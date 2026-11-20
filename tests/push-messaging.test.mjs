import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const shared = readFileSync(new URL('../public/societyos-push.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../public/firebase-messaging-sw.js', import.meta.url), 'utf8');
const data = { deliveryId: '11111111-1111-4111-8111-111111111111', referenceId: '22222222-2222-4222-8222-222222222222', category: 'NOTICE' };
const lockTails = new Map();
const locks = { request: (name, run) => {
  const result = (lockTails.get(name) ?? Promise.resolve()).then(run);
  lockTails.set(name, result.catch(() => undefined));
  return result;
} };
function harness(entries = new Map(), configured = true) {
  const events = new Map();
  const shown = [];
  const opened = [];
  let background;
  let initialized = false;
  const scope = {
    location: new URL(`https://society.test/firebase-messaging-sw.js${configured ? '?apiKey=public-test&projectId=public-test&messagingSenderId=public-test&appId=public-test' : ''}`),
    addEventListener: (name, fn) => events.set(name, fn),
    registration: { showNotification: async (...args) => shown.push(args) },
    clients: { matchAll: async () => [], openWindow: async (url) => opened.push(url) },
  };
  const context = vm.createContext({ self: scope, location: scope.location, navigator: { locks }, URL, Response, Date, console,
    caches: { open: async () => ({ match: async (key) => entries.has(key) ? new Response(entries.get(key)) : undefined, put: async (key, value) => entries.set(key, await value.text()), keys: async () => [...entries.keys()], delete: async (key) => entries.delete(key) }) },
    firebase: { initializeApp: () => { initialized = true; }, messaging: () => ({ onBackgroundMessage: (fn) => { background = fn; } }) },
    importScripts: (url) => {
      if (url === '/societyos-push.js') vm.runInContext(shared, context);
      else assert.ok(events.has('notificationclick'), 'custom click listener registered before Firebase');
    },
  });
  vm.runInContext(worker, context);
  return { scope, context, shown, opened, entries, events, background, initialized };
}

test('worker receives public query configuration and refuses absent configuration', () => {
  assert.equal(harness().initialized, true);
  assert.equal(harness(new Map(), false).initialized, false);
  const messaging = readFileSync(new URL('../lib/firebase/messaging.ts', import.meta.url), 'utf8');
  assert.ok(messaging.includes('firebase-messaging-sw.js?${parameters}'));
  assert.ok(!messaging.includes('process.env.FIREBASE_PRIVATE_KEY'));
});
test('data-only background display uses fixed text and persistent delivery deduplication', async () => {
  const h = harness();
  await Promise.all([h.background({ data: { ...data, title: 'private', url: 'https://evil.test' } }), h.background({ data })]);
  assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0][0], 'SocietyOS');
  assert.equal(h.shown[0][1].body, 'You have a new update.');
  assert.ok(!JSON.stringify(h.shown).includes('private'));
  const restarted = harness(h.entries);
  await restarted.background({ data });
  assert.equal(restarted.shown.length, 0);
});
test('notification payload already auto-displayed by Firebase is not manually displayed again', async () => {
  const h = harness();
  await h.background({ data, notification: { title: 'legacy notification' } });
  assert.equal(h.shown.length, 0);
});
test('malformed or unsupported event payload is not displayed', async () => {
  const h = harness();
  for (const payload of [{}, { data: { ...data, category: 'DOCUMENT' } }, { data: { ...data, referenceId: 'https://evil.test' } }]) await h.background(payload);
  assert.equal(h.shown.length, 0);
});
test('foreground and background share display claim; no duplicate background display', async () => {
  const entries = new Map();
  const foreground = harness(entries);
  assert.equal(await foreground.scope.SocietyOSPush.claimDisplay(data.deliveryId), true);
  const background = harness(entries);
  await background.background({ data });
  assert.equal(background.shown.length, 0);
  const hook = readFileSync(new URL('../hooks/useResidentPushMessages.ts', import.meta.url), 'utf8');
  assert.ok(hook.includes('onMessage(messaging'));
  assert.ok(hook.includes('claim: claimDisplay'));
  assert.ok(!hook.includes('showNotification(') && !hook.includes('new Notification('));
});
test('concurrent foreground and background claims serialize across contexts', async () => {
  const entries = new Map();
  const foreground = harness(entries);
  const background = harness(entries);
  const [claimed] = await Promise.all([
    foreground.scope.SocietyOSPush.claimDisplay(data.deliveryId),
    background.background({ data }),
  ]);
  assert.equal(claimed, true);
  assert.equal(background.shown.length, 0);
});
test('missing cross-context locks suppresses display instead of racing', async () => {
  const h = harness();
  delete h.context.navigator.locks;
  await h.background({ data });
  assert.equal(h.shown.length, 0);
});
test('click opens allowlisted same-origin resident route and ignores supplied URL', async () => {
  const h = harness();
  let task;
  let stopped = false;
  h.events.get('notificationclick')({
    notification: { data: { ...data, societyosPush: true, url: 'https://evil.test' }, close: () => {} },
    stopImmediatePropagation: () => { stopped = true; }, waitUntil: (pending) => { task = pending; },
  });
  await task;
  assert.equal(stopped, true);
  assert.equal(h.opened.length, 1);
  const url = new URL(h.opened[0]);
  assert.equal(url.origin, 'https://society.test');
  assert.equal(url.pathname, '/resident');
  assert.equal(url.searchParams.get('pushReference'), data.referenceId);
});
test('click navigates and focuses existing resident client, leaving admin clients alone', async () => {
  const h = harness();
  let destination;
  let focused = false;
  let task;
  h.scope.clients.matchAll = async () => [
    { url: 'https://society.test/admin', navigate: () => assert.fail('admin navigation') },
    { url: 'https://society.test/resident', navigate: async (url) => { destination = url; return { focus: async () => { focused = true; } }; } },
  ];
  h.events.get('notificationclick')({ notification: { data: { ...data, societyosPush: true }, close: () => {} }, stopImmediatePropagation: () => {}, waitUntil: (pending) => { task = pending; } });
  await task;
  assert.equal(focused, true);
  assert.ok(destination.startsWith('https://society.test/resident?'));
  assert.equal(h.opened.length, 0);
});
test('storage failure suppresses display; malformed clicks never navigate', async () => {
  const h = harness();
  h.context.caches.open = async () => { throw new Error('unavailable'); };
  await h.background({ data });
  assert.equal(h.shown.length, 0);
  h.events.get('notificationclick')({ notification: { data: { societyosPush: true, referenceId: 'invalid' }, close: () => {} }, stopImmediatePropagation: () => {}, waitUntil: () => assert.fail('navigation') });
  assert.equal(h.opened.length, 0);
});
