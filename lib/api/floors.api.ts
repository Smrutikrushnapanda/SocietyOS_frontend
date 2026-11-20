/**
 * SocietyOS Floors API
 *
 * Typed client for /api/v1/floors
 * Authenticated, permission-checked (floor:read / floor:manage),
 * and organization-scoped via X-Organization-Id.
 */

import apiClient from './client';

export interface BackendFloor {
  id: string;
  organization_id: string;
  building_id: string;
  floor_number: number;
  name?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFloorPayload {
  organization_id: string;
  building_id: string;
  floor_number: number;
  name?: string;
}

export interface UpdateFloorPayload {
  floor_number?: number;
  name?: string;
  isActive?: boolean;
}

export async function getFloors(): Promise<BackendFloor[]> {
  const { data } = await apiClient.get<any>('/floors');
  const payload = data?.data !== undefined ? data.data : data;
  return Array.isArray(payload) ? payload : [];
}

export async function getFloorsByBuilding(buildingId: string): Promise<BackendFloor[]> {
  const { data } = await apiClient.get<any>(`/floors/building/${buildingId}`);
  const payload = data?.data !== undefined ? data.data : data;
  return Array.isArray(payload) ? payload : [];
}

export async function getFloorById(id: string): Promise<BackendFloor> {
  const { data } = await apiClient.get<any>(`/floors/${id}`);
  return data?.data !== undefined ? data.data : data;
}

export async function createFloor(payload: CreateFloorPayload): Promise<BackendFloor> {
  const { data } = await apiClient.post<any>('/floors', payload);
  return data?.data !== undefined ? data.data : data;
}

export async function updateFloor(
  id: string,
  payload: UpdateFloorPayload,
): Promise<BackendFloor> {
  const { data } = await apiClient.patch<any>(`/floors/${id}`, payload);
  return data?.data !== undefined ? data.data : data;
}

export async function deleteFloor(id: string, permanent?: boolean): Promise<BackendFloor> {
  const { data } = await apiClient.delete<any>(`/floors/${id}`, {
    params: permanent ? { permanent: true } : undefined,
  });
  return data?.data !== undefined ? data.data : data;
}
