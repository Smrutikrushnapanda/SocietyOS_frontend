import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createNotificationPreferencesStore } from '../../store/useNotificationPreferencesStore';
import { NotificationPreferenceForm } from '../../components/modals/NotificationPreferenceFields';
import apiClient from './client';
import { getNotificationPreferences, updateNotificationPreferences, NOTIFICATION_CATEGORIES, type NotificationPreference, type NotificationPreferenceUpdate } from './notification-preferences.api';

const mandatory = new Set(['SECURITY', 'EMERGENCY', 'VISITOR_ARRIVAL', 'VISITOR_APPROVAL']);
function defaults(): NotificationPreference[] {
  return NOTIFICATION_CATEGORIES.map((category) => ({ category, enabled: true, mandatory: mandatory.has(category) }));
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const notice = (preferences: NotificationPreference[] | null) => preferences?.find((item) => item.category === 'NOTICE')?.enabled;
const noOp = () => undefined;

test('resident preference contract', async (suite) => {
  await suite.test('loads saved values once, without a write or local defaults', async () => {
    const request = deferred<NotificationPreference[]>();
    let reads = 0;
    let writes = 0;
    const store = createNotificationPreferencesStore({ read: () => { ++reads; return request.promise; }, update: async () => { ++writes; return defaults(); } }, () => 'resident:organization');
    const pending = store.getState().load();
    void store.getState().load();
    assert.equal(store.getState().loading, true);
    assert.equal(store.getState().draft, null);
    const saved = defaults().map((item) => item.category === 'NOTICE' ? { ...item, enabled: false } : item);
    request.resolve(saved);
    await pending;
    assert.equal(store.getState().loading, false);
    assert.equal(notice(store.getState().draft), false);
    assert.equal(reads, 1);
    assert.equal(writes, 0);
  });

  await suite.test('mandatory controls render checked and disabled; optional controls remain interactive', () => {
    const html = renderToStaticMarkup(<NotificationPreferenceForm draft={defaults()} loading={false} saving={false} error={null} dirty={false}
      onToggle={noOp} onRetry={noOp} onSave={noOp} onCancel={noOp} />);
    for (const label of ['Security', 'Emergencies', 'Visitor arrivals', 'Visitor approvals']) {
      const control = html.match(new RegExp(`<input[^>]*aria-label="${label}"[^>]*>`))?.[0];
      assert.ok(control?.includes('disabled=""'));
      assert.ok(control?.includes('checked=""'));
    }
    assert.ok(!html.match(/<input[^>]*aria-label="Notice circulars"[^>]*>/)?.[0].includes('disabled'));
  });

  await suite.test('only explicit Save persists changed optional categories and awaits confirmation', async () => {
    const response = deferred<NotificationPreference[]>();
    const updates: NotificationPreferenceUpdate[][] = [];
    const store = createNotificationPreferencesStore({ read: async () => defaults(), update: (input) => { updates.push(input); return response.promise; } }, () => 'resident:organization');
    await store.getState().load();
    store.getState().toggle('SECURITY');
    assert.equal(store.getState().draft?.[0].enabled, true);
    store.getState().toggle('NOTICE');
    assert.equal(notice(store.getState().saved), true);
    assert.equal(updates.length, 0);
    const pending = store.getState().save();
    assert.equal(store.getState().saving, true);
    assert.equal(await store.getState().save(), false);
    assert.deepEqual(updates, [[{ category: 'NOTICE', enabled: false }]]);
    store.getState().toggle('COMPLAINT');
    assert.equal(store.getState().draft?.find((item) => item.category === 'COMPLAINT')?.enabled, true);
    response.resolve(defaults().map((item) => item.category === 'NOTICE' ? { ...item, enabled: false } : item));
    assert.equal(await pending, true);
    assert.equal(store.getState().saving, false);
    assert.equal(notice(store.getState().saved), false);
    assert.deepEqual(store.getState().draft, store.getState().saved);
  });

  await suite.test('save failure preserves unsaved draft, reports failure and permits retry', async () => {
    let fail = true;
    const store = createNotificationPreferencesStore({ read: async () => defaults(), update: async () => {
      if (fail) throw new Error('offline');
      return defaults().map((item) => item.category === 'NOTICE' ? { ...item, enabled: false } : item);
    } }, () => 'resident:organization');
    await store.getState().load();
    store.getState().toggle('NOTICE');
    assert.equal(await store.getState().save(), false);
    assert.equal(notice(store.getState().draft), false);
    assert.equal(notice(store.getState().saved), true);
    assert.equal(store.getState().saving, false);
    assert.ok(store.getState().error);
    fail = false;
    assert.equal(await store.getState().save(), true);
    assert.equal(store.getState().error, null);
  });

  await suite.test('close discards unsaved changes and reopening reloads server state', async () => {
    let reads = 0;
    let writes = 0;
    const store = createNotificationPreferencesStore({ read: async () => { ++reads; return defaults(); }, update: async () => { ++writes; return defaults(); } }, () => 'resident:organization');
    await store.getState().load();
    store.getState().toggle('NOTICE');
    store.getState().close();
    assert.equal(store.getState().draft, null);
    await store.getState().load();
    assert.equal(notice(store.getState().draft), true);
    assert.equal(reads, 2);
    assert.equal(writes, 0);
  });

  await suite.test('failed load shows error and retries without assuming enabled optional values', async () => {
    let fail = true;
    const store = createNotificationPreferencesStore({ read: async () => { if (fail) throw new Error('offline'); return defaults(); }, update: async () => defaults() }, () => 'resident:organization');
    await store.getState().load();
    assert.equal(store.getState().loading, false);
    assert.equal(store.getState().draft, null);
    assert.ok(store.getState().error);
    fail = false;
    await store.getState().load();
    assert.equal(store.getState().error, null);
    assert.equal(store.getState().draft?.length, 10);
  });

  await suite.test('scope changes and close abort requests and reject stale read/save results', async () => {
    let scope = 'first:organization';
    const read = deferred<NotificationPreference[]>();
    const save = deferred<NotificationPreference[]>();
    let signal: AbortSignal | undefined;
    const store = createNotificationPreferencesStore({ read: (input) => { signal = input; return read.promise; }, update: (updates, input) => { signal = input; return save.promise; } }, () => scope);
    const pendingRead = store.getState().load();
    scope = 'second:organization';
    store.getState().close();
    assert.equal(signal?.aborted, true);
    read.resolve(defaults());
    await pendingRead;
    assert.equal(store.getState().draft, null);
    await store.getState().load();
    store.getState().toggle('NOTICE');
    const pendingSave = store.getState().save();
    scope = 'second:other-organization';
    store.getState().close();
    assert.equal(signal?.aborted, true);
    save.resolve(defaults());
    assert.equal(await pendingSave, false);
    assert.equal(store.getState().draft, null);
  });

  await suite.test('Strict Mode detach/reattach shares one load; final unmount discards session', async () => {
    let reads = 0;
    const store = createNotificationPreferencesStore({ read: async () => { ++reads; return defaults(); }, update: async () => defaults() }, () => 'resident:organization');
    const first = store.getState().acquire();
    first();
    const second = store.getState().acquire();
    await Promise.resolve();
    assert.equal(reads, 1);
    assert.equal(store.getState().draft?.length, 10);
    second();
    await Promise.resolve();
    assert.equal(store.getState().draft, null);
  });

  await suite.test('loading, saving and error markup truthfully disable actions and offer retry', () => {
    const props = { onToggle: noOp, onRetry: noOp, onSave: noOp, onCancel: noOp };
    const loading = renderToStaticMarkup(<NotificationPreferenceForm {...props} draft={null} loading saving={false} error={null} dirty={false} />);
    assert.match(loading, /role="status" aria-label="Loading notification preferences" aria-busy="true"/);
    assert.doesNotMatch(loading, /Loading preferences…|type="checkbox"/);
    assert.match(loading, /<button[^>]*disabled=""[^>]*>Save<\/button>/);
    const saving = renderToStaticMarkup(<NotificationPreferenceForm {...props} draft={defaults()} loading={false} saving error={null} dirty />);
    assert.match(saving, /role="status">Saving preferences/);
    assert.match(saving, /<button[^>]*disabled=""[^>]*>Cancel<\/button>/);
    const failure = renderToStaticMarkup(<NotificationPreferenceForm {...props} draft={null} loading={false} saving={false} error="Load failed" dirty={false} />);
    assert.match(failure, /role="alert">Load failed Changes are not confirmed saved/);
    assert.match(failure, />Retry loading<\/button>/);
  });

  await suite.test('missing authentication makes no request', async () => {
    let calls = 0;
    const store = createNotificationPreferencesStore({ read: async () => { ++calls; return defaults(); }, update: async () => { ++calls; return defaults(); } }, () => null);
    await store.getState().load();
    assert.equal(await store.getState().save(), false);
    assert.equal(calls, 0);
    assert.ok(store.getState().error);
  });

  await suite.test('API uses only preference GET/PATCH endpoints, without provider sends', async () => {
    const previous = apiClient.defaults.adapter;
    const requests: { method?: string; url?: string; body: unknown }[] = [];
    apiClient.defaults.adapter = async (config) => {
      requests.push({ method: config.method, url: config.url, body: config.data ? JSON.parse(String(config.data)) : null });
      return { data: defaults(), status: 200, statusText: 'OK', headers: {}, config };
    };
    try {
      assert.equal((await getNotificationPreferences()).length, 10);
      await updateNotificationPreferences([{ category: 'NOTICE', enabled: false }]);
      assert.deepEqual(requests, [
        { method: 'get', url: '/notification-preferences', body: null },
        { method: 'patch', url: '/notification-preferences', body: { updates: [{ category: 'NOTICE', enabled: false }] } },
      ]);
    } finally { apiClient.defaults.adapter = previous; }
  });
});
