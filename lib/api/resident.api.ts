/**
 * SocietyOS Resident API
 *
 * Dedicated client for resident portal data:
 * - Authenticated resident profile
 * - Resident assigned flat
 * - Building and floor hierarchy
 *
 * Uses apiClient with automatic token injection, organization context,
 * and normalized ApiError handling.
 */

import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';
import type { BackendFlat } from './flats.api';
import type { BackendBuilding } from './buildings.api';
import type { BackendFloor } from './floors.api';

export interface ResidentUser {
  id: string;
  mobileNumber: string;
}

export interface ResidentFlat extends BackendFlat {
  building?: BackendBuilding | null;
  floor?: BackendFloor | null;
}

export interface AuthenticatedResidentProfile {
  id: string;
  user_id: string;
  organization_id: string;
  flat_id: string | null;
  name?: string | null;
  resident_type?: 'OWNER' | 'TENANT' | 'FAMILY' | null;
  email?: string | null;
  is_primary?: boolean | null;
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isActive: boolean;
  app_access_status: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: ResidentUser;
  flat?: ResidentFlat | null;
}

/**
 * Fetch authenticated resident's own profile.
 * Target backend endpoint: GET /api/v1/residents/me
 * Requires active organization context in auth store.
 */
export async function getAuthenticatedResidentProfile(): Promise<AuthenticatedResidentProfile> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }

  const { data } = await apiClient.get<AuthenticatedResidentProfile>('/residents/me');
  return data;
}

/**
 * Fetch flat details for the authenticated resident's flat.
 * GET /api/v1/flats/:id
 */
export async function getResidentFlat(flatId: string): Promise<BackendFlat> {
  const { data } = await apiClient.get<BackendFlat>(`/flats/${flatId}`);
  return data;
}

/**
 * Fetch building details for the resident's flat building.
 * GET /api/v1/buildings/:id
 */
export async function getResidentBuilding(buildingId: string): Promise<BackendBuilding> {
  const { data } = await apiClient.get<BackendBuilding>(`/buildings/${buildingId}`);
  return data;
}

/**
 * Fetch floor details for the resident's flat floor.
 * GET /api/v1/floors/:id
 */
export async function getResidentFloor(floorId: string): Promise<BackendFloor> {
  const { data } = await apiClient.get<BackendFloor>(`/floors/${floorId}`);
  return data;
}

/**
 * Admin: Fetch all organization residents.
 * GET /api/v1/residents
 */
export async function getAllResidents(): Promise<AuthenticatedResidentProfile[]> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected.');
  }

  const { data } = await apiClient.get<AuthenticatedResidentProfile[]>('/residents');
  return data;
}

/**
 * Admin: Update resident KYC or flat assignment.
 * PATCH /api/v1/residents/:id
 */
export async function updateResidentKyc(
  id: string,
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED',
): Promise<AuthenticatedResidentProfile> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected.');
  }

  const { data } = await apiClient.patch<AuthenticatedResidentProfile>(`/residents/${id}`, {
    kyc_status,
  });
  return data;
}

