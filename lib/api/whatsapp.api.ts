import apiClient from './client';

export interface WhatsAppStatusData {
  status: 'WORKING' | 'CONNECTED' | 'STARTING' | 'SCAN_QR_CODE' | 'STOPPED' | 'FAILED' | 'UNKNOWN';
  provider: 'waha' | 'mock';
  sessionName: string;
  accountInfo: {
    id?: string;
    pushName?: string;
  } | null;
  lastChecked: string;
  error?: string;
}

export interface WhatsAppNotificationSettings {
  isEnabled: boolean;
  notifyVisitor: boolean;
  notifyMaintenance: boolean;
  notifyPayment: boolean;
  notifyComplaint: boolean;
  notifyNotice: boolean;
}

export interface TestMessageResponse {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
}

/**
 * Fetch WhatsApp provider and session connection health.
 */
export async function getWhatsAppStatus(): Promise<WhatsAppStatusData> {
  const { data } = await apiClient.get<any>('/admin/whatsapp/status');
  return data?.data !== undefined ? data.data : data;
}

/**
 * Dispatch a safe test message to the specified recipient phone number.
 */
export async function sendWhatsAppTestMessage(
  recipientNumber: string,
): Promise<TestMessageResponse> {
  const { data } = await apiClient.post<any>('/admin/whatsapp/test-message', {
    recipientNumber,
  }, { timeout: 120000 });
  return data?.data !== undefined ? data.data : data;
}

/**
 * Fetch active organization notification preferences for WhatsApp.
 */
export async function getWhatsAppSettings(): Promise<WhatsAppNotificationSettings> {
  const { data } = await apiClient.get<any>('/admin/whatsapp/settings');
  return data?.data !== undefined ? data.data : data;
}

/**
 * Update organization notification preferences for WhatsApp.
 */
export async function updateWhatsAppSettings(
  settings: Partial<WhatsAppNotificationSettings>,
): Promise<WhatsAppNotificationSettings> {
  const { data } = await apiClient.put<any>('/admin/whatsapp/settings', settings);
  return data?.data !== undefined ? data.data : data;
}
