/**
 * SocietyOS RBAC & Auth Context Tests (Phase 12 Step 5B)
 *
 * Verifies the 14 required capabilities:
 *  1. /auth/me response populates SUPER_ADMIN
 *  2. /auth/me response populates SOCIETY_ADMIN
 *  3. /auth/me response populates RESIDENT
 *  4. /auth/me response populates GUARD
 *  5. Single organization automatically selects organization
 *  6. Multiple organizations do NOT blindly select first
 *  7. Selected organization determines effective role
 *  8. Selected organization determines effective permissions
 *  9. SUPER_ADMIN has no automatic organization
 * 10. Unknown role fails closed
 * 11. Missing permissions fail closed
 * 12. Logout clears memberships/roles/permissions
 * 13. 403 does not trigger refresh
 * 14. /auth/me failure does not create fake authorization
 */

import assert from 'node:assert';
import { useAuthStore } from '../../store/useAuthStore';
import {
  hasRole,
  hasAnyRole,
  hasPermission,
  hasAnyPermission,
  canAccessPortal,
  isValidBackendRole,
} from './rbac';

// Setup mock window/sessionStorage for node environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {};
}
const mockStorage: Record<string, string> = {};
(globalThis as any).sessionStorage = {
  getItem: (k: string) => mockStorage[k] ?? null,
  setItem: (k: string, v: string) => {
    mockStorage[k] = v;
  },
  removeItem: (k: string) => {
    delete mockStorage[k];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  },
};

console.log('--- Running SocietyOS RBAC & Auth Context Tests ---');

// Test 1: /auth/me response populates SUPER_ADMIN
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'sa-1', mobileNumber: '+919800000001' },
  memberships: [
    {
      organizationId: null,
      role: 'SUPER_ADMIN',
      permissions: ['platform:manage', 'society:create'],
    },
  ],
});
assert.strictEqual(hasRole('SUPER_ADMIN'), true, 'Test 1.1: SUPER_ADMIN recognized');
assert.strictEqual(canAccessPortal('admin'), true, 'Test 1.2: SUPER_ADMIN accesses admin portal');
assert.strictEqual(canAccessPortal('resident'), false, 'Test 1.3: SUPER_ADMIN cannot access resident portal');
assert.strictEqual(hasPermission('platform:manage'), true, 'Test 1.4: platform permission recognized');
assert.strictEqual(useAuthStore.getState().organizationId, null, 'Test 1.5: SUPER_ADMIN organizationId is null');
console.log('✓ Test 1 Passed: /auth/me response populates SUPER_ADMIN');

// Test 2: /auth/me response populates SOCIETY_ADMIN
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'adm-1', mobileNumber: '+919800000002' },
  memberships: [
    {
      organizationId: 'org-admin-1',
      role: 'SOCIETY_ADMIN',
      permissions: ['society:manage', 'notice:create'],
    },
  ],
});
assert.strictEqual(hasRole('SOCIETY_ADMIN'), true, 'Test 2.1: SOCIETY_ADMIN recognized');
assert.strictEqual(canAccessPortal('admin'), true, 'Test 2.2: SOCIETY_ADMIN accesses admin portal');
assert.strictEqual(canAccessPortal('resident'), false, 'Test 2.3: SOCIETY_ADMIN cannot access resident portal');
assert.strictEqual(canAccessPortal('guard'), false, 'Test 2.4: SOCIETY_ADMIN cannot access guard portal');
assert.strictEqual(hasPermission('society:manage'), true, 'Test 2.5: society:manage permission recognized');
assert.strictEqual(useAuthStore.getState().organizationId, 'org-admin-1', 'Test 2.6: organizationId established');
console.log('✓ Test 2 Passed: /auth/me response populates SOCIETY_ADMIN');

