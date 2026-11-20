/**
 * SocietyOS Staff Role / Designation options.
 *
 * Staff `role` is a free-form string on the backend, but the admin UI presents
 * a dropdown built from a curated standard set of society designations merged
 * with the roles already in use by existing staff members. Driving the field
 * from one shared list keeps designations consistent across the roster instead
 * of letting every entry invent its own wording.
 *
 * Custom roles are still possible via the "Other / Custom…" option in the form;
 * once saved, a custom role shows up in this list for every future staff entry.
 */

/** Curated standard society staff designations. */
export const STANDARD_STAFF_ROLES: readonly string[] = [
  'Security Guard',
  'Head Security Officer',
  'Security Supervisor',
  'Front Desk Executive',
  'Society Manager',
  'Facility Manager',
  'Housekeeping Staff',
  'Estate Maintenance Supervisor',
  'Maintenance Technician',
  'Plumbing Technician',
  'Electrician',
  'Lift Operator',
  'Gardener',
];

/**
 * Build the deduplicated, stable dropdown option list for staff roles.
 *
 * Order: the curated standard designations → roles already in use → nothing
 * else. Matching is case-insensitive so "security guard" and "Security Guard"
 * never both appear. Callers that want a pure standard list can pass
 * `includeStandard: false` (not used today, kept for parity with flat types).
 */
export function staffRoleOptions(options?: {
  /** Roles already present on the roster (or the current form value). */
  inUse?: Iterable<string | null | undefined>;
  /** Include the curated standard designations first. Defaults to true. */
  includeStandard?: boolean;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (value: string | null | undefined) => {
    const t = (value ?? '').trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  if (options?.includeStandard !== false) {
    for (const r of STANDARD_STAFF_ROLES) add(r);
  }
  if (options?.inUse) {
    for (const r of options.inUse) add(r);
  }
  return out;
}

/** Case-insensitive membership check used to decide if a role needs the custom field. */
export function isKnownStaffRole(
  role: string | null | undefined,
  options: readonly string[],
): boolean {
  const key = (role ?? '').trim().toLowerCase();
  if (!key) return false;
  return options.some((o) => o.toLowerCase() === key);
}
