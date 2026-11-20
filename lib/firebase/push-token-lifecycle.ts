export interface PushSession { userId: string; organizationId: string; accessToken: string }
export interface PushBinding { userId: string; organizationId: string; tokenId: string }
interface Cache { binding: PushBinding | null; pending: PushBinding[]; resetRequired: boolean }
export interface CleanupResult { confirmed: boolean; browserReset: boolean }
export type RegistrationResult =
  | { status: 'registered'; token: string; tokenId: string }
  | { status: 'no_auth' | 'unsupported' | 'permission_denied' }
  | { status: 'error'; message: string };
interface Ports {
  read: () => Cache;
  write: (cache: Cache) => void;
  lock: <T>(work: () => Promise<T>) => Promise<T>;
  acquire: () => Promise<string>;
  remove: () => Promise<void>;
  register: (token: string, previousTokenId: string | undefined, signal: AbortSignal, session: PushSession) => Promise<{ id: string }>;
  revoke: (binding: PushBinding, session: PushSession) => Promise<void>;
}
const sameOwner = (binding: PushBinding, session: PushSession) => binding.userId === session.userId && binding.organizationId === session.organizationId;

export function createPushTokenLifecycle(ports: Ports) {
  let version = 0;
  let abort = new AbortController();
  let queue = Promise.resolve();
  let registering: { owner: string; version: number; result: Promise<RegistrationResult> } | null = null;
  function serialize<T>(work: () => Promise<T>): Promise<T> {
    const next = queue.then(() => ports.lock(work));
    queue = next.then(() => undefined, () => undefined);
    return next;
  }
  function invalidate() { ++version; abort.abort(); abort = new AbortController(); }
  async function clean(cache: Cache, session: PushSession | null): Promise<CleanupResult> {
    const binding = cache.binding;
    const ownsBrowser = !binding || !session || sameOwner(binding, session);
    if (binding && ownsBrowser) {
      cache.pending = [...cache.pending.filter((item) => item.tokenId !== binding.tokenId), binding];
      cache.binding = null;
      cache.resetRequired = true;
      ports.write(cache);
    }
    let confirmed = true;
    const remaining: PushBinding[] = [];
    for (const item of cache.pending) {
      const legacy = item.userId === '' && item.organizationId === '';
      if (!session || (!legacy && !sameOwner(item, session))) { remaining.push(item); confirmed = false; continue; }
      try { await ports.revoke(item, session); } catch { remaining.push(item); confirmed = false; }
    }
    cache.pending = remaining;
    if (cache.resetRequired && ownsBrowser) {
      try { await ports.remove(); cache.resetRequired = false; } catch { confirmed = false; }
    }
    ports.write(cache);
    return { confirmed, browserReset: !cache.resetRequired };
  }
  return {
    invalidate,
    cleanup(session: PushSession | null): Promise<CleanupResult> {
      invalidate();
      try {
        const cache = ports.read();
        if (!cache.binding && !cache.pending.length && !cache.resetRequired) return Promise.resolve({ confirmed: true, browserReset: true });
      } catch { return Promise.resolve({ confirmed: false, browserReset: false }); }
      return serialize(async () => {
        try { return await clean(ports.read(), session); }
        catch { return { confirmed: false, browserReset: false }; }
      }).catch(() => ({ confirmed: false, browserReset: false }));
    },
    register(session: PushSession | null, isCurrent: () => boolean): Promise<RegistrationResult> {
      if (!session) return Promise.resolve({ status: 'no_auth' });
      const request = version;
      const owner = `${session.userId}:${session.organizationId}`;
      if (registering?.owner === owner && registering.version === request) return registering.result;
      const signal = abort.signal;
      const result = serialize(async (): Promise<RegistrationResult> => {
        const current = () => request === version && !signal.aborted && isCurrent();
        if (!current()) return { status: 'no_auth' };
        try {
          const cache = ports.read();
          if (cache.binding && !sameOwner(cache.binding, session)) {
            // No cross-account claim. Invalidate the browser subscription before obtaining another token.
            cache.pending = [...cache.pending, cache.binding];
            cache.binding = null;
            cache.resetRequired = true;
            ports.write(cache);
          }
          if (cache.resetRequired) {
            await ports.remove();
            cache.resetRequired = false;
            ports.write(cache);
          }
          if (!current()) return { status: 'no_auth' };
          cache.resetRequired = true;
          ports.write(cache);
          const token = await ports.acquire();
          if (!current()) { cache.resetRequired = true; ports.write(cache); return { status: 'no_auth' }; }
          if (!token) return { status: 'error', message: 'Push subscription unavailable.' };
          const record = await ports.register(token, cache.binding?.tokenId, signal, session);
          // Record ownership even if sign-out happened while server response was in flight; queued cleanup can revoke it.
          cache.binding = { userId: session.userId, organizationId: session.organizationId, tokenId: record.id };
          cache.resetRequired = false;
          ports.write(cache);
          if (!current()) return { status: 'no_auth' };
          return { status: 'registered', token, tokenId: record.id };
        } catch {
          return { status: 'error', message: 'Push registration failed. Check your session and connection, then retry.' };
        }
      }).catch((): RegistrationResult => ({ status: 'error', message: 'Push registration unavailable. Browser locking or storage failed.' }));
      registering = { owner, version: request, result };
      void result.finally(() => { if (registering?.result === result) registering = null; });
      return result;
    },
  };
}

