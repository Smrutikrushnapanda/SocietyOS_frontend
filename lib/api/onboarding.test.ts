/**
 * Onboard New Resident — pure form-logic tests.
 *
 * Covers per-type document requirements, upload validation (mirroring the
 * server rules), step validation, and the payload builder for owner, tenant
 * and family-member onboarding.
 */

import assert from 'node:assert';
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  buildOnboardPayload,
  documentRequirements,
  emptyOnboardForm,
  formatFileSize,
  isValidIsoDate,
  isValidMobile,
  MAX_UPLOAD_BYTES,
  OnboardResidentForm,
  residentTypeLabel,
  resolveFlatContext,
  validateStep,
  validateUploadFile,
} from './onboarding';

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('--- Running Onboard New Resident form-logic tests ---');

// ── residentTypeLabel ─────────────────────────────────────────────────
test('residentTypeLabel maps codes to friendly labels', () => {
  assert.strictEqual(residentTypeLabel('OWNER'), 'Owner');
  assert.strictEqual(residentTypeLabel('TENANT'), 'Tenant');
  assert.strictEqual(residentTypeLabel('FAMILY'), 'Family Member');
  assert.strictEqual(residentTypeLabel(null), 'Resident');
  assert.strictEqual(residentTypeLabel('SOMETHING'), 'Resident');
});

// ── document requirements ─────────────────────────────────────────────
test('owner documents list identity and ownership proof as optional', () => {
  const docs = documentRequirements('OWNER');
  const ids = docs.map((d) => d.id);
  assert.ok(ids.includes('Identity Proof'));
  assert.ok(ids.includes('Ownership Proof'));
  assert.ok(!ids.includes('Rental Agreement'));
  assert.ok(!ids.includes('Police Verification'));
  assert.strictEqual(docs.find((d) => d.id === 'Identity Proof')?.required, false);
  assert.strictEqual(docs.find((d) => d.id === 'Ownership Proof')?.required, false);
});

test('tenant requires identity + rental agreement + optional police check', () => {
  const docs = documentRequirements('TENANT');
  const ids = docs.map((d) => d.id);
  assert.ok(ids.includes('Rental Agreement'));
  assert.ok(ids.includes('Police Verification'));
  assert.strictEqual(docs.find((d) => d.id === 'Rental Agreement')?.required, false);
  assert.strictEqual(docs.find((d) => d.id === 'Police Verification')?.required, false);
});

test('family member requires identity + relationship proof', () => {
  const docs = documentRequirements('FAMILY');
  const ids = docs.map((d) => d.id);
  assert.ok(ids.includes('Relationship Proof'));
  assert.strictEqual(docs.find((d) => d.id === 'Relationship Proof')?.required, false);
});

test('identity proof help text discourages a full unmasked Aadhaar copy', () => {
  const help = documentRequirements('OWNER').find((d) => d.id === 'Identity Proof')?.help ?? '';
  assert.ok(/mask/i.test(help), 'mentions masking');
  assert.ok(/unmasked/i.test(help), 'warns about unmasked Aadhaar');
});

// ── file validation ───────────────────────────────────────────────────
test('validates 10-digit phone and ISO dates', () => {
  assert.strictEqual(isValidMobile('9937898007'), true);
  assert.strictEqual(isValidMobile('12345'), false);
  assert.strictEqual(isValidMobile('abcdefghij'), false);
  assert.strictEqual(isValidIsoDate('1990-05-14'), true);
  assert.strictEqual(isValidIsoDate('14-05-1990'), false);
  assert.strictEqual(isValidIsoDate('1990-13-40'), false);
});

