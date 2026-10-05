/**
 * Firebase Web App initialization — SSR safe.
 *
 * Only public NEXT_PUBLIC_FIREBASE_* values are used here.
 * Firebase Admin SDK credentials (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * are never imported or referenced in this file or any frontend module.
 *
 * The app is initialized once (singleton) and only on the client side.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Returns the Firebase app singleton.
 * Safe to call multiple times — reuses existing app if already initialized.
 * Returns null during SSR (no window object available).
 */
export function getFirebaseApp(): FirebaseApp | null {
  // Do not initialize Firebase on the server side.
  if (typeof window === 'undefined') {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}
