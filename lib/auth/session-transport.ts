export type SessionPortal = 'resident' | 'guard' | 'admin';
export interface StoredSession { refreshToken?: string; rotationId?: string; organizationId?: string | null; pendingLogout?: string | boolean }
export function sessionPortal(): SessionPortal {
  if (typeof window === 'undefined') return 'resident';
  const path = window.location?.pathname || '/';
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/guard' || path.startsWith('/guard/') || path === '/walkie-talkie' || path.startsWith('/walkie-talkie/')) return 'guard';
  // The universal `/login` route renders AdminLoginPage, so it must use the
  // admin portal headers/cookies; otherwise an admin sign-in there is
  // rejected as "not registered as a resident".
  if (path === '/login' || path === '/login/') return 'admin';
  return 'resident';
}
export const sessionMode: 'cookie' | 'native' = 'cookie';
export const sessionHeaders = () => ({ 'X-Session-Mode': sessionMode, 'X-Portal-Role': sessionPortal().toUpperCase() });
const key = () => `societyos:${sessionPortal()}:session`;
export const credentialVault = {
  async load(): Promise<StoredSession> {
    const value: StoredSession = JSON.parse(localStorage.getItem(key()) || '{}');
    // Only existing tab storage is eligible for one-time cookie migration.
    const roles = JSON.parse(sessionStorage.getItem('societyos_roles') || '[]') as string[];
    const allowed = sessionPortal() === 'admin' ? roles.some(role => role === 'SOCIETY_ADMIN' || role === 'SUPER_ADMIN') : roles.includes(sessionPortal().toUpperCase());
    return { ...value, refreshToken: allowed ? sessionStorage.getItem('societyos_refresh_token') || undefined : undefined };
  },
  async save(value: StoredSession): Promise<void> {
    const { refreshToken: _, ...metadata } = value;
    if (typeof metadata.pendingLogout === 'string') metadata.pendingLogout = true;
    localStorage.setItem(key(), JSON.stringify(metadata));
    sessionStorage.removeItem('societyos_refresh_token');
  },
};
export const portalStorage = {
  getItem(key: string) {
    const scoped = sessionStorage.getItem(`${sessionPortal()}:${key}`);
    if (scoped !== null) return scoped;
    const roles = JSON.parse(sessionStorage.getItem('societyos_roles') || '[]') as string[];
    const allowed = sessionPortal() === 'admin' ? roles.some(role => ['SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(role)) : roles.includes(sessionPortal().toUpperCase());
    return allowed ? sessionStorage.getItem(key) : null;
  },
  setItem(key: string, value: string) { sessionStorage.setItem(`${sessionPortal()}:${key}`, value); },
  removeItem(key: string) { sessionStorage.removeItem(`${sessionPortal()}:${key}`); },
};
