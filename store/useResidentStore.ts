import { create } from 'zustand';
import { ResidentProfile } from '../types';
import { initialResident } from '../lib/mock-data';

interface ResidentState {
  resident: ResidentProfile;
  setResident: (profile: Partial<ResidentProfile>) => void;
  toggleNotification: (key: keyof ResidentProfile['whatsappNotifications']) => void;
}

export const useResidentStore = create<ResidentState>((set) => ({
  resident: initialResident,
  setResident: (updated) =>
    set((state) => ({ resident: { ...state.resident, ...updated } })),
  toggleNotification: (key) =>
    set((state) => ({
      resident: {
        ...state.resident,
        whatsappNotifications: {
          ...state.resident.whatsappNotifications,
          [key]: !state.resident.whatsappNotifications[key]
        }
      }
    }))
}));
