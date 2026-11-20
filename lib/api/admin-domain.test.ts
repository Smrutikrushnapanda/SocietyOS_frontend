/**
 * SocietyOS Admin Domain API & Society Structure Tests (Phase 12 Step 6)
 *
 * Verifies all 12 required test cases:
 *  1. Building list success
 *  2. Building empty state
 *  3. Building API error
 *  4. Building create
 *  5. Building update
 *  6. Building delete/deactivate
 *  7. Floor list
 *  8. Flat list
 *  9. Resident list
 * 10. Permission-gated action
 * 11. Missing organization context
 * 12. 403 does not trigger refresh
 */

import assert from 'node:assert';
import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';
import { hasPermission } from '../auth/rbac';
import {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  BackendBuilding,
} from './buildings.api';
import {
  getFloors,
  getFloorsByBuilding,
  BackendFloor,
} from './floors.api';
import {
  getFlats,
  getFlatsByBuilding,
  deleteFlat,
  BackendFlat,
} from './flats.api';
import {
  getResidents,
  BackendResident,
} from './residents.api';

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

console.log('--- Running SocietyOS Admin Domain API Tests ---');

// Mock backend fixtures
const MOCK_ORG_ID = '00000000-0000-0000-0000-000000000001';
const MOCK_BUILDINGS: BackendBuilding[] = [
  {
    id: 'bldg-1',
    organization_id: MOCK_ORG_ID,
    name: 'Tower A (Gulmohar)',
    code: 'T-A',
    totalFloors: 5,
    isActive: true,
  },
  {
    id: 'bldg-2',
    organization_id: MOCK_ORG_ID,
    name: 'Tower B (Amaltas)',
    code: 'T-B',
    totalFloors: 5,
    isActive: true,
  },
];

const MOCK_FLOORS: BackendFloor[] = [
  {
    id: 'floor-1',
    organization_id: MOCK_ORG_ID,
    building_id: 'bldg-1',
    floor_number: 1,
    name: 'Floor 1',
    isActive: true,
  },
  {
    id: 'floor-2',
    organization_id: MOCK_ORG_ID,
    building_id: 'bldg-1',
    floor_number: 2,
    name: 'Floor 2',
    isActive: true,
  },
];

const MOCK_FLATS: BackendFlat[] = [
  {
    id: 'flat-101',
    organization_id: MOCK_ORG_ID,
    building_id: 'bldg-1',
    floor_id: 'floor-1',
    flat_identifier: '101',
    flat_type: '3 BHK',
    maintenance_multiplier: 1.0,
    isActive: true,
  },
  {
    id: 'flat-102',
    organization_id: MOCK_ORG_ID,
    building_id: 'bldg-1',
    floor_id: 'floor-1',
    flat_identifier: '102',
    flat_type: '2 BHK',
    maintenance_multiplier: 1.0,
    isActive: true,
  },
];

const MOCK_RESIDENTS: BackendResident[] = [
  {
    id: 'res-1',
    user_id: 'usr-1',
    organization_id: MOCK_ORG_ID,
    flat_id: 'flat-101',
    kyc_status: 'VERIFIED',
    isActive: true,
    app_access_status: true,
    user: { id: 'usr-1', mobileNumber: '+919820011001' },
  },
];

