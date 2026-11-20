/**
 * Onboard New Resident — pure form logic.
 *
 * Kept free of React so it can be unit tested directly and reused by the
 * wizard component. Mirrors the backend validation in
 * `src/resident/dto/resident.dto.ts` and the file rules in
 * `src/files/file.service.ts` (10 MB, same extension/MIME allow-list).
 */

import type { OnboardResidentPayload } from './residents.api';

export type ResidentTypeCode = 'OWNER' | 'TENANT' | 'FAMILY';

export const RESIDENT_TYPE_OPTIONS: { value: ResidentTypeCode; label: string }[] = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'FAMILY', label: 'Family Member' },
];

/** Human label for a resident type code (FAMILY → "Family Member"). */
export function residentTypeLabel(
  type: ResidentTypeCode | string | null | undefined,
): string {
  switch (type) {
    case 'OWNER':
      return 'Owner';
    case 'TENANT':
      return 'Tenant';
    case 'FAMILY':
      return 'Family Member';
    default:
      return 'Resident';
  }
}

export const RELATIONSHIP_OPTIONS = [
  'Owner',
  'Spouse',
  'Son',
  'Daughter',
  'Parent',
  'Tenant',
  'Other',
] as const;
export type RelationshipOption = (typeof RELATIONSHIP_OPTIONS)[number];

export interface VehicleDetail {
  type?: string;
  make?: string;
  model?: string;
  registration?: string;
  color?: string;
}

export interface OnboardResidentForm {
  // Step 1 — personal details
  fullName: string;
  mobile: string;
  email: string;
  dateOfBirth: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  // Step 2 — flat & occupancy
  residentType: ResidentTypeCode;
  buildingId: string;
  flatId: string;
  moveInDate: string;
  relationshipToPrimary: string;
  ownerName: string;
  ownerContact: string;
  isPrimary: boolean;
  vehicles: VehicleDetail[];
}

export function emptyOnboardForm(): OnboardResidentForm {
  return {
    fullName: '',
    mobile: '',
    email: '',
    dateOfBirth: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    residentType: 'OWNER',
    buildingId: '',
    flatId: '',
    moveInDate: '',
    relationshipToPrimary: '',
    ownerName: '',
    ownerContact: '',
    isPrimary: false,
    vehicles: [],
  };
}

/** Extracts the clean 10-digit phone number if formatted with country code (e.g. +91) */
export function extractTenDigitPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
}

