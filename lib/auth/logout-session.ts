import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { pushSession, pushTokenLifecycle } from '../firebase/push-token-lifecycle';
import { credentialVault, sessionHeaders, sessionMode } from './session-transport';

let pending: Promise<boolean> | null = null;
export function logoutCurrentSession(): Promise<boolean> {
  if (pending) return pending;
  const state = useAuthStore.getState();
  useAuthStore.setState({ logoutInProgress: true });
  pending = (async () => {
    const stored = await credentialVault.load();
    const refreshToken = stored.refreshToken || state.refreshToken;
    // Tombstone prevents restoration even when logout cannot reach server.
    await credentialVault.save({ pendingLogout: sessionMode === 'native' ? refreshToken || true : true });
    const result = await pushTokenLifecycle.cleanup(pushSession(state));
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/auth/logout`, { refreshToken }, { withCredentials: true, headers: sessionHeaders(), timeout: 15000 });
      await credentialVault.save({});
    } catch { /* Reconnection flushes secure pending revocation before another login. */ }
    finally { if (useAuthStore.getState().sessionVersion === state.sessionVersion) useAuthStore.getState().clearAuth(); }
    if (!result.confirmed) useToastStore.getState().showToast('Signed out. Notification cleanup will retry when connected.', 'info');
    return result.confirmed;
  })().finally(() => { pending = null; });
  return pending;
}
