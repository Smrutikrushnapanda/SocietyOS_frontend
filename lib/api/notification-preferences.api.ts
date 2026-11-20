import apiClient from './client';

export const NOTIFICATION_CATEGORIES = [
  'SECURITY', 'EMERGENCY', 'VISITOR_ARRIVAL', 'VISITOR_APPROVAL',
  'NOTICE', 'COMPLAINT', 'DOCUMENT', 'POLL', 'AMENITY', 'GENERAL',
] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];
export interface NotificationPreference {
  category: NotificationCategory;
  enabled: boolean;
  mandatory: boolean;
}
export type NotificationPreferenceUpdate = Pick<NotificationPreference, 'category' | 'enabled'>;

export async function getNotificationPreferences(signal?: AbortSignal): Promise<NotificationPreference[]> {
  const { data } = await apiClient.get<NotificationPreference[]>('/notification-preferences', { signal });
  return data;
}

export async function updateNotificationPreferences(updates: NotificationPreferenceUpdate[], signal?: AbortSignal): Promise<NotificationPreference[]> {
  const { data } = await apiClient.patch<NotificationPreference[]>('/notification-preferences', { updates }, { signal });
  return data;
}
