import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axios, { AxiosError } from 'axios';
import apiClient from '../api/client';
import { registerPushToken, revokePushTokenForSession } from '../api/notifications.api';
import { createPushTokenLifecycle, parsePushCache, pushTokenLifecycle, type PushBinding, type PushSession } from './push-token-lifecycle';
import { logoutCurrentSession } from '../auth/logout-session';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

const first: PushSession = { userId: 'first-user', organizationId: 'first-organization', accessToken: 'mock-access' };
const second: PushSession = { userId: 'second-user', organizationId: 'first-organization', accessToken: 'mock-other-access' };
type Cache = ReturnType<Parameters<typeof createPushTokenLifecycle>[0]['read']>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}
function fixture() {
  let cache: Cache = { binding: null, pending: [], resetRequired: false };
  const calls: string[] = [];
  const revoked: PushBinding[] = [];
  let registrations = 0;
  const ports: Parameters<typeof createPushTokenLifecycle>[0] = {
    read: () => structuredClone(cache),
    write: (next) => { cache = structuredClone(next); },
    lock: (work) => work(),
    acquire: () => { calls.push('acquire'); return Promise.resolve('mock-subscription'); },
    remove: () => { calls.push('remove'); return Promise.resolve(); },
    register: (token, previous) => { calls.push(previous ? 'refresh' : 'register'); return Promise.resolve({ id: `record-${++registrations}` }); },
    revoke: (binding) => { calls.push('revoke'); revoked.push(binding); return Promise.resolve(); },
  };
  return { ports, calls, revoked, state: () => cache, lifecycle: createPushTokenLifecycle(ports) };
}

