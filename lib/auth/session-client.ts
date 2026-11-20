import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { credentialVault, sessionHeaders, sessionPortal, sessionMode } from './session-transport';
import { PortalAccessError, resolvePortalContext } from './portal-access';

const url = (path: string) => `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/auth/${path}`;
const unwrap = (value: any) => value?.data !== undefined ? value.data : value;
export const sessionRejected = (error: unknown) => error instanceof PortalAccessError || (axios.isAxiosError(error) && error.response?.status === 401);
let refresh: { portal: string; promise: Promise<string> } | null = null;

export async function flushPendingLogout(): Promise<void> {
  const stored = await credentialVault.load();
  if (!stored.pendingLogout) return;
  await axios.post(url('logout'), { refreshToken: typeof stored.pendingLogout === 'string' ? stored.pendingLogout : undefined }, { withCredentials: true, headers: sessionHeaders(), timeout: 15000 });
  await credentialVault.save({ organizationId: stored.organizationId });
}

export async function persistCredential(refreshToken?: string): Promise<void> {
  const stored = await credentialVault.load();
  await credentialVault.save({ refreshToken: sessionMode === 'native' ? refreshToken || stored.refreshToken : undefined, organizationId: useAuthStore.getState().organizationId });
}

export async function discardLoginSession(refreshToken?: string): Promise<void> {
  await credentialVault.save({ pendingLogout: sessionMode === 'native' ? refreshToken || true : true });
  useAuthStore.getState().clearAuth();
  try {
    await axios.post(url('logout'), { refreshToken }, { withCredentials: true, headers: sessionHeaders(), timeout: 15000 });
    await credentialVault.save({});
  } catch { /* Pending logout blocks restoration until revocation can retry. */ }
}

export function refreshAccessSession(): Promise<string> {
  const portal = sessionPortal();
  if (refresh?.portal === portal) return refresh.promise;
  const version = useAuthStore.getState().sessionVersion;
  const current = () => sessionPortal() === portal && !useAuthStore.getState().logoutInProgress && useAuthStore.getState().sessionVersion === version;
  const work = async () => {
    if (!current()) throw new Error('Session changed');
    const stored = await credentialVault.load();
    stored.organizationId = localStorage.getItem(`societyos:${portal}:organization`) || stored.organizationId;
    if (stored.pendingLogout) throw new Error('Signed out');
    const rotationId = stored.rotationId || crypto.randomUUID();
    await credentialVault.save({ ...stored, rotationId });
    const response = await axios.post(url('refresh-token'), { refreshToken: stored.refreshToken, rotationId }, { withCredentials: true, headers: sessionHeaders(), timeout: 15000 });
    const result = unwrap(response.data);
    if (!current()) throw new Error('Session changed');
    if (!result?.accessToken || (sessionMode === 'native' && !result.refreshToken)) throw new Error('Invalid session response');
    // Save rotated credential before publishing access state or issuing other requests.
    await credentialVault.save({ refreshToken: result.refreshToken, organizationId: stored.organizationId });
    if (!current()) throw new Error('Session changed');
    useAuthStore.getState().setAccessToken(result.accessToken);
    const responseMe = await axios.get(url('me'), { headers: {
      ...sessionHeaders(),
      Authorization: `Bearer ${result.accessToken}`,
    }, timeout: 15000 });
    if (!current()) throw new Error('Session changed');
    const context = unwrap(responseMe.data);
    let organizationId;
    try {
      organizationId = resolvePortalContext(context.memberships || [], portal, stored.organizationId).organizationId;
    } catch (error) {
      await discardLoginSession(result.refreshToken);
      throw error;
    }
    useAuthStore.getState().setAuth({ accessToken: result.accessToken, refreshToken: sessionMode === 'native' ? result.refreshToken : undefined, backendUser: context.user, memberships: context.memberships, organizationId });
    useAuthStore.getState().setAuthContext(context, organizationId);
    return result.accessToken as string;
  };
  const promise: Promise<string> = (async () => typeof navigator !== 'undefined' && navigator.locks ? await navigator.locks.request(`societyos-session:${portal}`, work) : await work())()
    .finally(() => { if (refresh?.promise === promise) refresh = null; });
  refresh = { portal, promise };
  return promise;
}

export async function restoreAuthSession(): Promise<boolean> {
  const state = useAuthStore.getState();
  if (state.logoutInProgress) return false;
  useAuthStore.setState({ isRestoring: true, sessionError: null });
  try {
    const stored = await credentialVault.load();
    if (stored.pendingLogout) { void flushPendingLogout().catch(() => {}); return false; }
    if (sessionMode === 'native' && !stored.refreshToken) return false;
    if (stored.organizationId) useAuthStore.setState({ organizationId: stored.organizationId });
    await refreshAccessSession();
    return true;
  } catch (error) {
    if (sessionRejected(error)) {
      useAuthStore.getState().clearAuth();
      if (!(error instanceof PortalAccessError)) await credentialVault.save({});
    } else {
      useAuthStore.setState({ sessionError: 'Session unavailable. Check your connection and retry.' });
    }
    return false;
  } finally { useAuthStore.setState({ isHydrated: true, isRestoring: false }); }
}
