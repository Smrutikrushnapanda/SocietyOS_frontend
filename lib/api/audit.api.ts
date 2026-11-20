import apiClient from './client';

export interface AuditLogItem {
  id: string;
  actor_user_id: string | null;
  actor_organization_id: string | null;
  target_organization_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogPage {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  actor_user_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

function cleanQuery<T extends Record<string, any>>(params?: T): Record<string, any> | undefined {
  if (!params) return undefined;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Fetch paginated audit logs for the active organization.
 * Backend: GET /api/v1/audit-logs
 * Permission: audit:read
 */
export async function getAuditLogs(params?: AuditLogFilters): Promise<AuditLogPage> {
  const { data } = await apiClient.get<AuditLogPage>('/audit-logs', {
    params: cleanQuery(params),
  });
  return data;
}

/**
 * Fetch a single audit log entry by ID with complete old/new values.
 * Backend: GET /api/v1/audit-logs/:id
 * Permission: audit:read
 */
export async function getAuditLogById(id: string): Promise<AuditLogItem> {
  const { data } = await apiClient.get<AuditLogItem>(`/audit-logs/${id}`);
  return data;
}
