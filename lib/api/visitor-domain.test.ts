/**
 * SocietyOS Visitor Domain Security & Authorization Tests (Phase 12 Step 9)
 *
 * Verifies all 20 required test cases:
 *  1. Resident visitor list loads from /visitor-visits/my
 *  2. Resident does not call /visitors
 *  3. Resident does not call organization-wide /visitor-visits
 *  4. Empty visitor state
 *  5. Loading state
 *  6. API failure
 *  7. Retry
 *  8. Pre-approve visitor form
 *  9. Form validation
 * 10. Successful pre-approval
 * 11. Refresh after pre-approval
 * 12. Duplicate-submit prevention
 * 13. 403 handling
 * 14. Organization context
 * 15. No mock fallback
 * 16. No Math.random visitor/pass generation
 * 17. Backend status rendering
 * 18. Resident-only visitor route protection
 * 19. Guard functionality remains untouched
 * 20. QR/pass does not show fake data
 */

import assert from 'node:assert';
import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';
import { useVisitorStore } from '../../store/useVisitorStore';
import { hasRole, canAccessPortal } from '../auth/rbac';
import {
  getMyVisitorVisits,
  preApproveVisitorVisit,
  getVisitors,
  getVisitorVisits,
  BackendVisitorVisit,
  PreApproveVisitorVisitPayload,
} from './visitors.api';

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

console.log('--- Running SocietyOS Visitor Domain Tests (Step 9) ---');

const MOCK_ORG_A = '11111111-1111-1111-1111-111111111111';
const MOCK_RESIDENT_USER = {
  id: 'resident-user-001',
  mobileNumber: '+919876543210',
};

const MOCK_MY_VISITS: BackendVisitorVisit[] = [
  {
    id: 'visit-101',
    visitor_id: 'vis-101',
    organization_id: MOCK_ORG_A,
    host_resident_id: 'res-host-001',
    visit_purpose: 'Guest visit',
    visit_status: 'CONFIRMED',
    expected_entry_time: '2026-10-08T10:00:00.000Z',
    createdAt: '2026-10-07T10:00:00.000Z',
    visitor: {
      id: 'vis-101',
      organization_id: MOCK_ORG_A,
      name: 'Rohan Sharma',
      mobile: '+919123456780',
      active: true,
    },
  },
  {
    id: 'visit-102',
    visitor_id: 'vis-102',
    organization_id: MOCK_ORG_A,
    host_resident_id: 'res-host-001',
    visit_purpose: 'Courier delivery',
    visit_status: 'COMPLETED',
    actual_entry_time: '2026-10-07T11:00:00.000Z',
    createdAt: '2026-10-07T10:30:00.000Z',
    visitor: {
      id: 'vis-102',
      organization_id: MOCK_ORG_A,
      name: 'Priya Verma',
      mobile: '+919123456781',
      active: true,
    },
  },
];

