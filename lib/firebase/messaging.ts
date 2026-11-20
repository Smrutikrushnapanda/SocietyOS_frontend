/**
 * FCM Token service — browser-only.
 *
 * Handles:
 *  1. Browser support check (Firebase Messaging requires a modern browser + HTTPS)
 *  2. Notification permission request
 *  3. FCM token acquisition via VAPID key
 *  4. Token registration with the backend POST /api/v1/push-tokens via apiClient
 *
 * SECURITY:
 *  - Only NEXT_PUBLIC_FIREBASE_* values are used (public, safe for the browser bundle).
 *  - FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are never referenced here.
 *  - user_id and organization_id are NOT sent in the request body.
 *    The backend derives them from the Authorization header and org context header.
 */

import { getMessaging, getToken, deleteToken, type Messaging } from 'firebase/messaging';
import { firebaseConfig, getFirebaseApp } from './firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { pushSession, pushTokenLifecycle, type RegistrationResult } from './push-token-lifecycle';

export type PushRegistrationResult = RegistrationResult;
export const pushPlatform = 'WEB' as const;

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

export async function acquireBrowserPushToken(): Promise<string> {
  const messaging = getFirebaseMessaging();
  if (!messaging) throw new Error('Push messaging unavailable');
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) {
    throw new Error('Public push configuration unavailable');
  }
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (value) parameters.set(key, value);
  }
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${parameters}`, { scope: '/' });
  return getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
}

export async function deleteBrowserPushToken(): Promise<void> {
  const messaging = getFirebaseMessaging();
  if (!messaging) throw new Error('Push reset unavailable');
  if (!await deleteToken(messaging)) throw new Error('Push reset not confirmed');
}

export async function registerFCMToken(): Promise<PushRegistrationResult> {
  const session = pushSession(useAuthStore.getState());
  if (!session) return { status: 'no_auth' };
  if (!isFCMSupported()) return { status: 'unsupported' };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      await pushTokenLifecycle.cleanup(session);
      return { status: 'permission_denied' };
    }
    return await pushTokenLifecycle.register(session, () => {
      const current = pushSession(useAuthStore.getState());
      return !!current && current.userId === session.userId && current.organizationId === session.organizationId;
    });
  } catch { return { status: 'error', message: 'Push permission or registration unavailable.' }; }
}

export async function unregisterFCMToken(): Promise<void> {
  const result = await pushTokenLifecycle.cleanup(pushSession(useAuthStore.getState()));
  if (!result.confirmed) throw new Error('Push cleanup not confirmed. Server revocation or browser reset remains pending.');
}
