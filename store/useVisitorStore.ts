import { residentPreview } from '../lib/api/resident-feeds.api';
import { create } from 'zustand';
import { Visitor, PreApprovedPass, VisitorStatus } from '../types';
import {
  getVisitors,
  getVisitorVisits,
  getVisitorPasses,
  decideMyVisitorVisit,
  preApproveVisitorVisit,
  createVisitor,
  createVisitorVisit,
  updateVisitorVisit,
  createVisitorPass,
  deleteVisitorPass,
  BackendVisitor,
  BackendVisitorVisit,
  BackendVisitorPass,
  PreApproveVisitorVisitPayload,
  CreateVisitorPassPayload,
} from '../lib/api/visitors.api';
import { getResidents } from '../lib/api/residents.api';
import { useAuthStore } from './useAuthStore';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';
import { localDayWindow } from '../lib/visitors/visit-window';

export interface GuardProfile {
  id: string;
  mobileNumber: string;
  role: 'GUARD';
  organizationId: string | null;
  gate: string;
}

interface GuardState {
  profile: GuardProfile | null;
  visitors: Visitor[];
  preApprovedPasses: PreApprovedPass[];
  filter: string;
  isLoading: boolean;
  error: string | null;
  hasLoadedVisitors: boolean;
  hasLoadedPasses: boolean;

