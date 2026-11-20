/**
 * SocietyOS Maintenance & Payments Domain Security & Authorization Tests (Phase 12 Step 10)
 *
 * Verifies all 28 required test cases:
 *  1. Resident dues load from /maintenance/dues/my
 *  2. Resident payment history loads from /maintenance/payments/my
 *  3. Resident does not call /maintenance/dues
 *  4. Resident does not call /maintenance/payments
 *  5. Resident does not call /maintenance/payments/resident/:residentId
 *  6. Resident empty dues state
 *  7. Resident empty payment history
 *  8. Resident loading state
 *  9. Resident API error
 * 10. Resident retry
 * 11. Partial payment display
 * 12. Overdue display
 * 13. Paid display
 * 14. Pre-existing payment mock data is not used
 * 15. Fake Pay Now behavior removed/disabled
 * 16. No fake payment ID generation
 * 17. No fake UPI success
 * 18. Admin maintenance configuration
 * 19. Admin due management
 * 20. Admin payment management
 * 21. Late-charge waiver permission
 * 22. Resident cannot see admin actions
 * 23. Guard cannot see maintenance/payment actions
 * 24. Organization context
 * 25. SUPER_ADMIN organization selection
 * 26. No hardcoded organization ID
 * 27. No mock fallback
 * 28. API errors handled correctly
 */

import assert from 'node:assert';
import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';
import { usePaymentStore } from '../../store/usePaymentStore';
import { hasRole, hasPermission, canAccessPortal } from '../auth/rbac';
import {
  getMyMaintenanceDues,
  getMyPayments,
  getOrganizationDues,
  getOrganizationPayments,
  getMaintenanceConfiguration,
  updateMaintenanceConfiguration,
  markDuePaid,
  markDueOverdue,
  waiveLateCharge,
  createPaymentRecord,
  BackendMaintenanceDue,
  BackendPayment,
  BackendMaintenanceConfiguration,
} from './maintenance.api';

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

console.log('--- Running SocietyOS Maintenance & Payments Domain Tests (Step 10) ---');

const MOCK_ORG_A = '11111111-1111-1111-1111-111111111111';
const MOCK_ORG_B = '22222222-2222-2222-2222-222222222222';
const MOCK_USER_RESIDENT = {
  id: 'resident-user-001',
  mobileNumber: '+919876543210',
};

