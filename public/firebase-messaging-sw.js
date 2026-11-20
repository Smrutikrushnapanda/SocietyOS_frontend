/* Public web configuration only; click handler must precede Firebase's listener. */
importScripts('/societyos-push.js');
self.addEventListener('notificationclick', (event) => {
  if (!event.notification.data?.societyosPush) return;
  const path = self.SocietyOSPush.pushPath(event.notification.data);
  event.stopImmediatePropagation();
  event.notification.close();
  if (!path) return;
  const destination = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      const url = new URL(client.url);
      if (url.origin === self.location.origin && url.pathname === '/resident') {
        const navigated = await client.navigate(destination);
        if (navigated) await navigated.focus();
        return;
      }
    }
    await self.clients.openWindow(destination);
  })());
});

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
const params = new URL(self.location.href).searchParams;
const config = Object.fromEntries(['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].map((key) => [key, params.get(key)]));
if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  firebase.messaging().onBackgroundMessage(async (payload) => {
    // Firebase already displays notification payloads; manually display data-only messages once.
    if (payload.notification) return;
    const data = self.SocietyOSPush.parsePush(payload.data);
    if (!data || !await self.SocietyOSPush.claimDisplay(data.deliveryId)) return;
    await self.registration.showNotification(data.category === 'POLL' ? 'New community poll' : data.category === 'EMERGENCY' ? 'SocietyOS emergency notice' : 'SocietyOS', {
      body: data.category === 'POLL' ? 'Open SocietyOS → Notices → Community Polls to vote.' : data.category === 'EMERGENCY' ? 'Open SocietyOS to read an emergency notice.' : 'You have a new update.',
      requireInteraction: data.category === 'EMERGENCY',
      tag: `societyos:${data.deliveryId}`,
      data: { ...data, societyosPush: true },
    });
  });
}
