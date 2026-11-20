import apiClient from './client';

export interface PaginatedReport<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BuildingOccupancyRow {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  floors: number;
  total_flats: number;
  occupied_flats: number;
  vacant_flats: number;
  occupancy_percentage: number;
}

export interface OccupancyTotals {
  buildings: number;
  floors: number;
  total_flats: number;
  occupied_flats: number;
  vacant_flats: number;
  occupancy_percentage: number;
}

export interface OccupancyReport {
  buildings: BuildingOccupancyRow[];
  totals: OccupancyTotals;
}

export interface ResidentReportRow {
  resident_id: string;
  kyc_status: string;
  app_access_status: boolean;
  is_active: boolean;
  flat: { id: string; flat_identifier: string | null } | null;
  building: { id: string; name: string | null } | null;
  floor: { id: string; floor_number: number | null } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface VisitorReportRow {
  visit_id: string;
  visitor: { id: string; name: string; mobile: string };
  visit_status: string;
  visit_purpose: string | null;
  expected_entry_time: string | null;
  actual_entry_time: string | null;
  approval_status: string | null;
  pass_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaintenanceDueReportRow {
  due_id: string;
  status: string;
  flat: { id: string; flat_identifier: string | null };
  building: { id: string; name: string | null } | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  calculated_amount: number | string;
  late_charge: number | string;
  late_charge_waived: number | string;
  is_late_charge_waived: boolean;
  late_charge_waived_at: string | null;
  due_date: string | null;
  payment_received_at: string | null;
  created_at: string | null;
}

export interface PaymentReportRow {
  payment_id: string;
  amount: number | string;
  payment_method: string;
  payment_status: string;
  payment_date: string | null;
  transaction_id: string | null;
  resident_id: string | null;
  flat: { id: string; flat_identifier: string | null } | null;
  building: { id: string; name: string | null } | null;
  maintenance_due: {
    id: string;
    status: string;
    billing_period_start: string | null;
    billing_period_end: string | null;
  } | null;
  created_at: string | null;
}

export interface ComplaintReportRow {
  complaint_id: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  resident_id: string;
  assigned_to: string | null;
  flat: { id: string; flat_identifier: string | null };
  building: { id: string; name: string | null } | null;
  created_at: string | null;
  resolved_at: string | null;
  updated_at: string | null;
}

export interface NoticeReportRow {
  notice_id: string;
  title: string;
  status: string;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PollOptionResultRow {
  option_id: string;
  option_text: string;
  display_order: number;
  vote_count: number;
  percentage: number;
}

export interface PollReportRow {
  poll_id: string;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  total_votes: number;
  options: PollOptionResultRow[];
}

export interface BaseReportQuery {
  page?: number;
  limit?: number;
}

export interface DateRangeReportQuery extends BaseReportQuery {
  from?: string;
  to?: string;
}

export interface ResidentsReportQuery extends BaseReportQuery {
  kyc_status?: string;
  app_access?: string;
  active?: string;
  building_id?: string;
  floor_id?: string;
  flat_id?: string;
}

export interface VisitorsReportQuery extends DateRangeReportQuery {
  visit_status?: string;
  visitor_id?: string;
}

export interface MaintenanceDuesReportQuery extends DateRangeReportQuery {
  status?: string;
  flat_id?: string;
  building_id?: string;
  billing_period?: string;
  has_late_charge?: string;
}

export interface PaymentsReportQuery extends DateRangeReportQuery {
  payment_status?: string;
  payment_method?: string;
  flat_id?: string;
  building_id?: string;
  resident_id?: string;
  maintenance_due_id?: string;
}

export interface ComplaintsReportQuery extends DateRangeReportQuery {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  flat_id?: string;
  building_id?: string;
}

export interface NoticesReportQuery extends DateRangeReportQuery {
  status?: string;
}

export interface PollsReportQuery extends DateRangeReportQuery {
  status?: string;
}

/**
 * Clean query params by stripping empty/undefined fields.
 */
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

export async function getOccupancyReport(): Promise<OccupancyReport> {
  const { data } = await apiClient.get<OccupancyReport>('/reports/occupancy');
  return data;
}

export async function getResidentsReport(
  params?: ResidentsReportQuery,
): Promise<PaginatedReport<ResidentReportRow>> {
  const { data } = await apiClient.get<PaginatedReport<ResidentReportRow>>('/reports/residents', {
    params: cleanQuery(params),
  });
  return data;
}

export async function getVisitorsReport(
  params?: VisitorsReportQuery,
): Promise<PaginatedReport<VisitorReportRow>> {
  const { data } = await apiClient.get<PaginatedReport<VisitorReportRow>>('/reports/visitors', {
    params: cleanQuery(params),
  });
  return data;
}

export async function getMaintenanceDuesReport(
  params?: MaintenanceDuesReportQuery,
): Promise<PaginatedReport<MaintenanceDueReportRow>> {
  const { data } = await apiClient.get<PaginatedReport<MaintenanceDueReportRow>>(
    '/reports/maintenance-dues',
    { params: cleanQuery(params) },
  );
  return data;
}

export async function getPaymentsReport(
  params?: PaymentsReportQuery,
): Promise<PaginatedReport<PaymentReportRow>> {
  const { data } = await apiClient.get<PaginatedReport<PaymentReportRow>>('/reports/payments', {
    params: cleanQuery(params),
  });
  return data;
}

export async function getComplaintsReport(
  params?: ComplaintsReportQuery,
): Promise<PaginatedReport<ComplaintReportRow>> {
  const { data } = await apiClient.get<PaginatedReport<ComplaintReportRow>>('/reports/complaints', {
    params: cleanQuery(params),
  });
  return data;
}

export async function getNoticesReport(
  params?: NoticesReportQuery,
): Promise<PaginatedReport<NoticeReportRow>> {
  const { data } = await apiClient.get<PaginatedReport<NoticeReportRow>>('/reports/notices', {
    params: cleanQuery(params),
  });
  return data;
}

export async function getPollsReport(
  params?: PollsReportQuery,
): Promise<PaginatedReport<PollReportRow>> {
  const { data } = await apiClient.get<PaginatedReport<PollReportRow>>('/reports/polls', {
    params: cleanQuery(params),
  });
  return data;
}