test('accepts supported files and rejects bad ones', () => {
  assert.strictEqual(
    validateUploadFile({ name: 'id.pdf', size: 1024, type: 'application/pdf' }),
    null,
  );
  assert.strictEqual(
    validateUploadFile({ name: 'photo.PNG', size: 2048, type: 'image/png' }),
    null,
  );
  assert.ok(
    validateUploadFile({ name: 'virus.exe', size: 10, type: 'application/octet-stream' }),
    'rejects .exe',
  );
  assert.ok(
    validateUploadFile({ name: 'huge.pdf', size: MAX_UPLOAD_BYTES + 1, type: 'application/pdf' }),
    'rejects oversized',
  );
  assert.ok(
    validateUploadFile({ name: 'empty.pdf', size: 0, type: 'application/pdf' }),
    'rejects empty',
  );
  assert.ok(
    validateUploadFile({ name: 'fake.pdf', size: 10, type: 'application/zip' }),
    'rejects mismatched content type',
  );
  // category specific 2MB limit
  assert.ok(
    validateUploadFile({ name: 'photo.jpg', size: 3 * 1024 * 1024, type: 'image/jpeg' }, 'Profile Photo'),
    'rejects photo over 2MB',
  );
  assert.ok(
    validateUploadFile({ name: 'id.pdf', size: 3 * 1024 * 1024, type: 'application/pdf' }, 'Identity Proof'),
    'rejects identity doc over 2MB',
  );
  // allow-list stays in sync with the server
  assert.deepStrictEqual(
    [...ALLOWED_UPLOAD_EXTENSIONS],
    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt'],
  );
});

test('formats file sizes', () => {
  assert.strictEqual(formatFileSize(512), '512 B');
  assert.strictEqual(formatFileSize(1536), '1.5 KB');
  assert.strictEqual(formatFileSize(2 * 1024 * 1024), '2.0 MB');
});

// ── step validation ───────────────────────────────────────────────────
test('step 1 requires name and a valid 10-digit mobile number', () => {
  const form = emptyOnboardForm();
  assert.ok(validateStep(0, form).length >= 2, 'name + mobile required');
  form.fullName = 'Aarav Sharma';
  form.mobile = '123';
  assert.deepStrictEqual(validateStep(0, form), [
    'Mobile number must be exactly 10 digits (numbers 0–9 only).',
  ]);
  form.mobile = '9876543210';
  assert.deepStrictEqual(validateStep(0, form), []);
  form.email = 'not-an-email';
  assert.strictEqual(validateStep(0, form).length, 1);
  form.email = 'aarav@example.com';
  assert.deepStrictEqual(validateStep(0, form), []);
});

test('step 2 requires building + flat, and relationship for family members', () => {
  const form = emptyOnboardForm();
  form.fullName = 'Aarav';
  form.mobile = '9876543210';
  assert.ok(validateStep(1, form).includes('Select a building.'));
  assert.ok(validateStep(1, form).includes('Select a flat.'));
  form.buildingId = 'b1';
  form.flatId = 'f1';
  assert.deepStrictEqual(validateStep(1, form), []);

  form.residentType = 'FAMILY';
  assert.strictEqual(validateStep(1, form).length, 1);
  form.relationshipToPrimary = 'Son';
  assert.deepStrictEqual(validateStep(1, form), []);
});

test('step 3 documents are optional', () => {
  const form = emptyOnboardForm();
  form.residentType = 'TENANT';
  const errors = validateStep(2, form, {});
  assert.strictEqual(errors.length, 0, 'all documents are optional');
});

// ── payload builder ───────────────────────────────────────────────────
test('builds an owner payload, omitting blanks and tenant/family fields', () => {
  const form: OnboardResidentForm = {
    ...emptyOnboardForm(),
    fullName: '  Aarav Sharma ',
    mobile: ' +919876543210 ',
    email: '',
    residentType: 'OWNER',
    buildingId: 'b1',
    flatId: 'f1',
    isPrimary: true,
    ownerName: 'should be ignored',
    relationshipToPrimary: 'should be ignored',
    vehicles: [{ registration: '', make: '', model: '' }],
  };
  const payload = buildOnboardPayload(form, { profilePhotoFileId: 'photo-uuid' });
  assert.strictEqual(payload.name, 'Aarav Sharma');
  assert.strictEqual(payload.phone, '+919876543210');
  assert.strictEqual(payload.resident_type, 'OWNER');
  assert.strictEqual(payload.is_primary, true);
  assert.strictEqual(payload.flat_id, 'f1');
  assert.strictEqual(payload.profile_photo_file_id, 'photo-uuid');
  assert.strictEqual(payload.email, undefined);
  assert.strictEqual(payload.owner_name, undefined);
  assert.strictEqual(payload.relationship_to_primary, undefined);
  assert.strictEqual(payload.vehicle_details, undefined, 'all-blank vehicles dropped');
});

