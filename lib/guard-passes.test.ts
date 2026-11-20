import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterValidGuestPasses, isGuardQueueVisitor } from './guard-passes';
import type { Visitor } from '../types/visitor';

const start = Date.parse('2026-11-20T10:00:00Z');
const end = start + 3600000;
const guest: Visitor = {
  id: 'visit', name: 'Guest', phone: '', purpose: 'Guest', flat: 'A-101', status: 'approved',
  isPreApproved: true, passStatus: 'ACTIVE', validityStart: new Date(start).toISOString(), validityEnd: new Date(end).toISOString(),
};

test('guest leaves queue at exact expiry even if visit remains confirmed', () => {
  assert.equal(isGuardQueueVisitor(guest, end - 1), true);
  assert.equal(isGuardQueueVisitor(guest, end), false);
  assert.equal(isGuardQueueVisitor(guest, end + 1), false);
  assert.equal(guest.status, 'approved');
});

test('future guest enters queue at validity start', () => {
  assert.equal(isGuardQueueVisitor(guest, start - 1), false);
  assert.equal(isGuardQueueVisitor(guest, start), true);
});

test('revoked, expired and invalid pass data never appear as ready for entry', () => {
  for (const patch of [{ passStatus: 'REVOKED' as const }, { passStatus: 'EXPIRED' as const }, { validityEnd: undefined }, { validityStart: 'invalid' }]) {
    assert.equal(isGuardQueueVisitor({ ...guest, ...patch }, start), false);
  }
});

test('ordinary walk-ins retain existing approval workflow', () => {
  const visitor: Visitor = { id: 'walk-in', name: 'Guest', phone: '', purpose: 'Visit', flat: 'A-101', status: 'requested' };
  assert.equal(isGuardQueueVisitor(visitor, end), true);
  assert.equal(isGuardQueueVisitor({ ...visitor, status: 'approved' }, end), true);
  for (const status of ['checked-in', 'checked-out', 'denied'] as const) assert.equal(isGuardQueueVisitor({ ...visitor, status }, end), false);
});

test('scanner list uses same exclusive expiry boundary', () => {
  const pass = {
    id: 'pass', visitId: guest.id, passCode: 'code', guestName: guest.name, phone: '', purpose: 'Guest', flat: 'A-101', resident: 'Host',
    startDate: guest.validityStart!, endDate: guest.validityEnd!, validityDisplay: '', gate: '', status: 'Active' as const,
  };
  assert.equal(filterValidGuestPasses([pass], new Date(end - 1)).length, 1);
  assert.equal(filterValidGuestPasses([pass], new Date(end)).length, 0);
});
