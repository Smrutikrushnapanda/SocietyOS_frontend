/**
 * SocietyOS Authoritative RBAC Helpers
 *
 * All functions are fail-closed:
 *  - No role -> returns false
 *  - Unknown role -> returns false
 *  - No permission -> returns false
 *  - Unknown permission -> returns false
 *
 * The frontend roles are strictly:
 *  - SUPER_ADMIN
 *  - SOCIETY_ADMIN
 *  - RESIDENT
 *  - GUARD
 */

import { useAuthStore } from '../../store/useAuthStore';
import type { BackendRole } from '../api/types';

export const VALID_BACKEND_ROLES: readonly BackendRole[] = [
  'SUPER_ADMIN',
  'SOCIETY_ADMIN',
  'RESIDENT',
  'GUARD',
] as const;

export function isValidBackendRole(role: unknown): role is BackendRole {
  return typeof role === 'string' && VALID_BACKEND_ROLES.includes(role as BackendRole);
}

export function hasRole(role: BackendRole): boolean {
  if (typeof window === 'undefined') return false;
  if (!isValidBackendRole(role)) return false;
  const roles = useAuthStore.getState().roles;
  return roles.includes(role);
}

export function hasAnyRole(requiredRoles: BackendRole[]): boolean {
  if (typeof window === 'undefined') return false;
  const roles = useAuthStore.getState().roles;
  return requiredRoles.some((r) => isValidBackendRole(r) && roles.includes(r));
}

export function hasPermission(permission: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!permission || typeof permission !== 'string') return false;
  const permissions = useAuthStore.getState().permissions;
  return permissions.includes(permission);
}

export function hasAnyPermission(requiredPermissions: string[]): boolean {
  if (typeof window === 'undefined') return false;
  const permissions = useAuthStore.getState().permissions;
  return requiredPermissions.some(
    (p) => typeof p === 'string' && p.length > 0 && permissions.includes(p),
  );
}

export function canAccessPortal(portal: 'admin' | 'resident' | 'guard'): boolean {
  if (typeof window === 'undefined') return false;
  const roles = useAuthStore.getState().roles;
  switch (portal) {
    case 'admin':
      return roles.includes('SOCIETY_ADMIN') || roles.includes('SUPER_ADMIN');
    case 'resident':
      return roles.includes('RESIDENT');
    case 'guard':
      return roles.includes('GUARD');
    default:
      return false;
  }
}
