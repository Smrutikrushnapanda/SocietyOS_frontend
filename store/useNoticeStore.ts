import { residentPreview } from '../lib/api/resident-feeds.api';
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import {
  BackendNotice,
  CreateNoticeInput,
} from '../types/notice';
import {
  getNotices as apiGetNotices,
  createNotice as apiCreateNotice,
  publishNotice as apiPublishNotice,
  expireNotice as apiExpireNotice,
} from '../lib/api/notices.api';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';

interface NoticeState {
  notices: BackendNotice[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;

  // Actions
  loadNotices: () => Promise<void>;
  createNotice: (input: CreateNoticeInput) => Promise<BackendNotice>;
  publishNotice: (id: string, confirmEmergency?: boolean) => Promise<void>;
  expireNotice: (id: string) => Promise<void>;
  clearNotices: () => void;

  // Legacy helper for backward-compat
  addNotice: (notice: any) => Promise<BackendNotice>;
  deleteNotice: (id: string) => void;
  reset: () => void;
}

let noticeLoadVersion = 0;
const noticeScope = () => {
  const auth = useAuthStore.getState();
  return `${auth.organizationId}:${auth.backendUser?.id ?? auth.user?.id}:${auth.isAuthenticated}`;
};

export const useNoticeStore = create<NoticeState>((set, get) => ({
  notices: [],
  isLoading: false,
  error: null,
  hasLoaded: false,

  clearNotices: () => set({ notices: [], error: null, isLoading: false, hasLoaded: false }),

  loadNotices: async () => {
    const version = ++noticeLoadVersion;
    const scope = noticeScope();
    set({ isLoading: true, error: null });
    try {
      let data: BackendNotice[];
      if (useAuthStore.getState().roles.includes('RESIDENT')) {
        const general = await residentPreview<BackendNotice>('/notices/page');
        const hasEmergency = general.some(notice => notice.priority === 'EMERGENCY');
        if (!hasEmergency && general.length >= 10) {
          const emergency = await residentPreview<BackendNotice>('/notices/page', { priority: 'EMERGENCY' });
          data = [...new Map([...general, ...emergency].map(notice => [notice.id, notice])).values()];
        } else {
          data = general;
        }
      } else {
        data = await apiGetNotices();
      }
      if (version !== noticeLoadVersion || scope !== noticeScope()) return;
      const mapped = data.map((n) => ({
        ...n,
        description: n.content,
        date: n.published_at
          ? new Date(n.published_at).toLocaleDateString()
          : new Date(n.created_at).toLocaleDateString(),
        displayDate: n.published_at
          ? new Date(n.published_at).toLocaleDateString()
          : 'Pending Publish',
        type: n.status === 'PUBLISHED' ? 'Circular' : n.status,
        priority: n.priority ?? 'NORMAL',
      }));
      set({ notices: mapped, isLoading: false, error: null, hasLoaded: true });
    } catch (err: unknown) {
      if (version !== noticeLoadVersion || scope !== noticeScope()) return;
      set({
        isLoading: false,
        error: getUserFriendlyErrorMessage(err, 'Failed to load notices'),
        hasLoaded: true,
      });
    }
  },

  createNotice: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const created = await apiCreateNotice(input);
      const mapped: BackendNotice = {
        ...created,
        description: created.content,
        date: 'Today',
        displayDate: 'Pending Publish',
        type: created.status,
        priority: created.priority ?? 'NORMAL',
      };
      set((state) => ({
        notices: [mapped, ...state.notices],
        isLoading: false,
        error: null,
      }));
      return mapped;
    } catch (err: unknown) {
      const errorMsg = getUserFriendlyErrorMessage(err, 'Failed to create notice');
      set({ isLoading: false, error: errorMsg });
      throw err;
    }
  },

  publishNotice: async (id, confirmEmergency = false) => {
    try {
      await apiPublishNotice(id, confirmEmergency);
      await get().loadNotices();
    } catch (err: unknown) {
      const errorMsg = getUserFriendlyErrorMessage(err, 'Failed to publish notice');
      set({ error: errorMsg });
      throw err;
    }
  },

  expireNotice: async (id) => {
    try {
      await apiExpireNotice(id);
      await get().loadNotices();
    } catch (err: unknown) {
      const errorMsg = getUserFriendlyErrorMessage(err, 'Failed to expire notice');
      set({ error: errorMsg });
      throw err;
    }
  },

  addNotice: async (notice: any) => {
    return get().createNotice({
      title: notice.title,
      content: notice.content || notice.description || '',
    });
  },

  deleteNotice: (id: string) => {
    // If admin archives notice, invoke expireNotice
    void get().expireNotice(id);
  },

  reset: () => {
    ++noticeLoadVersion;
    set({ notices: [], error: null, isLoading: false, hasLoaded: false });
  },
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId || state.backendUser?.id !== prevState.backendUser?.id || state.isAuthenticated !== prevState.isAuthenticated) {
      useNoticeStore.getState().reset();
    }
  });
}
