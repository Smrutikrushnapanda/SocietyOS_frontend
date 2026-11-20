/**
 * SocietyOS Floor Reconciliation Regression Tests (Phase 13 — tower floors)
 *
 * A building declares totalFloors (e.g. Tower A = 5) but must own one `floors`
 * record per floor; the Add Flat floor dropdown, floor plates, and 3D tower all
 * render from those records. Regression: a building edited to 5 floors with
 * only floor 1 recorded must yield missing = [2,3,4,5] so the UI can create
 * them and the dropdown shows all 5 floors.
 */

import assert from 'node:assert';
import {
  missingFloorNumbers,
  MAX_AUTO_CREATED_FLOORS,
} from './floors.reconcile';

let passed = 0;
const tests: { name: string; fn: () => void }[] = [];

function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

// --- The reported case: Tower A totalFloors 5, only floor 1 recorded ---
test('building with totalFloors=5 and only floor 1 → missing [2,3,4,5]', () => {
  assert.deepStrictEqual(missingFloorNumbers(5, [1]), [2, 3, 4, 5]);
});

test('totalFloors=5 with zero floor records → missing [1,2,3,4,5]', () => {
  assert.deepStrictEqual(missingFloorNumbers(5, []), [1, 2, 3, 4, 5]);
});

test('fully provisioned building → no missing floors', () => {
  assert.deepStrictEqual(missingFloorNumbers(5, [1, 2, 3, 4, 5]), []);
});

// --- Reconcile is additive: never duplicates, never shrinks ---
test('editing to MORE floors only adds the new ones', () => {
  assert.deepStrictEqual(missingFloorNumbers(8, [1, 2, 3, 4, 5]), [6, 7, 8]);
});

test('editing to FEWER floors needs no creation (existing beyond count ignored)', () => {
  assert.deepStrictEqual(missingFloorNumbers(3, [1, 2, 3, 4, 5]), []);
});

test('out-of-order existing floors handled correctly', () => {
  assert.deepStrictEqual(missingFloorNumbers(5, [3, 1]), [2, 4, 5]);
});

// --- Edge cases ---
test('falsy totalFloors is treated as 1', () => {
  assert.deepStrictEqual(missingFloorNumbers(0, []), [1]);
  assert.deepStrictEqual(missingFloorNumbers(NaN, []), [1]);
});

test('garbage / negative existing floor numbers are ignored', () => {
  assert.deepStrictEqual(missingFloorNumbers(4, [-1, 0, NaN, 1]), [2, 3, 4]);
});

test(`auto-creation is capped at ${MAX_AUTO_CREATED_FLOORS} floors`, () => {
  assert.strictEqual(
    missingFloorNumbers(25, []).length,
    MAX_AUTO_CREATED_FLOORS,
  );
  assert.deepStrictEqual(
    missingFloorNumbers(25, []),
    Array.from({ length: 10 }, (_, i) => i + 1),
  );
});

// --- Runner ---
for (const t of tests) {
  try {
    t.fn();
    passed += 1;
    console.log('  ✓', t.name);
  } catch (err) {
    console.error('  ✗', t.name, '\n   ', (err as Error).message);
    process.exitCode = 1;
  }
}
console.log(`\nFloor reconcile: ${passed}/${tests.length} passed`);