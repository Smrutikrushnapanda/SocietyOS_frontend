import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import {
  OccupancyReport,
  PaginatedReport,
  ResidentReportRow,
  VisitorReportRow,
  MaintenanceDueReportRow,
  PaymentReportRow,
  ComplaintReportRow,
  NoticeReportRow,
  PollReportRow,
  getOccupancyReport,
  getResidentsReport,
  getVisitorsReport,
  getMaintenanceDuesReport,
  getPaymentsReport,
  getComplaintsReport,
  getNoticesReport,
  getPollsReport,
} from '../lib/api/reports.api';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';

export type ReportTab =
  | 'occupancy'
  | 'residents'
  | 'visitors'
  | 'maintenance-dues'
  | 'payments'
  | 'complaints'
  | 'notices'
  | 'polls';

interface ReportState {
  activeTab: ReportTab;
  isLoading: boolean;
  error: string | null;

  // Report data cache
  occupancyData: OccupancyReport | null;
  residentsData: PaginatedReport<ResidentReportRow> | null;
  visitorsData: PaginatedReport<VisitorReportRow> | null;
  maintenanceDuesData: PaginatedReport<MaintenanceDueReportRow> | null;
  paymentsData: PaginatedReport<PaymentReportRow> | null;
  complaintsData: PaginatedReport<ComplaintReportRow> | null;
  noticesData: PaginatedReport<NoticeReportRow> | null;
  pollsData: PaginatedReport<PollReportRow> | null;

  // Filters & pagination
  page: number;
  filters: Record<string, any>;

  // Actions
  setActiveTab: (tab: ReportTab) => void;
  setFilter: (key: string, value: any) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
  fetchCurrentReport: () => Promise<void>;
  reset: () => void;
}

let reportRequest = 0;

export const useReportStore = create<ReportState>((set, get) => ({
  activeTab: 'occupancy',
  isLoading: false,
  error: null,

  occupancyData: null,
  residentsData: null,
  visitorsData: null,
  maintenanceDuesData: null,
  paymentsData: null,
  complaintsData: null,
  noticesData: null,
  pollsData: null,

  page: 1,
  filters: {},

  setActiveTab: (tab: ReportTab) => {
    set({ activeTab: tab, page: 1, filters: {}, error: null });
    get().fetchCurrentReport();
  },

  setFilter: (key: string, value: any) => {
    const nextFilters = { ...get().filters };
    if (value === undefined || value === null || value === '' || value === 'ALL') {
      delete nextFilters[key];
    } else {
      nextFilters[key] = value;
    }
    set({ filters: nextFilters, page: 1 });
    get().fetchCurrentReport();
  },

  clearFilters: () => { set({ filters: {}, page: 1 }); void get().fetchCurrentReport(); },

  setPage: (page: number) => {
    if (!Number.isInteger(page) || page < 1) return;
    set({ page });
    get().fetchCurrentReport();
  },

  fetchCurrentReport: async () => {
    const request = ++reportRequest;
    const userId = useAuthStore.getState().backendUser?.id;
    const { activeTab, page, filters } = get();
    const orgId = useAuthStore.getState().organizationId;
    if (!orgId) {
      set({ error: 'Active organization context required', isLoading: false });
      return;
    }
    const current = () => request === reportRequest && useAuthStore.getState().organizationId === orgId && useAuthStore.getState().backendUser?.id === userId;
    if (filters.from && filters.to && filters.from > filters.to) {
      set({ error: 'From date must not be after to date', isLoading: false }); return;
    }
    set({ isLoading: true, error: null, maintenanceDuesData: null, paymentsData: null, occupancyData: null, residentsData: null, visitorsData: null, complaintsData: null, noticesData: null, pollsData: null });

    try {
      switch (activeTab) {
        case 'occupancy': {
          const data = await getOccupancyReport();
          if (!current()) return;
          set({ occupancyData: data, isLoading: false });
          break;
        }
        case 'residents': {
          const data = await getResidentsReport({ ...filters, page, limit: 15 });
          if (!current()) return;
          if ('totalPages' in data && page > Math.max(1, data.totalPages)) { set({ page: Math.max(1, data.totalPages) }); return get().fetchCurrentReport(); }
          set({ residentsData: data, isLoading: false });
          break;
        }
        case 'visitors': {
          const data = await getVisitorsReport({ ...filters, page, limit: 15 });
          if (!current()) return;
          if ('totalPages' in data && page > Math.max(1, data.totalPages)) { set({ page: Math.max(1, data.totalPages) }); return get().fetchCurrentReport(); }
          set({ visitorsData: data, isLoading: false });
          break;
        }
        case 'maintenance-dues': {
          const data = await getMaintenanceDuesReport({ ...filters, page, limit: 15 });
          if (!current()) return;
          if ('totalPages' in data && page > Math.max(1, data.totalPages)) { set({ page: Math.max(1, data.totalPages) }); return get().fetchCurrentReport(); }
          set({ maintenanceDuesData: data, isLoading: false });
          break;
        }
        case 'payments': {
          const data = await getPaymentsReport({ ...filters, page, limit: 15 });
          if (!current()) return;
          if ('totalPages' in data && page > Math.max(1, data.totalPages)) { set({ page: Math.max(1, data.totalPages) }); return get().fetchCurrentReport(); }
          set({ paymentsData: data, isLoading: false });
          break;
        }
        case 'complaints': {
          const data = await getComplaintsReport({ ...filters, page, limit: 15 });
          if (!current()) return;
          if ('totalPages' in data && page > Math.max(1, data.totalPages)) { set({ page: Math.max(1, data.totalPages) }); return get().fetchCurrentReport(); }
          set({ complaintsData: data, isLoading: false });
          break;
        }
        case 'notices': {
          const data = await getNoticesReport({ ...filters, page, limit: 15 });
          if (!current()) return;
          if ('totalPages' in data && page > Math.max(1, data.totalPages)) { set({ page: Math.max(1, data.totalPages) }); return get().fetchCurrentReport(); }
          set({ noticesData: data, isLoading: false });
          break;
        }
        case 'polls': {
          const data = await getPollsReport({ ...filters, page, limit: 15 });
          if (!current()) return;
          if ('totalPages' in data && page > Math.max(1, data.totalPages)) { set({ page: Math.max(1, data.totalPages) }); return get().fetchCurrentReport(); }
          set({ pollsData: data, isLoading: false });
          break;
        }
      }
    } catch (err: unknown) {
      if (!current()) return;
      const message = getUserFriendlyErrorMessage(err, 'Failed to load report data');
      set({ error: message, isLoading: false });
    }
  },

  reset: () => {
    ++reportRequest;
    set({
      occupancyData: null,
      residentsData: null,
      visitorsData: null,
      maintenanceDuesData: null,
      paymentsData: null,
      complaintsData: null,
      noticesData: null,
      pollsData: null,
      page: 1,
      filters: {},
      error: null,
      isLoading: false,
    });
  },
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId || state.backendUser?.id !== prevState.backendUser?.id || !state.isAuthenticated) {
      useReportStore.getState().reset();
    }
  });
}
