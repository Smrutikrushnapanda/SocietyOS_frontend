import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDate } from '@internationalized/date';
import { amenityAllowsCustomTime, amenityCustomSlot, amenityBookingDates, amenityBookingSlotOptions, amenityTimeSlots, availableAmenityRangeSlots } from './amenity';

test('monthly preset includes every date across a month boundary', () => {
  const start = parseDate('2026-11-13');
  const end = start.add({ months: 1 }).subtract({ days: 1 }).toString();
  const dates = amenityBookingDates(start.toString(), end);
  assert.equal(dates.length, 30);
  assert.equal(dates.at(-1), '2026-12-12');
});

test('one booked day blocks that slot across the selected range, while another slot stays available', () => {
  const dates = amenityBookingDates('2026-11-13', '2026-12-12');
  const availability = new Map([['2026-11-25', ['06:30 AM - 07:30 AM']]]);
  assert.deepEqual(availableAmenityRangeSlots(['06:00 - 07:00', '07:00 - 08:00', '08:00 - 09:00'], dates, availability), ['08:00 - 09:00']);
});

test('range endpoints are inclusive and adjacent bookings stay available', () => {
  const dates = amenityBookingDates('2026-12-31', '2027-01-02');
  assert.equal(dates.length, 3);
  assert.deepEqual(availableAmenityRangeSlots(['06:00 - 07:00'], dates, new Map([['2027-01-02', ['07:00 - 08:00']]])), ['06:00 - 07:00']);
  assert.deepEqual(availableAmenityRangeSlots(['06:00 - 07:00'], dates, new Map([['2027-01-02', ['06:00 - 07:00']]])), []);
});

test('invalid ranges never offer bookable slots', () => {
  for (const [from, to] of [['2026-02-30', '2026-03-01'], ['2026-12-01', '2026-11-01'], ['2026-01-01', '2026-03-31']]) {
    const dates = amenityBookingDates(from, to);
    assert.deepEqual(dates, []);
    assert.deepEqual(availableAmenityRangeSlots(['06:00 - 07:00'], dates, new Map()), []);
  }
});

test('leap days and the existing 62-day availability bound are respected', () => {
  assert.deepEqual(amenityBookingDates('2028-02-28', '2028-03-01'), ['2028-02-28', '2028-02-29', '2028-03-01']);
  assert.equal(amenityBookingDates('2026-12-01', '2027-01-31').length, 62);
  assert.equal(amenityBookingDates('2026-12-01', '2027-02-01').length, 0);
});

test('actual configured durations distinguish fixed slots from flexible gym and hall windows', () => {
  for (const slotDuration of ['Open Access', 'Full Day / Evening']) assert.equal(amenityAllowsCustomTime({ slotDuration }), true);
  for (const slotDuration of ['1 Hour', '2 Hours', '60 mins']) {
    assert.equal(amenityAllowsCustomTime({ slotDuration }), false);
    assert.ok(amenityTimeSlots({ openTime: '06:00', closeTime: '22:00', slotDuration }).length > 0);
  }
});

test('flexible windows require both times and stay within configured operating hours', () => {
  const gym = { openTime: '05:30', closeTime: '22:30' };
  assert.equal(amenityCustomSlot(gym, '06:00', '07:00'), '06:00 - 07:00');
  assert.equal(amenityCustomSlot(gym, '05:30', '22:30'), '05:30 - 22:30');
  for (const [start, end] of [['', '07:00'], ['06:00', ''], ['07:00', '06:00'], ['05:00', '07:00'], ['06:00', '23:00']]) {
    assert.equal(amenityCustomSlot(gym, start, end), null);
  }
  const hall = { openTime: '09:00', closeTime: '23:30' };
  assert.equal(amenityCustomSlot(hall, '18:00', '22:00'), '18:00 - 22:00');
});

test('gym and full-day hall configurations provide selectable pills without custom input', () => {
  const gym = amenityBookingSlotOptions({ openTime: '05:30', closeTime: '22:30', slotDuration: 'Open Access' });
  assert.ok(gym.includes('05:30 - 06:30'));
  assert.ok(gym.includes('21:30 - 22:30'));
  const hall = amenityBookingSlotOptions({ openTime: '09:00', closeTime: '23:30', slotDuration: 'Full Day / Evening' });
  assert.equal(hall[0], '09:00 - 23:30');
  assert.ok(hall.includes('18:00 - 19:00'));
  assert.ok(hall.includes('23:00 - 23:30'));
  assert.deepEqual(amenityBookingSlotOptions({ openTime: '06:00', closeTime: '09:00', slotDuration: '1 Hour' }), ['06:00 - 07:00', '07:00 - 08:00', '08:00 - 09:00']);
});
