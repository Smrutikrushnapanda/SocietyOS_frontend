import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';
import {
  getNotificationPreferences, updateNotificationPreferences,
  type NotificationCategory, type NotificationPreference, type NotificationPreferenceUpdate,
} from '../lib/api/notification-preferences.api';

interface PreferencesState {
  saved: NotificationPreference[] | null;
  draft: NotificationPreference[] | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  scope: string | null;
  load: () => Promise<void>;
  toggle: (category: NotificationCategory) => void;
  save: () => Promise<boolean>;
  close: () => void;
  acquire: () => () => void;
}

interface PreferencesApi {
  read: (signal?: AbortSignal) => Promise<NotificationPreference[]>;
  update: (updates: NotificationPreferenceUpdate[], signal?: AbortSignal) => Promise<NotificationPreference[]>;
}

export function createNotificationPreferencesStore(api: PreferencesApi, currentScope: () => string | null) {
  let version = 0;
  let readers = 0;
  let pending: AbortController | null = null;
  return create<PreferencesState>((set, get) => ({
    saved: null, draft: null, loading: false, saving: false, error: null, scope: null,
    load: async () => {
      const scope = currentScope();
      if (scope === get().scope && (get().loading || get().saved)) return;
      const request = ++version;
      pending?.abort();
      pending = new AbortController();
      set({ saved: null, draft: null, scope, loading: true, saving: false, error: null });
      if (!scope) {
        set({ loading: false, error: 'Sign in and select an organization to load preferences.' });
        return;
      }
      try {
        const preferences = await api.read(pending.signal);
        if (request !== version || scope !== currentScope()) return;
        set({ saved: preferences, draft: preferences, loading: false });
      } catch (error: unknown) {
        if (request !== version || scope !== currentScope()) return;
        set({ loading: false, error: getUserFriendlyErrorMessage(error, 'Could not load preferences. Please retry.') });
      }
    },
    toggle: (category) => {
      const state = get();
      if (state.loading || state.saving || state.scope !== currentScope()) return;
      set({ draft: state.draft?.map((preference) => preference.category === category && !preference.mandatory
        ? { ...preference, enabled: !preference.enabled } : preference) ?? null });
    },
    save: async () => {
      const state = get();
      const scope = currentScope();
      if (!scope || scope !== state.scope || !state.saved || !state.draft || state.loading || state.saving) return false;
      const updates = state.draft.filter((preference) => !preference.mandatory &&
        state.saved?.find((saved) => saved.category === preference.category)?.enabled !== preference.enabled)
        .map(({ category, enabled }) => ({ category, enabled }));
      if (!updates.length) return false;
      const request = ++version;
      pending?.abort();
      pending = new AbortController();
      set({ saving: true, error: null });
      try {
        const preferences = await api.update(updates, pending.signal);
        if (request !== version || scope !== currentScope()) return false;
        set({ saved: preferences, draft: preferences, saving: false });
        return true;
      } catch (error: unknown) {
        if (request !== version || scope !== currentScope()) return false;
        set({ saving: false, error: getUserFriendlyErrorMessage(error, 'Could not save preferences. Your changes are unsaved; retry Save.') });
        return false;
      }
    },
    close: () => {
      pending?.abort();
      pending = null;
      ++version;
      set({ saved: null, draft: null, loading: false, saving: false, error: null, scope: null });
    },
    acquire: () => {
      ++readers;
      void get().load();
      return () => {
        --readers;
        // Strict Mode immediately reattaches; keep its in-flight read instead of issuing a second one.
        queueMicrotask(() => { if (readers === 0) get().close(); });
      };
    },
  }));
}

export function notificationPreferencesScope(): string | null {
  const state = useAuthStore.getState();
  const userId = state.backendUser?.id ?? state.user?.id;
  return state.isAuthenticated && userId && state.organizationId ? `${userId}:${state.organizationId}` : null;
}

export const useNotificationPreferencesStore = createNotificationPreferencesStore({
  read: getNotificationPreferences, update: updateNotificationPreferences,
}, notificationPreferencesScope);

useAuthStore.subscribe((state, previous) => {
  if (state.organizationId !== previous.organizationId || state.backendUser?.id !== previous.backendUser?.id ||
      state.user?.id !== previous.user?.id || state.isAuthenticated !== previous.isAuthenticated) {
    useNotificationPreferencesStore.getState().close();
  }
});
