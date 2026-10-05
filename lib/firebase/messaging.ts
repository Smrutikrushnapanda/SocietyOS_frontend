/**
 * FCM Token service — browser-only.
 *
 * Handles:
 *  1. Browser support check (Firebase Messaging requires a modern browser + HTTPS)
 *  2. Notification permission request
 *  3. FCM token acquisition via VAPID key
 *  4. Token registration with the backend POST /push-tokens
 *
 * SECURITY:
 *  - Only NEXT_PUBLIC_FIREBASE_* values are used (public, safe for the browser bundle).
 *  - FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are never referenced here.
 *  - user_id and organization_id are NOT sent in the request body.
 *    The backend derives them from the Authorization header and org context header.
 */

import { getMessaging, getToken, type Messaging } from 'firebase/messaging';
import { getFirebaseApp } from './firebase';

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'permission_denied' }
  | { status: 'unsupported' }
  | { status: 'no_auth' }
  | { status: 'error'; message: string };

/**
 * Returns true if the current browser environment supports Firebase Messaging.
 * Checks for window, navigator, Notification API, and service worker support.
 */
export function isFCMSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  return true;
}

/**
 * Returns the Firebase Messaging instance, or null if unsupported / SSR.
 * The Firebase app must already be initialized before calling this.
 */
export function getFirebaseMessaging(): Messaging | null {
  if (!isFCMSupported()) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getMessaging(app);
  } catch {
    return null;
  }
}

/**
 * Requests notification permission, acquires an FCM token, and registers
 * it with the backend at POST /push-tokens.
 *
 * @param authToken  - Bearer JWT for the Authorization header.
 *                     Pass null/undefined to skip backend registration
 *                     (mock auth mode — token is still acquired and logged).
 * @param societyId  - The X-Organization-Id header value required by OrganizationGuard.
 *                     Pass null/undefined to skip backend registration.
 */
export async function registerFCMToken(
  authToken: string | null | undefined,
  societyId: string | null | undefined
): Promise<PushRegistrationResult> {
  // 1. Check browser support
  if (!isFCMSupported()) {
    return { status: 'unsupported' };
  }

  // 2. Request notification permission
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return { status: 'unsupported' };
  }

  if (permission !== 'granted') {
    return { status: 'permission_denied' };
  }

  // 3. Get the Firebase Messaging instance
  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return { status: 'unsupported' };
  }

  // 4. Register the service worker and get the FCM token
  let fcmToken: string;
  try {
    const swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );

    fcmToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', message };
  }

  if (!fcmToken) {
    return { status: 'error', message: 'FCM token was empty after getToken()' };
  }

  // 5. If no auth token or society ID, skip backend registration (mock mode).
  if (!authToken || !societyId) {
    console.info(
      '[FCM] Token acquired; backend registration skipped because authentication/organization context is unavailable.'
    );
    return { status: 'registered', token: fcmToken };
  }

  // 6. Send only { token, platform } — backend derives user_id and organization_id
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050';
  try {
    const response = await fetch(`${apiBase}/push-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Organization-Id': societyId,
      },
      body: JSON.stringify({
        token: fcmToken,
        platform: 'WEB',
        // user_id and organization_id intentionally omitted
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { status: 'error', message: `Backend responded ${response.status}: ${text}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', message: `Network error registering push token: ${message}` };
  }

  return { status: 'registered', token: fcmToken };
}
