import { create } from 'zustand';
import { SocietyInfo } from '../types';
import { initialSociety } from '../lib/mock-data';

interface SocietyState {
  society: SocietyInfo;
  setSociety: (society: Partial<SocietyInfo>) => void;
  updateSettings: (settings: Partial<SocietyInfo>) => void;
  toggleWhatsAppSync: () => void;
}

export const useSocietyStore = create<SocietyState>((set) => ({
  society: initialSociety,
  setSociety: (updated) =>
    set((state) => ({ society: { ...state.society, ...updated } })),
  updateSettings: (updated) =>
    set((state) => ({ society: { ...state.society, ...updated } })),
  toggleWhatsAppSync: () =>
    set((state) => ({
      society: {
        ...state.society,
        whatsappConnected: !state.society.whatsappConnected
      }
    }))
}));