test('builds a tenant payload with owner details and vehicles', () => {
  const form: OnboardResidentForm = {
    ...emptyOnboardForm(),
    fullName: 'Riya Patel',
    mobile: '+919876543211',
    residentType: 'TENANT',
    buildingId: 'b1',
    flatId: 'f1',
    ownerName: 'Aarav Sharma',
    ownerContact: '+919876543210',
    moveInDate: '2024-02-01',
    relationshipToPrimary: 'ignore me',
    vehicles: [{ type: 'Car', make: 'Maruti', model: 'Swift', registration: 'KA01AB1234' }],
  };
  const payload = buildOnboardPayload(form);
  assert.strictEqual(payload.owner_name, 'Aarav Sharma');
  assert.strictEqual(payload.owner_contact, '+919876543210');
  assert.strictEqual(payload.move_in_date, '2024-02-01');
  assert.strictEqual(payload.relationship_to_primary, undefined);
  assert.deepStrictEqual(payload.vehicle_details, [
    { type: 'Car', make: 'Maruti', model: 'Swift', registration: 'KA01AB1234' },
  ]);
});

test('builds a family payload with relationship and emergency contact', () => {
  const form: OnboardResidentForm = {
    ...emptyOnboardForm(),
    fullName: 'Aarav Sharma Jr',
    mobile: '+919876543212',
    residentType: 'FAMILY',
    buildingId: 'b1',
    flatId: 'f1',
    relationshipToPrimary: 'Son',
    emergencyName: 'Meera Sharma',
    emergencyRelationship: 'Mother',
    emergencyPhone: '+919876500000',
    dateOfBirth: '2015-08-20',
    ownerName: 'ignore',
  };
  const payload = buildOnboardPayload(form);
  assert.strictEqual(payload.relationship_to_primary, 'Son');
  assert.strictEqual(payload.emergency_contact_name, 'Meera Sharma');
  assert.strictEqual(payload.emergency_contact_relationship, 'Mother');
  assert.strictEqual(payload.emergency_contact_phone, '+919876500000');
  assert.strictEqual(payload.date_of_birth, '2015-08-20');
  assert.strictEqual(payload.owner_name, undefined);
});

// ── flat context ──────────────────────────────────────────────────────
test('resolveFlatContext resolves the building, label, floor and unit type', () => {
  const ctx = resolveFlatContext(
    'f1',
    [
      {
        id: 'f1',
        building_id: 'b1',
        floor_id: 'fl5',
        flat_identifier: 'A-501',
        flat_type: '3 BHK',
      },
    ],
    [{ id: 'fl5', floor_number: 5 }],
    [{ id: 'b1', name: 'Tower A' }],
  );
  assert.deepStrictEqual(ctx, {
    buildingName: 'Tower A',
    flatIdentifier: 'A-501',
    floorNumber: 5,
    flatType: '3 BHK',
  });

  // A flat with no configured type yields an empty string, never undefined.
  const noType = resolveFlatContext(
    'f2',
    [{ id: 'f2', building_id: 'b1', floor_id: 'fl5', flat_identifier: 'A-502' }],
    [{ id: 'fl5', floor_number: 5 }],
    [{ id: 'b1', name: 'Tower A' }],
  );
  assert.strictEqual(noType.flatType, '');

  assert.deepStrictEqual(resolveFlatContext('missing', [], [], []), {
    buildingName: '',
    flatIdentifier: '',
    floorNumber: null,
    flatType: '',
  });
});

console.log(`\nALL ${passed} ONBOARD RESIDENT FORM-LOGIC TESTS PASSED!\n`);