const CACHE_KEY = 'societyos_fcm_token_id';
function isBinding(value: unknown): value is PushBinding {
  return typeof value === 'object' && value !== null && 'userId' in value && typeof value.userId === 'string' &&
    'organizationId' in value && typeof value.organizationId === 'string' && 'tokenId' in value && typeof value.tokenId === 'string';
}
export function parsePushCache(raw: string | null): Cache {
  if (!raw) return { binding: null, pending: [], resetRequired: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === 'object' && value !== null && 'binding' in value && (value.binding === null || isBinding(value.binding)) &&
        'pending' in value && Array.isArray(value.pending) && value.pending.every(isBinding) &&
        'resetRequired' in value && typeof value.resetRequired === 'boolean') {
      return { binding: isBinding(value.binding) ? value.binding : null, pending: value.pending, resetRequired: value.resetRequired };
    }
  } catch { /* Legacy unscoped ID requires a browser subscription reset. */ }
  const legacyId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ? raw : 'unknown';
  return { binding: null, pending: [{ userId: '', organizationId: '', tokenId: legacyId }], resetRequired: true };
}
function readCache(): Cache {
  return parsePushCache(typeof window === 'undefined' ? null : localStorage.getItem(CACHE_KEY));
}

export const pushTokenLifecycle = createPushTokenLifecycle({
  read: readCache,
  write: (cache) => {
    if (!cache.binding && !cache.pending.length && !cache.resetRequired) localStorage.removeItem(CACHE_KEY);
    else localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  },
  lock: async (work) => {
    if (typeof navigator === 'undefined' || !navigator.locks) throw new Error('Browser push locking unavailable');
    return navigator.locks.request('societyos-push-lifecycle', work);
  },
  acquire: async () => (await import('./messaging')).acquireBrowserPushToken(),
  remove: async () => (await import('./messaging')).deleteBrowserPushToken(),
  register: async (token, previousTokenId, signal, session) => (await import('../api/notifications.api')).registerPushToken({ token, platform: (await import('./messaging')).pushPlatform, previousTokenId }, signal, session),
  revoke: async (binding, session) => { await (await import('../api/notifications.api')).revokePushTokenForSession(binding.tokenId, session); },
});

export function pushSession(state: { isAuthenticated: boolean; backendUser: { id: string } | null; user: { id: string } | null; organizationId: string | null; accessToken: string | null }): PushSession | null {
  const userId = state.backendUser?.id ?? state.user?.id;
  return state.isAuthenticated && userId && state.organizationId && state.accessToken
    ? { userId, organizationId: state.organizationId, accessToken: state.accessToken } : null;
}
