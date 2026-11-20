'use client';

import { useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { parsePush, claimDisplay } from '../public/societyos-push';
import { getFirebaseMessaging } from '../lib/firebase/messaging';
import { authorizedPushDestination, handleResidentForegroundPush, type PushDestination } from '../lib/firebase/resident-push';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useToastStore } from '../store/useToastStore';

function residentScope(): string {
  const state = useAuthStore.getState();
  return state.isAuthenticated && state.roles.includes('RESIDENT') && state.backendUser?.id && state.organizationId
    ? `${state.backendUser.id}:${state.organizationId}` : '';
}

export function useResidentPushMessages(navigate: (destination: PushDestination) => void): void {
  const userId = useAuthStore((state) => state.backendUser?.id);
  const organizationId = useAuthStore((state) => state.organizationId);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  useEffect(() => {
    const scope = residentScope();
    if (!scope) return;
    let active = true;
    const messaging = typeof Notification !== 'undefined' && Notification.permission === 'granted'
      ? getFirebaseMessaging() : null;
    const unsubscribe = messaging ? onMessage(messaging, (payload) => {
      void handleResidentForegroundPush(payload.data, scope, {
        scope: () => active ? residentScope() : '',
        claim: claimDisplay,
        refresh: () => { void useNotificationStore.getState().fetchUnreadCount(); window.dispatchEvent(new Event('societyos:notices-changed')); },
        notify: () => useToastStore.getState().showToast('You have a new SocietyOS update.', 'info'),
      });
    }) : () => undefined;
    const openDestination = async () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('pushCategory')) return;
      const data = parsePush({
        deliveryId: url.searchParams.get('pushDelivery'),
        category: url.searchParams.get('pushCategory'),
        referenceId: url.searchParams.get('pushReference'),
      });
      for (const key of ['pushCategory', 'pushReference', 'pushDelivery']) url.searchParams.delete(key);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      const destination = data ? await authorizedPushDestination(data, scope, residentScope) : null;
      if (!active || scope !== residentScope()) return;
      if (destination) navigate(destination);
      else useToastStore.getState().showToast('This update is no longer available.', 'info');
    };
    queueMicrotask(() => { if (active) void openDestination(); });
    const onLocation = () => { void openDestination(); };
    window.addEventListener('popstate', onLocation);
    return () => { active = false; unsubscribe(); window.removeEventListener('popstate', onLocation); };
  }, [userId, organizationId, authenticated, navigate]);
}
