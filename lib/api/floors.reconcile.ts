/**
 * SocietyOS Floor reconciliation utilities.
 *
 * A building declares how many floors it has (buildings.total_floors) and
 * owns one `floors` record per floor — flats point at a floor by id, and the
 * floor dropdown, floor plates, and 3D tower all render from those records.
 * These helpers compute which floor records are missing so callers can create
 * exactly the ones needed (never duplicates, never more than the declared
 * count).
 */

/** Hard cap on floors auto-created for one building (matches the UI cap). */
export const MAX_AUTO_CREATED_FLOORS = 10;

/**
 * Return the floor numbers (1..min(totalFloors, cap)) that do NOT yet have a
 * record, given the already-existing floor numbers. Garbage/negative existing
 * values are ignored. A falsy totalFloors is treated as 1.
 */
export function missingFloorNumbers(
  totalFloors: number,
  existing: number[],
  maxFloorCap: number = MAX_AUTO_CREATED_FLOORS,
): number[] {
  const maxFloors = Math.max(1, Math.min(totalFloors || 1, maxFloorCap));
  const have = new Set<number>();
  for (const n of existing) {
    if (Number.isFinite(n) && n >= 1) have.add(n);
  }
  const missing: number[] = [];
  for (let i = 1; i <= maxFloors; i++) {
    if (!have.has(i)) missing.push(i);
  }
  return missing;
}