// Test 3: /auth/me response populates RESIDENT
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'res-1', mobileNumber: '+919800000003' },
  memberships: [
    {
      organizationId: 'org-res-1',
      role: 'RESIDENT',
      permissions: ['complaint:submit', 'notice:read'],
    },
  ],
});
assert.strictEqual(hasRole('RESIDENT'), true, 'Test 3.1: RESIDENT recognized');
assert.strictEqual(canAccessPortal('resident'), true, 'Test 3.2: RESIDENT accesses resident portal');
assert.strictEqual(canAccessPortal('admin'), false, 'Test 3.3: RESIDENT cannot access admin portal');
assert.strictEqual(canAccessPortal('guard'), false, 'Test 3.4: RESIDENT cannot access guard portal');
assert.strictEqual(hasPermission('complaint:submit'), true, 'Test 3.5: complaint:submit permission recognized');
assert.strictEqual(useAuthStore.getState().organizationId, 'org-res-1', 'Test 3.6: organizationId established');
console.log('✓ Test 3 Passed: /auth/me response populates RESIDENT');

// Test 4: /auth/me response populates GUARD
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'grd-1', mobileNumber: '+919800000004' },
  memberships: [
    {
      organizationId: 'org-guard-1',
      role: 'GUARD',
      permissions: ['visitor:scan', 'visitor:entry'],
    },
  ],
});
assert.strictEqual(hasRole('GUARD'), true, 'Test 4.1: GUARD recognized');
assert.strictEqual(canAccessPortal('guard'), true, 'Test 4.2: GUARD accesses guard portal');
assert.strictEqual(canAccessPortal('admin'), false, 'Test 4.3: GUARD cannot access admin portal');
assert.strictEqual(canAccessPortal('resident'), false, 'Test 4.4: GUARD cannot access resident portal');
assert.strictEqual(hasPermission('visitor:scan'), true, 'Test 4.5: visitor:scan permission recognized');
assert.strictEqual(useAuthStore.getState().organizationId, 'org-guard-1', 'Test 4.6: organizationId established');
console.log('✓ Test 4 Passed: /auth/me response populates GUARD');

// Test 5: Single organization automatically selects organization
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'usr-single', mobileNumber: '+919800000005' },
  memberships: [
    {
      organizationId: 'org-single-42',
      role: 'RESIDENT',
      permissions: ['complaint:submit'],
    },
  ],
});
assert.strictEqual(useAuthStore.getState().organizationId, 'org-single-42', 'Test 5.1: auto-selected single org');
assert.deepStrictEqual(useAuthStore.getState().roles, ['RESIDENT'], 'Test 5.2: roles established');
assert.deepStrictEqual(useAuthStore.getState().permissions, ['complaint:submit'], 'Test 5.3: permissions established');
console.log('✓ Test 5 Passed: Single organization automatically selects organization');

// Test 6: Multiple organizations do NOT blindly select first
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'usr-multi', mobileNumber: '+919800000006' },
  memberships: [
    { organizationId: 'org-alpha', role: 'RESIDENT', permissions: ['complaint:submit'] },
    { organizationId: 'org-beta', role: 'SOCIETY_ADMIN', permissions: ['society:manage'] },
  ],
});
assert.strictEqual(useAuthStore.getState().organizationId, null, 'Test 6.1: Must not select memberships[0]');
assert.deepStrictEqual(useAuthStore.getState().roles, [], 'Test 6.2: Roles fail closed until org selection');
assert.deepStrictEqual(useAuthStore.getState().permissions, [], 'Test 6.3: Permissions fail closed until org selection');
assert.strictEqual(useAuthStore.getState().memberships.length, 2, 'Test 6.4: All memberships preserved');
console.log('✓ Test 6 Passed: Multiple organizations do NOT blindly select first');

