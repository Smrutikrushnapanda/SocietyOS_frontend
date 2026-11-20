'use client';
import { create } from 'zustand';
import { CURRENCIES, getPublicSocietySettings, type PublicSocietySettings } from '../lib/api/society-settings.api';
import { useAuthStore } from './useAuthStore';
import { useSocietyStore } from './useSocietyStore';
import apiClient from '../lib/api/client';
let generation = 0;
let imageGeneration = 0;
let imageRequest: { key: string; promise: Promise<void> } | null = null;
const scope = () => { const auth = useAuthStore.getState(); return JSON.stringify([auth.organizationId, auth.backendUser?.id ?? auth.user?.id, auth.sessionVersion, auth.isAuthenticated, auth.roles]); };
interface State {
  data: PublicSocietySettings | null;
  campusImage: { fileId: string; scope: string; url: string } | null;
  load: () => Promise<void>;
  loadCampusImage: (fileId: string) => Promise<void>;
  clearCampusImage: () => void;
  apply: (settings: PublicSocietySettings) => void;
  reset: () => void;
}
export const useSocietySettingsStore = create<State>((set, get) => ({
  data: null,
  campusImage: null,
  apply: settings => {
    if (settings.organizationId !== useAuthStore.getState().organizationId) return;
    if (get().data?.branding.campusImageFileId !== settings.branding.campusImageFileId) get().clearCampusImage();
    set({ data: settings });
    useSocietyStore.getState().setSociety({ id: settings.organizationId, name: settings.name, address: settings.address, regNo: settings.profile.registrationNumber, currency: CURRENCIES[settings.profile.currencyCode] });
  },
  load: async () => {
    const auth = useAuthStore.getState();
    if (!auth.organizationId || !auth.isAuthenticated) return;
    const before = scope(), request = ++generation;
    try { const settings = await getPublicSocietySettings(); if (request === generation && before === scope()) get().apply(settings); }
    catch { if (request === generation && before === scope()) set({ data: null }); }
  },
  loadCampusImage: fileId => {
    const before = scope(), cached = get().campusImage;
    if (cached?.fileId === fileId && cached.scope === before) return Promise.resolve();
    const key = `${before}:${fileId}`;
    if (imageRequest?.key === key) return imageRequest.promise;
    const version = ++imageGeneration;
    const promise = apiClient.get<Blob>('/society-settings/campus-image', { responseType: 'blob' }).then(response => {
      if (version !== imageGeneration || scope() !== before || get().data?.branding.campusImageFileId !== fileId) return;
      const old = get().campusImage;
      if (old) URL.revokeObjectURL(old.url);
      set({ campusImage: { fileId, scope: before, url: URL.createObjectURL(response.data) } });
    }).catch(() => {}).finally(() => { if (version === imageGeneration && imageRequest?.key === key) imageRequest = null; });
    imageRequest = { key, promise };
    return promise;
  },
  clearCampusImage: () => {
    ++imageGeneration; imageRequest = null;
    const cached = get().campusImage;
    if (cached) URL.revokeObjectURL(cached.url);
    set({ campusImage: null });
  },
  reset: () => { ++generation; get().clearCampusImage(); set({ data: null }); useSocietyStore.getState().setSociety({ id: '', name: '', address: '', regNo: '', currency: '₹' }); },
}));
useAuthStore.subscribe((state, previous) => { if (state.organizationId !== previous.organizationId || (state.backendUser?.id ?? state.user?.id) !== (previous.backendUser?.id ?? previous.user?.id) || state.sessionVersion !== previous.sessionVersion || state.isAuthenticated !== previous.isAuthenticated || state.roles.join(',') !== previous.roles.join(',')) useSocietySettingsStore.getState().reset(); });
