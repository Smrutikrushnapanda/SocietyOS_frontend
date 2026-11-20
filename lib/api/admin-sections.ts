/**
 * SocietyOS Admin section registry.
 *
 * Most sections use /admin?section=…; Residents has its own page.
 * This registry keeps navigation and restored URLs consistent.
 */

export type AdminSectionType =
  | 'overview'
  | 'buildings'
  | 'residents'
  | 'parking'
  | 'visitors'
  | 'amenities'
  | 'complaints'
  | 'staff'
  | 'finance'
  | 'documents'
  | 'notices'
  | 'reports'
  | 'audit'
  | 'whatsapp'
  | 'role_master'
  | 'settings'
  | 'organizations';

/** Every section the admin SPA can render. */
export const ALL_ADMIN_SECTIONS: readonly string[] = [
  'overview',
  'buildings',
  'residents',
  'parking',
  'visitors',
  'amenities',
  'complaints',
  'staff',
  'finance',
  'documents',
  'notices',
  'reports',
  'audit',
  'whatsapp',
  'role_master',
  'settings',
  'organizations',
];

/** True when the value is one of the known admin sections. */
export function isAdminSection(value: string | null | undefined): value is AdminSectionType {
  return !!value && ALL_ADMIN_SECTIONS.includes(value);
}

export function adminSectionHref(section: AdminSectionType): string {
  return section === 'residents' ? '/admin/residents' : `/admin?section=${section}`;
}

/** The SUPER_ADMIN-only platform management section. */
export const PLATFORM_SECTION: AdminSectionType = 'organizations';
