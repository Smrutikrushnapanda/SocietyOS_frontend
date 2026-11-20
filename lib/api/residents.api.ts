/**
 * SocietyOS Residents API
 *
 * Typed client for /api/v1/residents
 * Authenticated, permission-checked (resident:read / resident:manage),
 * and organization-scoped via X-Organization-Id.
 */

import apiClient from './client';
import type { BackendFlat } from './flats.api';

export interface BackendResidentUser {
  id: string;
  mobileNumber: string;
}

export interface BackendResident {
  id: string;
  user_id: string;
  organization_id: string;
  flat_id?: string | null;
  name?: string | null;
  resident_type?: 'OWNER' | 'TENANT' | 'FAMILY' | null;
  email?: string | null;
  is_primary?: boolean | null;
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isActive: boolean;
  app_access_status: boolean;
  profile_photo_file_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: BackendResidentUser;
  flat?: BackendFlat;
  vehicle_details?: Array<{
    type?: string;
    make?: string;
    model?: string;
    registration?: string;
    color?: string;
  }> | null;
}

export interface CreateResidentPayload {
  user_id: string;
  organization_id: string;
  flat_id?: string;
}

/**
 * Onboard a new resident (name + phone + optional flat) in one call. The
 * backend creates the auth user, the resident profile, and the RESIDENT role.
 * Multiple residents can share one flat by calling this once per person with
 * the same `flat_id`.
 */
export interface OnboardResidentPayload {
  name: string;
  phone: string;
  email?: string;
  flat_id?: string;
  resident_type?: 'OWNER' | 'TENANT' | 'FAMILY';
  is_primary?: boolean;
  kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  app_access_status?: boolean;
  /* Personal details */
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  /* Occupancy details */
  move_in_date?: string;
  relationship_to_primary?: string;
  owner_name?: string;
  owner_contact?: string;
  profile_photo_file_id?: string;
  vehicle_details?: Array<{
    type?: string;
    make?: string;
    model?: string;
    registration?: string;
  }>;
}

export function residentDisplayName(r: Pick<BackendResident, 'name' | 'user'>): string {
  return r.name || r.user?.mobileNumber || 'Unnamed Resident';
}

export function residentLabel(r: Pick<BackendResident, 'name' | 'resident_type' | 'is_primary'>): string {
  const parts: string[] = [];
  if (r.resident_type) parts.push(capitalize(r.resident_type));
  if (r.is_primary) parts.push('Primary');
  return parts.length > 0 ? parts.join(' • ') : '';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export interface UpdateResidentPayload {
  name?: string;
  email?: string;
  flat_id?: string;
  resident_type?: 'OWNER' | 'TENANT' | 'FAMILY';
  is_primary?: boolean;
  kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isActive?: boolean;
  /** Mobile number (login identity). Lives on the auth User. */
  phone?: string;
  /* Personal details */
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  /* Occupancy details */
  move_in_date?: string;
  relationship_to_primary?: string;
  owner_name?: string;
  owner_contact?: string;
  profile_photo_file_id?: string | null;
  vehicle_details?: Array<{
    type?: string;
    make?: string;
    model?: string;
    registration?: string;
    color?: string;
  }>;
}

export interface AssignFlatPayload {
  flat_id: string;
}

export interface UpdateAppAccessPayload {
  app_access_status: boolean;
}

export async function getResidents(): Promise<BackendResident[]> {
  const { data } = await apiClient.get<any>('/residents');
  const payload = data?.data !== undefined ? data.data : data;
  return Array.isArray(payload) ? payload : [];
}

export async function getResidentById(id: string): Promise<BackendResident> {
  const { data } = await apiClient.get<any>(`/residents/${id}`);
  return data?.data !== undefined ? data.data : data;
}

export async function createResident(payload: CreateResidentPayload): Promise<BackendResident> {
  const { data } = await apiClient.post<any>('/residents', payload);
  return data?.data !== undefined ? data.data : data;
}

/**
 * Onboard a brand-new resident (name + phone + flat) in one call.
 * POST /api/v1/residents/onboard — requires resident:manage.
 */
export async function onboardResident(payload: OnboardResidentPayload): Promise<BackendResident> {
  const { data } = await apiClient.post<any>('/residents/onboard', payload);
  return data?.data !== undefined ? data.data : data;
}

export async function updateResident(
  id: string,
  payload: UpdateResidentPayload,
): Promise<BackendResident> {
  const { data } = await apiClient.patch<any>(`/residents/${id}`, payload);
  return data?.data !== undefined ? data.data : data;
}

export async function deleteResident(id: string, permanent?: boolean): Promise<BackendResident> {
  const { data } = await apiClient.delete<any>(`/residents/${id}`, {
    params: permanent ? { permanent: true } : undefined,
  });
  return data?.data !== undefined ? data.data : data;
}

export async function bulkImportResidents(records: any[]): Promise<{
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; identifier: string; error: string }>;
}> {
  const { data } = await apiClient.post<any>('/residents/bulk-import', { records });
  return data?.data !== undefined ? data.data : data;
}

export async function assignFlatToResident(
  residentId: string,
  payload: AssignFlatPayload,
): Promise<BackendResident> {
  const { data } = await apiClient.patch<any>(
    `/residents/${residentId}/assign-flat`,
    payload,
  );
  return data?.data !== undefined ? data.data : data;
}

export async function updateResidentAppAccess(
  residentId: string,
  payload: UpdateAppAccessPayload,
): Promise<BackendResident> {
  const { data } = await apiClient.patch<any>(
    `/residents/${residentId}/app-access`,
    payload,
  );
  return data?.data !== undefined ? data.data : data;
}
