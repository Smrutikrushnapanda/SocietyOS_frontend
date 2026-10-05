/**
 * Firebase Cloud Messaging Service Worker — background push notification handler.
 *
 * This file MUST be served from the root path (/firebase-messaging-sw.js).
 * It uses only the public Firebase web SDK configuration values.
 *
 * SECURITY:
 *  - No Firebase Admin credentials (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) here.
 *  - Only public NEXT_PUBLIC_FIREBASE_* equivalent values are used.
 *  - These values are safe to include in a public service worker.
 */

// Import Firebase SDKs via the CDN scripts compatible with service workers.
// Using the same major version (10) as the installed firebase npm package.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// ---------------------------------------------------------------------------
// Firebase configuration — public values only.
// Service workers do not have access to Next.js env vars, so these values
// are read from the query string appended when the SW is registered, or fall
// back to the literal values injected at build time by next.config.
//
// Strategy: the SW reads its own URL's search params for the config values,
// which are appended by the registerFCMToken() call in messaging.ts.
// If not present, hardcoded public env-var equivalents are used (safe since
// these are NEXT_PUBLIC_ values — already in the browser bundle).
// ---------------------------------------------------------------------------

function getConfigFromScope() {
  try {
    const url = new URL(self.location.href);
    return {
      apiKey: url.searchParams.get('apiKey'),
      authDomain: url.searchParams.get('authDomain'),
      projectId: url.searchParams.get('projectId'),
      storageBucket: url.searchParams.get('storageBucket'),
      messagingSenderId: url.searchParams.get('messagingSenderId'),
      appId: url.searchParams.get('appId'),
    };
  } catch {
    return {};
  }
}

const scopeConfig = getConfigFromScope();

// Fall back to the hardcoded public values if the SW is loaded without params.
// These are public NEXT_PUBLIC_ values — safe in the browser bundle.
const firebaseConfig = {
  apiKey: scopeConfig.apiKey || self.__FIREBASE_CONFIG_API_KEY__,
  authDomain: scopeConfig.authDomain || self.__FIREBASE_CONFIG_AUTH_DOMAIN__,
  projectId: scopeConfig.projectId || self.__FIREBASE_CONFIG_PROJECT_ID__,
  storageBucket: scopeConfig.storageBucket || self.__FIREBASE_CONFIG_STORAGE_BUCKET__,
  messagingSenderId: scopeConfig.messagingSenderId || self.__FIREBASE_CONFIG_MESSAGING_SENDER_ID__,
  appId: scopeConfig.appId || self.__FIREBASE_CONFIG_APP_ID__,
};

// Only initialize if we have the minimum required fields.
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  /**
   * Handle background push messages.
   * Firebase calls this when the app is not in the foreground.
   * The notification is displayed automatically by the FCM SDK if
   * `notification` is present in the payload. For data-only payloads,
   * we construct and show the notification manually.
   */
  messaging.onBackgroundMessage((payload) => {
    const notificationTitle =
      payload.notification?.title ?? payload.data?.title ?? 'SocietyOS';
    const notificationOptions = {
      body: payload.notification?.body ?? payload.data?.body ?? '',
      icon: '/shared/societyos-icon.png',
      badge: '/shared/societyos-icon.png',
      data: payload.data ?? {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
