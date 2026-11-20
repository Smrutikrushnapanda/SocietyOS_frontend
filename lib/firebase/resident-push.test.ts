import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizedPushDestination, handleResidentForegroundPush } from './resident-push';
import { parsePush, pushPath } from '../../public/societyos-push';

const data = { deliveryId: '11111111-1111-4111-8111-111111111111', referenceId: '22222222-2222-4222-8222-222222222222', category: 'NOTICE' };

test('resident push navigation', async (suite) => {
  await suite.test('ignores arbitrary URLs and private display text', () => {
    const parsed = parsePush({ ...data, url: 'https://invalid.example', title: 'private', body: 'private' });
    assert.deepEqual(parsed, data);
    assert.ok(pushPath(parsed)?.startsWith('/resident?'));
    assert.ok(!pushPath(parsed)?.includes('invalid.example'));
  });
  await suite.test('rejects malformed and unsupported destinations', () => {
    for (const value of [null, {}, { ...data, referenceId: '../admin' }, { ...data, category: 'DOCUMENT' }, { ...data, deliveryId: 'arbitrary' }]) {
      assert.equal(parsePush(value), null);
      assert.equal(pushPath(value), null);
    }
  });
  await suite.test('maps supported categories only after authorized resource lookup', async () => {
    const screens = { NOTICE: 'notices', EMERGENCY: 'notices', POLL: 'polls', COMPLAINT: 'complaints', AMENITY: 'amenities', VISITOR_ARRIVAL: 'visitors', VISITOR_APPROVAL: 'visitors' };
    for (const [category, screen] of Object.entries(screens)) {
      let requested = '';
      const destination = await authorizedPushDestination({ ...data, category }, 'user:organization', () => 'user:organization', async (input) => { requested = input.referenceId; return true; });
      assert.deepEqual(destination, { screen, referenceId: data.referenceId });
      assert.equal(requested, data.referenceId);
    }
  });
  await suite.test('expired sessions do not load a destination', async () => {
    let called = false;
    assert.equal(await authorizedPushDestination(data, '', () => '', async () => { called = true; return true; }), null);
    assert.equal(called, false);
  });
  await suite.test('account or organization switch rejects stale lookup completion', async () => {
    let scope = 'first:organization';
    assert.equal(await authorizedPushDestination(data, scope, () => scope, async () => { scope = 'second:organization'; return true; }), null);
  });
  await suite.test('deleted or inaccessible record produces no navigation', async () => {
    assert.equal(await authorizedPushDestination(data, 'scope', () => 'scope', async () => false), null);
    assert.equal(await authorizedPushDestination(data, 'scope', () => 'scope', async () => { throw new Error('403'); }), null);
  });
  await suite.test('foreground refresh and toast happen once, without payload display text', async () => {
    const seen = new Set<string>();
    let refreshed = 0;
    let notified = 0;
    const ports = {
      scope: () => 'scope', claim: async (id: string) => { if (seen.has(id)) return false; seen.add(id); return true; },
      refresh: () => { ++refreshed; }, notify: () => { ++notified; },
    };
    await handleResidentForegroundPush({ ...data, title: 'private' }, 'scope', ports);
    await handleResidentForegroundPush(data, 'scope', ports);
    assert.equal(refreshed, 1);
    assert.equal(notified, 1);
  });
  await suite.test('foreground callback rejects logout during async display claim', async () => {
    let scope = 'scope';
    await handleResidentForegroundPush(data, scope, {
      scope: () => scope, claim: async () => { scope = ''; return true; },
      refresh: () => assert.fail('stale refresh'), notify: () => assert.fail('stale toast'),
    });
  });
});
