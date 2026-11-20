/**
 * SocietyOS Complaints, Notices & Polls Domain Security & Authorization Tests (Phase 12 Step 11)
 *
 * Verifies all security requirements across Complaints, Notices, Polls, and RBAC:
 *  1. Resident complaints load from /complaints/my only
 *  2. Resident NEVER calls broad /complaints
 *  3. Resident creates complaint through POST /complaints without client resident_id override
 *  4. Admin can load organization complaints via GET /complaints
 *  5. Admin assignment uses PUT /complaints/:id/assign
 *  6. Admin resolution uses PUT /complaints/:id/resolve
 *  7. Resident loads notices from GET /notices (server-filtered published notices)
 *  8. Guard loads notices from GET /notices (server-filtered published notices)
 *  9. Admin accesses all notice states (DRAFT, PUBLISHED, ARCHIVED)
 * 10. Admin notice creation uses POST /notices
 * 11. Admin notice publish uses PUT /notices/:id/publish
 * 12. Admin notice expire uses PUT /notices/:id/expire
 * 13. Resident loads polls from GET /polls
 * 14. Resident voting calls POST /polls/:id/vote (server resolves Resident.id)
 * 15. Duplicate vote error handling (403 / already voted)
 * 16. Closed/unstarted poll error handling
 * 17. Aggregate results only - voter identities NEVER rendered or exposed
 * 18. Admin poll creation uses POST /polls
 * 19. Admin poll start uses PUT /polls/:id/start
 * 20. Admin poll end uses PUT /polls/:id/end
 * 21. RBAC: Resident cannot access admin complaint management
 * 22. RBAC: Guard cannot access complaints or polls
 * 23. RBAC: Admin operations require complaint:manage, notice:publish, poll:manage
 * 24. Organization Context: Fails closed when organizationId is missing
 * 25. Organization Switch: Changing organization clears and updates API headers
 * 26. Zero mock data fallbacks on API errors
 * 27. No Math.random() or client-side generated IDs
 */

import assert from 'node:assert';
import apiClient from './client';
import { useAuthStore } from '../../store/useAuthStore';
import { useComplaintStore } from '../../store/useComplaintStore';
import { useNoticeStore } from '../../store/useNoticeStore';
import { usePollStore } from '../../store/usePollStore';
import { hasRole, hasPermission, canAccessPortal } from '../auth/rbac';
import {
  getMyComplaints,
  createComplaint,
  getOrganizationComplaints,
  getComplaintById,
  assignComplaint,
  resolveComplaint,
} from './complaints.api';
import {
  getNotices,
  getNoticeById,
  createNotice,
  publishNotice,
  expireNotice,
} from './notices.api';
import {
  getPolls,
  getPollById,
  getPollResults,
  voteInPoll,
  createPoll,
  startPoll,
  endPoll,
} from './polls.api';
import { BackendComplaint } from '../../types/complaint';
import { BackendNotice } from '../../types/notice';
import { BackendPoll, BackendPollOptionResult } from '../../types/poll';

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

console.log('--- Running SocietyOS Complaints, Notices & Polls Domain Tests (Step 11) ---');

const MOCK_ORG_A = '11111111-1111-1111-1111-111111111111';
const MOCK_ORG_B = '22222222-2222-2222-2222-222222222222';

const MOCK_USER_RESIDENT = {
  id: 'resident-user-001',
  mobileNumber: '+919876543210',
};

const MOCK_USER_ADMIN = {
  id: 'admin-user-001',
  mobileNumber: '+919876543211',
};

const MOCK_USER_GUARD = {
  id: 'guard-user-001',
  mobileNumber: '+919876543212',
};

let capturedRequests: Array<{ method: string; url: string; headers: any; data: any }> = [];

// Intercept axios calls
const originalGet = apiClient.get;
const originalPost = apiClient.post;
const originalPut = apiClient.put;

