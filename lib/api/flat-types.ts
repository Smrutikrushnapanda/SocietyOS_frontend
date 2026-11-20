/**
 * SocietyOS Flat Type options.
 *
 * Flat type is a free-form string on the backend, but the admin UI presents a
 * dropdown built from the society's configured **Flat Types**
 * ("Flat Type Configuration") merged with the flat types already in use by
 * existing flats. The current selection is always included so an existing flat
 * with a custom type can be kept without edits being destructive.
 *
 * A built-in standard range (1 RK … 6 BHK + special units) is available as a
 * fallback, but callers that drive the dropdown from configuration should pass
 * `includeStandard: false` so only configured / in-use types are offered.
 */

/** Standard fallback flat type range. */
export const STANDARD_FLAT_TYPES: readonly string[] = [
  '1 RK',
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  '5 BHK',
  '6 BHK',
  'Studio',
  'Duplex',
  'Penthouse',
  'Villa',
];

/**
 * Build the deduplicated, stable dropdown option list for flat types.
 *
 * Order: configured / existing types → the selected value if it is not already
 * represented, so whatever the user has chosen always stays selectable. The
 * built-in standard range is prepended only when `includeStandard` is not
 * explicitly `false`.
 */
export function flatTypeOptions(options?: {
  selected?: string | null;
  custom?: Iterable<string>;
  /** Include the built-in standard range first. Defaults to true. */
  includeStandard?: boolean;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (value: string) => {
    const t = (value ?? '').trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  if (options?.includeStandard !== false) {
    for (const t of STANDARD_FLAT_TYPES) add(t);
  }
  if (options?.custom) {
    for (const c of options.custom) add(c);
  }
  if (options?.selected) add(options.selected);
  return out;
}