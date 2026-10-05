/**
 * usePushNotifications — React hook for Firebase Cloud Messaging web push.
 *
 * Wires up FCM token acquisition and backend registration in a React-friendly way.
 * Safe for Next.js SSR — all Firebase/browser APIs are guarded behind client-side checks.
 *
 * Usage:
 *   const { status, requestPermission } = usePushNotifications();
 *
 * The hook does NOT auto-request permission on mount to respect the user's intent.
 * Call requestPermission() explicitly (e.g., on a button click) to start the flow.
 *
 * Auth:
 *   The current AuthUser in the auth store has no JWT token (mock auth system).
 *   When no JWT is available, backend registration is skipped gracefully — the
 *   FCM token is still acquired and logged. Once a real JWT flow is added, pass
 *   the token via the authToken field of AuthUser and it will be used automatically.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { getFirebaseApp } from '../lib/firebase/firebase';
import { registerFCMToken, isFCMSupported, type PushRegistrationResult } from '../lib/firebase/messaging';
import { useAuthStore } from '../store/useAuthStore';

export type PushNotificationStatus =
  | 'idle'
  | 'requesting'
  | 'registered'
  | 'permission_denied'
  | 'unsupported'
  | 'no_auth'
  | 'error';

interface UsePushNotificationsResult {
  /** Current state of the push notification registration flow. */
  status: PushNotificationStatus;
  /** The acquired FCM token, if registration succeeded. */
  fcmToken: string | null;
  /** Human-readable error message if status === 'error'. */
  errorMessage: string | null;
  /** Whether the current browser supports FCM. */
  isSupported: boolean;
  /**
   * Trigger the permission request + FCM token registration flow.
   * Safe to call multiple times — will no-op if already registered.
   */
  requestPermission: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [status, setStatus] = useState<PushNotificationStatus>('idle');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const { user, isAuthenticated } = useAuthStore();

  // Determine browser support on the client side only.
  useEffect(() => {
    setIsSupported(isFCMSupported());
  }, []);

  // Ensure the Firebase app is initialized on mount (client side only).
  useEffect(() => {
    if (typeof window !== 'undefined') {
      getFirebaseApp();
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // No-op if already registered or currently requesting.
    if (status === 'registered' || status === 'requesting') return;

    if (!isFCMSupported()) {
      setStatus('unsupported');
      return;
    }

    setStatus('requesting');
    setErrorMessage(null);

    // Extract auth token and society ID from the current user session.
    // AuthUser currently has no JWT (mock auth) — both will be null/undefined,
    // causing registerFCMToken to skip backend registration gracefully.
    const authToken: string | null =
      (user as (typeof user & { accessToken?: string }) | null)?.accessToken ?? null;
    const societyId: string | null = user?.societyId ?? null;

    const result: PushRegistrationResult = await registerFCMToken(authToken, societyId);

    switch (result.status) {
      case 'registered':
        setFcmToken(result.token);
        setStatus('registered');
        break;
      case 'permission_denied':
        setStatus('permission_denied');
        break;
      case 'unsupported':
        setStatus('unsupported');
        break;
      case 'no_auth':
        setStatus('no_auth');
        break;
      case 'error':
        setStatus('error');
        setErrorMessage(result.message);
        break;
    }
  }, [status, user]);

  return {
    status,
    fcmToken,
    errorMessage,
    isSupported,
    requestPermission,
  };
}
