import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Visitor } from '../../types/visitor';
import { isCurrentGateApproval, localDateValue, localDayWindow } from './visit-window';

const now = new Date('2026-11-13T11:30:00+05:30');
const visitor = (overrides: Partial<Visitor> = {}): Visitor => ({
  id: 'visit', name: 'Visitor', phone: '9000000000', purpose: 'Guest', flat: 'A-101',
  status: 'requested', visitDate: '2026-11-13T10:00:00+05:30', ...overrides,
});

test('today includes pending and approved requests, including later today', () => {
  assert.equal(isCurrentGateApproval(visitor(), now), true);
  assert.equal(isCurrentGateApproval(visitor({ status: 'approved' }), now), true);
  assert.equal(isCurrentGateApproval(visitor({ visitDate: '2026-11-13T23:30:00+05:30' }), now), true);
});

test('past days, future days and missing dates never enter the preview', () => {
  for (const visitDate of ['2026-11-12T23:59:00+05:30', '2026-11-14T00:00:00+05:30', '', 'invalid', undefined]) {
    assert.equal(isCurrentGateApproval(visitor({ visitDate }), now), false, visitDate);
  }
});

test('denied, checked-in and completed visits never look approved', () => {
  for (const status of ['denied', 'checked-in', 'checked-out'] as const) assert.equal(isCurrentGateApproval(visitor({ status }), now), false);
});

test('an active multiday pass stays visible until its exact expiry', () => {
  const pass = visitor({ status: 'approved', passStatus: 'ACTIVE', validityStart: '2026-11-12T10:00:00+05:30', validityEnd: '2026-11-14T00:00:00+05:30' });
  assert.equal(isCurrentGateApproval(pass, now), true);
  assert.equal(isCurrentGateApproval(pass, new Date('2026-11-13T23:59:59+05:30')), true);
  assert.equal(isCurrentGateApproval(pass, new Date(pass.validityEnd!)), false);
});

test('expired and revoked passes stay hidden even when the visit remains confirmed', () => {
  for (const passStatus of ['EXPIRED', 'REVOKED'] as const) assert.equal(isCurrentGateApproval(visitor({ passStatus }), now), false);
  assert.equal(isCurrentGateApproval(visitor({ validityStart: '2026-11-13T09:00:00+05:30', validityEnd: now.toISOString(), passStatus: 'ACTIVE' }), now), false);
});

test('invalid windows and tomorrow passes stay hidden', () => {
  for (const [validityStart, validityEnd] of [
    ['2026-11-14T00:00:00+05:30', '2026-11-15T00:00:00+05:30'],
    ['2026-11-13T13:00:00+05:30', '2026-11-13T12:00:00+05:30'],
    ['invalid', '2026-11-14T00:00:00+05:30'],
    ['2026-11-13T10:00:00+05:30', ''],
  ]) assert.equal(isCurrentGateApproval(visitor({ validityStart, validityEnd }), now), false);
});

test('local day and date input values do not move to yesterday at Indian midnight', () => {
  const midnight = new Date('2026-11-13T00:05:00+05:30');
  assert.equal(localDateValue(midnight), '2026-11-13');
  assert.deepEqual(localDayWindow(midnight), { dayStart: '2026-11-12T18:30:00.000Z', dayEnd: '2026-11-13T18:30:00.000Z' });
  const before = visitor({ visitDate: '2026-11-13T23:59:59+05:30' });
  assert.equal(isCurrentGateApproval(before, new Date('2026-11-13T23:59:59+05:30')), true);
  assert.equal(isCurrentGateApproval(before, new Date('2026-11-14T00:00:00+05:30')), false);
});
