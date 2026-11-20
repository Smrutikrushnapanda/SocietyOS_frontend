/**
 * SocietyOS Buildings API
 *
 * Typed client for /api/v1/buildings
 * Authenticated, permission-checked (building:read / building:manage),
 * and organization-scoped via X-Organization-Id.
 */

import apiClient from './client';

export interface BackendBuilding {
  id: string;
  organization_id: string;
  name: string;
  code?: string | null;
  totalFloors?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBuildingPayload {
  organization_id: string;
  name: string;
  code?: string;
  totalFloors?: number;
}

export interface UpdateBuildingPayload {
  name?: string;
  code?: string;
  totalFloors?: number;
  isActive?: boolean;
}

export async function getBuildings(includeInactive?: boolean): Promise<BackendBuilding[]> {
  const { data } = await apiClient.get<any>('/buildings', {
    params: includeInactive ? { includeInactive: true } : undefined,
  });
  const payload = data?.data !== undefined ? data.data : data;
  return Array.isArray(payload) ? payload : [];
}

export async function getBuildingById(id: string): Promise<BackendBuilding> {
  const { data } = await apiClient.get<any>(`/buildings/${id}`);
  return data?.data !== undefined ? data.data : data;
}

export async function createBuilding(payload: CreateBuildingPayload): Promise<BackendBuilding> {
  const { data } = await apiClient.post<any>('/buildings', payload);
  return data?.data !== undefined ? data.data : data;
}

export async function updateBuilding(
  id: string,
  payload: UpdateBuildingPayload,
): Promise<BackendBuilding> {
  const { data } = await apiClient.patch<any>(`/buildings/${id}`, payload);
  return data?.data !== undefined ? data.data : data;
}

export async function deleteBuilding(id: string, permanent?: boolean): Promise<BackendBuilding> {
  const { data } = await apiClient.delete<any>(`/buildings/${id}`, {
    params: permanent ? { permanent: true } : undefined,
  });
  return data?.data !== undefined ? data.data : data;
}