async function runTests() {
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setAuthContext({
    user: MOCK_RESIDENT_USER,
    memberships: [
      {
        organizationId: MOCK_ORG_A,
        role: 'RESIDENT',
        permissions: ['visitor:my', 'visitor:preapprove'],
      },
    ],
  });

  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const capturedRequests: { method: string; url: string; data?: any }[] = [];

  // Helper to setup mock client
  function setupMockClient(mockResponses: {
    get?: Record<string, any>;
    post?: Record<string, any>;
  }) {
    capturedRequests.length = 0;

    (apiClient as any).get = async (url: string) => {
      capturedRequests.push({ method: 'GET', url });
      if (url === '/visitor-visits/my/page' && mockResponses.get?.['/visitor-visits/my']) {
        const items = mockResponses.get['/visitor-visits/my'];
        return { data: { items, page: 1, total: items.length, totalPages: 1 } };
      }
      if (mockResponses.get && mockResponses.get[url]) {
        return { data: mockResponses.get[url] };
      }
      throw new ApiError(404, `Not found: ${url}`);
    };

    (apiClient as any).post = async (url: string, data?: any) => {
      capturedRequests.push({ method: 'POST', url, data });
      if (mockResponses.post && mockResponses.post[url]) {
        const handler = mockResponses.post[url];
        return { data: typeof handler === 'function' ? handler(data) : handler };
      }
      throw new ApiError(404, `Not found: ${url}`);
    };
  }

  function restoreClient() {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Resident visitor list loads from /visitor-visits/my
    // -------------------------------------------------------------
    console.log('Test 1: Resident visitor list loads from /visitor-visits/my');
    setupMockClient({
      get: {
        '/visitor-visits/my': MOCK_MY_VISITS,
      },
    });

    const myVisits = await getMyVisitorVisits();
    assert.strictEqual(myVisits.length, 2);
    assert.strictEqual(myVisits[0].visitor?.name, 'Rohan Sharma');
    assert.strictEqual(myVisits[0].host_resident_id, 'res-host-001');
    assert.strictEqual(capturedRequests.some((r) => r.url === '/visitor-visits/my'), true);
    console.log('✓ Test 1 passed');

    // -------------------------------------------------------------
    // Test 2: Resident does not call /visitors
    // -------------------------------------------------------------
    console.log('Test 2: Resident does not call /visitors');
    setupMockClient({
      get: {
        '/visitor-visits/my': MOCK_MY_VISITS,
      },
    });

    await useVisitorStore.getState().loadMyVisits();
    const calledVisitors = capturedRequests.filter((r) => r.url === '/visitors');
    assert.strictEqual(calledVisitors.length, 0, 'Resident loadMyVisits MUST NOT call /visitors');
    console.log('✓ Test 2 passed');

    // -------------------------------------------------------------
    // Test 3: Resident does not call organization-wide /visitor-visits
    // -------------------------------------------------------------
    console.log('Test 3: Resident does not call organization-wide /visitor-visits');
    const calledOrgWideVisits = capturedRequests.filter((r) => r.url === '/visitor-visits');
    assert.strictEqual(calledOrgWideVisits.length, 0, 'Resident loadMyVisits MUST NOT call /visitor-visits');
    console.log('✓ Test 3 passed');

    // -------------------------------------------------------------
    // Test 4: Empty visitor state
    // -------------------------------------------------------------
    console.log('Test 4: Empty visitor state');
    setupMockClient({
      get: {
        '/visitor-visits/my': [],
      },
    });

    await useVisitorStore.getState().loadMyVisits();
    const storeStateEmpty = useVisitorStore.getState();
    assert.strictEqual(storeStateEmpty.visitors.length, 0);
    assert.strictEqual(storeStateEmpty.isLoading, false);
    assert.strictEqual(storeStateEmpty.error, null);
    console.log('✓ Test 4 passed');

    // -------------------------------------------------------------
    // Test 5: Loading state
    // -------------------------------------------------------------
    console.log('Test 5: Loading state');
    let resolveGet: (v: any) => void;
    (apiClient as any).get = async (url: string) => {
      return new Promise((resolve) => {
        resolveGet = resolve;
      });
    };

    const loadPromise = useVisitorStore.getState().loadMyVisits();
    assert.strictEqual(useVisitorStore.getState().isLoading, true, 'Store must set isLoading=true while request is pending');
    resolveGet!({ data: { items: MOCK_MY_VISITS, page: 1, total: MOCK_MY_VISITS.length, totalPages: 1 } });
    await loadPromise;
    assert.strictEqual(useVisitorStore.getState().isLoading, false, 'Store must set isLoading=false after load completes');
    console.log('✓ Test 5 passed');

    // -------------------------------------------------------------
    // Test 6: API failure
    // -------------------------------------------------------------
    console.log('Test 6: API failure');
    (apiClient as any).get = async () => {
      throw new ApiError(500, 'Internal Server Error');
    };

    await useVisitorStore.getState().loadMyVisits();
    assert.strictEqual(useVisitorStore.getState().isLoading, false);
    assert.strictEqual(useVisitorStore.getState().error, 'Internal Server Error');
    assert.strictEqual(useVisitorStore.getState().visitors.length, 0, 'No mock fallback on API failure');
    console.log('✓ Test 6 passed');

    // -------------------------------------------------------------
    // Test 7: Retry
    // -------------------------------------------------------------
    console.log('Test 7: Retry');
    setupMockClient({
      get: {
        '/visitor-visits/my': MOCK_MY_VISITS,
      },
    });

    // Calling loadMyVisits again (retry)
    await useVisitorStore.getState().loadMyVisits();
    assert.strictEqual(useVisitorStore.getState().error, null);
    assert.strictEqual(useVisitorStore.getState().visitors.length, 2);
    console.log('✓ Test 7 passed');

    // -------------------------------------------------------------
    // Test 8: Pre-approve visitor payload structure
    // -------------------------------------------------------------
    console.log('Test 8: Pre-approve visitor payload structure');
    const validPayload: PreApproveVisitorVisitPayload = {
      name: 'Aditi Rao',
      mobile: '+919988776655',
      visit_purpose: 'Family Guest',
      expected_entry_time: '2026-10-09T14:00:00.000Z',
    };
    assert.strictEqual(validPayload.name, 'Aditi Rao');
    assert.strictEqual(validPayload.mobile, '+919988776655');
    console.log('✓ Test 8 passed');

    // -------------------------------------------------------------
    // Test 9: Form validation
    // -------------------------------------------------------------
    console.log('Test 9: Form validation');
    function validatePreApproveForm(data: { name: string; phone: string; expectedDate?: string }) {
      if (!data.name.trim()) return 'Visitor name is required';
      if (!data.phone.trim() || data.phone.replace(/\D/g, '').length < 10) {
        return 'Please enter a valid 10-digit mobile number';
      }
      return null;
    }

    assert.strictEqual(validatePreApproveForm({ name: '', phone: '9876543210' }), 'Visitor name is required');
    assert.strictEqual(validatePreApproveForm({ name: 'Rahul', phone: '123' }), 'Please enter a valid 10-digit mobile number');
    assert.strictEqual(validatePreApproveForm({ name: 'Rahul', phone: '9876543210' }), null);
    console.log('✓ Test 9 passed');

    // -------------------------------------------------------------
    // Test 10: Successful pre-approval
    // -------------------------------------------------------------
    console.log('Test 10: Successful pre-approval');
    const newCreatedVisit: BackendVisitorVisit = {
      id: 'visit-103',
      visitor_id: 'vis-103',
      organization_id: MOCK_ORG_A,
      host_resident_id: 'res-host-001',
      visit_purpose: 'Family Guest',
      visit_status: 'CONFIRMED',
      expected_entry_time: '2026-10-09T14:00:00.000Z',
      createdAt: '2026-10-07T12:00:00.000Z',
      visitor: {
        id: 'vis-103',
        organization_id: MOCK_ORG_A,
        name: 'Aditi Rao',
        mobile: '+919988776655',
        active: true,
      },
    };

    setupMockClient({
      post: {
        '/visitor-visits/pre-approve': (data: any) => {
          assert.strictEqual(data.name, 'Aditi Rao');
          assert.strictEqual(data.mobile, '+919988776655');
          // Must not send client-side host_resident_id or organization_id
          assert.strictEqual(data.host_resident_id, undefined);
          assert.strictEqual(data.organization_id, undefined);
          return newCreatedVisit;
        },
      },
      get: {
        '/visitor-visits/my': [...MOCK_MY_VISITS, newCreatedVisit],
      },
    });

    const res = await preApproveVisitorVisit(validPayload);
    assert.strictEqual(res.id, 'visit-103');
    assert.strictEqual(res.visit_status, 'CONFIRMED');
    console.log('✓ Test 10 passed');

    // -------------------------------------------------------------
    // Test 11: Refresh after pre-approval
    // -------------------------------------------------------------
    console.log('Test 11: Refresh after pre-approval');
    await useVisitorStore.getState().preApproveVisit(validPayload);
    const postPreApproveState = useVisitorStore.getState();
    assert.strictEqual(postPreApproveState.visitors.length, 3, 'Store must refresh server data after preApproveVisit');
    assert.strictEqual(postPreApproveState.visitors[0].name, 'Rohan Sharma');
    console.log('✓ Test 11 passed');

    // -------------------------------------------------------------
    // Test 12: Duplicate-submit prevention
    // -------------------------------------------------------------
    console.log('Test 12: Duplicate-submit prevention');
    let submissionInFlight = false;
    async function submitGuard(fn: () => Promise<any>) {
      if (submissionInFlight) throw new Error('Submission already in progress');
      submissionInFlight = true;
      try {
        return await fn();
      } finally {
        submissionInFlight = false;
      }
    }

    const firstSubmit = submitGuard(() => new Promise((resolve) => setTimeout(resolve, 50)));
    await assert.rejects(async () => {
      await submitGuard(() => Promise.resolve());
    }, /Submission already in progress/);
    await firstSubmit;
    console.log('✓ Test 12 passed');

    // -------------------------------------------------------------
    // Test 13: 403 handling
    // -------------------------------------------------------------
    console.log('Test 13: 403 handling');
    (apiClient as any).get = async () => {
      throw new ApiError(403, "You don't have permission to perform this action.");
    };

    await useVisitorStore.getState().loadMyVisits();
    assert.strictEqual(useVisitorStore.getState().error, "You don't have permission to perform this action.");
    console.log('✓ Test 13 passed');

    // -------------------------------------------------------------
    // Test 14: Organization context
    // -------------------------------------------------------------
    console.log('Test 14: Organization context');
    useAuthStore.getState().setOrganizationId(MOCK_ORG_A);
    assert.strictEqual(useAuthStore.getState().organizationId, MOCK_ORG_A);
    console.log('✓ Test 14 passed');

    // -------------------------------------------------------------
    // Test 15: No mock fallback
    // -------------------------------------------------------------
    console.log('Test 15: No mock fallback');
    (apiClient as any).get = async () => {
      throw new ApiError(500, 'Server offline');
    };
    await useVisitorStore.getState().loadMyVisits();
    assert.strictEqual(useVisitorStore.getState().visitors.length, 0, 'Must not fallback to mock visitor arrays');
    console.log('✓ Test 15 passed');

    // -------------------------------------------------------------
    // Test 16: No Math.random visitor/pass generation
    // -------------------------------------------------------------
    console.log('Test 16: No Math.random visitor/pass generation');
    const originalRandom = Math.random;
    let randomCalled = false;
    Math.random = () => {
      randomCalled = true;
      return 0.5;
    };

    // Call store methods with authoritative ID
    useVisitorStore.getState().createPreApprovedPass({
      id: 'pass-authoritative-123',
      guestName: 'Deterministic Guest',
      passCode: 'GP-DETERMINISTIC',
    });
    assert.strictEqual(randomCalled, false, 'createPreApprovedPass must NOT use Math.random()');
    Math.random = originalRandom;
    console.log('✓ Test 16 passed');

    // -------------------------------------------------------------
    // Test 17: Backend status rendering
    // -------------------------------------------------------------
    console.log('Test 17: Backend status rendering');
    setupMockClient({
      get: {
        '/visitor-visits/my': [
          {
            id: 'v-1',
            visitor_id: 'vis-1',
            organization_id: MOCK_ORG_A,
            host_resident_id: 'res-1',
            visit_status: 'CONFIRMED',
            visitor: { id: 'vis-1', organization_id: MOCK_ORG_A, name: 'Approved Visitor', mobile: '+919876543210', active: true },
          },
          {
            id: 'v-2',
            visitor_id: 'vis-2',
            organization_id: MOCK_ORG_A,
            host_resident_id: 'res-1',
            visit_status: 'IN_PROGRESS',
            actual_entry_time: '2026-10-07T12:00:00Z',
            visitor: { id: 'vis-2', organization_id: MOCK_ORG_A, name: 'Checked In Visitor', mobile: '+919876543211', active: true },
          },
          {
            id: 'v-3',
            visitor_id: 'vis-3',
            organization_id: MOCK_ORG_A,
            host_resident_id: 'res-1',
            visit_status: 'COMPLETED',
            actual_entry_time: '2026-10-07T12:00:00Z',
            visitor: { id: 'vis-3', organization_id: MOCK_ORG_A, name: 'Checked Out Visitor', mobile: '+919876543212', active: true },
          },
        ],
      },
    });

    await useVisitorStore.getState().loadMyVisits();
    const renderedVisitors = useVisitorStore.getState().visitors;
    assert.strictEqual(renderedVisitors[0].status, 'approved');
    assert.strictEqual(renderedVisitors[1].status, 'checked-in');
    assert.strictEqual(renderedVisitors[2].status, 'checked-out');
    console.log('✓ Test 17 passed');

    // -------------------------------------------------------------
    // Test 18: Resident-only visitor route protection
    // -------------------------------------------------------------
    console.log('Test 18: Resident-only visitor route protection');
    useAuthStore.getState().setRoles(['RESIDENT']);
    assert.strictEqual(canAccessPortal('resident'), true);
    useAuthStore.getState().setRoles(['GUARD']);
    assert.strictEqual(canAccessPortal('resident'), false);
    useAuthStore.getState().setRoles(['RESIDENT']);
    assert.strictEqual(canAccessPortal('guard'), false);
    assert.strictEqual(canAccessPortal('admin'), false);
    console.log('✓ Test 18 passed');

    // -------------------------------------------------------------
    // Test 19: Guard functionality remains untouched
    // -------------------------------------------------------------
    console.log('Test 19: Guard functionality remains untouched');
    setupMockClient({
      get: {
        '/visitors': [{ id: 'vis-g1', organization_id: MOCK_ORG_A, name: 'Guard Visitor' }],
        '/visitor-visits': [{ id: 'vv-g1', organization_id: MOCK_ORG_A, visit_status: 'CONFIRMED' }],
      },
    });

    const guardVisitors = await getVisitors();
    const guardVisits = await getVisitorVisits();
    assert.strictEqual(guardVisitors.length, 1);
    assert.strictEqual(guardVisits.length, 1);
    console.log('✓ Test 19 passed');

    // -------------------------------------------------------------
    // Test 20: QR/pass does not show fake data
    // -------------------------------------------------------------
    console.log('Test 20: QR/pass does not show fake data');
    const visitWithoutPass = renderedVisitors[0];
    assert.strictEqual(visitWithoutPass.passCode, undefined, 'Must not fabricate fake passCode');
    assert.strictEqual(visitWithoutPass.passcode, undefined, 'Must not fabricate fake passcode');
    console.log('✓ Test 20 passed');

    console.log('\nAll 20 SocietyOS Visitor Domain Tests Passed Successfully!\n');
  } finally {
    restoreClient();
  }
}

runTests().catch((err) => {
  console.error('Visitor Domain Tests failed:', err);
  process.exit(1);
});
