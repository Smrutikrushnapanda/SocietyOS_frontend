import { create } from 'zustand';
import { SocietyInfo } from '../types';

const emptySociety: SocietyInfo = {
  id: '',
  name: '',
  regNo: '',
  address: '',
  tower: '',
  currency: '₹',
  graceDays: 0,
  lateFeePercent: 0,
  ratePerSqFt: 0,
  whatsappConnected: false,
  whatsappNumber: '',
  societyHandle: ''
};

interface SocietyState {
  society: SocietyInfo;
  setSociety: (society: Partial<SocietyInfo>) => void;
  updateSettings: (settings: Partial<SocietyInfo>) => void;
  toggleWhatsAppSync: () => void;
}

export const useSocietyStore = create<SocietyState>((set) => ({
  society: emptySociety,
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
