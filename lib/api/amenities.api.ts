import apiClient from './client';
import { useAuthStore } from '../../store/useAuthStore';

function getActiveOrganizationId(): string | null {
  const state = useAuthStore.getState();
  return state.organizationId || null;
}

export interface BackendAmenity {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  icon: string;
  category?: string | null;
  description?: string | null;
  image_file_id?: string | null;
  location?: string | null;
  capacity: number;
  open_time: string;
  close_time: string;
  slot_duration: string;
  price: number;
  guest_fee: number;
  status_text?: string | null;
  status: 'Active' | 'Closed (Maintenance)';
  created_at: string;
  updated_at: string;
}

export interface CreateAmenityInput {
  name: string;
  code: string;
  icon?: string;
  category?: string;
  description?: string;
  image_file_id?: string | null;
  location?: string;
  capacity?: number;
  open_time?: string;
  close_time?: string;
  slot_duration?: string;
  price?: number;
  guest_fee?: number;
  status_text?: string;
  status?: 'Active' | 'Closed (Maintenance)';
}

export interface BackendAmenityBooking {
  id: string;
  organization_id: string;
  amenity_id?: string | null;
  amenity: string;
  resident: string;
  flat: string;
  date: string;
  slot: string;
  guests: number;
  amount: number;
  status: 'Approved' | 'Pending' | 'Completed' | 'Cancelled' | 'Rejected' | 'Revoked';
  created_at: string;
  updated_at: string;
}

export interface AmenityAvailabilityDay {
  date: string;
  slots: string[];
}

export interface CreateBookingInput {
  amenity_id?: string;
  amenity: string;
  resident?: string;
  resident_id?: string;
  flat?: string;
  date: string;
  slot: string;
  guests: number;
  amount?: number;
}

export type CreateBookingRangeInput = Omit<CreateBookingInput, 'date'> & { date_from: string; date_to: string };

// --- AMENITIES ---

export async function getAmenities(): Promise<BackendAmenity[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.get<BackendAmenity[]>('/amenities', {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function getAmenityImage(id: string): Promise<Blob> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');
  const res = await apiClient.get<Blob>(`/amenities/${id}/image`, {
    headers: { 'X-Organization-Id': orgId },
    responseType: 'blob',
  });
  return res.data;
}

export async function createAmenity(input: CreateAmenityInput): Promise<BackendAmenity> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<BackendAmenity>('/amenities', input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function updateAmenity(id: string, input: Partial<CreateAmenityInput>): Promise<BackendAmenity> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.put<BackendAmenity>(`/amenities/${id}`, input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function deleteAmenity(id: string): Promise<void> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  await apiClient.delete(`/amenities/${id}`, {
    headers: { 'X-Organization-Id': orgId },
  });
}

// --- BOOKINGS ---

export async function getAmenityBookings(): Promise<BackendAmenityBooking[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.get<BackendAmenityBooking[]>('/amenities/bookings', {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function getAmenityAvailability(id: string, from: string, to: string): Promise<AmenityAvailabilityDay[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');
  const res = await apiClient.get<AmenityAvailabilityDay[]>(`/amenities/${id}/availability`, {
    timeout: 15000,
    params: { from, to },
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function createAmenityBooking(input: CreateBookingInput): Promise<BackendAmenityBooking> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<BackendAmenityBooking>('/amenities/bookings', input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function createAmenityBookingRange(input: CreateBookingRangeInput): Promise<BackendAmenityBooking[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');
  const res = await apiClient.post<BackendAmenityBooking[]>('/amenities/bookings/range', input, {
    timeout: 30000,
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function updateAmenityBookingStatus(
  id: string,
  status: 'Approved' | 'Rejected' | 'Cancelled' | 'Revoked',
): Promise<BackendAmenityBooking> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.patch<BackendAmenityBooking>(
    `/amenities/bookings/${id}/status`,
    { status },
    {
      headers: { 'X-Organization-Id': orgId },
    },
  );
  return res.data;
}

export async function cancelMyAmenityBooking(id: string): Promise<BackendAmenityBooking> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');
  const res = await apiClient.patch<BackendAmenityBooking>(`/amenities/bookings/${id}/cancel`, {}, { headers: { 'X-Organization-Id': orgId } });
  return res.data;
}
