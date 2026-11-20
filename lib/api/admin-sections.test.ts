/**
 * SocietyOS Admin section persistence regression tests (Phase 13 — reload UX)
 *
 * The /admin page is a single-URL SPA: the active section used to live only in
 * React state, so reloading always landed on the index (overview). The section
 * is now carried in the URL (?section=…) and restored on mount. These tests
 * pin the validation used when reading the value back from the URL.
 */

import assert from 'node:assert';
import {
  ALL_ADMIN_SECTIONS,
  adminSectionHref,
  isAdminSection,
  PLATFORM_SECTION,
} from './admin-sections';

let passed = 0;
const tests: { name: string; fn: () => void }[] = [];

function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test('registry covers every section the admin SPA renders', () => {
  assert.ok(ALL_ADMIN_SECTIONS.includes('overview'));
  assert.ok(ALL_ADMIN_SECTIONS.includes('buildings'));
  assert.ok(ALL_ADMIN_SECTIONS.includes('residents'));
  assert.strictEqual(isAdminSection('residents'), true, 'resident directory must survive refresh');
  assert.ok(ALL_ADMIN_SECTIONS.includes('visitors'));
  assert.ok(ALL_ADMIN_SECTIONS.includes('role_master'));
  assert.ok(ALL_ADMIN_SECTIONS.includes('organizations'));
  assert.strictEqual(
    ALL_ADMIN_SECTIONS.length,
    new Set(ALL_ADMIN_SECTIONS).size,
    'registry must not contain duplicates',
  );
});

test('valid section values are accepted', () => {
  for (const s of ALL_ADMIN_SECTIONS) {
    assert.strictEqual(isAdminSection(s), true, `${s} should be valid`);
  }
});

test('Residents opens its dedicated page and other sections keep their existing URLs', () => {
  assert.strictEqual(adminSectionHref('residents'), '/admin/residents');
  assert.strictEqual(adminSectionHref('buildings'), '/admin?section=buildings');
  assert.strictEqual(adminSectionHref('overview'), '/admin?section=overview');
});

test('garbage / empty / null / missing values are rejected', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.strictEqual(isAdminSection('' as any), false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.strictEqual(isAdminSection(null as any), false);
  assert.strictEqual(isAdminSection(undefined), false);
  assert.strictEqual(isAdminSection('admin'), false);
  assert.strictEqual(isAdminSection('overview; drop table'), false);
  assert.strictEqual(isAdminSection('OVERVIEW'), false, 'case-sensitive');
  assert.strictEqual(isAdminSection('../organizations'), false);
});

test('the platform section is tracked separately for SUPER_ADMIN gating', () => {
  assert.strictEqual(PLATFORM_SECTION, 'organizations');
  assert.strictEqual(isAdminSection(PLATFORM_SECTION), true);
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
console.log(`\nAdmin sections: ${passed}/${tests.length} passed`);