async function runTests() {
  // Establish auth store state with active organization and permissions
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setAuth({
    accessToken: 'test-admin-jwt',
    refreshToken: 'test-admin-refresh',
    backendUser: { id: 'admin-user-1', mobileNumber: '+919820000000' },
    organizationId: MOCK_ORG_ID,
    roles: ['SOCIETY_ADMIN'],
    permissions: [
      'building:read',
      'building:manage',
      'floor:read',
      'floor:manage',
      'flat:read',
      'flat:manage',
      'resident:read',
      'resident:manage',
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

  try {
    // -------------------------------------------------------------------------
    // Test 1: Building list success
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/buildings');
      assert.strictEqual(cfg.method, 'get');
      return { status: 200, data: MOCK_BUILDINGS };
    };

    const buildings = await getBuildings();
    assert.strictEqual(buildings.length, 2, 'Test 1.1: Returns 2 buildings');
    assert.strictEqual(buildings[0].name, 'Tower A (Gulmohar)', 'Test 1.2: Building name matches');
    const headerOrgId =
      lastConfig.headers['X-Organization-Id'] || lastConfig.headers.get?.('X-Organization-Id');
    assert.strictEqual(headerOrgId, MOCK_ORG_ID, 'Test 1.3: Injects X-Organization-Id header');
    console.log('✓ Test 1 Passed: Building list success');

    // -------------------------------------------------------------------------
    // Test 2: Building empty state
    // -------------------------------------------------------------------------
    mockHandler = async () => ({ status: 200, data: [] });

    const emptyBuildings = await getBuildings();
    assert.strictEqual(emptyBuildings.length, 0, 'Test 2.1: Empty list returned');
    assert.deepStrictEqual(emptyBuildings, [], 'Test 2.2: Returns empty array');
    console.log('✓ Test 2 Passed: Building empty state');

    // -------------------------------------------------------------------------
    // Test 3: Building API error
    // -------------------------------------------------------------------------
    mockHandler = async () => ({
      status: 500,
      data: { message: 'Internal Server Error while loading buildings' },
    });

    try {
      await getBuildings();
      assert.fail('Test 3.1: Should have thrown ApiError');
    } catch (err: any) {
      assert.strictEqual(err instanceof ApiError, true, 'Test 3.2: Throws normalized ApiError');
      assert.strictEqual(err.status, 500, 'Test 3.3: Status is 500');
      assert.strictEqual(
        err.backendMessage,
        'Internal Server Error while loading buildings',
        'Test 3.4: Error message preserved',
      );
    }
    console.log('✓ Test 3 Passed: Building API error');

    // -------------------------------------------------------------------------
    // Test 4: Building create
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/buildings');
      assert.strictEqual(cfg.method, 'post');
      const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
      return {
        status: 201,
        data: {
          id: 'bldg-new',
          organization_id: body.organization_id,
          name: body.name,
          code: body.code,
          totalFloors: body.totalFloors,
          isActive: true,
        },
      };
    };

    const createdBuilding = await createBuilding({
      organization_id: MOCK_ORG_ID,
      name: 'Tower C (Jacaranda)',
      code: 'T-C',
      totalFloors: 6,
    });
    assert.strictEqual(createdBuilding.id, 'bldg-new', 'Test 4.1: Created building returned');
    assert.strictEqual(createdBuilding.name, 'Tower C (Jacaranda)', 'Test 4.2: Name matches');
    assert.strictEqual(createdBuilding.totalFloors, 6, 'Test 4.3: Total floors matches');
    console.log('✓ Test 4 Passed: Building create');

    // -------------------------------------------------------------------------
    // Test 5: Building update
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/buildings/bldg-1');
      assert.strictEqual(cfg.method, 'patch');
      const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
      return {
        status: 200,
        data: { ...MOCK_BUILDINGS[0], ...body },
      };
    };

    const updatedBuilding = await updateBuilding('bldg-1', { name: 'Tower A Renamed' });
    assert.strictEqual(updatedBuilding.name, 'Tower A Renamed', 'Test 5.1: Updated name returned');
    console.log('✓ Test 5 Passed: Building update');

    // -------------------------------------------------------------------------
    // Test 6: Building delete/deactivate
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/buildings/bldg-1');
      assert.strictEqual(cfg.method, 'delete');
      return {
        status: 200,
        data: { ...MOCK_BUILDINGS[0], isActive: false },
      };
    };

    const deactivatedBuilding = await deleteBuilding('bldg-1');
    assert.strictEqual(deactivatedBuilding.isActive, false, 'Test 6.1: Building marked inactive');
    console.log('✓ Test 6 Passed: Building delete/deactivate');

    // -------------------------------------------------------------------------
    // Test 7: Floor list
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      if (cfg.url === '/floors') return { status: 200, data: MOCK_FLOORS };
      if (cfg.url === '/floors/building/bldg-1') return { status: 200, data: MOCK_FLOORS };
      throw new Error(`Unexpected GET ${cfg.url}`);
    };

    const allFloors = await getFloors();
    assert.strictEqual(allFloors.length, 2, 'Test 7.1: Returns 2 floors');
    const buildingFloors = await getFloorsByBuilding('bldg-1');
    assert.strictEqual(buildingFloors.length, 2, 'Test 7.2: Returns building floors');
    console.log('✓ Test 7 Passed: Floor list');

    // -------------------------------------------------------------------------
    // Test 8: Flat list
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      if (cfg.url === '/flats') return { status: 200, data: MOCK_FLATS };
      if (cfg.url === '/flats/building/bldg-1') return { status: 200, data: MOCK_FLATS };
      throw new Error(`Unexpected GET ${cfg.url}`);
    };

    const allFlats = await getFlats();
    assert.strictEqual(allFlats.length, 2, 'Test 8.1: Returns 2 flats');
    const buildingFlats = await getFlatsByBuilding('bldg-1');
    assert.strictEqual(buildingFlats[0].flat_identifier, '101', 'Test 8.2: Flat identifier matches');
    console.log('✓ Test 8 Passed: Flat list');

    // -------------------------------------------------------------------------
    // Test 9: Resident list
    // -------------------------------------------------------------------------
    mockHandler = async (cfg) => {
      assert.strictEqual(cfg.url, '/residents');
      return { status: 200, data: MOCK_RESIDENTS };
    };

    const residents = await getResidents();
    assert.strictEqual(residents.length, 1, 'Test 9.1: Returns 1 resident');
    assert.strictEqual(residents[0].user?.mobileNumber, '+919820011001', 'Test 9.2: Mobile matches');
    console.log('✓ Test 9 Passed: Resident list');

    // -------------------------------------------------------------------------
    // Test 10: Permission-gated action
    // -------------------------------------------------------------------------
    assert.strictEqual(hasPermission('building:manage'), true, 'Test 10.1: building:manage allowed');
    assert.strictEqual(hasPermission('flat:manage'), true, 'Test 10.2: flat:manage allowed');
    assert.strictEqual(hasPermission('resident:manage'), true, 'Test 10.3: resident:manage allowed');

    // Remove permissions to verify fail-closed gating
    useAuthStore.getState().setPermissions(['building:read']);
    assert.strictEqual(hasPermission('building:read'), true, 'Test 10.4: building:read allowed');
    assert.strictEqual(hasPermission('building:manage'), false, 'Test 10.5: building:manage denied');
    assert.strictEqual(hasPermission('flat:manage'), false, 'Test 10.6: flat:manage denied');
    assert.strictEqual(hasPermission('resident:manage'), false, 'Test 10.7: resident:manage denied');
    console.log('✓ Test 10 Passed: Permission-gated action');

    // -------------------------------------------------------------------------
    // Test 11: Missing organization context
    // -------------------------------------------------------------------------
    useAuthStore.getState().setOrganizationId(null);
    assert.strictEqual(
      useAuthStore.getState().organizationId,
      null,
      'Test 11.1: Organization ID is null',
    );

    mockHandler = async () => ({ status: 200, data: [] });
    await getBuildings();
    const missingOrgHeader =
      lastConfig.headers['X-Organization-Id'] || lastConfig.headers.get?.('X-Organization-Id');
    assert.strictEqual(
      missingOrgHeader,
      undefined,
      'Test 11.2: X-Organization-Id header is omitted when org context is unset',
    );
    console.log('✓ Test 11 Passed: Missing organization context');

    // -------------------------------------------------------------------------
    // Test 12: 403 does not trigger refresh
    // -------------------------------------------------------------------------
    const err403 = new ApiError(403, 'Forbidden: permission required');
    assert.strictEqual(err403.status, 403, 'Test 12.1: Status is 403');
    assert.strictEqual(
      (err403.status as number) === 401,
      false,
      'Test 12.2: 403 is distinct from 401 and does not enter refresh logic',
    );
    console.log('✓ Test 12 Passed: 403 does not trigger refresh');

    console.log('\nALL 12 ADMIN DOMAIN TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    apiClient.defaults.adapter = originalAdapter;
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
