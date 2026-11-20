import { residentPreview } from '../lib/api/resident-feeds.api';
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import {
  BackendComplaint,
  CreateComplaintInput,
  BackendComplaintStatus,
} from '../types/complaint';
import {
  getActionableComplaintCount,
  getOrganizationComplaints,
  createComplaint as apiCreateComplaint,
  updateComplaint as apiUpdateComplaint,
  assignComplaint as apiAssignComplaint,
  resolveComplaint as apiResolveComplaint,
} from '../lib/api/complaints.api';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';

interface ComplaintState {
  complaints: BackendComplaint[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  actionableCount: number;
  countUpdatedAt: number;
  loadActionableCount: (force?: boolean) => Promise<void>;

  // Actions
  loadResidentComplaints: () => Promise<void>;
  loadAdminComplaints: () => Promise<void>;
  createResidentComplaint: (input: {
    category: string;
    subject: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    flat_id?: string;
  }) => Promise<BackendComplaint>;
  createAdminComplaint: (input: CreateComplaintInput) => Promise<BackendComplaint>;
  updateStatus: (id: string, status: BackendComplaintStatus) => Promise<void>;
  assignTicket: (id: string, assignedTo: string) => Promise<void>;
  resolveTicket: (id: string, reason: string) => Promise<void>;
  clearComplaints: () => void;

  // Legacy helper for backward-compat
  addComplaint: (data: any) => Promise<BackendComplaint>;
  updateComplaintStatus: (id: string, status: any) => Promise<void>;
  deleteComplaint: (id: string) => void;
  reset: () => void;
}

let countRequest = 0;
let countPending = false;

export const useComplaintStore = create<ComplaintState>((set, get) => ({
  complaints: [],
  isLoading: false,
  error: null,
  hasLoaded: false,
  actionableCount: 0,
  countUpdatedAt: 0,
  loadActionableCount: async (force = false) => {
    const auth = useAuthStore.getState();
    if (!auth.organizationId || !auth.permissions.includes('complaint:manage') || !auth.roles.some(role => ['SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(role))) return;
    if (!force && (countPending || Date.now() - get().countUpdatedAt < 30000)) return;
    const request = ++countRequest;
    countPending = true;
    try {
      const count = await getActionableComplaintCount();
      if (request === countRequest && useAuthStore.getState().organizationId === auth.organizationId && useAuthStore.getState().backendUser?.id === auth.backendUser?.id) set({ actionableCount: count, countUpdatedAt: Date.now() });
    } catch { if (request === countRequest) set({ actionableCount: 0 }); }
    finally { if (request === countRequest) countPending = false; }
  },

  clearComplaints: () => set({ complaints: [], error: null, isLoading: false, hasLoaded: false }),

  loadResidentComplaints: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await residentPreview<BackendComplaint>('/complaints/my/page', { tab: 'active' });
      const mapped = data.map((c) => ({
        ...c,
        title: c.subject,
        flat: c.flat_id || '',
        raisedAt: new Date(c.created_at).toLocaleDateString(),
        assignedStaff: c.assigned_to || undefined,
      }));
      set({ complaints: mapped, isLoading: false, error: null, hasLoaded: true });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: getUserFriendlyErrorMessage(err, 'Failed to load complaints'),
        hasLoaded: true,
      });
    }
  },

  loadAdminComplaints: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getOrganizationComplaints();
      const mapped = data.map((c) => ({
        ...c,
        title: c.subject,
        flat: c.flat_id || '',
        raisedAt: new Date(c.created_at).toLocaleDateString(),
        assignedStaff: c.assigned_to || undefined,
      }));
      set({ complaints: mapped, isLoading: false, error: null, hasLoaded: true });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: getUserFriendlyErrorMessage(err, 'Failed to load organization complaints'),
        hasLoaded: true,
      });
    }
  },

  createResidentComplaint: async (input) => {
    const scope = useAuthStore.getState();
    set({ isLoading: true, error: null });
    try {
      const created = await apiCreateComplaint({
        category: input.category,
        subject: input.subject,
        description: input.description,
        priority: input.priority || 'MEDIUM',
        flat_id: input.flat_id,
      });
      const mapped: BackendComplaint = {
        ...created,
        title: created.subject,
        flat: created.flat_id || '',
        raisedAt: 'Just Now',
        assignedStaff: created.assigned_to || undefined,
      };
      if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return mapped;
      set((state) => ({
        complaints: [mapped, ...state.complaints],
        isLoading: false,
        error: null,
      }));
      void get().loadActionableCount(true);
      if (typeof window !== 'undefined') window.dispatchEvent?.(new Event('societyos:resident-feed-changed'));
      return mapped;
    } catch (err: unknown) {
      const errorMsg = getUserFriendlyErrorMessage(err, 'Failed to create complaint');
      set({ isLoading: false, error: errorMsg });
      throw err;
    }
  },

  createAdminComplaint: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const created = await apiCreateComplaint(input);
      const mapped: BackendComplaint = {
        ...created,
        title: created.subject,
        flat: created.flat_id || '',
        raisedAt: 'Just Now',
        assignedStaff: created.assigned_to || undefined,
      };
      set((state) => ({
        complaints: [mapped, ...state.complaints],
        isLoading: false,
        error: null,
      }));
      void get().loadActionableCount(true);
      return mapped;
    } catch (err: unknown) {
      const errorMsg = getUserFriendlyErrorMessage(err, 'Failed to create complaint');
      set({ isLoading: false, error: errorMsg });
      throw err;
    }
  },

  updateStatus: async (id, status) => {
    try {
      await apiUpdateComplaint(id, { status });
      void get().loadActionableCount(true);
      set((state) => ({
        complaints: state.complaints.map((c) => (c.id === id ? { ...c, status } : c)),
      }));
    } catch (err: unknown) {
      const errorMsg = getUserFriendlyErrorMessage(err, 'Failed to update complaint');
      set({ error: errorMsg });
      throw err;
    }
  },

  assignTicket: async (id, assignedTo) => {
    try {
      await apiAssignComplaint(id, assignedTo);
      set((state) => ({
        complaints: state.complaints.map((c) =>
          c.id === id ? { ...c, assigned_to: assignedTo, assignedStaff: assignedTo } : c,
        ),
      }));
    } catch (err: unknown) {
      const errorMsg = getUserFriendlyErrorMessage(err, 'Failed to assign complaint');
      set({ error: errorMsg });
      throw err;
    }
  },

  resolveTicket: async (id, reason) => {
    try {
      await apiResolveComplaint(id, reason);
      await get().loadAdminComplaints();
      void get().loadActionableCount(true);
    } catch (err: unknown) {
      const errorMsg = getUserFriendlyErrorMessage(err, 'Failed to resolve complaint');
      set({ error: errorMsg });
      throw err;
    }
  },

  addComplaint: async (data: any) => {
    return get().createResidentComplaint({
      category: data.category?.toUpperCase() || 'OTHER',
      subject: data.title || data.subject || 'Complaint',
      description: data.description || '',
      priority: data.priority ? (data.priority.toUpperCase() as any) : 'MEDIUM',
      flat_id: data.flat_id,
    });
  },

  updateComplaintStatus: async (id: string, status: any) => {
    const backendStatus: BackendComplaintStatus =
      status === 'in-progress' || status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : status === 'resolved' || status === 'RESOLVED'
        ? 'RESOLVED'
        : status === 'closed' || status === 'CLOSED'
        ? 'CLOSED'
        : 'OPEN';

    if (backendStatus === 'RESOLVED') {
      return get().resolveTicket(id, 'Resolved via Admin Console');
    }
    return get().updateStatus(id, backendStatus);
  },

  deleteComplaint: (id: string) => {
    set((state) => ({
      complaints: state.complaints.filter((c) => c.id !== id),
    }));
  },

  reset: () => { ++countRequest; countPending = false; set({ actionableCount: 0, countUpdatedAt: 0, complaints: [], error: null, isLoading: false, hasLoaded: false }); },
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId || state.backendUser?.id !== prevState.backendUser?.id || !state.isAuthenticated) {
      useComplaintStore.getState().reset();
    }
  });
}
