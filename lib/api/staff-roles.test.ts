/**
 * SocietyOS Staff Role dropdown regression tests.
 *
 * The Add/Edit Society Staff Member modal presents Role / Designation as a
 * dropdown driven by a curated standard set of designations merged with the
 * roles already in use on the roster, so designations stay consistent. A custom
 * role can still be entered via the "Other / Custom…" option.
 */

import assert from 'node:assert';
import {
  STANDARD_STAFF_ROLES,
  staffRoleOptions,
  isKnownStaffRole,
} from './staff-roles';

let passed = 0;
const tests: { name: string; fn: () => void }[] = [];

function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test('standard designations cover the common society roles', () => {
  assert.ok(STANDARD_STAFF_ROLES.includes('Security Guard'));
  assert.ok(STANDARD_STAFF_ROLES.includes('Head Security Officer'));
  assert.ok(STANDARD_STAFF_ROLES.includes('Housekeeping Staff'));
  assert.ok(STANDARD_STAFF_ROLES.includes('Electrician'));
  assert.ok(STANDARD_STAFF_ROLES.includes('Facility Manager'));
});

test('options list the standard designations first, in order', () => {
  const options = staffRoleOptions();
  assert.deepStrictEqual(options.slice(0, 3), [
    'Security Guard',
    'Head Security Officer',
    'Security Supervisor',
  ]);
});

test('in-use roles are merged (deduplicated)', () => {
  const options = staffRoleOptions({
    inUse: ['Plumbing AMC Specialist', 'Security Guard', 'Plumbing AMC Specialist'],
  });
  assert.ok(options.includes('Plumbing AMC Specialist'));
  assert.strictEqual(
    options.filter((o) => o === 'Plumbing AMC Specialist').length,
    1,
  );
  // Already in the standard list, so not duplicated.
  assert.strictEqual(options.filter((o) => o === 'Security Guard').length, 1);
});

test('case-insensitive dedupe across standard and in-use roles', () => {
  const options = staffRoleOptions({ inUse: ['security guard', 'ELECTRICIAN'] });
  assert.strictEqual(
    options.filter((o) => o.toLowerCase() === 'security guard').length,
    1,
  );
  assert.strictEqual(
    options.filter((o) => o.toLowerCase() === 'electrician').length,
    1,
  );
});

test('includeStandard:false keeps only the provided roles', () => {
  const options = staffRoleOptions({
    includeStandard: false,
    inUse: ['Plumbing AMC Specialist', 'Lift Operator'],
  });
  assert.deepStrictEqual(options, ['Plumbing AMC Specialist', 'Lift Operator']);
  assert.ok(!options.includes('Security Guard'));
});

test('empty / whitespace / null values are ignored', () => {
  const options = staffRoleOptions({ inUse: ['', '   ', null, undefined, 'Gardener'] });
  assert.ok(!options.includes(''));
  assert.ok(!options.includes('   '));
  assert.ok(options.includes('Gardener'));
});

test('isKnownStaffRole matches case-insensitively and rejects unknowns', () => {
  const options = staffRoleOptions();
  assert.strictEqual(isKnownStaffRole('Security Guard', options), true);
  assert.strictEqual(isKnownStaffRole('  security guard ', options), true);
  assert.strictEqual(isKnownStaffRole('Chief Snack Officer', options), false);
  assert.strictEqual(isKnownStaffRole('', options), false);
  assert.strictEqual(isKnownStaffRole(null, options), false);
});

// --- Runner ---
for (const t of tests) {
  try {
    t.fn();
    passed += 1;
    console.log('  \u2713', t.name);
  } catch (err) {
    console.error('  \u2717', t.name, '\n   ', (err as Error).message);
    process.exitCode = 1;
  }
}
console.log(`\nStaff roles: ${passed}/${tests.length} passed`);
