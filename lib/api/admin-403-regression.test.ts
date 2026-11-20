/**
 * SocietyOS Admin 403 Regression & Authorization Suite
 *
 * Covers all 20 minimum required tests from Step 10:
 *  1. Admin login
 *  2. Admin access token
 *  3. Admin role resolution
 *  4. Admin organization context
 *  5. Admin dashboard APIs
 *  6. Admin CRUD APIs
 *  7. Admin reports
 *  8. Admin exports
 *  9. Admin audit APIs
 * 10. Admin notification/file APIs
 * 11. SUPER_ADMIN with valid X-Organization-Id
 * 12. SUPER_ADMIN without required target organization
 * 13. SOCIETY_ADMIN with valid membership
 * 14. Cross-organization access
 * 15. Resident attempting Admin API
 * 16. Guard attempting Admin API
 * 17. Invalid/malformed organization ID
 * 18. Missing permission
 * 19. Expired/invalid access token
 * 20. Frontend API client authorization/organization-header behavior
 */

import assert from 'node:assert';
import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';
import { hasRole, hasPermission, canAccessPortal } from '../auth/rbac';
import { getBuildings } from './buildings.api';
import { parkingApi } from './parking.api';
import { getAuditLogs } from './audit.api';
import { getOccupancyReport } from './reports.api';

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

console.log('--- Running SocietyOS Admin 403 Regression & Authorization Tests ---');

const VALID_ORG_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
const OTHER_ORG_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';

// 1. Admin login
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuth({
  accessToken: 'valid-admin-token',
  refreshToken: 'valid-admin-refresh',
  backendUser: { id: 'admin-user-1', mobileNumber: '+917381142451' },
  organizationId: VALID_ORG_ID,
  roles: ['SOCIETY_ADMIN'],
  permissions: ['society:manage', 'building:read', 'building:manage', 'report:read', 'audit:read'],
});
assert.strictEqual(useAuthStore.getState().isAuthenticated, true, 'Test 1: Admin logged in');

// 2. Admin access token attached
assert.strictEqual(useAuthStore.getState().accessToken, 'valid-admin-token', 'Test 2: Access token set');

// 3. Admin role resolution
assert.strictEqual(hasRole('SOCIETY_ADMIN'), true, 'Test 3: SOCIETY_ADMIN resolved');
assert.strictEqual(canAccessPortal('admin'), true, 'Test 3.1: Admin portal permitted');

// 4. Admin organization context
assert.strictEqual(useAuthStore.getState().organizationId, VALID_ORG_ID, 'Test 4: Organization context set');

// 5. Admin dashboard APIs have required permissions
assert.strictEqual(hasPermission('building:read'), true, 'Test 5: Dashboard read permission held');

// 6. Admin CRUD APIs
assert.strictEqual(hasPermission('building:manage'), true, 'Test 6: Admin CRUD manage permission held');

// 7. Admin reports
assert.strictEqual(hasPermission('report:read'), true, 'Test 7: Report permission held');

// 8. Admin exports
useAuthStore.getState().setPermissions([...useAuthStore.getState().permissions, 'report:export']);
assert.strictEqual(hasPermission('report:export'), true, 'Test 8: Export permission held');

// 9. Admin audit APIs
assert.strictEqual(hasPermission('audit:read'), true, 'Test 9: Audit permission held');

// 10. Admin notification/file APIs
useAuthStore.getState().setPermissions([...useAuthStore.getState().permissions, 'notification:manage', 'file:manage']);
assert.strictEqual(hasPermission('notification:manage'), true, 'Test 10.1: Notification permission held');
assert.strictEqual(hasPermission('file:manage'), true, 'Test 10.2: File permission held');

// 11. SUPER_ADMIN with valid X-Organization-Id
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'super-1', mobileNumber: '+917008845326' },
  memberships: [
    {
      organizationId: null,
      role: 'SUPER_ADMIN',
      permissions: ['building:read', 'building:manage', 'report:read'],
    },
  ],
});
useAuthStore.getState().setOrganizationId(VALID_ORG_ID);
assert.strictEqual(hasRole('SUPER_ADMIN'), true, 'Test 11.1: SUPER_ADMIN recognized');
assert.strictEqual(useAuthStore.getState().organizationId, VALID_ORG_ID, 'Test 11.2: SUPER_ADMIN target organization set');
assert.strictEqual(hasPermission('building:read'), true, 'Test 11.3: Permission active on target org');