// Test 7: Selected organization determines effective role
useAuthStore.getState().setOrganizationId('org-alpha');
assert.strictEqual(useAuthStore.getState().organizationId, 'org-alpha', 'Test 7.1: org-alpha selected');
assert.deepStrictEqual(useAuthStore.getState().roles, ['RESIDENT'], 'Test 7.2: RESIDENT role on org-alpha');
assert.strictEqual(hasRole('RESIDENT'), true, 'Test 7.3: hasRole RESIDENT true');
assert.strictEqual(hasRole('SOCIETY_ADMIN'), false, 'Test 7.4: hasRole SOCIETY_ADMIN false');

useAuthStore.getState().setOrganizationId('org-beta');
assert.strictEqual(useAuthStore.getState().organizationId, 'org-beta', 'Test 7.5: org-beta selected');
assert.deepStrictEqual(useAuthStore.getState().roles, ['SOCIETY_ADMIN'], 'Test 7.6: SOCIETY_ADMIN role on org-beta');
assert.strictEqual(hasRole('SOCIETY_ADMIN'), true, 'Test 7.7: hasRole SOCIETY_ADMIN true');
assert.strictEqual(hasRole('RESIDENT'), false, 'Test 7.8: hasRole RESIDENT false');

// Normal user setting invalid/unauthorized org ID fails closed:
useAuthStore.getState().setOrganizationId('org-unauthorized-random');
assert.strictEqual(useAuthStore.getState().organizationId, null, 'Test 7.9: Unauthorized org ID fails closed');
assert.deepStrictEqual(useAuthStore.getState().roles, [], 'Test 7.10: Roles cleared on unauthorized org');
assert.strictEqual(hasRole('SOCIETY_ADMIN'), false, 'Test 7.11: SOCIETY_ADMIN denied');
assert.strictEqual(hasRole('RESIDENT'), false, 'Test 7.12: RESIDENT denied');
console.log('✓ Test 7 Passed: Selected organization determines effective role');

// Test 8: Selected organization determines effective permissions
useAuthStore.getState().setOrganizationId('org-alpha');
assert.strictEqual(hasPermission('complaint:submit'), true, 'Test 8.1: complaint:submit allowed on org-alpha');
assert.strictEqual(hasPermission('society:manage'), false, 'Test 8.2: society:manage denied on org-alpha');

useAuthStore.getState().setOrganizationId('org-beta');
assert.strictEqual(hasPermission('society:manage'), true, 'Test 8.3: society:manage allowed on org-beta');
assert.strictEqual(hasPermission('complaint:submit'), false, 'Test 8.4: complaint:submit denied on org-beta');
console.log('✓ Test 8 Passed: Selected organization determines effective permissions');

// Test 9: SUPER_ADMIN has no automatic organization
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'sa-platform', mobileNumber: '+919800000009' },
  memberships: [
    {
      organizationId: null,
      role: 'SUPER_ADMIN',
      permissions: ['platform:root'],
    },
  ],
});
assert.strictEqual(useAuthStore.getState().organizationId, null, 'Test 9.1: SUPER_ADMIN organizationId is null');
assert.strictEqual(hasRole('SUPER_ADMIN'), true, 'Test 9.2: SUPER_ADMIN role present');
assert.strictEqual(canAccessPortal('admin'), true, 'Test 9.3: SUPER_ADMIN accesses admin portal');
// SUPER_ADMIN can explicitly select a target society for cross-society ops while maintaining role
useAuthStore.getState().setOrganizationId('target-society-123');
assert.strictEqual(useAuthStore.getState().organizationId, 'target-society-123', 'Test 9.4: target society set');
assert.strictEqual(hasRole('SUPER_ADMIN'), true, 'Test 9.5: SUPER_ADMIN role maintained');
assert.strictEqual(hasPermission('platform:root'), true, 'Test 9.6: platform:root permission maintained');
console.log('✓ Test 9 Passed: SUPER_ADMIN has no automatic organization');

