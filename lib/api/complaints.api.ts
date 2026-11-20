/**
 * SocietyOS Complaints API Client
 *
 * Resident Endpoints:
 * - GET /complaints/my (permission: complaint:my) - Resident personal complaints only
 * - POST /complaints (permission: complaint:create) - Create complaint (server derives resident_id from req.user.id)
 *
 * Admin Endpoints:
 * - GET /complaints (permission: complaint:manage) - Organization-wide complaints list
 * - GET /complaints/:id (permission: complaint:manage) - Single complaint detail
 * - PUT /complaints/:id (permission: complaint:manage) - Update priority / status / assigned_to
 * - PUT /complaints/:id/assign (permission: complaint:manage) - Assign complaint to staff
 * - PUT /complaints/:id/resolve (permission: complaint:manage) - Resolve complaint with reason
 *
 * Strictly scoped by X-Organization-Id header and authenticated session.
 */

import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';
import {
  BackendComplaint,
  CreateComplaintInput,
  UpdateComplaintInput,
} from '../../types/complaint';

function getActiveOrganizationId(): string | null {
  const state = useAuthStore.getState();
  return state.organizationId || null;
}

/**
 * Resident: Get personal complaints
 * GET /api/v1/complaints/my
 */
export async function getMyComplaints(): Promise<BackendComplaint[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch complaints');
  }

  const response = await apiClient.get<BackendComplaint[]>('/complaints/my', {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

/**
 * Resident & Admin: Create a complaint
 * POST /api/v1/complaints
 * Server derives resident ownership from authenticated session in target org.
 */
export async function createComplaint(
  input: CreateComplaintInput,
): Promise<BackendComplaint> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to create a complaint');
  }

  const response = await apiClient.post<BackendComplaint>('/complaints', input, {
    timeout: 30000,
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

/**
 * Admin: Get all organization complaints
 * GET /api/v1/complaints
 */
export async function getOrganizationComplaints(): Promise<BackendComplaint[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch organization complaints');
  }

  const response = await apiClient.get<BackendComplaint[]>('/complaints', {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

/**
 * Admin: Get single complaint detail
 * GET /api/v1/complaints/:id
 */
export async function getComplaintById(
  id: string,
): Promise<BackendComplaint | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch complaint');
  }

  const response = await apiClient.get<BackendComplaint | null>(
    `/complaints/${id}`,
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

/**
 * Admin: Update complaint
 * PUT /api/v1/complaints/:id
 */
export async function updateComplaint(
  id: string,
  input: UpdateComplaintInput,
): Promise<BackendComplaint | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to update complaint');
  }

  const response = await apiClient.put<BackendComplaint | null>(
    `/complaints/${id}`,
    input,
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

/**
 * Admin: Assign complaint to staff / technician
 * PUT /api/v1/complaints/:id/assign
 */
export async function assignComplaint(
  id: string,
  assignedTo: string,
): Promise<BackendComplaint | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to assign complaint');
  }

  const response = await apiClient.put<BackendComplaint | null>(
    `/complaints/${id}/assign`,
    { assigned_to: assignedTo },
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

/**
 * Admin: Resolve complaint with reason
 * PUT /api/v1/complaints/:id/resolve
 */
export async function resolveComplaint(
  id: string,
  reason: string,
): Promise<BackendComplaint | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to resolve complaint');
  }

  const response = await apiClient.put<BackendComplaint | null>(
    `/complaints/${id}/resolve`,
    { reason },
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

export interface PriorityConfig {
  id: string;
  organization_id: string;
  priority: string;
  name: string;
  description?: string | null;
  order_severity: number;
  response_deadline_minutes: number;
  resolution_deadline_minutes: number;
  escalation_window_minutes: number;
  escalation_recipient: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePriorityInput {
  priority: string;
  name: string;
  description?: string;
  order_severity?: number;
  response_deadline_minutes: number;
  resolution_deadline_minutes: number;
  escalation_window_minutes: number;
  escalation_recipient?: string;
  status?: string;
}

export async function getPriorityConfigs(): Promise<PriorityConfig[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch priorities');
  }

  const response = await apiClient.get<PriorityConfig[]>('/complaints/priorities', {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

export async function createPriorityConfig(input: CreatePriorityInput): Promise<PriorityConfig> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to create priority');
  }

  const response = await apiClient.post<PriorityConfig>('/complaints/priorities', input, {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

export async function updatePriorityConfig(id: string, input: Partial<CreatePriorityInput>): Promise<PriorityConfig> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to update priority');
  }

  const response = await apiClient.put<PriorityConfig>(`/complaints/priorities/${id}`, input, {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

export async function deletePriorityConfig(id: string): Promise<void> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to delete priority');
  }

  await apiClient.delete(`/complaints/priorities/${id}`, {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
}


export async function getActionableComplaintCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/complaints/actionable-count');
  return data.count;
}
