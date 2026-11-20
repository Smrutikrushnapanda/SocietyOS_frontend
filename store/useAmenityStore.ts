import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';
import { Amenity, AmenityBooking } from '../types';
import {
  getAmenities,
  cancelMyAmenityBooking,
  createAmenity as apiCreateAmenity,
  updateAmenity as apiUpdateAmenity,
  deleteAmenity as apiDeleteAmenity,
  getAmenityBookings,
  createAmenityBooking as apiCreateBooking,
  createAmenityBookingRange,
  updateAmenityBookingStatus as apiUpdateStatus,
  BackendAmenity,
  BackendAmenityBooking,
  CreateAmenityInput,
  CreateBookingInput,
  CreateBookingRangeInput,
} from '../lib/api/amenities.api';

function mapAmenity(b: BackendAmenity): Amenity {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    icon: b.icon || 'pool',
    category: b.category || undefined,
    description: b.description || undefined,
    imageFileId: b.image_file_id || undefined,
    location: b.location || undefined,
    capacity: b.capacity,
    openTime: b.open_time,
    closeTime: b.close_time,
    slotDuration: b.slot_duration,
    price: Number(b.price || 0),
    guestFee: Number(b.guest_fee || 0),
    statusText: b.status_text || (b.status === 'Active' ? 'Operational' : 'Maintenance'),
    status: b.status as any,
  };
}

function mapBooking(b: BackendAmenityBooking): AmenityBooking {
  return {
    id: b.id,
    amenity: b.amenity,
    resident: b.resident,
    flat: b.flat,
    date: b.date,
    slot: b.slot,
    guests: b.guests,
    amount: Number(b.amount || 0),
    status: b.status,
  };
}

interface AmenityState {
  amenities: Amenity[];
  bookings: AmenityBooking[];
  isLoading: boolean;
  isLoadingBookings: boolean;
  error: string | null;
  hasLoadedAmenities: boolean;
  hasLoadedBookings: boolean;
  loadAmenities: () => Promise<void>;
  loadBookings: () => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  createAmenity: (input: CreateAmenityInput) => Promise<Amenity>;
  updateAmenity: (id: string, input: Partial<CreateAmenityInput>) => Promise<Amenity>;
  deleteAmenity: (id: string) => Promise<void>;
  bookAmenity: (input: CreateBookingInput) => Promise<AmenityBooking>;
  bookAmenityRange: (input: CreateBookingRangeInput) => Promise<AmenityBooking[]>;
  updateBookingStatus: (id: string, status: 'Approved' | 'Rejected' | 'Cancelled' | 'Revoked') => Promise<void>;
}

export const useAmenityStore = create<AmenityState>((set, get) => ({
  amenities: [],
  bookings: [],
  isLoading: false,
  isLoadingBookings: false,
  error: null,
  hasLoadedAmenities: false,
  hasLoadedBookings: false,

  loadAmenities: async () => {
    const scope = useAuthStore.getState();
    set({ isLoading: true, error: null });
    try {
      const data = await getAmenities();
      if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return;
      set({ amenities: data.map(mapAmenity), isLoading: false, hasLoadedAmenities: true });
    } catch (err: any) {
      if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return;
      set({ error: getUserFriendlyErrorMessage(err), isLoading: false, hasLoadedAmenities: true });
    }
  },

  loadBookings: async () => {
    const scope = useAuthStore.getState();
    set({ isLoadingBookings: true, error: null });
    try {
      const data = await getAmenityBookings();
      if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return;
      set({ bookings: data.map(mapBooking), hasLoadedBookings: true, isLoadingBookings: false });
    } catch (err: any) {
      if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return;
      set({ error: getUserFriendlyErrorMessage(err), hasLoadedBookings: true, isLoadingBookings: false });
    }
  },

  createAmenity: async (input) => {
    const scope = useAuthStore.getState();
    const raw = await apiCreateAmenity(input);
    const mapped = mapAmenity(raw);
    if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return mapped;
    set((state) => ({ amenities: [...state.amenities, mapped] }));
    return mapped;
  },

  updateAmenity: async (id, input) => {
    const scope = useAuthStore.getState();
    const raw = await apiUpdateAmenity(id, input);
    const mapped = mapAmenity(raw);
    if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return mapped;
    set((state) => ({
      amenities: state.amenities.map((a) => (a.id === id ? mapped : a)),
    }));
    return mapped;
  },

  deleteAmenity: async (id) => {
    const scope = useAuthStore.getState();
    await apiDeleteAmenity(id);
    if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return;
    set((state) => ({
      amenities: state.amenities.filter((a) => a.id !== id),
    }));
  },

  bookAmenity: async (input) => {
    const scope = useAuthStore.getState();
    const raw = await apiCreateBooking(input);
    const mapped = mapBooking(raw);
    if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return mapped;
    set((state) => ({
      bookings: [mapped, ...state.bookings],
    }));
    return mapped;
  },

  bookAmenityRange: async (input) => {
    const scope = useAuthStore.getState();
    const mapped = (await createAmenityBookingRange(input)).map(mapBooking);
    if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return mapped;
    set(state => ({ bookings: [...mapped, ...state.bookings] }));
    return mapped;
  },

  cancelBooking: async (id) => {
    const scope = useAuthStore.getState();
    const mapped = mapBooking(await cancelMyAmenityBooking(id));
    if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return;
    set((state) => ({ bookings: state.bookings.map((booking) => booking.id === id ? mapped : booking) }));
  },

  updateBookingStatus: async (id, status) => {
    const scope = useAuthStore.getState();
    const raw = await apiUpdateStatus(id, status);
    const mapped = mapBooking(raw);
    if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return;
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? mapped : b)),
    }));
  },
}));

useAuthStore.subscribe((state, previous) => {
  if (state.organizationId !== previous.organizationId || state.backendUser?.id !== previous.backendUser?.id || !state.isAuthenticated) {
    useAmenityStore.setState({ amenities: [], bookings: [], hasLoadedAmenities: false, hasLoadedBookings: false, isLoading: false, isLoadingBookings: false, error: null });
  }
});
