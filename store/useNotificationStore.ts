import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import {
  NotificationItem,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from '../lib/api/notifications.api';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;

  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  reset: () => void;
}

let fetchVersion = 0;
let unreadFetchVersion = 0;
const currentScope = () => {
  const state = useAuthStore.getState();
  return `${state.organizationId}:${state.backendUser?.id ?? state.user?.id}:${state.isAuthenticated}`;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  hasLoaded: false,

  fetchNotifications: async () => {
    const version = ++fetchVersion;
    const scope = currentScope();
    set({ isLoading: true, error: null });
    try {
      const items = await getNotifications();
      if (version !== fetchVersion || scope !== currentScope()) return;
      const unread = items.filter((n) => !n.is_read).length;
      set({
        notifications: items,
        unreadCount: unread,
        isLoading: false,
        hasLoaded: true,
      });
    } catch (err: unknown) {
      if (version !== fetchVersion || scope !== currentScope()) return;
      const message = getUserFriendlyErrorMessage(err, 'Failed to fetch notifications');
      set({
        error: message,
        isLoading: false,
        hasLoaded: true,
      });
    }
  },

  fetchUnreadCount: async () => {
    const version = ++unreadFetchVersion;
    const scope = currentScope();
    try {
      const unreadCount = await getUnreadNotificationCount();
      if (version !== unreadFetchVersion || scope !== currentScope()) return;
      set({ unreadCount });
    } catch {
      // Preserve last known count while offline; next refresh reads backend state again.
    }
  },

  markAsRead: async (id: string) => {
    const scope = currentScope();
    ++fetchVersion;
    ++unreadFetchVersion;
    set({ isLoading: false });
    try {
      const updated = await markNotificationRead(id);
      if (scope !== currentScope()) return;
      set((state) => {
        const next = state.notifications.map((n) => (n.id === id ? { ...n, is_read: true, read_at: updated.read_at } : n));
        return {
          notifications: next,
          unreadCount: next.filter((n) => !n.is_read).length,
        };
      });
    } catch (err: unknown) {
      if (scope !== currentScope()) return;
      const message = getUserFriendlyErrorMessage(err, 'Failed to mark notification as read');
      set({ error: message });
    }
  },

  markAllAsRead: async () => {
    const scope = currentScope();
    ++fetchVersion;
    ++unreadFetchVersion;
    set({ isLoading: false });
    try {
      await markAllNotificationsRead();
      if (scope !== currentScope()) return;
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (err: unknown) {
      if (scope !== currentScope()) return;
      const message = getUserFriendlyErrorMessage(err, 'Failed to mark all notifications as read');
      set({ error: message });
    }
  },

  reset: () => {
    ++fetchVersion;
    ++unreadFetchVersion;
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      hasLoaded: false,
    });
  },
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId || state.backendUser?.id !== prevState.backendUser?.id || state.user?.id !== prevState.user?.id || state.isAuthenticated !== prevState.isAuthenticated) {
      useNotificationStore.getState().reset();
    }
  });
}
