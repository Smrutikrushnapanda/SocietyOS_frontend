import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { VisitorLiveClient, VISITOR_LIVE_CHANNEL, parseVisitorInvalidation, type VisitorSocket, type LiveState } from './visitor-live';

class FakeSocket implements VisitorSocket {
  connected = false;
  available = true;
  connects = 0;
  disconnects = 0;
  listeners = new Map<string, Set<(data?: unknown) => void>>();
  on(event: string, callback: (data?: unknown) => void) {
    const listeners = this.listeners.get(event) ?? new Set(); listeners.add(callback); this.listeners.set(event, listeners);
  }
  emit(event: string, data?: unknown) { for (const listener of this.listeners.get(event) ?? []) listener(data); }
  connect() { ++this.connects; this.connected = this.available; this.emit(this.available ? 'connect' : 'connect_error'); }
  disconnect() { ++this.disconnects; this.connected = false; this.emit('disconnect'); }
  removeAllListeners() { this.listeners.clear(); }
}
const org = '11111111-1111-4111-8111-111111111111';
const event = (id = 'a'.repeat(64)) => ({ version: 1, eventId: id, type: 'visit.arrived', organizationId: org, visitId: '22222222-2222-4222-8222-222222222222', occurredAt: new Date().toISOString() });
async function tick(ms = 100) { mock.timers.tick(ms); for (let i = 0; i < 8; i++) await Promise.resolve(); }
let passed = 0;
async function test(name: string, run: (fixture: ReturnType<typeof setup>) => Promise<void> | void) {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const fixture = setup();
  try { await run(fixture); ++passed; console.log(`PASS ${name}`); }
  finally { fixture.client.stop(); mock.timers.reset(); }
}
function setup() {
  const socket = new FakeSocket();
  const scope = { current: true, active: true };
  const states: LiveState[] = [];
  let refreshes = 0;
  let operation: () => Promise<void> = () => Promise.resolve();
  const client = new VisitorLiveClient({
    session: { userId: 'resident', organizationId: org, accessToken: 'test', sessionToken: 'test' },
    socket, current: () => scope.current, active: () => scope.active,
    state: state => states.push(state), refresh: async () => { ++refreshes; await operation(); },
  });
  return { client, socket, scope, states, count: () => refreshes, operation: (next: () => Promise<void>) => { operation = next; } };
}
async function run() {
  await test('initial connection refetch and duplicate invalidation coalescing', async ({ client, socket, count, states }) => {
    client.start(); await tick(); assert.equal(count(), 1); assert.equal(states.at(-1), 'connected');
    socket.emit(VISITOR_LIVE_CHANNEL, event()); socket.emit(VISITOR_LIVE_CHANNEL, event()); await tick();
    assert.equal(count(), 2); socket.emit(VISITOR_LIVE_CHANNEL, event()); await tick(); assert.equal(count(), 2);
  });
  await test('rejects malformed, foreign, stale and future events', async ({ client, socket, count }) => {
    client.start(); await tick();
    for (const input of [null, {}, { ...event(), version: 2 }, { ...event(), type: 'unknown' }, { ...event(), organizationId: 'foreign' }, { ...event(), occurredAt: new Date(Date.now() - 400000).toISOString() }, { ...event(), occurredAt: new Date(Date.now() + 120000).toISOString() }]) socket.emit(VISITOR_LIVE_CHANNEL, input);
    await tick(); assert.equal(count(), 1); assert.equal(parseVisitorInvalidation({}), null);
  });
  await test('idle and unavailable sockets never poll; reconnect recovers missed events', async ({ client, socket, count, states }) => {
    socket.available = false; client.start(); await tick(); assert.equal(count(), 1); assert.equal(states.at(-1), 'recovering');
    await tick(90000); await tick(); assert.equal(count(), 1);
    socket.available = true; socket.connect(); await tick(); assert.equal(count(), 2); assert.equal(states.at(-1), 'connected');
    await tick(90000); await tick(); assert.equal(count(), 2);
  });
  await test('reconnect refetches even without an event or replay buffer', async ({ client, socket, count }) => {
    client.start(); await tick(); socket.disconnect(); socket.connect(); await tick(); assert.equal(count(), 2);
  });
  await test('account/organization switch blocks old events and old async follow-up', async ({ client, socket, scope, operation, count }) => {
    let release = () => {};
    operation(() => new Promise<void>(resolve => { release = resolve; }));
    client.start(); await tick(); socket.emit(VISITOR_LIVE_CHANNEL, event()); scope.current = false;
    release(); await tick(); socket.emit(VISITOR_LIVE_CHANNEL, event('b'.repeat(64))); await tick(30000);
    assert.equal(count(), 1);
  });
  await test('logout/unmount removes listeners, connection and timers', async ({ client, socket, count }) => {
    client.start(); await tick(); client.stop();
    assert.equal(socket.listeners.size, 0); assert.equal(socket.connected, false); assert.equal(socket.disconnects, 1);
    await tick(60000); assert.equal(count(), 1);
  });
  await test('hidden/offline defers work and focus/online recovery refetches', async ({ client, scope, count }) => {
    scope.active = false; client.start(); await tick(30000); assert.equal(count(), 0);
    scope.active = true; client.recover(); await tick(); assert.equal(count(), 1);
  });
  await test('events during refetch queue one follow-up snapshot', async ({ client, socket, operation, count }) => {
    let release = () => {};
    operation(() => new Promise<void>(resolve => { release = resolve; }));
    client.start(); await tick(); socket.emit(VISITOR_LIVE_CHANNEL, event()); socket.emit(VISITOR_LIVE_CHANNEL, event('b'.repeat(64)));
    operation(() => Promise.resolve()); release(); await tick(); await tick(); assert.equal(count(), 2);
  });
  await test('failed API refetch is recoverable without changing socket identity', async ({ client, operation, count, states }) => {
    operation(() => Promise.reject(new Error('mock outage'))); client.start(); await tick(); assert.equal(states.at(-1), 'recovering');
    operation(() => Promise.resolve()); client.recover(); await tick(); assert.equal(count(), 2);
  });
  console.log(`${passed} visitor live client tests passed`);
}
void run().catch(error => { console.error(error); process.exitCode = 1; });