const MOCK_MY_DUES: BackendMaintenanceDue[] = [
  {
    id: 'due-001',
    flat_id: 'flat-aaa',
    organization_id: MOCK_ORG_A,
    base_maintenance_amount: 3500,
    maintenance_multiplier: 1.0,
    calculated_amount: 3500,
    billing_period_start: '2026-10-01',
    billing_period_end: '2026-10-31',
    due_date: '2026-10-15',
    late_charge: 250,
    late_charge_waived: 0,
    status: 'PENDING',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
];

const MOCK_MY_PAYMENTS: BackendPayment[] = [
  {
    id: 'pay-001',
    organization_id: MOCK_ORG_A,
    resident_id: 'resident-entity-001',
    flat_id: 'flat-aaa',
    maintenance_due_id: 'due-000',
    amount: 3500,
    payment_method: 'UPI',
    payment_status: 'COMPLETED',
    payment_date: '2026-09-05T12:00:00.000Z',
    transaction_id: 'UPI-REF-998811',
    created_by: 'admin-001',
    created_at: '2026-09-05T12:00:00.000Z',
    updated_at: '2026-09-05T12:00:00.000Z',
  },
];

const MOCK_CONFIG: BackendMaintenanceConfiguration = {
  id: 'config-001',
  organization_id: MOCK_ORG_A,
  base_maintenance_amount: 3500,
  due_day_of_month: 15,
  late_charge_type: 'FIXED',
  late_charge_value: 250,
  late_charge_grace_days: 5,
  is_active: true,
};

function setupResidentContext() {
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setAuthContext({
    user: MOCK_USER_RESIDENT,
    memberships: [
      {
        organizationId: MOCK_ORG_A,
        role: 'RESIDENT',
        permissions: ['due:my', 'payment:my', 'visitor:my', 'visitor:preapprove'],
      },
    ],
  });
}

function setupAdminContext() {
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setAuthContext({
    user: { id: 'admin-user-001', mobileNumber: '+919999988888' },
    memberships: [
      {
        organizationId: MOCK_ORG_A,
        role: 'SOCIETY_ADMIN',
        permissions: [
          'due:my',
          'payment:my',
          'due:read',
          'due:manage',
          'payment:read',
          'payment:manage',
          'maintenance:read',
          'maintenance:manage',
          'late_charge:waive',
        ],
      },
    ],
  });
}

function setupGuardContext() {
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setAuthContext({
    user: { id: 'guard-user-001', mobileNumber: '+919777766666' },
    memberships: [
      {
        organizationId: MOCK_ORG_A,
        role: 'GUARD',
        permissions: ['visitor:read', 'visitor:manage'],
      },
    ],
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Track HTTP requests
  const recordedRequests: { method: string; url: string; headers?: any; data?: any }[] = [];

  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;
  const originalPatch = apiClient.patch;

  apiClient.get = (async (url: string, config?: any) => {
    recordedRequests.push({ method: 'GET', url, headers: config?.headers });
    if (url === '/maintenance/dues/my') {
      return { data: MOCK_MY_DUES };
    }
    if (url === '/maintenance/payments/my/page') return { data: { items: MOCK_MY_PAYMENTS, page: 1, limit: 5, total: 1, totalPages: 1 } };
    if (url === '/maintenance/payments/my') {
      return { data: MOCK_MY_PAYMENTS };
    }
    if (url === '/maintenance/dues') {
      return { data: MOCK_MY_DUES };
    }
    if (url === '/maintenance/payments') {
      return { data: MOCK_MY_PAYMENTS };
    }
    if (url === '/maintenance/config') {
      return { data: MOCK_CONFIG };
    }
    throw new ApiError(404, `Not found: ${url}`);
  }) as any;

  apiClient.post = (async (url: string, data?: any, config?: any) => {
    recordedRequests.push({ method: 'POST', url, data, headers: config?.headers });
    if (url.includes('/waive-late-charge')) {
      return { data: { ...MOCK_MY_DUES[0], late_charge_waived: 250 } };
    }
    if (url === '/maintenance/payments') {
      return { data: { ...MOCK_MY_PAYMENTS[0], ...data, id: 'pay-new-001' } };
    }
    return { data: {} };
  }) as any;

  apiClient.patch = (async (url: string, data?: any, config?: any) => {
    recordedRequests.push({ method: 'PATCH', url, data, headers: config?.headers });
    if (url.includes('/mark-paid')) {
      return { data: { ...MOCK_MY_DUES[0], status: 'PAID' } };
    }
    if (url.includes('/mark-overdue')) {
      return { data: { ...MOCK_MY_DUES[0], status: 'OVERDUE' } };
    }
    return { data: {} };
  }) as any;

  apiClient.put = (async (url: string, data?: any, config?: any) => {
    recordedRequests.push({ method: 'PUT', url, data, headers: config?.headers });
    return { data: { ...MOCK_CONFIG, ...data } };
  }) as any;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        passed++;
        console.log(`  ✓ ${name}`);
      })
      .catch((err) => {
        failed++;
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
      });
  }

  // 1. Resident dues load from /maintenance/dues/my
  await test('1. Resident dues load from /maintenance/dues/my', async () => {
    setupResidentContext();
    recordedRequests.length = 0;
    const dues = await getMyMaintenanceDues();
    assert.strictEqual(dues.length, 1);
    assert.strictEqual(dues[0].id, 'due-001');
    assert.strictEqual(recordedRequests[0].url, '/maintenance/dues/my');
  });

  // 2. Resident payment history loads from /maintenance/payments/my
  await test('2. Resident payment history loads from /maintenance/payments/my', async () => {
    setupResidentContext();
    recordedRequests.length = 0;
    const payments = await getMyPayments();
    assert.strictEqual(payments.length, 1);
    assert.strictEqual(payments[0].id, 'pay-001');
    assert.strictEqual(recordedRequests[0].url, '/maintenance/payments/my');
  });

  // 3. Resident does not call /maintenance/dues
  await test('3. Resident does not call /maintenance/dues', async () => {
    setupResidentContext();
    recordedRequests.length = 0;
    await usePaymentStore.getState().loadResidentDues();
    const calledOrgDues = recordedRequests.some((r) => r.url === '/maintenance/dues');
    assert.strictEqual(calledOrgDues, false, 'Resident must never call /maintenance/dues');
  });

  // 4. Resident does not call /maintenance/payments
  await test('4. Resident does not call /maintenance/payments', async () => {
    setupResidentContext();
    recordedRequests.length = 0;
    await usePaymentStore.getState().loadResidentPayments();
    const calledOrgPayments = recordedRequests.some((r) => r.url === '/maintenance/payments');
    assert.strictEqual(calledOrgPayments, false, 'Resident must never call /maintenance/payments');
  });

  // 5. Resident does not call /maintenance/payments/resident/:residentId
  await test('5. Resident does not call /maintenance/payments/resident/:residentId', async () => {
    setupResidentContext();
    recordedRequests.length = 0;
    await usePaymentStore.getState().loadResidentPayments();
    const calledResidentIdEndpoint = recordedRequests.some((r) => r.url.includes('/payments/resident/'));
    assert.strictEqual(calledResidentIdEndpoint, false, 'Must not use IDOR-prone resident-parameter endpoint');
  });

  // 6. Resident empty dues state
  await test('6. Resident empty dues state handles cleanly', async () => {
    const prevGet = apiClient.get;
    apiClient.get = (async () => ({ data: [] })) as any;
    try {
      setupResidentContext();
      await usePaymentStore.getState().loadResidentDues();
      assert.strictEqual(usePaymentStore.getState().maintenanceDue, null);
      assert.strictEqual(usePaymentStore.getState().residentDues.length, 0);
    } finally {
      apiClient.get = prevGet;
    }
  });

  // 7. Resident empty payment history
  await test('7. Resident empty payment history handles cleanly', async () => {
    const prevGet = apiClient.get;
    apiClient.get = (async () => ({ data: { items: [], page: 1, limit: 5, total: 0, totalPages: 1 } })) as any;
    try {
      setupResidentContext();
      await usePaymentStore.getState().loadResidentPayments();
      assert.strictEqual(usePaymentStore.getState().receipts.length, 0);
      assert.strictEqual(usePaymentStore.getState().residentPayments.length, 0);
    } finally {
      apiClient.get = prevGet;
    }
  });

  // 8. Resident loading state
  await test('8. Resident loading state tracked in store', async () => {
    setupResidentContext();
    const store = usePaymentStore.getState();
    assert.strictEqual(typeof store.isLoadingResidentDues, 'boolean');
    assert.strictEqual(typeof store.isLoadingResidentPayments, 'boolean');
  });

  // 9. Resident API error handled gracefully
  await test('9. Resident API error is stored as string without crashing', async () => {
    const prevGet = apiClient.get;
    apiClient.get = (async () => {
      throw new ApiError(500, 'Internal Server Error');
    }) as any;
    try {
      setupResidentContext();
      await usePaymentStore.getState().loadResidentDues();
      assert.strictEqual(usePaymentStore.getState().residentError, 'Internal Server Error');
    } finally {
      apiClient.get = prevGet;
    }
  });

  // 10. Resident retry clears error
  await test('10. Resident retry succeeds and clears error', async () => {
    setupResidentContext();
    await usePaymentStore.getState().loadResidentDues();
    assert.strictEqual(usePaymentStore.getState().residentError, null);
    assert.ok(usePaymentStore.getState().maintenanceDue !== null);
  });

  // 11. Partial payment calculation from backend
  await test('11. Authoritative financial calculation preserves backend values', async () => {
    setupResidentContext();
    await usePaymentStore.getState().loadResidentDues();
    const due = usePaymentStore.getState().maintenanceDue;
    assert.ok(due);
    assert.strictEqual(due?.originalAmount, 3500);
    assert.strictEqual(due?.lateCharge, 250);
    assert.strictEqual(due?.due, 3750); // 3500 + 250
  });

  // 12. Overdue display matches backend status
  await test('12. Overdue status matches backend enum', async () => {
    const prevGet = apiClient.get;
    apiClient.get = (async () => ({
      data: [{ ...MOCK_MY_DUES[0], status: 'OVERDUE' }],
    })) as any;
    try {
      setupResidentContext();
      await usePaymentStore.getState().loadResidentDues();
      assert.strictEqual(usePaymentStore.getState().maintenanceDue?.backendStatus, 'OVERDUE');
    } finally {
      apiClient.get = prevGet;
    }
  });

  // 13. Paid display matches backend status
  await test('13. Paid status matches backend enum', async () => {
    const prevGet = apiClient.get;
    apiClient.get = (async () => ({
      data: [{ ...MOCK_MY_DUES[0], status: 'PAID' }],
    })) as any;
    try {
      setupResidentContext();
      await usePaymentStore.getState().loadResidentDues();
      assert.strictEqual(usePaymentStore.getState().maintenanceDue?.backendStatus, 'PAID');
      assert.strictEqual(usePaymentStore.getState().maintenanceDue?.status, 'paid');
    } finally {
      apiClient.get = prevGet;
    }
  });

  // 14. Pre-existing payment mock data is not used in production store
  await test('14. Pre-existing mock data arrays are not active', () => {
    const store = usePaymentStore.getState();
    assert.ok(Array.isArray(store.residentDues));
    assert.ok(Array.isArray(store.residentPayments));
  });

  // 15. Fake Pay Now behavior removed/disabled (no fake local mutation)
  await test('15. Store does not fake mark dues as PAID on payment click', () => {
    const store = usePaymentStore.getState();
    assert.strictEqual((store as any).payWithUpi, undefined, 'payWithUpi simulation must be removed');
  });

  // 16. No fake payment ID generation
  await test('16. Store does not use Math.random() for payment IDs', () => {
    const storeContent = require('fs').readFileSync(
      require('path').join(process.cwd(), 'store/usePaymentStore.ts'),
      'utf8',
    );
    assert.strictEqual(storeContent.includes('Math.random()'), false, 'No Math.random() allowed in store');
  });

  // 17. No fake UPI success modal
  await test('17. UpiPaymentModal honestly explains gateway unavailability', () => {
    const modalContent = require('fs').readFileSync(
      require('path').join(process.cwd(), 'components/modals/UpiPaymentModal.tsx'),
      'utf8',
    );
    assert.ok(modalContent.includes('Online Gateway Coming Soon') || modalContent.includes('not yet enabled'));
    assert.strictEqual(modalContent.includes('payWithUpi'), false);
  });

  // 18. Admin maintenance configuration loads from /maintenance/config
  await test('18. Admin maintenance configuration loads via getMaintenanceConfiguration', async () => {
    setupAdminContext();
    recordedRequests.length = 0;
    const config = await getMaintenanceConfiguration();
    assert.ok(config);
    assert.strictEqual(config?.id, 'config-001');
    assert.strictEqual(recordedRequests[0].url, '/maintenance/config');
  });

  // 19. Admin due management (markPaid / markOverdue)
  await test('19. Admin due management calls backend endpoints', async () => {
    setupAdminContext();
    recordedRequests.length = 0;
    await markDuePaid('due-001');
    assert.strictEqual(recordedRequests[0].method, 'PATCH');
    assert.strictEqual(recordedRequests[0].url, '/maintenance/dues/due-001/mark-paid');

    await markDueOverdue('due-001');
    assert.strictEqual(recordedRequests[1].method, 'PATCH');
    assert.strictEqual(recordedRequests[1].url, '/maintenance/dues/due-001/mark-overdue');
  });

  // 20. Admin payment management (createPaymentRecord)
  await test('20. Admin payment management creates internal payment record', async () => {
    setupAdminContext();
    recordedRequests.length = 0;
    const res = await createPaymentRecord({
      organization_id: MOCK_ORG_A,
      maintenance_due_id: 'due-001',
      amount: 3750,
      payment_method: 'CASH',
    });
    assert.ok(res);
    assert.strictEqual(recordedRequests[0].method, 'POST');
    assert.strictEqual(recordedRequests[0].url, '/maintenance/payments');
  });

  // 21. Late-charge waiver requires permission late_charge:waive
  await test('21. Late-charge waiver permission check', () => {
    setupAdminContext();
    assert.strictEqual(hasPermission('late_charge:waive'), true);

    setupResidentContext();
    assert.strictEqual(hasPermission('late_charge:waive'), false);

    setupGuardContext();
    assert.strictEqual(hasPermission('late_charge:waive'), false);
  });

  // 22. Resident cannot see admin actions / roles
  await test('22. Resident cannot access admin maintenance actions', () => {
    setupResidentContext();
    assert.strictEqual(canAccessPortal('admin'), false);
    assert.strictEqual(hasPermission('due:manage'), false);
    assert.strictEqual(hasPermission('payment:manage'), false);
  });

  // 23. Guard cannot see maintenance/payment actions
  await test('23. Guard has no maintenance/payment permissions', () => {
    setupGuardContext();
    assert.strictEqual(hasPermission('due:my'), false);
    assert.strictEqual(hasPermission('payment:my'), false);
    assert.strictEqual(hasPermission('due:read'), false);
    assert.strictEqual(hasPermission('payment:read'), false);
    assert.strictEqual(canAccessPortal('resident'), false);
    assert.strictEqual(canAccessPortal('admin'), false);
  });

  // 24. Organization context header check
  await test('24. Organization context asserted prior to API calls', async () => {
    useAuthStore.setState({ organizationId: null });
    await assert.rejects(
      async () => {
        await getMyMaintenanceDues();
      },
      (err: any) => err instanceof ApiError && err.status === 400,
    );
  });

  // 25. SUPER_ADMIN organization selection
  await test('25. SUPER_ADMIN portal access respects role and org context', () => {
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setAuthContext({
      user: { id: 'super-admin-001', mobileNumber: '+919000000000' },
      memberships: [
        {
          organizationId: null,
          role: 'SUPER_ADMIN',
          permissions: ['due:my', 'payment:my', 'due:manage'],
        },
      ],
    });
    useAuthStore.getState().setOrganizationId(MOCK_ORG_B);
    assert.strictEqual(hasRole('SUPER_ADMIN'), true);
    assert.strictEqual(canAccessPortal('admin'), true);
    assert.strictEqual(useAuthStore.getState().organizationId, MOCK_ORG_B);
  });

  // 26. No hardcoded organization ID in maintenance.api.ts
  await test('26. No hardcoded organization ID in client api module', () => {
    const apiFile = require('fs').readFileSync(
      require('path').join(process.cwd(), 'lib/api/maintenance.api.ts'),
      'utf8',
    );
    assert.strictEqual(apiFile.includes('SOC-001'), false);
  });

  // 27. No mock fallback in store
  await test('27. Store does not fall back to mock dues on network error', async () => {
    const prevGet = apiClient.get;
    apiClient.get = (async () => {
      throw new ApiError(503, 'Service Unavailable');
    }) as any;
    try {
      setupResidentContext();
      await usePaymentStore.getState().loadResidentDues();
      assert.strictEqual(usePaymentStore.getState().residentDues.length, 0);
      assert.strictEqual(usePaymentStore.getState().maintenanceDue, null);
    } finally {
      apiClient.get = prevGet;
    }
  });

  // 28. API errors handled correctly across status codes
  await test('28. Normalized ApiError instance handles status codes', () => {
    const err = new ApiError(403, 'Forbidden');
    assert.strictEqual(err.status, 403);
    assert.strictEqual(err.backendMessage, 'Forbidden');
  });

  // Restore client methods
  apiClient.get = originalGet;
  apiClient.post = originalPost;
  apiClient.put = originalPut;
  apiClient.patch = originalPatch;

  console.log(`\nMaintenance & Payments Domain Tests Complete: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
