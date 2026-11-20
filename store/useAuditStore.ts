import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import {
  AuditLogItem,
  AuditLogFilters,
  getAuditLogs,
  getAuditLogById,
} from '../lib/api/audit.api';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';

interface AuditState {
  auditLogs: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: AuditLogFilters;
  selectedLog: AuditLogItem | null;
  selectedLogId: string | null;
  detailError: string | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  hasLoaded: boolean;

  fetchAuditLogs: () => Promise<void>;
  fetchAuditLogDetail: (id: string) => Promise<void>;
  setFilter: (key: keyof AuditLogFilters, value: any) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  clearFilters: () => void;
  setSelectedLog: (log: AuditLogItem | null) => void;
  reset: () => void;
}

let listRequest = 0;
let detailRequest = 0;

export const useAuditStore = create<AuditState>((set, get) => ({
  auditLogs: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  filters: {},
  selectedLog: null,
  selectedLogId: null,
  detailError: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  hasLoaded: false,

  fetchAuditLogs: async () => {
    const request = ++listRequest;
    const userId = useAuthStore.getState().backendUser?.id;
    const orgId = useAuthStore.getState().organizationId;
    if (!orgId) {
      set({ error: 'Active organization context required', isLoading: false, hasLoaded: true });
      return;
    }
    if (get().filters.from && get().filters.to && get().filters.from! > get().filters.to!) {
      set({ error: 'From date must not be after to date', isLoading: false }); return;
    }
    set({ isLoading: true, error: null });
    const { page, limit, filters } = get();

    try {
      const data = await getAuditLogs({
        ...filters,
        page,
        limit,
      });

      if (request !== listRequest || useAuthStore.getState().organizationId !== orgId || useAuthStore.getState().backendUser?.id !== userId) return;
      if (page > Math.max(1, data.totalPages)) { set({ page: Math.max(1, data.totalPages) }); return get().fetchAuditLogs(); }
      set({
        auditLogs: data.items || [],
        total: data.total || 0,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.totalPages || 1,
        isLoading: false,
        hasLoaded: true,
      });
    } catch (err: unknown) {
      if (request !== listRequest || useAuthStore.getState().organizationId !== orgId) return;
      const message = getUserFriendlyErrorMessage(err, 'Failed to load audit logs');
      set({ auditLogs: [], total: 0, totalPages: 1, error: message, isLoading: false, hasLoaded: true });
    }
  },

  fetchAuditLogDetail: async (id: string) => {
    const request = ++detailRequest;
    const orgId = useAuthStore.getState().organizationId;
    if (!orgId) {
      set({ error: 'Active organization context required', isLoadingDetail: false });
      return;
    }
    const userId = useAuthStore.getState().backendUser?.id;
    set({ isLoadingDetail: true, selectedLog: null, selectedLogId: id, detailError: null });
    try {
      const detail = await getAuditLogById(id);
      if (request !== detailRequest || useAuthStore.getState().organizationId !== orgId || useAuthStore.getState().backendUser?.id !== userId) return;
      set({ selectedLog: detail, isLoadingDetail: false });
    } catch (err: unknown) {
      if (request !== detailRequest || useAuthStore.getState().organizationId !== orgId || useAuthStore.getState().backendUser?.id !== userId) return;
      const message = getUserFriendlyErrorMessage(err, 'Failed to load audit log details');
      set({ detailError: message, isLoadingDetail: false });
    }
  },

  setFilter: (key: keyof AuditLogFilters, value: any) => {
    const nextFilters: Record<string, any> = { ...get().filters };
    if (value === undefined || value === null || value === '' || value === 'ALL') {
      delete nextFilters[key as string];
    } else {
      nextFilters[key as string] = value;
    }
    set({ filters: nextFilters as AuditLogFilters, page: 1 });
    get().fetchAuditLogs();
  },

  setPage: (page: number) => {
    if (!Number.isInteger(page) || page < 1 || page > get().totalPages) return;
    set({ page });
    get().fetchAuditLogs();
  },

  setLimit: (limit) => { if (![10, 20, 50].includes(limit)) return; set({ limit, page: 1 }); void get().fetchAuditLogs(); },
  clearFilters: () => { set({ filters: {}, page: 1 }); void get().fetchAuditLogs(); },
  setSelectedLog: (log: AuditLogItem | null) => {
    ++detailRequest;
    set({ selectedLog: log, selectedLogId: log?.id ?? null, detailError: null, isLoadingDetail: false });
  },

  reset: () => {
    ++listRequest; ++detailRequest;
    set({
      auditLogs: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      filters: {},
      selectedLog: null,
      selectedLogId: null,
      detailError: null,
      isLoading: false,
      isLoadingDetail: false,
      error: null,
      hasLoaded: false,
    });
  },
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId || state.backendUser?.id !== prevState.backendUser?.id || !state.isAuthenticated) {
      useAuditStore.getState().reset();
    }
  });
}
