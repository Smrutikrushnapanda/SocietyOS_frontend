/**
 * SocietyOS Notices API Client
 *
 * Resident & Guard:
 * - GET /notices (permission: notice:read) - Returns only PUBLISHED notices (server-filtered)
 * - GET /notices/:id (permission: notice:read) - Returns single notice
 *
 * Admin:
 * - GET /notices (permission: notice:read) - Returns all notices (DRAFT, PUBLISHED, ARCHIVED)
 * - POST /notices (permission: notice:publish) - Create new notice
 * - PUT /notices/:id/publish (permission: notice:publish) - Transition DRAFT -> PUBLISHED
 * - PUT /notices/:id/expire (permission: notice:publish) - Transition PUBLISHED -> ARCHIVED
 *
 * Strictly scoped by X-Organization-Id header and authenticated session.
 */

import apiClient from './client';
import { useAuthStore } from '../../store/useAuthStore';
import {
  BackendNotice,
  CreateNoticeInput,
  UpdateNoticeInput, NoticeAttachment,
} from '../../types/notice';

function getActiveOrganizationId(): string | null {
  const state = useAuthStore.getState();
  return state.organizationId || null;
}

/**
 * Get organization notices (role-aware: Residents & Guards get PUBLISHED only)
 * GET /api/v1/notices
 */
export async function getNotices(): Promise<BackendNotice[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch notices');
  }

  const response = await apiClient.get<BackendNotice[]>('/notices', {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

/**
 * Get single notice by ID
 * GET /api/v1/notices/:id
 */
export async function getNoticeById(id: string): Promise<BackendNotice | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch notice');
  }

  const response = await apiClient.get<BackendNotice | null>(`/notices/${id}`, {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

/**
 * Admin: Create a notice
 * POST /api/v1/notices
 */
export async function createNotice(
  input: CreateNoticeInput,
): Promise<BackendNotice> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to create a notice');
  }

  const response = await apiClient.post<BackendNotice>('/notices', input, {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

/**
 * Admin: Publish notice (transition DRAFT -> PUBLISHED)
 * PUT /api/v1/notices/:id/publish
 */
export async function publishNotice(id: string, confirmEmergency = false): Promise<BackendNotice | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to publish notice');
  }

  const response = await apiClient.put<BackendNotice | null>(
    `/notices/${id}/publish`,
    { confirmEmergency },
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

/**
 * Admin: Expire notice (transition PUBLISHED -> ARCHIVED)
 * PUT /api/v1/notices/:id/expire
 */
export async function expireNotice(id: string): Promise<BackendNotice | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to expire notice');
  }

  const response = await apiClient.put<BackendNotice | null>(
    `/notices/${id}/expire`,
    {},
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

export interface NoticeCapabilities { scheduledPublication: boolean; deliveryWorker: boolean; pushDispatch: boolean }
export async function getNoticeCapabilities(): Promise<NoticeCapabilities> {
  return (await apiClient.get<NoticeCapabilities>('/notices/capabilities')).data;
}
export async function updateNotice(id: string, input: UpdateNoticeInput): Promise<BackendNotice> {
  return (await apiClient.put<BackendNotice>(`/notices/${id}`, input)).data;
}
export async function scheduleNotice(id: string, publishAt: string, confirmEmergency: boolean): Promise<BackendNotice> {
  return (await apiClient.put<BackendNotice>(`/notices/${id}/schedule`, { publishAt, confirmEmergency })).data;
}
export async function cancelNoticeSchedule(id: string): Promise<BackendNotice> {
  return (await apiClient.delete<BackendNotice>(`/notices/${id}/schedule`)).data;
}
export async function getNoticeAttachments(id: string): Promise<NoticeAttachment[]> {
  return (await apiClient.get<NoticeAttachment[]>(`/notices/${id}/attachments`)).data;
}
export async function uploadNoticeAttachment(id: string, file: File): Promise<NoticeAttachment> {
  const form = new FormData(); form.append('file', file);
  return (await apiClient.post<NoticeAttachment>(`/notices/${id}/attachments`, form)).data;
}
export async function removeNoticeAttachment(id: string, fileId: string): Promise<void> {
  await apiClient.delete(`/notices/${id}/attachments/${fileId}`);
}
export async function downloadNoticeAttachment(id: string, file: NoticeAttachment): Promise<void> {
  const before = useAuthStore.getState();
  const response = await apiClient.get<Blob>(`/notices/${id}/attachments/${file.id}`, { responseType: 'blob' });
  const current = useAuthStore.getState();
  if (!current.isAuthenticated || current.logoutInProgress || before.backendUser?.id !== current.backendUser?.id || before.organizationId !== current.organizationId) return;
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.original_filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