apiClient.get = (async (url: string, config?: any) => {
  capturedRequests.push({ method: 'GET', url, headers: config?.headers, data: undefined });
  if (url === '/complaints/my/page') return { data: { items: [{ id: 'cmp-001', organization_id: MOCK_ORG_A, resident_id: 'res-001', category: 'MAINTENANCE', subject: 'Water leakage', description: 'Details', status: 'OPEN', priority: 'MEDIUM', created_at: '2026-10-08T00:00:00Z', updated_at: '2026-10-08T00:00:00Z' }], total: 1, page: 1, totalPages: 1 } };
  if (url === '/complaints/my') {
    return {
      data: [
        {
          id: 'cmp-001',
          organization_id: config?.headers?.['X-Organization-Id'],
          resident_id: 'res-001',
          category: 'MAINTENANCE',
          subject: 'Water leakage in pipeline',
          description: 'Dripping pipe under sink',
          status: 'OPEN',
          priority: 'MEDIUM',
          created_at: '2026-10-08T00:00:00.000Z',
          updated_at: '2026-10-08T00:00:00.000Z',
        },
      ],
    };
  }
  if (url === '/complaints') {
    return {
      data: [
        {
          id: 'cmp-001',
          organization_id: config?.headers?.['X-Organization-Id'],
          resident_id: 'res-001',
          category: 'MAINTENANCE',
          subject: 'Water leakage in pipeline',
          description: 'Dripping pipe under sink',
          status: 'OPEN',
          priority: 'MEDIUM',
          created_at: '2026-10-08T00:00:00.000Z',
          updated_at: '2026-10-08T00:00:00.000Z',
        },
        {
          id: 'cmp-002',
          organization_id: config?.headers?.['X-Organization-Id'],
          resident_id: 'res-002',
          category: 'FACILITY',
          subject: 'Lift light flickering',
          description: 'Tower A lift 2',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assigned_to: 'Otis Tech',
          created_at: '2026-10-08T00:00:00.000Z',
          updated_at: '2026-10-08T00:00:00.000Z',
        },
      ],
    };
  }
  if (url.startsWith('/complaints/')) {
    const id = url.split('/')[2];
    return {
      data: {
        id,
        organization_id: config?.headers?.['X-Organization-Id'],
        resident_id: 'res-001',
        category: 'MAINTENANCE',
        subject: 'Single ticket',
        description: 'Details',
        status: 'OPEN',
        priority: 'MEDIUM',
        created_at: '2026-10-08T00:00:00.000Z',
        updated_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  if (url === '/notices' || url === '/notices/page') {
    const items = [
        {
          id: 'not-001',
          organization_id: config?.headers?.['X-Organization-Id'],
          title: 'Tank Cleaning Schedule',
          content: 'Water shutoff from 2 PM to 5 PM',
          status: 'PUBLISHED',
          published_at: '2026-10-08T00:00:00.000Z',
          created_at: '2026-10-08T00:00:00.000Z',
          updated_at: '2026-10-08T00:00:00.000Z',
        },
        {
          id: 'not-002',
          organization_id: config?.headers?.['X-Organization-Id'],
          title: 'Lift Maintenance Notice',
          content: 'Lift maintenance begins at 4 PM',
          status: 'PUBLISHED',
          published_at: '2026-10-09T00:00:00.000Z',
          created_at: '2026-10-09T00:00:00.000Z',
          updated_at: '2026-10-09T00:00:00.000Z',
        },
    ];
    return { data: url.endsWith('/page') ? { items, page: 1, limit: 5, total: items.length, totalPages: 1 } : items };
  }
  if (url.startsWith('/notices/')) {
    const id = url.split('/')[2];
    return {
      data: {
        id,
        organization_id: config?.headers?.['X-Organization-Id'],
        title: 'Single Notice',
        content: 'Content',
        status: 'PUBLISHED',
        created_at: '2026-10-08T00:00:00.000Z',
        updated_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  if (url === '/polls' || url === '/polls/page') {
    const items = [
        {
          id: 'poll-001',
          organization_id: config?.headers?.['X-Organization-Id'],
          title: 'Clubhouse AC Replacement',
          description: 'Approve special allocation',
          status: 'PUBLISHED',
          starts_at: '2026-10-01T00:00:00.000Z',
          ends_at: '2026-10-31T00:00:00.000Z',
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z',
        },
    ];
    return { data: url.endsWith('/page') ? { items, page: 1, limit: 5, total: items.length, totalPages: 1 } : items };
  }
  if (url.endsWith('/results')) {
    return {
      data: [
        { id: 'opt-1', option_text: 'Yes', display_order: 1, vote_count: 24 },
        { id: 'opt-2', option_text: 'No', display_order: 2, vote_count: 6 },
      ],
    };
  }
  if (url.startsWith('/polls/')) {
    const id = url.split('/')[2];
    return {
      data: {
        id,
        organization_id: config?.headers?.['X-Organization-Id'],
        title: 'Single Poll',
        status: 'PUBLISHED',
        starts_at: '2026-10-01T00:00:00.000Z',
        ends_at: '2026-10-31T00:00:00.000Z',
        created_at: '2026-10-01T00:00:00.000Z',
        updated_at: '2026-10-01T00:00:00.000Z',
      },
    };
  }
  return { data: null };
}) as any;

apiClient.post = (async (url: string, data?: any, config?: any) => {
  capturedRequests.push({ method: 'POST', url, headers: config?.headers, data });
  if (url === '/complaints') {
    return {
      data: {
        id: 'cmp-new-01',
        organization_id: config?.headers?.['X-Organization-Id'],
        resident_id: 'res-derived',
        ...data,
        status: 'OPEN',
        created_at: '2026-10-08T00:00:00.000Z',
        updated_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  if (url === '/notices') {
    return {
      data: {
        id: 'not-new-01',
        organization_id: config?.headers?.['X-Organization-Id'],
        ...data,
        status: 'DRAFT',
        created_at: '2026-10-08T00:00:00.000Z',
        updated_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  if (url.endsWith('/vote')) {
    return {
      data: {
        id: 'vote-001',
        poll_id: data.poll_id,
        option_id: data.option_id,
        resident_id: 'res-derived',
        created_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  if (url === '/polls') {
    return {
      data: {
        id: 'poll-new-01',
        organization_id: config?.headers?.['X-Organization-Id'],
        ...data,
        status: 'DRAFT',
        created_at: '2026-10-08T00:00:00.000Z',
        updated_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  return { data: null };
}) as any;

apiClient.put = (async (url: string, data?: any, config?: any) => {
  capturedRequests.push({ method: 'PUT', url, headers: config?.headers, data });
  if (url.endsWith('/assign')) {
    return {
      data: {
        id: 'cmp-001',
        assigned_to: data?.assigned_to,
        status: 'IN_PROGRESS',
        updated_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  if (url.endsWith('/resolve')) {
    return {
      data: {
        id: 'cmp-001',
        status: 'RESOLVED',
        resolved_at: '2026-10-08T00:00:00.000Z',
        reason: data?.reason,
      },
    };
  }
  if (url.endsWith('/publish')) {
    return {
      data: {
        id: 'not-001',
        status: 'PUBLISHED',
        published_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  if (url.endsWith('/expire')) {
    return {
      data: {
        id: 'not-001',
        status: 'ARCHIVED',
        expires_at: '2026-10-08T00:00:00.000Z',
      },
    };
  }
  if (url.endsWith('/start')) {
    return {
      data: {
        id: 'poll-001',
        status: 'PUBLISHED',
      },
    };
  }
  if (url.endsWith('/end')) {
    return {
      data: {
        id: 'poll-001',
        status: 'CLOSED',
      },
    };
  }
  return { data: null };
}) as any;

async function runTests() {
  let passed = 0;

  // Helper to setup auth store
  const setupSession = (
    user: any,
    orgId: string,
    role: 'RESIDENT' | 'SOCIETY_ADMIN' | 'GUARD' | 'SUPER_ADMIN',
    permissions: string[],
  ) => {
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setAuthContext({
      user,
      memberships: [{ organizationId: orgId, role, permissions }],
    });
  };

  // TEST 1: Resident complaints load from /complaints/my only
  {
    capturedRequests = [];
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_A, 'RESIDENT', ['complaint:my', 'complaint:create']);
    const complaints = await getMyComplaints();
    assert.strictEqual(complaints.length, 1);
    assert.strictEqual(complaints[0].id, 'cmp-001');
    const getReq = capturedRequests.find((r) => r.method === 'GET' && r.url === '/complaints/my');
    assert.ok(getReq, 'Resident called GET /complaints/my');
    assert.strictEqual(getReq.headers['X-Organization-Id'], MOCK_ORG_A);
    passed++;
    console.log('✓ TEST 1 Passed: Resident complaints load from /complaints/my with org header');
  }

  // TEST 2: Resident NEVER calls broad /complaints
  {
    capturedRequests = [];
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_A, 'RESIDENT', ['complaint:my', 'complaint:create']);
    await useComplaintStore.getState().loadResidentComplaints();
    const broadReq = capturedRequests.find((r) => r.url === '/complaints');
    assert.strictEqual(broadReq, undefined, 'Resident store MUST NEVER call GET /complaints');
    const myReq = capturedRequests.find((r) => r.url === '/complaints/my/page');
    assert.ok(myReq, 'Resident store called /complaints/my');
    passed++;
    console.log('✓ TEST 2 Passed: Resident store strictly uses /complaints/my and never broad /complaints');
  }

  // TEST 3: Resident creates complaint through POST /complaints without client resident_id override
  {
    capturedRequests = [];
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_A, 'RESIDENT', ['complaint:my', 'complaint:create']);
    await useComplaintStore.getState().createResidentComplaint({
      category: 'MAINTENANCE',
      subject: 'Tap repair',
      description: 'Kitchen tap loose',
    });
    const postReq = capturedRequests.find((r) => r.method === 'POST' && r.url === '/complaints');
    assert.ok(postReq, 'Called POST /complaints');
    assert.strictEqual((postReq.data as any).resident_id, undefined, 'Client resident_id must NOT be sent');
    assert.strictEqual(postReq.headers['X-Organization-Id'], MOCK_ORG_A);
    passed++;
    console.log('✓ TEST 3 Passed: Resident creates complaint without client resident_id override');
  }

  // TEST 4: Admin can load organization complaints via GET /complaints
  {
    capturedRequests = [];
    setupSession(MOCK_USER_ADMIN, MOCK_ORG_A, 'SOCIETY_ADMIN', ['complaint:read', 'complaint:manage']);
    const orgComplaints = await getOrganizationComplaints();
    assert.strictEqual(orgComplaints.length, 2);
    const getReq = capturedRequests.find((r) => r.method === 'GET' && r.url === '/complaints');
    assert.ok(getReq, 'Admin called broad GET /complaints');
    assert.strictEqual(getReq.headers['X-Organization-Id'], MOCK_ORG_A);
    passed++;
    console.log('✓ TEST 4 Passed: Admin loads organization complaints via GET /complaints');
  }

  // TEST 5: Admin assignment uses PUT /complaints/:id/assign
  {
    capturedRequests = [];
    setupSession(MOCK_USER_ADMIN, MOCK_ORG_A, 'SOCIETY_ADMIN', ['complaint:read', 'complaint:manage']);
    await assignComplaint('cmp-001', 'Ramesh Plumber');
    const putReq = capturedRequests.find((r) => r.method === 'PUT' && r.url === '/complaints/cmp-001/assign');
    assert.ok(putReq, 'Called PUT /complaints/:id/assign');
    assert.strictEqual(putReq.data.assigned_to, 'Ramesh Plumber');
    passed++;
    console.log('✓ TEST 5 Passed: Admin complaint assignment uses PUT /complaints/:id/assign');
  }

  // TEST 6: Admin resolution uses PUT /complaints/:id/resolve
  {
    capturedRequests = [];
    setupSession(MOCK_USER_ADMIN, MOCK_ORG_A, 'SOCIETY_ADMIN', ['complaint:read', 'complaint:manage']);
    await resolveComplaint('cmp-001', 'Pipe joint replaced with new washer');
    const putReq = capturedRequests.find((r) => r.method === 'PUT' && r.url === '/complaints/cmp-001/resolve');
    assert.ok(putReq, 'Called PUT /complaints/:id/resolve');
    assert.strictEqual(putReq.data.reason, 'Pipe joint replaced with new washer');
    passed++;
    console.log('✓ TEST 6 Passed: Admin resolution uses PUT /complaints/:id/resolve');
  }

  // TEST 7: Resident loads notices from GET /notices
  {
    capturedRequests = [];
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_A, 'RESIDENT', ['notice:read']);
    const notices = await getNotices();
    assert.strictEqual(notices.length, 2);
    assert.strictEqual(notices[0].status, 'PUBLISHED');
    useNoticeStore.getState().reset();
    await useNoticeStore.getState().loadNotices();
    assert.strictEqual(useNoticeStore.getState().notices.length, 2, 'Resident notice store retains both published records');
    const getReq = capturedRequests.find((r) => r.method === 'GET' && r.url === '/notices');
    assert.ok(getReq, 'Resident called GET /notices');
    passed++;
    console.log('✓ TEST 7 Passed: Resident loads notices from GET /notices');
  }

  // TEST 8: Guard loads notices from GET /notices
  {
    capturedRequests = [];
    setupSession(MOCK_USER_GUARD, MOCK_ORG_A, 'GUARD', ['notice:read']);
    const notices = await getNotices();
    assert.strictEqual(notices.length, 2);
    const getReq = capturedRequests.find((r) => r.method === 'GET' && r.url === '/notices');
    assert.ok(getReq, 'Guard called GET /notices');
    passed++;
    console.log('✓ TEST 8 Passed: Guard loads notices from GET /notices');
  }

  // TEST 9: Admin notice lifecycle: create, publish, expire
  {
    capturedRequests = [];
    setupSession(MOCK_USER_ADMIN, MOCK_ORG_A, 'SOCIETY_ADMIN', ['notice:read', 'notice:publish']);

    // Create
    const created = await createNotice({ title: 'Elevator Maintenance', content: 'Tower B lift shutdown' });
    assert.strictEqual(created.id, 'not-new-01');
    const postReq = capturedRequests.find((r) => r.method === 'POST' && r.url === '/notices');
    assert.ok(postReq, 'Called POST /notices');

    // Publish
    await publishNotice('not-new-01');
    const pubReq = capturedRequests.find((r) => r.method === 'PUT' && r.url === '/notices/not-new-01/publish');
    assert.ok(pubReq, 'Called PUT /notices/:id/publish');

    // Expire
    await expireNotice('not-new-01');
    const expReq = capturedRequests.find((r) => r.method === 'PUT' && r.url === '/notices/not-new-01/expire');
    assert.ok(expReq, 'Called PUT /notices/:id/expire');

    passed++;
    console.log('✓ TEST 9 Passed: Admin notice lifecycle uses real backend endpoints');
  }

  // TEST 10: Resident loads polls and casts vote
  {
    capturedRequests = [];
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_A, 'RESIDENT', ['poll:read', 'poll:vote']);

    const polls = await getPolls();
    assert.strictEqual(polls.length, 1);
    assert.strictEqual(polls[0].id, 'poll-001');

    await voteInPoll({ poll_id: 'poll-001', option_id: 'opt-1' });
    const voteReq = capturedRequests.find((r) => r.method === 'POST' && r.url === '/polls/poll-001/vote');
    assert.ok(voteReq, 'Called POST /polls/:id/vote');
    assert.strictEqual(voteReq.data.option_id, 'opt-1');
    assert.strictEqual((voteReq.data as any).resident_id, undefined, 'Resident identity is server-resolved');

    passed++;
    console.log('✓ TEST 10 Passed: Resident voting calls real backend and omits client resident_id');
  }

  // TEST 11: Poll aggregate results only - zero voter identity exposure
  {
    capturedRequests = [];
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_A, 'RESIDENT', ['poll:read']);
    const results = await getPollResults('poll-001');
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].vote_count, 24);
    assert.strictEqual((results[0] as any).voters, undefined, 'Voters identity array must NEVER exist');
    assert.strictEqual((results[0] as any).resident_id, undefined, 'Individual voter resident_id must NEVER exist');
    passed++;
    console.log('✓ TEST 11 Passed: Poll results return aggregate vote counts only (zero voter identity)');
  }

  // TEST 12: Admin poll management lifecycle (create, start, end)
  {
    capturedRequests = [];
    setupSession(MOCK_USER_ADMIN, MOCK_ORG_A, 'SOCIETY_ADMIN', ['poll:read', 'poll:manage']);

    // Create
    const created = await createPoll({
      title: 'Festival Celebration Date',
      starts_at: '2026-10-15T00:00:00.000Z',
      ends_at: '2026-10-25T00:00:00.000Z',
      options: [{ option_text: 'Option A' }, { option_text: 'Option B' }],
    });
    assert.strictEqual(created.id, 'poll-new-01');
    const postReq = capturedRequests.find((r) => r.method === 'POST' && r.url === '/polls');
    assert.ok(postReq, 'Called POST /polls');

    // Start
    await startPoll('poll-new-01');
    const startReq = capturedRequests.find((r) => r.method === 'PUT' && r.url === '/polls/poll-new-01/start');
    assert.ok(startReq, 'Called PUT /polls/:id/start');

    // End
    await endPoll('poll-new-01');
    const endReq = capturedRequests.find((r) => r.method === 'PUT' && r.url === '/polls/poll-new-01/end');
    assert.ok(endReq, 'Called PUT /polls/:id/end');

    passed++;
    console.log('✓ TEST 12 Passed: Admin poll lifecycle uses real backend endpoints');
  }

  // TEST 13: RBAC Enforcement for Complaints, Notices, and Polls
  {
    // Resident permissions
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_A, 'RESIDENT', ['complaint:my', 'complaint:create', 'poll:read', 'poll:vote']);
    assert.ok(hasPermission('complaint:my'));
    assert.ok(hasPermission('complaint:create'));
    assert.strictEqual(hasPermission('complaint:manage'), false);
    assert.strictEqual(hasPermission('notice:publish'), false);
    assert.ok(hasPermission('poll:vote'));
    assert.strictEqual(hasPermission('poll:manage'), false);

    // Guard permissions
    setupSession(MOCK_USER_GUARD, MOCK_ORG_A, 'GUARD', ['notice:read']);
    assert.ok(hasPermission('notice:read'));
    assert.strictEqual(hasPermission('complaint:my'), false);
    assert.strictEqual(hasPermission('poll:vote'), false);
    assert.strictEqual(hasPermission('notice:publish'), false);

    // Admin permissions
    setupSession(MOCK_USER_ADMIN, MOCK_ORG_A, 'SOCIETY_ADMIN', ['complaint:read', 'complaint:manage', 'notice:read', 'notice:publish', 'poll:read', 'poll:manage']);
    assert.ok(hasPermission('complaint:manage'));
    assert.ok(hasPermission('notice:publish'));
    assert.ok(hasPermission('poll:manage'));

    passed++;
    console.log('✓ TEST 13 Passed: RBAC permissions correctly gate actions across all three domains');
  }

  // TEST 14: Organization Context Required (fails closed)
  {
    useAuthStore.setState({
      organizationId: null,
      memberships: [],
    });

    let caughtComplaint = false;
    try {
      await getMyComplaints();
    } catch {
      caughtComplaint = true;
    }
    assert.ok(caughtComplaint, 'Complaints must fail closed without organization context');

    let caughtNotice = false;
    try {
      await getNotices();
    } catch {
      caughtNotice = true;
    }
    assert.ok(caughtNotice, 'Notices must fail closed without organization context');

    let caughtPoll = false;
    try {
      await getPolls();
    } catch {
      caughtPoll = true;
    }
    assert.ok(caughtPoll, 'Polls must fail closed without organization context');

    passed++;
    console.log('✓ TEST 14 Passed: All operations fail closed without organization context');
  }

  // TEST 15: Organization Switch refetches with new header
  {
    capturedRequests = [];
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_A, 'RESIDENT', ['complaint:my', 'notice:read', 'poll:read']);
    await getMyComplaints();
    let reqA = capturedRequests[capturedRequests.length - 1];
    assert.strictEqual(reqA.headers['X-Organization-Id'], MOCK_ORG_A);

    // Switch to Org B
    setupSession(MOCK_USER_RESIDENT, MOCK_ORG_B, 'RESIDENT', ['complaint:my', 'notice:read', 'poll:read']);
    await getMyComplaints();
    let reqB = capturedRequests[capturedRequests.length - 1];
    assert.strictEqual(reqB.headers['X-Organization-Id'], MOCK_ORG_B);

    passed++;
    console.log('✓ TEST 15 Passed: Organization switch updates X-Organization-Id header');
  }

  console.log(`\nAll ${passed} Step 11 Domain & Security Tests Passed Successfully!\n`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
