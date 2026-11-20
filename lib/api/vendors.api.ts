import apiClient from './client';
import { useAuthStore } from '../../store/useAuthStore';

function getActiveOrganizationId(): string | null {
  const state = useAuthStore.getState();
  return state.organizationId || null;
}

export interface BackendVendor {
  id: string;
  organization_id: string;
  name: string;
  service_category: string;
  contact_person: string;
  phone: string;
  email?: string | null;
  sla: string;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorInput {
  name: string;
  service_category: string;
  contact_person: string;
  phone: string;
  email?: string;
  sla?: string;
  status?: string;
  notes?: string;
}

export interface BackendAmcContract {
  id: string;
  organization_id: string;
  vendor_id: string;
  contract_name: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  amount: number;
  status: string;
  service_coverage?: string | null;
  renewal_notes?: string | null;
  created_at: string;
  updated_at: string;
  vendor?: BackendVendor;
}

export interface CreateAmcContractInput {
  vendor_id: string;
  contract_name: string;
  contract_type?: string;
  start_date: string;
  end_date: string;
  amount?: number;
  status?: string;
  service_coverage?: string;
  renewal_notes?: string;
}

// --- VENDORS ---

export async function getVendors(): Promise<BackendVendor[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.get<BackendVendor[]>('/vendors', {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function createVendor(input: CreateVendorInput): Promise<BackendVendor> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<BackendVendor>('/vendors', input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function updateVendor(id: string, input: Partial<CreateVendorInput>): Promise<BackendVendor> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.put<BackendVendor>(`/vendors/${id}`, input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function deleteVendor(id: string): Promise<void> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  await apiClient.delete(`/vendors/${id}`, {
    headers: { 'X-Organization-Id': orgId },
  });
}

// --- AMC CONTRACTS ---

export async function getAmcContracts(): Promise<BackendAmcContract[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.get<BackendAmcContract[]>('/amc-contracts', {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function createAmcContract(input: CreateAmcContractInput): Promise<BackendAmcContract> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<BackendAmcContract>('/amc-contracts', input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function updateAmcContract(id: string, input: Partial<CreateAmcContractInput>): Promise<BackendAmcContract> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.put<BackendAmcContract>(`/amc-contracts/${id}`, input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function deleteAmcContract(id: string): Promise<void> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  await apiClient.delete(`/amc-contracts/${id}`, {
    headers: { 'X-Organization-Id': orgId },
  });
}
