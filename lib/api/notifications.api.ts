import axios from 'axios';
import type { PushSession } from '../firebase/push-token-lifecycle';
import apiClient from './client';

export interface NotificationItem {
  id: string;
  organization_id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PushTokenPlatform = 'WEB' | 'ANDROID' | 'IOS';

export interface PushTokenRecord {
  id: string;
  user_id: string;
  organization_id: string;
  token: string;
  platform: PushTokenPlatform;
  is_active: boolean;
  last_seen_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterPushTokenPayload {
  token: string;
  platform?: PushTokenPlatform;
  previousTokenId?: string;
}

/**
 * Fetch all notifications for the authenticated user within the active organization.
 * Backend: GET /api/v1/notifications
 * Permission: notification:read
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<NotificationItem[]>('/notifications');
  return data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<{ total: number }>('/notifications/page', { params: { page: 1, unread: true } });
  return data.total;
}

/**
 * Fetch a single notification by ID.
 * Backend: GET /api/v1/notifications/:id
 * Permission: notification:read
 */
export async function getNotification(id: string): Promise<NotificationItem> {
  const { data } = await apiClient.get<NotificationItem>(`/notifications/${id}`);
  return data;
}

/**
 * Mark a single notification as read.
 * Backend: PATCH /api/v1/notifications/:id/read
 * Permission: notification:read
 */
export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const { data } = await apiClient.patch<NotificationItem>(`/notifications/${id}/read`);
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event('societyos:notifications-changed'));
  return data;
}

/**
 * Mark all notifications for the authenticated user as read.
 * Backend: PATCH /api/v1/notifications/read-all
 * Permission: notification:read
 */
export async function markAllNotificationsRead(): Promise<{ message: string }> {
  const { data } = await apiClient.patch<{ message: string }>('/notifications/read-all');
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event('societyos:notifications-changed'));
  return data;
}

/**
 * Register or update an FCM / Web push token for the authenticated user.
 * Backend: POST /api/v1/push-tokens
 * Permission: push_token:manage
 */
export async function registerPushToken(
  payload: RegisterPushTokenPayload,
  signal?: AbortSignal,
  session?: PushSession,
): Promise<PushTokenRecord> {
  const config = { signal, ...(session ? { societyosPushScope: { userId: session.userId, organizationId: session.organizationId } } : {}) };
  const { data } = await apiClient.post<PushTokenRecord>('/push-tokens', {
    token: payload.token,
    platform: payload.platform ?? 'WEB',
    ...(payload.previousTokenId ? { previousTokenId: payload.previousTokenId } : {}),
  }, config);
  return data;
}

/**
 * Deactivate a registered push token by ID.
 * Backend: DELETE /api/v1/push-tokens/:id
 * Permission: push_token:manage
 */
export async function deactivatePushToken(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/push-tokens/${id}`);
  return data;
}

// Captured-session cleanup must never refresh/log out a subsequently signed-in account.
export async function revokePushTokenForSession(id: string, session: PushSession): Promise<void> {
  await axios.delete(`${apiClient.defaults.baseURL}/push-tokens/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${session.accessToken}`, 'X-Organization-Id': session.organizationId },
    timeout: 10000,
  });
}
