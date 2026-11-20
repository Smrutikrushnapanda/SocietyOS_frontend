import { create } from 'zustand';
import { vehiclesApi, Vehicle, CreateVehiclePayload, UpdateVehiclePayload } from '../lib/api/vehicles.api';
import { parkingApi, ParkingSlot, CreateParkingSlotPayload, UpdateParkingSlotPayload } from '../lib/api/parking.api';
import { useAuthStore } from './useAuthStore';

interface ParkingState {
  slots: ParkingSlot[];
  vehicles: Vehicle[];
  selectedZone: string;
  isLoading: boolean;
  error: string | null;

  setSelectedZone: (zone: string) => void;
  loadParkingData: () => Promise<void>;
  createSlot: (payload: CreateParkingSlotPayload) => Promise<ParkingSlot>;
  updateSlot: (id: string, payload: UpdateParkingSlotPayload) => Promise<ParkingSlot>;
  deleteSlot: (id: string) => Promise<void>;

  createVehicle: (payload: CreateVehiclePayload) => Promise<Vehicle>;
  updateVehicle: (id: string, payload: UpdateVehiclePayload) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  reset: () => void;
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  slots: [],
  vehicles: [],
  selectedZone: 'A',
  isLoading: false,
  error: null,

  setSelectedZone: (zone: string) => set({ selectedZone: zone }),

  loadParkingData: async () => {
    const orgId = useAuthStore.getState().organizationId;
    if (!orgId) {
      set({ slots: [], vehicles: [], isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const [slotsRes, vehiclesRes] = await Promise.all([
        parkingApi.getParkingSlots(),
        vehiclesApi.getVehicles(),
      ]);

      const slots = Array.isArray(slotsRes) ? slotsRes : [];
      const vehicles = Array.isArray(vehiclesRes) ? vehiclesRes : [];

      set({
        slots,
        vehicles,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load parking and vehicle records.';
      set({ isLoading: false, error: msg });
    }
  },

  createSlot: async (payload: CreateParkingSlotPayload) => {
    const newSlot = await parkingApi.createParkingSlot(payload);
    await get().loadParkingData();
    return newSlot;
  },

  updateSlot: async (id: string, payload: UpdateParkingSlotPayload) => {
    const updated = await parkingApi.updateParkingSlot(id, payload);
    await get().loadParkingData();
    return updated;
  },

  deleteSlot: async (id: string) => {
    await parkingApi.deleteParkingSlot(id);
    await get().loadParkingData();
  },

  createVehicle: async (payload: CreateVehiclePayload) => {
    const newVeh = await vehiclesApi.createVehicle(payload);
    await get().loadParkingData();
    return newVeh;
  },

  updateVehicle: async (id: string, payload: UpdateVehiclePayload) => {
    const updated = await vehiclesApi.updateVehicle(id, payload);
    await get().loadParkingData();
    return updated;
  },

  deleteVehicle: async (id: string) => {
    await vehiclesApi.deleteVehicle(id);
    await get().loadParkingData();
  },

  reset: () => set({ slots: [], vehicles: [], isLoading: false, error: null }),
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId) {
      useParkingStore.getState().reset();
    }
  });
}
