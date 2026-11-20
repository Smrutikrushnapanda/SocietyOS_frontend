/**
 * usePushNotifications — React hook for Firebase Cloud Messaging web push.
 *
 * Wires up FCM token acquisition and backend registration in a React-friendly way.
 * Safe for Next.js SSR — all Firebase/browser APIs are guarded behind client-side checks.
 *
 * Usage:
 *   const { status, requestPermission, unregister } = usePushNotifications();
 *
 * The hook does NOT auto-request permission on mount to respect the user's intent.
 * Call requestPermission() explicitly (e.g., on a button click) to start the flow.
 */

'use client';

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { registerFCMToken, unregisterFCMToken, isFCMSupported } from '../lib/firebase/messaging';
import { pushSession } from '../lib/firebase/push-token-lifecycle';
import { useAuthStore } from '../store/useAuthStore';

export type PushNotificationStatus = 'idle' | 'requesting' | 'registered' | 'permission_denied' | 'unsupported' | 'no_auth' | 'error';
interface PushState { scope: string; status: PushNotificationStatus; fcmToken: string | null; tokenId: string | null; errorMessage: string | null }
const subscribeSupport = () => () => undefined;
const emptyState = (scope: string): PushState => ({ scope, status: 'idle', fcmToken: null, tokenId: null, errorMessage: null });
const currentScope = () => { const session = pushSession(useAuthStore.getState()); return session ? `${session.userId}:${session.organizationId}` : ''; };

export function usePushNotifications() {
  const userId = useAuthStore((state) => state.backendUser?.id ?? state.user?.id);
  const organizationId = useAuthStore((state) => state.organizationId);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const scope = authenticated ? `${userId}:${organizationId}` : '';
  const [state, setState] = useState<PushState>(() => emptyState(scope));
  const isSupported = useSyncExternalStore(subscribeSupport, isFCMSupported, () => false);
  const requestPermission = useCallback(async () => {
    const started = currentScope();
    if (!started) { setState({ ...emptyState(''), status: 'no_auth' }); return; }
    setState({ ...emptyState(started), status: 'requesting' });
    const result = await registerFCMToken();
    if (currentScope() !== started) return;
    setState(result.status === 'registered'
      ? { scope: started, status: 'registered', fcmToken: result.token, tokenId: result.tokenId, errorMessage: null }
      : { ...emptyState(started), status: result.status, errorMessage: result.status === 'error' ? result.message : null });
  }, []);
  useEffect(() => {
    const refresh = () => {
      if (scope && typeof Notification !== 'undefined' && Notification.permission === 'granted') void requestPermission();
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [scope, requestPermission]);
  const unregister = useCallback(async () => {
    const started = currentScope();
    try { await unregisterFCMToken(); if (currentScope() === started) setState(emptyState(started)); }
    catch { if (currentScope() === started) setState({ ...emptyState(started), status: 'error', errorMessage: 'Push cleanup not confirmed. Retry when connected.' }); }
  }, []);
  return { ...(state.scope === scope ? state : emptyState(scope)), isSupported, requestPermission, unregister };
}
