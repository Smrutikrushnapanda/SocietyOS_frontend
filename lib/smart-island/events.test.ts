import assert from 'node:assert/strict';
import { buildIslandEvents, eligibleEvents, IslandEvent, nextEventId, reconcileEventId } from './events';
import type { BackendComplaint } from '../../types/complaint';
import type { NotificationItem } from '../api/notifications.api';
import type { BackendVisitorVisit } from '../api/visitors.api';
const event = (id: string, priority = 3): IslandEvent => ({ id, priority, title: id, body: '', date: '2026-01-01', unread: true, category: 'GENERAL', icon: '', target: 'notifications' });
let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`); };
test('zero and one events remain stable', () => { assert.equal(nextEventId([], null), null); assert.equal(nextEventId([event('a')], 'a'), 'a'); });
for (const count of [3, 5, 8]) test(`${count} events cycle without consecutive repeats`, () => {
  const events = Array.from({ length: count }, (_, i) => event(String(i)));
  let current: string | null = events[0].id;
  for (let i = 0; i < count * 3; i++) { const next = nextEventId(events, current); assert.notEqual(next, current); current = next; }
  assert.equal(current, events[0].id);
});
test('arrival does not reset current selection', () => { assert.equal(reconcileEventId([event('new', 0), event('a'), event('b')], 'b'), 'b'); });
test('removal advances to surviving neighbour', () => { assert.equal(reconcileEventId([event('a'), event('c')], 'b', [event('a'), event('b'), event('c')]), 'c'); });
test('emergency and visitor priority, recency, dedupe and expiry', () => {
  const expired = { ...event('expired'), expiresAt: 5 };
  assert.deepEqual(eligibleEvents([event('routine'), event('urgent', 0), event('visitor', 1), event('routine'), expired], 10).map(e => e.id), ['urgent', 'visitor', 'routine']);
});
test('read and resolved maintenance notifications leave rotation', () => {
  const notification = { organization_id: 'org', recipient_user_id: 'user', read_at: null, updated_at: '2026-01-01', id: 'n', title: 'Status', body: 'Done', type: 'MAINTENANCE', is_read: false, created_at: '2026-01-01', data: { complaintId: 'r' } } as NotificationItem;
  const request = { id: 'r', status: 'RESOLVED', subject: 'Tap', updated_at: '2026-01-01' } as BackendComplaint;
  assert.deepEqual(buildIslandEvents([request], [notification], []), []);
  assert.deepEqual(buildIslandEvents([], [{ ...notification, data: null, is_read: true }], []), []);
});
test('expanded island can retain a notification after it is marked read', () => {
  const notification = { id: 'n', organization_id: 'org', recipient_user_id: 'user', title: 'Published notice', body: 'Water off at 3 PM', type: 'GENERAL', is_read: true, read_at: '2026-01-01', created_at: '2026-01-01', updated_at: '2026-01-01', data: null } as NotificationItem;
  const retained = buildIslandEvents([], [notification], [], true);
  assert.equal(retained.length, 1);
  assert.equal(retained[0].unread, false);
  assert.deepEqual(buildIslandEvents([], [notification], []), []);
});
test('active requests keep stable IDs across updates', () => {
  const request = { id: 'r', status: 'OPEN', subject: 'Tap', updated_at: '2026-01-01' } as BackendComplaint;
  assert.equal(buildIslandEvents([request], [], [])[0].id, buildIslandEvents([{ ...request, updated_at: '2026-01-02' }], [], [])[0].id);
});
test('routine security is not a critical alert; importance drives priority', () => {
  const notification = { id: 'n', organization_id: 'org', recipient_user_id: 'user', title: 'Security update', body: 'Info', type: 'SECURITY', is_read: false, read_at: null, created_at: '2026-01-01', updated_at: '2026-01-01', data: null } as NotificationItem;
  const routine = buildIslandEvents([], [notification], [])[0];
  assert.equal(routine.priority, 4); assert.equal(routine.critical, false);
  const critical = buildIslandEvents([], [{ ...notification, data: { priority: 'CRITICAL' } }], [])[0];
  assert.equal(critical.priority, 0); assert.equal(critical.critical, true);
});
test('old maintenance statuses do not rotate as current updates', () => {
  const request = { id: 'r', status: 'IN_PROGRESS', subject: 'Tap', priority: 'HIGH', updated_at: '2026-01-02' } as BackendComplaint;
  const notification = { id: 'n', organization_id: 'org', recipient_user_id: 'user', title: 'Old status', body: 'Open', type: 'MAINTENANCE', is_read: false, read_at: null, created_at: '2026-01-01', updated_at: '2026-01-01', data: { complaintId: 'r', status: 'OPEN' } } as NotificationItem;
  const result = buildIslandEvents([request], [notification], []);
  assert.equal(result.length, 1); assert.equal(result[0].id, 'request:r'); assert.equal(result[0].body, 'Work in progress');
});
test('notice notifications open the notice screen and retain the notice ID', () => {
  const notification = { id: 'n', organization_id: 'org', recipient_user_id: 'user', title: 'Water shutdown', body: 'Tuesday', type: 'GENERAL', is_read: false, read_at: null, created_at: '2026-01-01', updated_at: '2026-01-01', data: { noticeId: 'notice-one' } } as NotificationItem;
  const result = buildIslandEvents([], [notification], [])[0];
  assert.equal(result.target, 'notices'); assert.equal(result.noticeId, 'notice-one');
});
test('maintenance and visitor events expose safe workflow references', () => {
  const request = { id: 'request-one', status: 'IN_PROGRESS', subject: 'Tap', assigned_to: 'staff-id', priority: 'MEDIUM', updated_at: '2026-01-01' } as BackendComplaint;
  const visit = { id: 'visit-one', organization_id: 'org', visitor_id: 'visitor', visit_status: 'PENDING', visit_purpose: 'Delivery', visitor: { id: 'visitor', organization_id: 'org', name: 'Ravi', mobile: '', active: true } } as BackendVisitorVisit;
  const result = buildIslandEvents([request], [], [visit]);
  assert.equal(result[0].visitId, 'visit-one'); assert.match(result[0].title, /Ravi/);
  assert.equal(result[1].reference, 'request-one'); assert.match(result[1].body, /Technician assigned/);
});
console.log(`${passed} Smart Island event tests passed.`);