  setFilter: (filter: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Resident backend synchronization
  loadMyVisits: () => Promise<void>;
  preApproveVisit: (payload: PreApproveVisitorVisitPayload) => Promise<BackendVisitorVisit>;
  approveMyVisitor: (visitId: string) => Promise<void>;
  rejectMyVisitor: (visitId: string) => Promise<void>;

  // Real backend synchronization (Guard)
  loadGuardData: () => Promise<void>;

  // Operations
  approveVisitorVisit: (visitId: string) => Promise<void>;
  denyVisitorVisit: (visitId: string) => Promise<void>;
  checkInVisitorVisit: (visitId: string, token?: string) => Promise<void>;
  checkOutVisitorVisit: (visitId: string) => Promise<void>;
  logWalkInVisitor: (params: {
    name: string;
    phone: string;
    purpose: string;
    flat: string;
    vehicleNo?: string | null;
    hostResidentId?: string;
  }) => Promise<void>;
  createPass: (payload: {
    visitorId: string;
    validityStart?: string;
    validityEnd: string;
    issuer?: string;
  }) => Promise<void>;
  revokePass: (passId: string) => Promise<void>;
  verifyPassByCode: (passCode: string) => PreApprovedPass | undefined;
  getPassByCodeOrName: (codeOrName: string) => PreApprovedPass | undefined;

  // Compatibility helpers
  approveVisitor: (id: string) => Promise<void>;
  denyVisitor: (id: string) => Promise<void>;
  rejectVisitor: (id: string) => Promise<void>;
  checkInVisitor: (id: string) => Promise<void>;
  checkOutVisitor: (id: string) => Promise<void>;
  addVisitor: (visitor: Partial<Visitor>) => void;
  createPreApprovedPass: (pass: Partial<PreApprovedPass>) => PreApprovedPass;

  reset: () => void;
}

function mapVisitsToVisitors(
  visits: BackendVisitorVisit[],
  visitorsMap: Map<string, BackendVisitor>,
  passes: BackendVisitorPass[],
): Visitor[] {
  return visits.map((visit) => {
    const v = visitorsMap.get(visit.visitor_id);
    const pass = passes.find((p) => p.visitor_visit_id === visit.id);

    let status: VisitorStatus = 'requested';
    if (visit.visit_status === 'COMPLETED') {
      status = 'checked-out';
    } else if (visit.visit_status === 'CANCELLED' || visit.visit_status === 'EXPIRED') {
      status = 'denied';
    } else if (visit.actual_entry_time) {
      status = 'checked-in';
    } else if (visit.visit_status === 'CONFIRMED') {
      status = 'approved';
    } else {
      status = 'requested';
    }

    return {
      id: visit.id,
      visitDate: visit.actual_entry_time || visit.expected_entry_time || visit.createdAt,
      validityStart: pass?.validity_start,
      validityEnd: pass?.validity_end,
      passStatus: pass?.pass_status,
      name: v?.name || 'Visitor',
      phone: v?.mobile || '',
      purpose: visit.visit_purpose || 'General',
      flat: '—', // Linked via unit if available
      status,
      requestedAt: visit.createdAt ? new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
      approvedAt: visit.visit_status === 'CONFIRMED' ? 'Approved' : undefined,
      checkedInAt: visit.actual_entry_time ? new Date(visit.actual_entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      entryTime: visit.actual_entry_time ? new Date(visit.actual_entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      vehicleNo: null,
      notifiedViaWhatsApp: true,
      passCode: pass ? pass.id.toUpperCase() : undefined,
      passcode: pass ? pass.id.toUpperCase() : undefined,
      isPreApproved: Boolean(pass),
    };
  });
}

function mapPassesToPreApproved(
  passes: BackendVisitorPass[],
  visitorsMap: Map<string, BackendVisitor>,
  visits: BackendVisitorVisit[],
): PreApprovedPass[] {
  return passes.filter(pass => visits.some(visit => visit.id === pass.visitor_visit_id && visit.visit_status === 'CONFIRMED' && !visit.actual_entry_time)).map((pass) => {
    const v = visitorsMap.get(pass.visitor_id);
    const code = pass.id.toUpperCase();

    let status: PreApprovedPass['status'] = 'Active';
    if (pass.pass_status === 'EXPIRED') status = 'Expired';
    else if (pass.pass_status === 'REVOKED') status = 'Revoked';
    else status = 'Active';

    return {
      id: pass.id,
      visitId: pass.visitor_visit_id || undefined,
      passCode: code,
      guestName: v?.name || 'Pre-approved Guest',
      phone: v?.mobile || '',
      purpose: 'Guest Pass',
      flat: '—',
      resident: pass.issuer || 'Resident',
      startDate: pass.validity_start,
      endDate: pass.validity_end,
      validityDisplay: pass.validity_end ? `Valid till ${new Date(pass.validity_end).toLocaleDateString()}` : 'Active',
      gate: 'Main Gate Terminal',
      vehicleNo: null,
      status,
      createdAt: pass.createdAt ? new Date(pass.createdAt).toLocaleDateString() : '',
      qrToken: `SOC-PASS-${pass.id}`,
    };
  });
}

export function mapMyVisitsToVisitors(visits: BackendVisitorVisit[]): Visitor[] {
  return visits.map((visit) => {
    const v = visit.visitor;

    let status: VisitorStatus = 'requested';
    if (visit.visit_status === 'COMPLETED') {
      status = 'checked-out';
    } else if (visit.visit_status === 'CANCELLED' || visit.visit_status === 'EXPIRED') {
      status = 'denied';
    } else if (visit.actual_entry_time) {
      status = 'checked-in';
    } else if (visit.visit_status === 'CONFIRMED') {
      status = 'approved';
    } else {
      status = 'requested';
    }

    return {
      id: visit.id,
      visitDate: visit.actual_entry_time || visit.expected_entry_time || visit.createdAt,
      validityStart: visit.pass?.validity_start,
      validityEnd: visit.pass?.validity_end,
      passStatus: visit.pass?.pass_status,
      name: v?.name || 'Visitor',
      phone: v?.mobile || '',
      purpose: visit.visit_purpose || 'General',
      flat: '—',
      status,
      requestedAt: visit.createdAt
        ? new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recent',
      approvedAt: visit.visit_status === 'CONFIRMED' ? 'Approved' : undefined,
      checkedInAt: visit.actual_entry_time
        ? new Date(visit.actual_entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
      entryTime: visit.actual_entry_time
        ? new Date(visit.actual_entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
      vehicleNo: null,
      notifiedViaWhatsApp: true,
      isPreApproved: visit.visit_status === 'CONFIRMED',
    };
  });
}

let visitorLoadGeneration = 0;
function visitorScope(state: ReturnType<typeof useAuthStore.getState>): string {
  return JSON.stringify([state.backendUser?.id ?? state.user?.id, state.organizationId, state.isAuthenticated, state.logoutInProgress, state.sessionVersion, state.roles]);
}
function visitorRequestGuard(state: ReturnType<typeof useAuthStore.getState>): () => boolean {
  const scope = visitorScope(state);
  const generation = ++visitorLoadGeneration;
  return () => generation === visitorLoadGeneration && scope === visitorScope(useAuthStore.getState());
}

export const useVisitorStore = create<GuardState>((set, get) => ({
  profile: null,
  visitors: [],
  preApprovedPasses: [],
  filter: 'all',
  isLoading: false,
  error: null,
  hasLoadedVisitors: false,
  hasLoadedPasses: false,

  setFilter: (filter) => set({ filter }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  loadMyVisits: async () => {
    const auth = useAuthStore.getState();
    const fresh = visitorRequestGuard(auth);
    const orgId = auth.organizationId;
    if (!orgId) {
      set({
        error: 'No organization selected. Please select an organization.',
        isLoading: false,
        hasLoadedVisitors: true,
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const backendVisits = await residentPreview<BackendVisitorVisit>('/visitor-visits/my/page', { tab: 'gate-approvals', ...localDayWindow(), limit: 10 });
      if (!fresh()) return;
      const mappedVisitors = mapMyVisitsToVisitors(backendVisits);

      set({
        visitors: mappedVisitors,
        isLoading: false,
        error: null,
        hasLoadedVisitors: true,
      });
    } catch (err: unknown) {
      if (!fresh()) return;
      const message = err instanceof Error ? err.message : 'Failed to load visitor data.';
      set({
        visitors: [],
        isLoading: false,
        error: message,
        hasLoadedVisitors: true,
      });
    }
  },

  preApproveVisit: async (payload: PreApproveVisitorVisitPayload) => {
    set({ isLoading: true, error: null });
    try {
      const visit = await preApproveVisitorVisit(payload);
      await get().loadMyVisits();
      window.dispatchEvent?.(new Event('societyos:resident-feed-changed'));
      return visit;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to pre-approve visitor.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  approveMyVisitor: async (visitId: string) => {
    await decideMyVisitorVisit(visitId, 'APPROVED');
    await get().loadMyVisits();
    window.dispatchEvent?.(new Event('societyos:events-changed'));
  },

  rejectMyVisitor: async (visitId: string) => {
    await decideMyVisitorVisit(visitId, 'REJECTED');
    await get().loadMyVisits();
    window.dispatchEvent?.(new Event('societyos:events-changed'));
  },

  loadGuardData: async () => {
    const auth = useAuthStore.getState();
    const fresh = visitorRequestGuard(auth);
    const orgId = auth.organizationId;
    if (!orgId) {
      set({
        error: 'No organization selected. Please select an organization.',
        isLoading: false,
        hasLoadedVisitors: true,
        hasLoadedPasses: true,
      });
      return;
    }

    if (!get().hasLoadedVisitors) {
      set({ isLoading: true, error: null });
    } else if (get().error) {
      set({ error: null });
    }

    // Derive authoritative guard profile from auth store
    const guardProfile: GuardProfile = {
      id: auth.backendUser?.id || '',
      mobileNumber: auth.backendUser?.mobileNumber || '',
      role: 'GUARD',
      organizationId: orgId,
      gate: 'Gate 01 • Main Terminal',
    };

    try {
      const [backendVisitors, backendVisits, backendPasses] = await Promise.all([
        getVisitors(),
        getVisitorVisits(),
        getVisitorPasses(),
      ]);

      if (!fresh()) return;
      const visitorMap = new Map<string, BackendVisitor>();
      backendVisitors.forEach((v) => visitorMap.set(v.id, v));

      const mappedVisitors = mapVisitsToVisitors(backendVisits, visitorMap, backendPasses);
      const mappedPasses = mapPassesToPreApproved(backendPasses, visitorMap, backendVisits);

      set({
        profile: guardProfile,
        visitors: mappedVisitors,
        preApprovedPasses: mappedPasses,
        isLoading: false,
        error: null,
        hasLoadedVisitors: true,
        hasLoadedPasses: true,
      });
    } catch (err: unknown) {
      if (!fresh()) return;
      const message = err instanceof Error ? err.message : 'Failed to load visitor data.';
      set({
        profile: guardProfile,
        visitors: [],
        preApprovedPasses: [],
        isLoading: false,
        error: message,
        hasLoadedVisitors: true,
        hasLoadedPasses: true,
      });
    }
  },

  approveVisitorVisit: async (visitId: string) => {
    await updateVisitorVisit(visitId, { visit_status: 'CONFIRMED' });
    await get().loadGuardData();
  },

  denyVisitorVisit: async (visitId: string) => {
    await updateVisitorVisit(visitId, { visit_status: 'CANCELLED' });
    await get().loadGuardData();
  },

  checkInVisitorVisit: async (visitId: string, token?: string) => {
    await updateVisitorVisit(visitId, {
      visit_status: 'CONFIRMED',
      check_in: true,
      pass_token: token,
    });
    await get().loadGuardData();
  },

  checkOutVisitorVisit: async (visitId: string) => {
    await updateVisitorVisit(visitId, { visit_status: 'COMPLETED' });
    await get().loadGuardData();
  },

  logWalkInVisitor: async ({ name, phone, purpose, flat, vehicleNo, hostResidentId }) => {
    const orgId = useAuthStore.getState().organizationId;
    if (!orgId) throw new Error('Organization context is required');

    // 1. Resolve host resident ID if not explicitly provided
    let residentId = hostResidentId;
    if (!residentId) {
      try {
        const residents = await getResidents();
        if (residents && residents.length > 0) {
          residentId = residents[0].id;
        }
      } catch {}
    }

    // 2. Create visitor entity
    const createdVisitor = await createVisitor({
      organization_id: orgId,
      name,
      mobile: phone || '0000000000',
      active: true,
    });

    // 3. Create visitor visit with host resident ID
    await createVisitorVisit({
      organization_id: orgId,
      visitor_id: createdVisitor.id,
      host_resident_id: residentId,
      visit_status: 'PENDING',
      visit_purpose: purpose,
      expected_entry_time: new Date().toISOString(),
    });

    await get().loadGuardData();
  },

  createPass: async ({ visitorId, validityStart, validityEnd, issuer }) => {
    const orgId = useAuthStore.getState().organizationId;
    if (!orgId) throw new Error('Organization context is required');

    await createVisitorPass({
      organization_id: orgId,
      visitor_id: visitorId,
      issuer: issuer || 'Society Admin',
      pass_status: 'ACTIVE',
      validity_start: validityStart || new Date().toISOString(),
      validity_end: validityEnd,
    });

    await get().loadGuardData();
  },

  revokePass: async (passId: string) => {
    await deleteVisitorPass(passId);
    await get().loadGuardData();
  },

  verifyPassByCode: (passCode: string) => {
    const q = passCode.trim().toUpperCase();
    return get().preApprovedPasses.find(
      (p) => p.passCode.toUpperCase() === q || p.id.toUpperCase() === q,
    );
  },

  getPassByCodeOrName: (codeOrName: string) => {
    const q = codeOrName.trim().toUpperCase();
    if (!q) return undefined;
    return get().preApprovedPasses.find(
      (p) =>
        p.passCode.toUpperCase() === q ||
        p.id.toUpperCase() === q ||
        p.guestName.toUpperCase().includes(q),
    );
  },

  approveVisitor: async (id: string) => {
    await get().approveVisitorVisit(id);
  },

  denyVisitor: async (id: string) => {
    await get().denyVisitorVisit(id);
  },

  rejectVisitor: async (id: string) => {
    await get().denyVisitorVisit(id);
  },

  checkInVisitor: async (id: string) => {
    await get().checkInVisitorVisit(id);
  },

  checkOutVisitor: async (id: string) => {
    await get().checkOutVisitorVisit(id);
  },

  addVisitor: (v: Partial<Visitor>) => {
    if (!v.id) {
      throw new Error('Visitor ID must be provided by authoritative backend response');
    }
    const newVisitor: Visitor = {
      id: v.id,
      name: v.name || 'Visitor',
      phone: v.phone || '',
      purpose: v.purpose || 'General',
      flat: v.flat || '—',
      status: v.status || 'requested',
      requestedAt: v.requestedAt || 'Recent',
      vehicleNo: v.vehicleNo || null,
      notifiedViaWhatsApp: Boolean(v.notifiedViaWhatsApp),
      passCode: v.passCode,
      passcode: v.passcode,
      isPreApproved: Boolean(v.isPreApproved),
    };
    set((state) => ({ visitors: [newVisitor, ...state.visitors] }));
  },

  createPreApprovedPass: (passData: Partial<PreApprovedPass>): PreApprovedPass => {
    if (!passData.id) {
      throw new Error('Pass ID must be provided by authoritative backend response');
    }
    const code = passData.passCode || passData.id.toUpperCase();
    const newPass: PreApprovedPass = {
      id: passData.id,
      passCode: code,
      guestName: passData.guestName || 'Guest',
      phone: passData.phone || '',
      purpose: passData.purpose || 'Guest Pass',
      flat: passData.flat || '—',
      resident: passData.resident || 'Resident',
      startDate: passData.startDate || '',
      endDate: passData.endDate || '',
      validityDisplay: passData.validityDisplay || 'Active',
      gate: passData.gate || 'Main Gate Terminal',
      vehicleNo: passData.vehicleNo || null,
      status: 'Active',
      createdAt: passData.createdAt || '',
      qrToken: `SOC-PASS-${passData.id}`,
    };
    set((state) => ({ preApprovedPasses: [newPass, ...state.preApprovedPasses] }));
    return newPass;
  },

  reset: () => {
    ++visitorLoadGeneration;
    set({
      profile: null,
      visitors: [],
      preApprovedPasses: [],
      isLoading: false,
      error: null,
      hasLoadedVisitors: false,
      hasLoadedPasses: false,
    });
  },
}));

useAuthStore.subscribe((state, previous) => {
  if (visitorScope(state) !== visitorScope(previous)) useVisitorStore.getState().reset();
});
