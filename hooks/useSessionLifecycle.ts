'use client';
import { useEffect } from 'react';
import apiClient from '../lib/api/client';
import { useAuthStore } from '../store/useAuthStore';
import { flushPendingLogout } from '../lib/auth/session-client';

export function useSessionLifecycle(): void {
  useEffect(() => {
    let activityAt = 0;
    let busy = false;
    const activity = (event: Event) => {
      const state = useAuthStore.getState();
      if (!event.isTrusted || document.hidden || !state.isAuthenticated || state.logoutInProgress || busy || Date.now() - activityAt < 60000) return;
      busy = true;
      void apiClient.post('/auth/activity').then(() => { activityAt = Date.now(); }).catch(() => {}).finally(() => { busy = false; });
    };
    const recover = () => {
      if (document.hidden) return;
      const state = useAuthStore.getState();
      if (state.logoutInProgress) return;
      if (state.sessionError) void state.restoreSession();
      else if (state.isAuthenticated) void apiClient.get('/auth/me').then(response => {
        if (useAuthStore.getState().sessionVersion === state.sessionVersion) useAuthStore.getState().setAuthContext(response.data, state.organizationId);
      }).catch(() => {});
      else void flushPendingLogout().catch(() => {});
    };
    window.addEventListener('pointerdown', activity, true);
    window.addEventListener('keydown', activity, true);
    window.addEventListener('touchstart', activity, { capture: true, passive: true });
    window.addEventListener('online', recover);
    window.addEventListener('focus', recover);
    document.addEventListener('visibilitychange', recover);
    return () => {
      window.removeEventListener('pointerdown', activity, true); window.removeEventListener('keydown', activity, true); window.removeEventListener('touchstart', activity, true);
      window.removeEventListener('online', recover); window.removeEventListener('focus', recover); document.removeEventListener('visibilitychange', recover);
    };
  }, []);
}