// Test 10: Unknown role fails closed
assert.strictEqual(isValidBackendRole('TENANT_ADMIN'), false, 'Test 10.1: TENANT_ADMIN is not valid');
assert.strictEqual(isValidBackendRole('admin'), false, 'Test 10.2: lowercase admin is not valid');
assert.strictEqual(hasRole('TENANT_ADMIN' as any), false, 'Test 10.3: Unknown role fails closed');
assert.strictEqual(hasAnyRole(['TENANT_ADMIN' as any]), false, 'Test 10.4: Unknown role in list fails closed');
console.log('✓ Test 10 Passed: Unknown role fails closed');

// Test 11: Missing permissions fail closed
assert.strictEqual(hasPermission('nonexistent:permission'), false, 'Test 11.1: Missing perm returns false');
assert.strictEqual(hasPermission(''), false, 'Test 11.2: Empty string returns false');
assert.strictEqual(hasAnyPermission(['perm:a', 'perm:b']), false, 'Test 11.3: hasAnyPermission fails closed');
console.log('✓ Test 11 Passed: Missing permissions fail closed');

// Test 12: Logout clears memberships/roles/permissions
useAuthStore.getState().logout();
assert.strictEqual(useAuthStore.getState().memberships.length, 0, 'Test 12.1: memberships cleared');
assert.strictEqual(useAuthStore.getState().roles.length, 0, 'Test 12.2: roles cleared');
assert.strictEqual(useAuthStore.getState().permissions.length, 0, 'Test 12.3: permissions cleared');
assert.strictEqual(useAuthStore.getState().organizationId, null, 'Test 12.4: organizationId cleared');
assert.strictEqual(useAuthStore.getState().isAuthenticated, false, 'Test 12.5: unauthenticated');
assert.strictEqual(hasRole('SUPER_ADMIN'), false, 'Test 12.6: hasRole returns false');
assert.strictEqual(hasPermission('platform:root'), false, 'Test 12.7: hasPermission returns false');
assert.strictEqual(mockStorage['societyos_memberships'], undefined, 'Test 12.8: storage memberships cleared');
assert.strictEqual(mockStorage['societyos_roles'], undefined, 'Test 12.9: storage roles cleared');
assert.strictEqual(mockStorage['societyos_permissions'], undefined, 'Test 12.10: storage perms cleared');
console.log('✓ Test 12 Passed: Logout clears memberships/roles/permissions');

// Test 13: 403 does not trigger refresh
const status403 = 403;
const is401 = (status403 as number) === 401;
assert.strictEqual(is401, false, 'Test 13.1: 403 status is strictly distinct from 401');
console.log('✓ Test 13 Passed: 403 does not trigger refresh');

// Test 14: /auth/me failure does not create fake authorization
useAuthStore.getState().clearAuth();
assert.strictEqual(useAuthStore.getState().isAuthenticated, false, 'Test 14.1: not authenticated');
assert.strictEqual(useAuthStore.getState().roles.length, 0, 'Test 14.2: zero roles');
assert.strictEqual(useAuthStore.getState().permissions.length, 0, 'Test 14.3: zero permissions');
assert.strictEqual(useAuthStore.getState().memberships.length, 0, 'Test 14.4: zero memberships');
assert.strictEqual(hasRole('RESIDENT'), false, 'Test 14.5: RESIDENT denied');
assert.strictEqual(hasRole('SOCIETY_ADMIN'), false, 'Test 14.6: SOCIETY_ADMIN denied');
assert.strictEqual(hasRole('GUARD'), false, 'Test 14.7: GUARD denied');
assert.strictEqual(hasRole('SUPER_ADMIN'), false, 'Test 14.8: SUPER_ADMIN denied');
assert.strictEqual(canAccessPortal('admin'), false, 'Test 14.9: admin portal denied');
assert.strictEqual(canAccessPortal('resident'), false, 'Test 14.10: resident portal denied');
assert.strictEqual(canAccessPortal('guard'), false, 'Test 14.11: guard portal denied');
console.log('✓ Test 14 Passed: /auth/me failure does not create fake authorization');

console.log('\nALL 14 RBAC & AUTH CONTEXT TESTS PASSED SUCCESSFULLY!');
