'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useVisitorStore } from '../store/useVisitorStore';
import { VisitorLiveClient, type LiveState } from '../lib/live/visitor-live';

export function useVisitorLiveUpdates(): LiveState {
  const userId = useAuthStore(state => state.backendUser?.id);
  const organizationId = useAuthStore(state => state.organizationId);
  const accessToken = useAuthStore(state => state.accessToken);
  const authenticated = useAuthStore(state => state.isAuthenticated);
  const loggingOut = useAuthStore(state => state.logoutInProgress);
  const resident = useAuthStore(state => state.roles.includes('RESIDENT'));
  const permitted = useAuthStore(state => state.roles.includes('RESIDENT') ? state.permissions.includes('visitor:my') : state.permissions.includes('visitor:read'));
  const [connection, setConnection] = useState<LiveState>('stopped');

  useEffect(() => {
    if (!userId || !organizationId || !accessToken || !authenticated || loggingOut || !permitted) return;
    let active = true;
    const current = () => {
      const state = useAuthStore.getState();
      return active && state.isAuthenticated && !state.logoutInProgress && state.backendUser?.id === userId && state.organizationId === organizationId && state.accessToken === accessToken;
    };
    const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
    const socket = io(`${base}/visitors-live`, { path: '/socket.io', transports: ['websocket'], autoConnect: false, auth: { accessToken, organizationId }, reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 15000, timeout: 10000 });
    const client = new VisitorLiveClient({
      session: { userId, organizationId, accessToken }, socket, current,
      active: () => !document.hidden && navigator.onLine,
      state: value => { if (active) setConnection(value); },
      refresh: async () => {
        if (!current()) return;
        const store = useVisitorStore.getState();
        if (resident) await store.loadMyVisits(); else await store.loadGuardData();
        if (current()) window.dispatchEvent(new Event('societyos:events-changed'));
      },
    });
    const recover = () => {
      if (!socket.connected && document.visibilityState === 'visible') client.recover();
    };
    const recoverOnline = () => client.recover();
    const unsubscribe = useAuthStore.subscribe(() => { if (!current()) client.stop(); });
    client.start();
    window.addEventListener('focus', recover); window.addEventListener('online', recoverOnline);
    document.addEventListener('visibilitychange', recover);
    return () => {
      active = false; unsubscribe(); client.stop();
      window.removeEventListener('focus', recover); window.removeEventListener('online', recoverOnline);
      document.removeEventListener('visibilitychange', recover);
    };
  }, [userId, organizationId, accessToken, authenticated, loggingOut, resident, permitted]);
  return authenticated && !loggingOut && permitted && userId && organizationId && accessToken ? connection : 'stopped';
}
