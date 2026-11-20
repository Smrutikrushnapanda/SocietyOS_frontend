/**
 * Shared backend types used by both the auth store and the auth API wrappers.
 * Kept in a separate file to avoid circular imports:
 *   client.ts → useAuthStore.ts → auth.api.ts → client.ts
 */

export interface BackendUser {
  id: string;
  mobileNumber: string;
  fullName?: string | null;
}

export type BackendRole = 'SUPER_ADMIN' | 'SOCIETY_ADMIN' | 'RESIDENT' | 'GUARD';

export interface OrganizationContextItem {
  id: string;
  name?: string;
  role?: string;
}

export interface OrganizationMembership {
  organizationId: string | null;
  role: BackendRole;
  permissions: string[];
}

export interface AuthMeResponse {
  user: {
    id: string;
    mobileNumber: string;
  fullName?: string | null;
  };
  memberships: OrganizationMembership[];
}