test('push token lifecycle', async (suite) => {
  await suite.test('unauthenticated registration never acquires a browser token or calls backend', async () => {
    const f = fixture();
    assert.equal((await f.lifecycle.register(null, () => true)).status, 'no_auth');
    assert.deepEqual(f.calls, []);
  });
  await suite.test('duplicate concurrent registration shares one acquisition and API request', async () => {
    const f = fixture();
    const [a, b] = await Promise.all([f.lifecycle.register(first, () => true), f.lifecycle.register(first, () => true)]);
    assert.equal(a.status, 'registered');
    assert.deepEqual(a, b);
    assert.deepEqual(f.calls, ['acquire', 'register']);
    assert.deepEqual(f.state().binding, { userId: first.userId, organizationId: first.organizationId, tokenId: 'record-1' });
    assert.ok(!JSON.stringify(f.state()).includes('mock-subscription'));
  });
  await suite.test('legacy unscoped ID is retained until authorized revocation is confirmed', async () => {
    const f = fixture();
    const legacy = parsePushCache('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    f.ports.write(legacy);
    f.ports.revoke = () => Promise.reject(new Error('ownership unconfirmed'));
    assert.equal((await f.lifecycle.cleanup(first)).confirmed, false);
    assert.equal(f.state().pending[0].tokenId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    assert.equal(f.state().resetRequired, false);
    assert.equal(parsePushCache('malformed').pending[0].tokenId, 'unknown');
  });
  await suite.test('subsequent acquisition refreshes only the previous browser binding', async () => {
    const f = fixture();
    await f.lifecycle.register(first, () => true);
    await f.lifecycle.register(first, () => true);
    assert.deepEqual(f.calls, ['acquire', 'register', 'acquire', 'refresh']);
  });
  await suite.test('logout revokes current binding, deletes SDK subscription and is idempotent', async () => {
    const f = fixture();
    await f.lifecycle.register(first, () => true);
    assert.deepEqual(await f.lifecycle.cleanup(first), { confirmed: true, browserReset: true });
    assert.deepEqual(f.calls, ['acquire', 'register', 'revoke', 'remove']);
    assert.equal(f.state().binding, null);
    assert.deepEqual(f.state().pending, []);
    const count = f.calls.length;
    assert.equal((await f.lifecycle.cleanup(first)).confirmed, true);
    assert.equal(f.calls.length, count);
  });
  await suite.test('failed server cleanup is unconfirmed and retains metadata even when SDK reset succeeds', async () => {
    const f = fixture();
    await f.lifecycle.register(first, () => true);
    f.ports.revoke = () => Promise.reject(new Error('offline'));
    assert.deepEqual(await f.lifecycle.cleanup(first), { confirmed: false, browserReset: true });
    assert.equal(f.state().pending.length, 1);
    assert.equal(f.state().binding, null);
  });
  await suite.test('failed browser reset blocks registration for next account', async () => {
    const f = fixture();
    await f.lifecycle.register(first, () => true);
    f.ports.remove = () => Promise.reject(new Error('reset failed'));
    assert.equal((await f.lifecycle.cleanup(first)).confirmed, false);
    const before = f.calls.length;
    assert.equal((await f.lifecycle.register(second, () => true)).status, 'error');
    assert.equal(f.calls.length, before);
    assert.equal(f.state().resetRequired, true);
  });
  await suite.test('direct account switch resets old subscription before new acquisition and never claims old owner', async () => {
    const f = fixture();
    await f.lifecycle.register(first, () => true);
    await f.lifecycle.register(second, () => true);
    assert.deepEqual(f.calls, ['acquire', 'register', 'remove', 'acquire', 'register']);
    assert.equal(f.state().binding?.userId, second.userId);
    assert.equal(f.state().pending[0].userId, first.userId);
    assert.equal(f.revoked.length, 0);
  });
  await suite.test('organization switch also resets old browser subscription', async () => {
    const f = fixture();
    await f.lifecycle.register(first, () => true);
    await f.lifecycle.register({ ...first, organizationId: 'second-organization' }, () => true);
    assert.equal(f.calls.filter((call) => call === 'remove').length, 1);
    assert.equal(f.state().binding?.organizationId, 'second-organization');
  });
  await suite.test('late old-session cleanup cannot delete new account browser binding', async () => {
    const f = fixture();
    await f.lifecycle.register(second, () => true);
    const before = f.calls.length;
    assert.equal((await f.lifecycle.cleanup(first)).confirmed, true);
    assert.equal(f.calls.length, before);
    assert.equal(f.state().binding?.userId, second.userId);
  });
  await suite.test('sign-out during token acquisition prevents registration and resets acquired subscription', async () => {
    const f = fixture();
    const acquired = deferred<string>();
    const started = deferred<void>();
    f.ports.acquire = () => { started.resolve(); return acquired.promise; };
    const registration = f.lifecycle.register(first, () => true);
    await started.promise;
    const cleanup = f.lifecycle.cleanup(first);
    acquired.resolve('mock-subscription');
    assert.equal((await registration).status, 'no_auth');
    assert.equal((await cleanup).confirmed, true);
    assert.ok(!f.calls.includes('register'));
    assert.ok(f.calls.includes('remove'));
  });
  await suite.test('late backend response after logout is tracked and revoked rather than restoring registration', async () => {
    const f = fixture();
    const response = deferred<{ id: string }>();
    const started = deferred<void>();
    f.ports.register = () => { started.resolve(); return response.promise; };
    const registration = f.lifecycle.register(first, () => true);
    await started.promise;
    const cleanup = f.lifecycle.cleanup(first);
    response.resolve({ id: 'late-record' });
    assert.equal((await registration).status, 'no_auth');
    await cleanup;
    assert.equal(f.revoked[0].tokenId, 'late-record');
    assert.equal(f.state().binding, null);
  });
  await suite.test('storage/locking failures return errors rather than unhandled rejection or registration success', async () => {
    const f = fixture();
    f.ports.lock = () => Promise.reject(new Error('unavailable'));
    assert.equal((await f.lifecycle.register(first, () => true)).status, 'error');
    assert.equal((await f.lifecycle.cleanup(first)).confirmed, true);
    f.ports.read = () => { throw new Error('storage failed'); };
    assert.equal((await f.lifecycle.cleanup(first)).confirmed, false);
    assert.deepEqual(f.calls, []);
  });
  await suite.test('all manual logout handlers delegate to shared tested cleanup utility', () => {
    for (const file of ['components/modals/ProfileSettingsModal.tsx', 'components/admin/AdminTopBar.tsx', 'components/guard/GuardHeader.tsx', 'hooks/useAuthFlow.ts']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      assert.match(source, /await logoutCurrentSession\(\)/);
      assert.doesNotMatch(source, /await apiLogout\(/);
    }
    const expiry = readFileSync(resolve(process.cwd(), 'lib/api/client.ts'), 'utf8');
    assert.match(expiry, /await pushTokenLifecycle.cleanup\(pushSession\(state\)\)/);
    const auth = readFileSync(resolve(process.cwd(), 'store/useAuthStore.ts'), 'utf8');
    assert.match(auth, /pushTokenLifecycle.cleanup\(before\)/);
  });
  await suite.test('shared logout clears auth after cleanup and preserves truthful failure feedback', async (context) => {
    const events: string[] = [];
    context.mock.method(pushTokenLifecycle, 'cleanup', () => { events.push('cleanup'); return Promise.resolve({ confirmed: false, browserReset: false }); });
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = (config) => {
      assert.equal(config.url, '/auth/logout');
      events.push('backend-logout');
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    };
    useAuthStore.getState().setAuth({ accessToken: first.accessToken, refreshToken: 'mock-refresh', backendUser: { id: first.userId, mobileNumber: '' }, organizationId: first.organizationId, roles: ['RESIDENT'], permissions: [] });
    try {
      assert.equal(await logoutCurrentSession(), false);
      assert.deepEqual(events, ['cleanup', 'backend-logout']);
      assert.equal(useAuthStore.getState().isAuthenticated, false);
      assert.match(useToastStore.getState().message ?? '', /cleanup not confirmed/);
    } finally { apiClient.defaults.adapter = originalAdapter; useToastStore.getState().hideToast(); }
  });
  await suite.test('old logout completion cannot clear a newly authenticated account', async (context) => {
    const cleanup = deferred<{ confirmed: boolean; browserReset: boolean }>();
    context.mock.method(pushTokenLifecycle, 'cleanup', () => cleanup.promise);
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = (config) => Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    const login = (session: PushSession) => useAuthStore.getState().setAuth({ accessToken: session.accessToken, refreshToken: session.userId + '-refresh', backendUser: { id: session.userId, mobileNumber: '' }, organizationId: session.organizationId, roles: ['RESIDENT'], permissions: [] });
    login(first);
    const pending = logoutCurrentSession();
    login(second);
    cleanup.resolve({ confirmed: true, browserReset: true });
    try {
      assert.equal(await pending, false);
      assert.equal(useAuthStore.getState().backendUser?.id, second.userId);
      assert.equal(useAuthStore.getState().isAuthenticated, true);
    } finally { apiClient.defaults.adapter = originalAdapter; useAuthStore.setState({ logoutInProgress: false }); useAuthStore.getState().clearAuth(); }
  });
  await suite.test('direct auth clear/account replacement uses departing session cleanup', async (context) => {
    const departing: PushSession[] = [];
    context.mock.method(pushTokenLifecycle, 'cleanup', (session: PushSession | null) => { if (session) departing.push(session); return Promise.resolve({ confirmed: true, browserReset: true }); });
    const login = (session: PushSession) => useAuthStore.getState().setAuth({ accessToken: session.accessToken, refreshToken: 'mock-refresh', backendUser: { id: session.userId, mobileNumber: '' }, organizationId: session.organizationId, roles: ['RESIDENT'], permissions: [] });
    login(first);
    login(second);
    assert.equal(departing[0].userId, first.userId);
    useAuthStore.getState().logout();
    assert.equal(departing[1].userId, second.userId);
  });
  await suite.test('registration cannot cross account context before request dispatch', async () => {
    const originalAdapter = apiClient.defaults.adapter;
    let calls = 0;
    apiClient.defaults.adapter = (config) => { ++calls; return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config }); };
    useAuthStore.getState().setAuth({ accessToken: second.accessToken, refreshToken: 'second-refresh', backendUser: { id: second.userId, mobileNumber: '' }, organizationId: second.organizationId, roles: ['RESIDENT'], permissions: [] });
    try {
      await assert.rejects(registerPushToken({ token: 'mock-subscription', platform: 'WEB' }, new AbortController().signal, first));
      assert.equal(calls, 0);
      assert.equal(useAuthStore.getState().backendUser?.id, second.userId);
    } finally { apiClient.defaults.adapter = originalAdapter; useAuthStore.getState().clearAuth(); }
  });
  await suite.test('old registration 401 cannot refresh or sign out a replacement account', async () => {
    const originalAdapter = apiClient.defaults.adapter;
    const started = deferred<void>();
    let fail!: () => void;
    apiClient.defaults.adapter = (config) => new Promise((resolve, reject) => {
      fail = () => reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }));
      started.resolve();
    });
    const login = (session: PushSession) => useAuthStore.getState().setAuth({ accessToken: session.accessToken, refreshToken: session.userId + '-refresh', backendUser: { id: session.userId, mobileNumber: '' }, organizationId: session.organizationId, roles: ['RESIDENT'], permissions: [] });
    login(first);
    const request = registerPushToken({ token: 'mock-subscription', platform: 'WEB' }, new AbortController().signal, first);
    await started.promise;
    login(second);
    fail();
    try {
      await assert.rejects(request);
      assert.equal(useAuthStore.getState().backendUser?.id, second.userId);
      assert.equal(useAuthStore.getState().isAuthenticated, true);
    } finally { apiClient.defaults.adapter = originalAdapter; useAuthStore.getState().clearAuth(); }
  });
  await suite.test('captured-session revocation never refreshes or clears another current account', async () => {
    const adapter = axios.defaults.adapter;
    const calls: string[] = [];
    axios.defaults.adapter = (config) => {
      calls.push(config.url ?? '');
      assert.equal(config.headers.get('Authorization'), `Bearer ${first.accessToken}`);
      assert.equal(config.headers.get('X-Organization-Id'), first.organizationId);
      return Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }));
    };
    const identity = useAuthStore.getState().backendUser?.id;
    try {
      await assert.rejects(revokePushTokenForSession('record-id', first));
      assert.equal(calls.length, 1);
      assert.equal(useAuthStore.getState().backendUser?.id, identity);
    } finally { axios.defaults.adapter = adapter; }
  });
});
