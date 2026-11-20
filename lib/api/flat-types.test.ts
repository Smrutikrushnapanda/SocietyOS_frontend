/**
 * SocietyOS Flat Type dropdown regression tests (Phase 13 — flat unit edit UX)
 *
 * The Register New Unit Flat and Edit Flat Unit modals present flat type as a
 * dropdown driven by the society's configured Flat Types ("Flat Type
 * Configuration") merged with any types already used by existing flats, with
 * the current selection always included. The built-in standard range
 * (1 RK … 6 BHK + special units) is available only when explicitly requested.
 */

import assert from 'node:assert';
import {
  STANDARD_FLAT_TYPES,
  flatTypeOptions,
} from './flat-types';

let passed = 0;
const tests: { name: string; fn: () => void }[] = [];

function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test('standard range covers 1 RK through 6 BHK plus special units', () => {
  assert.ok(STANDARD_FLAT_TYPES.includes('1 RK'));
  assert.ok(STANDARD_FLAT_TYPES.includes('1 BHK'));
  assert.ok(STANDARD_FLAT_TYPES.includes('6 BHK'));
  assert.ok(STANDARD_FLAT_TYPES.includes('Studio'));
  assert.ok(STANDARD_FLAT_TYPES.includes('Duplex'));
  assert.ok(STANDARD_FLAT_TYPES.includes('Penthouse'));
  assert.ok(STANDARD_FLAT_TYPES.includes('Villa'));
});

test('flatTypeOptions lists the standard range first, in order', () => {
  const options = flatTypeOptions();
  assert.deepStrictEqual(options.slice(0, 7), [
    '1 RK',
    '1 BHK',
    '2 BHK',
    '3 BHK',
    '4 BHK',
    '5 BHK',
    '6 BHK',
  ]);
});

test('custom configured/existing types are merged (deduplicated)', () => {
  const options = flatTypeOptions({
    custom: ['2 BHK Compact', '3 BHK', '3.5 BHK Sky Suite', '2 BHK Compact'],
  });
  assert.ok(options.includes('2 BHK Compact'));
  assert.ok(options.includes('3.5 BHK Sky Suite'));
  // Dedupe
  assert.strictEqual(
    options.filter((o) => o === '2 BHK Compact').length,
    1,
  );
});

test('the selected value is always present even if non-standard', () => {
  const options = flatTypeOptions({ selected: 'Custom Loft 420' });
  assert.ok(options.includes('Custom Loft 420'));
});

test('the selected value is not duplicated when already in the list', () => {
  const options = flatTypeOptions({ selected: '3 BHK' });
  assert.strictEqual(options.filter((o) => o === '3 BHK').length, 1);
});

test('case-insensitive deduplication across merge sources', () => {
  const options = flatTypeOptions({
    custom: ['3 bhk', 'studio'],
    selected: 'STUDIO',
  });
  assert.strictEqual(options.filter((o) => o.toLowerCase() === '3 bhk').length, 1);
  assert.strictEqual(options.filter((o) => o.toLowerCase() === 'studio').length, 1);
});

test('empty / whitespace-only values are ignored', () => {
  const options = flatTypeOptions({
    selected: '',
    custom: ['', '   ', '3 BHK'],
  });
  assert.ok(!options.includes(''));
  assert.ok(!options.includes('   '));
});

test('includeStandard:false drops the built-in range and keeps only configured types', () => {
  const options = flatTypeOptions({
    includeStandard: false,
    custom: ['2 BHK Compact', '3 BHK Standard'],
    selected: 'Legacy Type',
  });
  assert.deepStrictEqual(options, ['2 BHK Compact', '3 BHK Standard', 'Legacy Type']);
  assert.ok(!options.includes('1 RK'));
  assert.ok(!options.includes('6 BHK'));
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
console.log(`\nFlat types: ${passed}/${tests.length} passed`);