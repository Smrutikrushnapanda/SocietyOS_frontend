/**
 * SocietyOS Flats API
 *
 * Typed client for /api/v1/flats
 * Authenticated, permission-checked (flat:read / flat:manage),
 * and organization-scoped via X-Organization-Id.
 */

import apiClient from './client';

export interface BackendFlat {
  id: string;
  organization_id: string;
  building_id: string;
  floor_id: string;
  flat_identifier: string;
  flat_type?: string | null;
  maintenance_multiplier?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFlatPayload {
  organization_id: string;
  building_id: string;
  floor_id: string;
  flat_identifier: string;
  flat_type?: string;
  maintenance_multiplier?: number;
}

export interface UpdateFlatPayload {
  building_id?: string;
  floor_id?: string;
  flat_identifier?: string;
  flat_type?: string;
  maintenance_multiplier?: number;
  isActive?: boolean;
}

export async function getFlats(): Promise<BackendFlat[]> {
  const { data } = await apiClient.get<any>('/flats');
  const payload = data?.data !== undefined ? data.data : data;
  return Array.isArray(payload) ? payload : [];
}

export async function getFlatsByBuilding(buildingId: string): Promise<BackendFlat[]> {
  const { data } = await apiClient.get<any>(`/flats/building/${buildingId}`);
  const payload = data?.data !== undefined ? data.data : data;
  return Array.isArray(payload) ? payload : [];
}

export async function getFlatById(id: string): Promise<BackendFlat> {
  const { data } = await apiClient.get<any>(`/flats/${id}`);
  return data?.data !== undefined ? data.data : data;
}

export async function createFlat(payload: CreateFlatPayload): Promise<BackendFlat> {
  const { data } = await apiClient.post<any>('/flats', payload);
  return data?.data !== undefined ? data.data : data;
}

export async function updateFlat(
  id: string,
  payload: UpdateFlatPayload,
): Promise<BackendFlat> {
  const { data } = await apiClient.patch<any>(`/flats/${id}`, payload);
  return data?.data !== undefined ? data.data : data;
}

export async function deleteFlat(id: string, permanent?: boolean): Promise<BackendFlat> {
  const { data } = await apiClient.delete<any>(`/flats/${id}`, {
    params: permanent ? { permanent: true } : undefined,
  });
  return data?.data !== undefined ? data.data : data;
}