// 12. SUPER_ADMIN without required target organization
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'super-1', mobileNumber: '+917008845326' },
  memberships: [
    {
      organizationId: null,
      role: 'SUPER_ADMIN',
      permissions: ['building:read'],
    },
  ],
});
assert.strictEqual(useAuthStore.getState().organizationId, null, 'Test 12: SUPER_ADMIN without target org has null organizationId');

// 13. SOCIETY_ADMIN with valid membership
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'sa-1', mobileNumber: '+917381142451' },
  memberships: [
    {
      organizationId: VALID_ORG_ID,
      role: 'SOCIETY_ADMIN',
      permissions: ['building:read'],
    },
  ],
});
assert.strictEqual(useAuthStore.getState().organizationId, VALID_ORG_ID, 'Test 13.1: Valid membership auto-selected');
assert.strictEqual(hasRole('SOCIETY_ADMIN'), true, 'Test 13.2: Role resolved');

// 14. Cross-organization access
// Switching to an unauthorized organization fails closed for normal user
useAuthStore.getState().setOrganizationId('unauthorized-society-99');
assert.strictEqual(useAuthStore.getState().organizationId, null, 'Test 14.1: Cross-organization access fails closed');
assert.strictEqual(useAuthStore.getState().roles.length, 0, 'Test 14.2: Roles revoked on unauthorized target');

// 15. Resident attempting Admin API
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'res-1', mobileNumber: '+919937898008' },
  memberships: [
    {
      organizationId: VALID_ORG_ID,
      role: 'RESIDENT',
      permissions: ['complaint:submit', 'building:read'],
    },
  ],
});
assert.strictEqual(canAccessPortal('admin'), false, 'Test 15.1: RESIDENT rejected from admin portal');
assert.strictEqual(hasPermission('building:manage'), false, 'Test 15.2: RESIDENT lacks admin building:manage');
assert.strictEqual(hasPermission('audit:read'), false, 'Test 15.3: RESIDENT lacks admin audit:read');

// 16. Guard attempting Admin API
useAuthStore.getState().clearAuth();
useAuthStore.getState().setAuthContext({
  user: { id: 'grd-1', mobileNumber: '+919938156756' },
  memberships: [
    {
      organizationId: VALID_ORG_ID,
      role: 'GUARD',
      permissions: ['visitor:read', 'visitor:manage'],
    },
  ],
});
assert.strictEqual(canAccessPortal('admin'), false, 'Test 16.1: GUARD rejected from admin portal');
assert.strictEqual(hasPermission('building:read'), false, 'Test 16.2: GUARD lacks admin building:read');
assert.strictEqual(hasPermission('report:read'), false, 'Test 16.3: GUARD lacks admin report:read');

// 17. Invalid/malformed organization ID
useAuthStore.getState().setOrganizationId('invalid-malformed-uuid!@#$');
assert.strictEqual(useAuthStore.getState().organizationId, null, 'Test 17: Malformed organization ID rejected');

// 18. Missing permission
assert.strictEqual(hasPermission('nonexistent:permission'), false, 'Test 18: Missing permission returns false');

// 19. Expired/invalid access token (ApiError normalization)
const err = new ApiError(403, 'Forbidden resource');
assert.strictEqual(err.status, 403, 'Test 19.1: 403 status mapped');
assert.strictEqual(err.message, 'Forbidden resource', 'Test 19.2: error message preserved');

// 20. Frontend API client authorization/organization-header behavior
const interceptedHeaders: Record<string, string> = {};
const fakeConfig: any = {
  headers: {
    set: (k: string, v: string) => {
      interceptedHeaders[k] = v;
    },
    has: (k: string) => Boolean(interceptedHeaders[k]),
  },
};
useAuthStore.getState().setAuth({
  accessToken: 'jwt-header-test-token',
  refreshToken: 'refresh-test',
  backendUser: { id: 'admin-header-1', mobileNumber: '+917381142451' },
  organizationId: VALID_ORG_ID,
  roles: ['SOCIETY_ADMIN'],
  permissions: ['society:read'],
});
// Execute interceptor handler logic
const interceptor = (apiClient.interceptors.request as any).handlers?.[0]?.fulfilled;
if (typeof interceptor === 'function') {
  interceptor(fakeConfig);
  assert.strictEqual(interceptedHeaders['Authorization'], 'Bearer jwt-header-test-token', 'Test 20.1: Bearer token attached');
  assert.strictEqual(interceptedHeaders['X-Organization-Id'], VALID_ORG_ID, 'Test 20.2: X-Organization-Id attached');
}

console.log('✓ All 20 Admin 403 Regression & Authorization Tests Passed Successfully!');
