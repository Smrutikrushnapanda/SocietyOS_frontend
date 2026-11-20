import apiClient from './client';

export interface ExportDateRangeQuery {
  from?: string;
  to?: string;
}

export interface ResidentsExportQuery {
  kyc_status?: string;
  app_access?: string;
  active?: string;
  building_id?: string;
  floor_id?: string;
  flat_id?: string;
}

export interface VisitorsExportQuery extends ExportDateRangeQuery {
  visit_status?: string;
  visitor_id?: string;
}

export interface MaintenanceDuesExportQuery extends ExportDateRangeQuery {
  status?: string;
  flat_id?: string;
  building_id?: string;
  billing_period?: string;
  has_late_charge?: string;
}

export interface PaymentsExportQuery extends ExportDateRangeQuery {
  payment_status?: string;
  payment_method?: string;
  flat_id?: string;
  building_id?: string;
  resident_id?: string;
  maintenance_due_id?: string;
}

export interface ComplaintsExportQuery extends ExportDateRangeQuery {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  flat_id?: string;
  building_id?: string;
}

export interface NoticesExportQuery extends ExportDateRangeQuery {
  status?: string;
}

export interface PollsExportQuery extends ExportDateRangeQuery {
  status?: string;
}

export interface ExportDownloadResult {
  filename: string;
  rowCount: number;
  truncated: boolean;
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

function parseFilename(contentDisposition?: string, fallback = 'export.csv'): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

async function triggerDownload(
  endpoint: string,
  fallbackFilename: string,
  params?: Record<string, any>,
): Promise<ExportDownloadResult> {
  const response = await apiClient.get<Blob>(endpoint, {
    params: cleanQuery(params),
    responseType: 'blob',
  });

  const headers = (response.headers || {}) as Record<string, any>;
  const contentDisp = typeof headers['content-disposition'] === 'string' ? headers['content-disposition'] : undefined;
  const filename = parseFilename(contentDisp, fallbackFilename);
  const truncated = headers['x-export-truncated'] === 'true';
  const rowCount = Number(headers['x-export-row-count'] || 0);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return { filename, rowCount, truncated };
}

export async function exportResidents(
  params?: ResidentsExportQuery,
): Promise<ExportDownloadResult> {
  return triggerDownload('/exports/residents', 'residents.csv', params);
}

export async function exportVisitors(
  params?: VisitorsExportQuery,
): Promise<ExportDownloadResult> {
  return triggerDownload('/exports/visitors', 'visitors.csv', params);
}

export async function exportMaintenanceDues(
  params?: MaintenanceDuesExportQuery,
): Promise<ExportDownloadResult> {
  return triggerDownload('/exports/maintenance-dues', 'maintenance-dues.csv', params);
}

export async function exportPayments(
  params?: PaymentsExportQuery,
): Promise<ExportDownloadResult> {
  return triggerDownload('/exports/payments', 'payments.csv', params);
}

export async function exportComplaints(
  params?: ComplaintsExportQuery,
): Promise<ExportDownloadResult> {
  return triggerDownload('/exports/complaints', 'complaints.csv', params);
}

export async function exportNotices(
  params?: NoticesExportQuery,
): Promise<ExportDownloadResult> {
  return triggerDownload('/exports/notices', 'notices.csv', params);
}

export async function exportPolls(
  params?: PollsExportQuery,
): Promise<ExportDownloadResult> {
  return triggerDownload('/exports/polls', 'polls.csv', params);
}
