/**
 * SocietyOS Super Admin — Organizations Domain API Tests (Phase 13 Step 1)
 *
 * Verifies the SUPER_ADMIN organization management + provisioning contract:
 *  1. Organization list success (SUPER_ADMIN, no org header)
 *  2. Organization list with selected org header
 *  3. Organization empty state
 *  4. Organization API error normalization (500)
 *  5. Organization create (POST body)
 *  6. Organization update (PATCH body)
 *  7. Organization delete/deactivate (DELETE)
 *  8. Provision SOCIETY_ADMIN (POST /organizations/:id/provision-admin)
 *  9. Provision conflict error normalization (409)
 * 10. Permission-gated provisioning access
 */

import assert from 'node:assert';
import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';
import { hasPermission } from '../auth/rbac';
import { organizationsApi, Organization } from './organizations.api';

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

console.log('--- Running SocietyOS SUPER_ADMIN Organizations Domain Tests ---');

const MOCK_ORG_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
const MOCK_ORGS: Organization[] = [
  {
    id: MOCK_ORG_ID,
    name: 'Greenwood Heights',
    identifier: 'Greenwood Heights',
    address: 'Plot 42, Sector 19',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    name: 'Silver Oaks',
    identifier: 'Silver Oaks',
    address: 'Plot 10, Sector 21',
    isActive: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
];

async function runTests() {
  // Establish SUPER_ADMIN auth store state (platform-scoped: no org header)
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setAuth({
    accessToken: 'test-super-jwt',
    refreshToken: 'test-super-refresh',
    backendUser: { id: 'super-user-1', mobileNumber: '+919000000000' },
    organizationId: null,
    roles: ['SUPER_ADMIN'],
    permissions: [
      'society:read',
      'society:manage',
      'admin_user:read',
      'admin_user:manage',
    ],
    memberships: [
      {
        organizationId: null,
        role: 'SUPER_ADMIN',
        permissions: [
          'society:read',
          'society:manage',
          'admin_user:read',
          'admin_user:manage',
        ],
      },
    ],
  });

  const originalAdapter = apiClient.defaults.adapter;
  let lastConfig: any = null;
  let mockHandler: (config: any) => Promise<{ status: number; data: any }> = async () => ({
    status: 200,
    data: {},
  });

  apiClient.defaults.adapter = async (config) => {
    lastConfig = config;
    const res = await mockHandler(config);
    if (res.status >= 400) {
      const err: any = new Error(`Request failed with status code ${res.status}`);
      err.response = { status: res.status, data: res.data, headers: {}, config };
      err.isAxiosError = true;
      throw err;
    }
    return {
      data: res.data,
      status: res.status,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const headerOrgId = () =>
    lastConfig.headers['X-Organization-Id'] || lastConfig.headers.get?.('X-Organization-Id');

  try {
    // -------------------------------------------------------------------------
    // Test 1: Organization list success (platform-scoped SUPER_ADMIN)
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/organizations');
      assert.strictEqual(cfg.method, 'get');
      return { status: 200, data: MOCK_ORGS };
    };

    const orgs = await organizationsApi.getOrganizations();
    assert.strictEqual(orgs.length, 2, 'Test 1.1: Returns 2 organizations');
    assert.strictEqual(orgs[0].name, 'Greenwood Heights', 'Test 1.2: Name matches');
    assert.strictEqual(
      headerOrgId(),
      undefined,
      'Test 1.3: X-Organization-Id omitted for platform-scoped SUPER_ADMIN',
    );
    console.log('✓ Test 1 Passed: Organization list success');

    // -------------------------------------------------------------------------
    // Test 2: Organization list with selected target org header
    // -------------------------------------------------------------------------
    useAuthStore.getState().setOrganizationId(MOCK_ORG_ID);
    mockHandler = async () => ({ status: 200, data: MOCK_ORGS });
    await organizationsApi.getOrganizations();
    assert.strictEqual(headerOrgId(), MOCK_ORG_ID, 'Test 2.1: Org header attached when selected');
    useAuthStore.getState().setOrganizationId(null);
    console.log('✓ Test 2 Passed: Organization list with selected org header');

    // -------------------------------------------------------------------------
    // Test 3: Organization empty state
    // -------------------------------------------------------------------------
    mockHandler = async () => ({ status: 200, data: [] });

    const emptyOrgs = await organizationsApi.getOrganizations();
    assert.strictEqual(emptyOrgs.length, 0, 'Test 3.1: Empty list returned');
    assert.deepStrictEqual(emptyOrgs, [], 'Test 3.2: Returns empty array');
    console.log('✓ Test 3 Passed: Organization empty state');

    // -------------------------------------------------------------------------
    // Test 4: Organization API error normalization
    // -------------------------------------------------------------------------
    mockHandler = async () => ({
      status: 500,
      data: { message: 'Internal Server Error while loading organizations' },
    });

    try {
      await organizationsApi.getOrganizations();
      assert.fail('Test 4.1: Should have thrown ApiError');
    } catch (err: any) {
      assert.strictEqual(err instanceof ApiError, true, 'Test 4.2: Throws normalized ApiError');
      assert.strictEqual(err.status, 500, 'Test 4.3: Status is 500');
      assert.strictEqual(
        err.backendMessage,
        'Internal Server Error while loading organizations',
        'Test 4.4: Error message preserved',
      );
    }
    console.log('✓ Test 4 Passed: Organization API error normalization');

    // -------------------------------------------------------------------------
    // Test 5: Organization create
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/organizations');
      assert.strictEqual(cfg.method, 'post');
      const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
      return {
        status: 201,
        data: {
          id: 'cccccccc-3333-4333-8333-ccccccccccc3',
          name: body.name,
          identifier: body.identifier ?? body.name,
          address: body.address ?? '',
          isActive: true,
          createdAt: '2026-10-10T00:00:00.000Z',
          updatedAt: '2026-10-10T00:00:00.000Z',
        },
      };
    };

    const createdOrg = await organizationsApi.createOrganization({
      name: 'Emerald Meadows',
      identifier: 'Emerald Meadows',
      address: 'Pune',
    });
    assert.strictEqual(
      createdOrg.name,
      'Emerald Meadows',
      'Test 5.1: Created organization returned',
    );
    assert.strictEqual(createdOrg.isActive, true, 'Test 5.2: New org is active');
    console.log('✓ Test 5 Passed: Organization create');

    // -------------------------------------------------------------------------
    // Test 6: Organization update
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/organizations/cccccccc-3333-4333-8333-ccccccccccc3');
      assert.strictEqual(cfg.method, 'patch');
      const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
      return { status: 200, data: { ...MOCK_ORGS[0], ...body } };
    };

    const updatedOrg = await organizationsApi.updateOrganization(
      'cccccccc-3333-4333-8333-ccccccccccc3',
      { name: 'Emerald Meadows Renamed' },
    );
    assert.strictEqual(updatedOrg.name, 'Emerald Meadows Renamed', 'Test 6.1: Updated name returned');
    console.log('✓ Test 6 Passed: Organization update');

    // -------------------------------------------------------------------------
    // Test 7: Organization delete/deactivate
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/organizations/cccccccc-3333-4333-8333-ccccccccccc3');
      assert.strictEqual(cfg.method, 'delete');
      return { status: 200, data: { ...MOCK_ORGS[0], isActive: false } };
    };

    const deactivatedOrg = await organizationsApi.deleteOrganization(
      'cccccccc-3333-4333-8333-ccccccccccc3',
    );
    assert.strictEqual(deactivatedOrg.isActive, false, 'Test 7.1: Organization marked inactive');
    console.log('✓ Test 7 Passed: Organization delete/deactivate');

    // -------------------------------------------------------------------------
    // Test 8: Provision SOCIETY_ADMIN
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(
        cfg.url,
        '/organizations/aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1/provision-admin',
      );
      assert.strictEqual(cfg.method, 'post');
      const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
      return {
        status: 201,
        data: {
          organization_id: MOCK_ORG_ID,
          organization_name: 'Greenwood Heights',
          user_id: 'new-admin-user-id',
          phone: body.phone,
          role: 'SOCIETY_ADMIN',
          fullName: body.fullName ?? null,
          email: body.email ?? null,
        },
      };
    };

    const provisioned = await organizationsApi.provisionAdmin(MOCK_ORG_ID, {
      phone: '+919876543210',
      fullName: 'Client Admin',
      email: 'client@example.com',
    });
    assert.strictEqual(provisioned.role, 'SOCIETY_ADMIN', 'Test 8.1: SOCIETY_ADMIN role granted');
    assert.strictEqual(
      provisioned.organization_id,
      MOCK_ORG_ID,
      'Test 8.2: Membership scoped to target org',
    );
    assert.strictEqual(provisioned.user_id, 'new-admin-user-id', 'Test 8.3: Account id returned');
    console.log('✓ Test 8 Passed: Provision SOCIETY_ADMIN');

    // -------------------------------------------------------------------------
    // Test 9: Provision conflict error normalization
    // -------------------------------------------------------------------------
    mockHandler = async () => ({
      status: 409,
      data: { message: 'This user already has a role in this organization' },
    });

    try {
      await organizationsApi.provisionAdmin(MOCK_ORG_ID, { phone: '+919876543210' });
      assert.fail('Test 9.1: Should have thrown ApiError');
    } catch (err: any) {
      assert.strictEqual(err instanceof ApiError, true, 'Test 9.2: Throws normalized ApiError');
      assert.strictEqual(err.status, 409, 'Test 9.3: Status is 409');
      assert.strictEqual(
        err.backendMessage,
        'This user already has a role in this organization',
        'Test 9.4: Conflict message preserved',
      );
    }
    console.log('✓ Test 9 Passed: Provision conflict error normalization');

    // -------------------------------------------------------------------------
    // Test 10: Permission-gated provisioning access
    // -------------------------------------------------------------------------
    assert.strictEqual(hasPermission('admin_user:manage'), true, 'Test 10.1: admin_user:manage allowed');
    assert.strictEqual(hasPermission('society:manage'), true, 'Test 10.2: society:manage allowed');

    // Remove permission to verify fail-closed gating
    useAuthStore.getState().setPermissions(['society:read', 'admin_user:read']);
    assert.strictEqual(hasPermission('admin_user:manage'), false, 'Test 10.3: admin_user:manage denied');
    assert.strictEqual(hasPermission('society:manage'), false, 'Test 10.4: society:manage denied');
    console.log('✓ Test 10 Passed: Permission-gated provisioning access');

    console.log('\nALL 10 ORGANIZATIONS DOMAIN TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    apiClient.defaults.adapter = originalAdapter;
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});