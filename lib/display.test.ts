/**
 * Resident greeting helper tests.
 *
 * The resident portal must greet by first name only: "Namaste, Arun".
 */

import assert from 'node:assert';
import { firstName, greetingFor } from './display';

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('--- Running resident greeting tests ---');

test('firstName returns the first token only', () => {
  assert.strictEqual(firstName('Arun Kumar Panda'), 'Arun');
  assert.strictEqual(firstName('  Riya   Patel '), 'Riya');
  assert.strictEqual(firstName('Madonna'), 'Madonna');
});

test('firstName handles blank / null input safely', () => {
  assert.strictEqual(firstName(''), '');
  assert.strictEqual(firstName('   '), '');
  assert.strictEqual(firstName(null), '');
  assert.strictEqual(firstName(undefined), '');
});

test('greetingFor builds "Namaste, <first name>"', () => {
  assert.strictEqual(greetingFor('Arun Kumar Panda'), 'Namaste, Arun');
  assert.strictEqual(greetingFor(''), 'Namaste');
  assert.strictEqual(greetingFor(null), 'Namaste');
  assert.strictEqual(greetingFor('Arun', 'Hello'), 'Hello, Arun');
});

console.log(`\nALL ${passed} GREETING TESTS PASSED!\n`);