export const PHONE_10_DIGIT_PATTERN = /^[0-9]{10}$/;
export const MOBILE_PATTERN = /^\+?[0-9]{10,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidMobile(value: string): boolean {
  return PHONE_10_DIGIT_PATTERN.test((value ?? '').trim());
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test((value ?? '').trim());
}

export function isValidIsoDate(value: string): boolean {
  const v = (value ?? '').trim();
  if (!ISO_DATE_PATTERN.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

/* ── File upload rules (mirror src/files/file.service.ts) ────────────── */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB general
export const MAX_RESIDENT_DOC_BYTES = 2 * 1024 * 1024; // 2 MB for resident profile docs

export const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const IDENTITY_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const;
export const OWNERSHIP_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt'] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
] as const;

export const ALLOWED_UPLOAD_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
] as const;

/**
 * Client-side guard mirroring the server rules so obviously-bad files never
 * hit the network. Returns an error message, or null when the file is OK.
 * Supports category-specific rules (Photo: 2MB image, Identity/Ownership: 2MB).
 */
export function validateUploadFile(
  file: {
    name: string;
    size: number;
    type: string;
  },
  category?: string,
): string | null {
  const name = file?.name ?? '';
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';

  if (category === 'Profile Photo' || category === '__profile_photo__') {
    if (!ext || !(PHOTO_EXTENSIONS as readonly string[]).includes(ext)) {
      return 'Resident Photo only supports JPG, JPEG, PNG, or WEBP images.';
    }
    if (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return 'Resident Photo must be a valid JPG, PNG, or WEBP image.';
    }
    if (file.size === 0) return 'File is empty.';
    if (file.size > MAX_RESIDENT_DOC_BYTES) {
      return 'Resident Photo exceeds the maximum allowed size of 2 MB.';
    }
    return null;
  }

  if (category === 'Identity Proof') {
    if (!ext || !(IDENTITY_EXTENSIONS as readonly string[]).includes(ext)) {
      return 'Identity Proof only supports JPG, JPEG, PNG, WEBP, or PDF files.';
    }
    if (file.type && !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      return 'Unsupported content type for Identity Proof.';
    }
    if (file.size === 0) return 'File is empty.';
    if (file.size > MAX_RESIDENT_DOC_BYTES) {
      return 'Identity Proof exceeds the maximum allowed size of 2 MB.';
    }
    return null;
  }

  if (category === 'Ownership Proof') {
    if (!ext || !(OWNERSHIP_EXTENSIONS as readonly string[]).includes(ext)) {
      return 'Ownership Proof only supports JPG, JPEG, PNG, WEBP, PDF, or TXT files.';
    }
    if (
      file.type &&
      !['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'].includes(file.type)
    ) {
      return 'Unsupported content type for Ownership Proof.';
    }
    if (file.size === 0) return 'File is empty.';
    if (file.size > MAX_RESIDENT_DOC_BYTES) {
      return 'Ownership Proof exceeds the maximum allowed size of 2 MB.';
    }
    return null;
  }

  if (!ext || !(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Unsupported file type "${ext || '(none)'}". Use PDF, JPG, PNG, GIF, WEBP or TXT.`;
  }
  if (file.type && !(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.type)) {
    return `Unsupported content type "${file.type}".`;
  }
  if (file.size === 0) return 'File is empty.';
  if (file.size > MAX_UPLOAD_BYTES) return 'File exceeds the 10 MB limit.';
  return null;
}

/** Human file size, e.g. 1536 → "1.5 KB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Document requirements by resident type ──────────────────────────── */

export interface DocumentRequirement {
  /** Backend `category` value. */
  id: string;
  label: string;
  required: boolean;
  help: string;
}

/**
 * Documents to collect for a given resident type.
 * Identity proof and Ownership proof are optional per requirements.
 */
export function documentRequirements(
  type: ResidentTypeCode,
): DocumentRequirement[] {
  const identity: DocumentRequirement = {
    id: 'Identity Proof',
    label: 'Identity Proof',
    required: false,
    help: 'Optional: Any government photo ID (JPG, PNG, WEBP, PDF up to 2 MB). Mask Aadhaar if provided — a full unmasked Aadhaar copy is not required.',
  };
  const police: DocumentRequirement = {
    id: 'Police Verification',
    label: 'Police / Tenant Verification',
    required: false,
    help: 'Attach only if your society requires it.',
  };

  if (type === 'OWNER') {
    return [
      identity,
      {
        id: 'Ownership Proof',
        label: 'Ownership Proof',
        required: false,
        help: 'Optional: Sale deed, property tax receipt or allotment letter (JPG, PNG, WEBP, PDF, TXT up to 2 MB).',
      },
    ];
  }
  if (type === 'TENANT') {
    return [
      identity,
      {
        id: 'Rental Agreement',
        label: 'Rental Agreement',
        required: false,
        help: 'Signed lease / rent agreement.',
      },
      police,
    ];
  }
  return [
    identity,
    {
      id: 'Relationship Proof',
      label: 'Occupancy / Relationship Proof',
      required: false,
      help: 'A document linking this person to the flat owner or primary resident.',
    },
    police,
  ];
}

/* ── Step validation ─────────────────────────────────────────────────── */

export const ONBOARD_STEPS = [
  'Personal Details',
  'Flat & Occupancy',
  'Documents',
  'Review',
] as const;

export type OnboardStepIndex = 0 | 1 | 2 | 3;

/**
 * Returns the list of validation errors for a step (empty = valid).
 * `uploadedByDocType` maps a document id → whether a file is attached, used
 * for step 2 (index 2 = Documents).
 */
export function validateStep(
  step: number,
  form: OnboardResidentForm,
  uploadedByDocType: Record<string, boolean> = {},
  isEdit = false,
): string[] {
  const errors: string[] = [];

  if (step === 0) {
    if (!form.fullName.trim()) errors.push('Full name is required.');
    if (!form.mobile.trim()) errors.push('Mobile number is required.');
    else if (!isValidMobile(form.mobile))
      errors.push('Mobile number must be exactly 10 digits (numbers 0–9 only).');
    if (form.email.trim() && !isValidEmail(form.email))
      errors.push('Email address is not valid.');
    if (form.emergencyPhone.trim() && !isValidMobile(form.emergencyPhone))
      errors.push('Emergency contact phone must be 10–15 digits.');
    if (form.dateOfBirth.trim() && !isValidIsoDate(form.dateOfBirth))
      errors.push('Date of birth must be a valid date.');
    return errors;
  }

  if (step === 1) {
    if (!isEdit && !form.buildingId) errors.push('Select a building.');
    if (!isEdit && !form.flatId) errors.push('Select a flat.');
    if (form.buildingId && !form.flatId) errors.push('Select a flat.');
    if (form.residentType === 'FAMILY' && !form.relationshipToPrimary.trim())
      errors.push('Relationship to the owner / primary resident is required for family members.');
    if (form.ownerContact.trim() && !isValidMobile(form.ownerContact))
      errors.push('Owner contact must be 10–15 digits.');
    if (form.moveInDate.trim() && !isValidIsoDate(form.moveInDate))
      errors.push('Move-in date must be a valid date.');
    return errors;
  }

  if (step === 2) {
    if (!isEdit) {
      for (const req of documentRequirements(form.residentType)) {
        if (req.required && !uploadedByDocType[req.id]) {
          errors.push(`${req.label} is required.`);
        }
      }
    }
    return errors;
  }

  return errors;
}

/* ── Payload builder ─────────────────────────────────────────────────── */

/**
 * Maps the wizard form to the `POST /residents/onboard` payload, trimming
 * values and omitting blanks so the backend keeps its defaults.
 */
export function buildOnboardPayload(
  form: OnboardResidentForm,
  opts: { profilePhotoFileId?: string } = {},
): OnboardResidentPayload {
  const payload: OnboardResidentPayload = {
    name: form.fullName.trim(),
    phone: form.mobile.trim(),
    resident_type: form.residentType,
    is_primary: form.isPrimary,
    kyc_status: 'VERIFIED',
    app_access_status: true,
  };

  const email = form.email.trim();
  if (email) payload.email = email;
  if (form.flatId) payload.flat_id = form.flatId;
  if (form.dateOfBirth.trim()) payload.date_of_birth = form.dateOfBirth.trim();
  if (form.emergencyName.trim())
    payload.emergency_contact_name = form.emergencyName.trim();
  if (form.emergencyRelationship.trim())
    payload.emergency_contact_relationship = form.emergencyRelationship.trim();
  if (form.emergencyPhone.trim())
    payload.emergency_contact_phone = form.emergencyPhone.trim();
  if (form.moveInDate.trim()) payload.move_in_date = form.moveInDate.trim();

  if (form.residentType === 'FAMILY' && form.relationshipToPrimary.trim())
    payload.relationship_to_primary = form.relationshipToPrimary.trim();
  if (form.residentType === 'TENANT') {
    if (form.ownerName.trim()) payload.owner_name = form.ownerName.trim();
    if (form.ownerContact.trim()) payload.owner_contact = form.ownerContact.trim();
  }

  const vehicles = form.vehicles.filter(
    (v) => v.registration?.trim() || v.make?.trim() || v.model?.trim(),
  );
  if (vehicles.length > 0) payload.vehicle_details = vehicles;

  if (opts.profilePhotoFileId)
    payload.profile_photo_file_id = opts.profilePhotoFileId;

  return payload;
}

/* ── Flat / floor context ────────────────────────────────────────────── */

export interface FlatContext {
  buildingName: string;
  flatIdentifier: string;
  floorNumber: number | null;
  /** The flat's configured occupancy / unit type (e.g. "3 BHK"); '' when unset. */
  flatType: string;
}

/**
 * Resolve a flat's human context (building name, flat label, floor number and
 * configured occupancy / unit type) from the loaded buildings/floors/flats.
 * All ids are already org-scoped by the API, so a missing match simply yields
 * blanks.
 */
export function resolveFlatContext(
  flatId: string,
  flats: Array<{
    id: string;
    building_id: string;
    floor_id: string;
    flat_identifier: string;
    flat_type?: string | null;
  }>,
  floors: Array<{ id: string; floor_number: number }>,
  buildings: Array<{ id: string; name: string }>,
): FlatContext {
  const flat = flats.find((f) => f.id === flatId);
  if (!flat) return { buildingName: '', flatIdentifier: '', floorNumber: null, flatType: '' };
  const building = buildings.find((b) => b.id === flat.building_id);
  const floor = floors.find((fl) => fl.id === flat.floor_id);
  return {
    buildingName: building?.name ?? '',
    flatIdentifier: flat.flat_identifier ?? '',
    floorNumber: typeof floor?.floor_number === 'number' ? floor.floor_number : null,
    flatType: flat.flat_type ?? '',
  };
}
