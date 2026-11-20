/**
 * Small display helpers shared across the resident and admin UI.
 */

/**
 * First name only, for friendly greetings.
 *
 * "Arun Kumar Panda" → "Arun"
 * "  Riya   Patel " → "Riya"
 * "" / null / undefined → ""
 *
 * Used by the resident portal header ("Namaste, Arun").
 */
export function firstName(fullName?: string | null): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

/**
 * Greeting line for the resident portal header.
 *
 * residentFirstName("Arun Kumar Panda") → "Namaste, Arun"
 * residentFirstName("")                 → "Namaste"
 */
export function greetingFor(fullName?: string | null, fallback = 'Namaste'): string {
  const first = firstName(fullName);
  return first ? `${fallback}, ${first}` : fallback;
}

export function authenticatedAdminName(profile?: { fullName?: string | null } | null): string {
  return profile?.fullName?.trim() || 'Admin';
}

export function authenticatedGuardName(profile?: { fullName?: string | null } | null, legacyName?: string | null): string {
  for (const candidate of [profile?.fullName, legacyName]) {
    const name = candidate?.trim();
    if (name && /\p{L}/u.test(name) && !/^Officer\s*\d+$/i.test(name)) return name;
  }
  return 'On-Duty Guard';
}
