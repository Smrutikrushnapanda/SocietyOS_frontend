/**
 * SocietyOS Maintenance & Payments API
 *
 * Dedicated typed client for:
 * - Resident personal dues (GET /maintenance/dues/my)
 * - Resident personal payments (GET /maintenance/payments/my)
 * - Admin maintenance configuration (GET /maintenance/config, PUT /maintenance/config)
 * - Admin organization dues (GET /maintenance/dues, POST /maintenance/dues)
 * - Admin due lifecycle (GET /maintenance/dues/:id, PATCH /maintenance/dues/:id/mark-paid, PATCH /maintenance/dues/:id/mark-overdue, POST /maintenance/dues/:id/waive-late-charge)
 * - Admin internal payment records (GET /maintenance/payments, POST /maintenance/payments, GET /maintenance/payments/:id, PATCH /payments/:id/mark-completed, PATCH /payments/:id/mark-failed)
 *
 * Scoped by X-Organization-Id header and authenticated user session.
 */

import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';

// ============================================================================
// Backend Entity Types
// ============================================================================

export interface BackendMaintenanceConfiguration {
  id: string;
  organization_id: string;
  base_maintenance_amount: number;
  due_day_of_month: number;
  late_charge_type: 'FIXED' | 'PERCENTAGE';
  late_charge_frequency?: 'ONCE' | 'DAILY' | 'WEEKLY';
  late_charge_start?: 'FIRST_DAY' | 'AFTER_PERIOD';
  late_charge_value: number;
  late_charge_grace_days: number;
  is_active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendMaintenanceDue {
  id: string;
  flat_id: string;
  organization_id: string;
  base_maintenance_amount: number;
  maintenance_multiplier: number;
  calculated_amount: number;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  late_charge: number;
  late_charge_waived: number;
  late_charge_waived_by?: string | null;
  late_charge_waived_at?: string | null;
  late_charge_waiver_reason?: string | null;
  status: 'PENDING' | 'OVERDUE' | 'PAID';
  payment_received_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendPayment {
  id: string;
  organization_id: string;
  resident_id?: string | null;
  flat_id?: string | null;
  maintenance_due_id: string;
  amount: number;
  payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
  payment_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  payment_date: string;
  transaction_id?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// DTOs
// ============================================================================

export interface UpdateMaintenanceConfigurationPayload {
  base_maintenance_amount?: number;
  due_day_of_month?: number;
  late_charge_type?: 'FIXED' | 'PERCENTAGE';
  late_charge_frequency?: 'ONCE' | 'DAILY' | 'WEEKLY';
  late_charge_start?: 'FIRST_DAY' | 'AFTER_PERIOD';
  late_charge_value?: number;
  late_charge_grace_days?: number;
  is_active?: boolean;
}

export interface GenerateDuePayload {
  flat_id: string;
  billing_period_start: string;
  billing_period_end: string;
}

export interface WaiveLateChargePayload {
  stop_future_charges?: boolean;
  reason?: string;
}

export interface CreatePaymentPayload {
  organization_id: string;
  resident_id?: string;
  flat_id?: string;
  maintenance_due_id: string;
  amount: number;
  payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
}

// ============================================================================
// Helper: Organization Context Assertion
// ============================================================================

function assertOrganizationContext(): string {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  return orgId;
}

// ============================================================================
// Resident APIs (due:my, payment:my)
// ============================================================================

/**
 * Fetch authenticated resident's dues (scoped to resident flat & org context).
 * GET /api/v1/maintenance/dues/my
 */
export async function getMyMaintenanceDues(): Promise<BackendMaintenanceDue[]> {
  assertOrganizationContext();
  const { data } = await apiClient.get<BackendMaintenanceDue[]>('/maintenance/dues/my');
  return data;
}

/**
 * Fetch authenticated resident's payment records (scoped to resident & org context).
 * GET /api/v1/maintenance/payments/my
 */
export async function getMyPayments(): Promise<BackendPayment[]> {
  assertOrganizationContext();
  const { data } = await apiClient.get<BackendPayment[]>('/maintenance/payments/my');
  return data;
}

// ============================================================================
// Admin Maintenance Configuration APIs (maintenance:read, maintenance:manage)
// ============================================================================

/**
 * Fetch organization's maintenance configuration.
 * GET /api/v1/maintenance/config
 */
export async function getMaintenanceConfiguration(): Promise<BackendMaintenanceConfiguration | null> {
  assertOrganizationContext();
  const { data } = await apiClient.get<BackendMaintenanceConfiguration | null>('/maintenance/config');
  return data;
}

/**
 * Update organization's maintenance configuration.
 * PUT /api/v1/maintenance/config
 */
export async function updateMaintenanceConfiguration(
  payload: UpdateMaintenanceConfigurationPayload,
): Promise<BackendMaintenanceConfiguration> {
  assertOrganizationContext();
  const { data } = await apiClient.put<BackendMaintenanceConfiguration>('/maintenance/config', payload);
  return data;
}

// ============================================================================
// Admin Dues Management APIs (due:read, due:manage, late_charge:waive)
// ============================================================================

/**
 * List all dues in current organization.
 * GET /api/v1/maintenance/dues
 */
export async function getOrganizationDues(): Promise<BackendMaintenanceDue[]> {
  assertOrganizationContext();
  const { data } = await apiClient.get<BackendMaintenanceDue[]>('/maintenance/dues');
  return data;
}

/**
 * Get specific due by ID.
 * GET /api/v1/maintenance/dues/:id
 */
export async function getDueById(dueId: string): Promise<BackendMaintenanceDue> {
  assertOrganizationContext();
  const { data } = await apiClient.get<BackendMaintenanceDue>(`/maintenance/dues/${dueId}`);
  return data;
}

/**
 * Generate a new maintenance due for a flat.
 * POST /api/v1/maintenance/dues
 */
export async function generateDue(payload: GenerateDuePayload): Promise<BackendMaintenanceDue> {
  assertOrganizationContext();
  const { data } = await apiClient.post<BackendMaintenanceDue>('/maintenance/dues', payload);
  return data;
}

/**
 * Mark due as paid (administrative override).
 * PATCH /api/v1/maintenance/dues/:id/mark-paid
 */
export async function markDuePaid(dueId: string): Promise<BackendMaintenanceDue> {
  assertOrganizationContext();
  const { data } = await apiClient.patch<BackendMaintenanceDue>(`/maintenance/dues/${dueId}/mark-paid`);
  return data;
}

/**
 * Mark due as overdue.
 * PATCH /api/v1/maintenance/dues/:id/mark-overdue
 */
export async function markDueOverdue(dueId: string): Promise<BackendMaintenanceDue> {
  assertOrganizationContext();
  const { data } = await apiClient.patch<BackendMaintenanceDue>(`/maintenance/dues/${dueId}/mark-overdue`);
  return data;
}

/**
 * Waive late charge on a maintenance due.
 * POST /api/v1/maintenance/dues/:id/waive-late-charge
 */
export async function waiveLateCharge(dueId: string, payload: WaiveLateChargePayload): Promise<BackendMaintenanceDue> {
  assertOrganizationContext();
  const { data } = await apiClient.post<BackendMaintenanceDue>(
    `/maintenance/dues/${dueId}/waive-late-charge`,
    payload,
  );
  return data;
}

// ============================================================================
// Admin Payment Management APIs (payment:read, payment:manage)
// ============================================================================

/**
 * List all internal payment records for the organization.
 * GET /api/v1/maintenance/payments
 */
export async function getOrganizationPayments(): Promise<BackendPayment[]> {
  assertOrganizationContext();
  const { data } = await apiClient.get<BackendPayment[]>('/maintenance/payments');
  return data;
}

/**
 * Get single payment record by ID.
 * GET /api/v1/maintenance/payments/:id
 */
export async function getPaymentById(paymentId: string): Promise<BackendPayment> {
  assertOrganizationContext();
  const { data } = await apiClient.get<BackendPayment>(`/maintenance/payments/${paymentId}`);
  return data;
}

/**
 * Create manual internal payment record.
 * POST /api/v1/maintenance/payments
 */
export async function createPaymentRecord(payload: CreatePaymentPayload): Promise<BackendPayment> {
  assertOrganizationContext();
  const { data } = await apiClient.post<BackendPayment>('/maintenance/payments', payload);
  return data;
}

/**
 * Mark payment record as COMPLETED.
 * PATCH /api/v1/maintenance/payments/:id/mark-completed
 */
export async function markPaymentCompleted(paymentId: string): Promise<BackendPayment> {
  assertOrganizationContext();
  const { data } = await apiClient.patch<BackendPayment>(`/maintenance/payments/${paymentId}/mark-completed`);
  return data;
}

/**
 * Mark payment record as FAILED.
 * PATCH /api/v1/maintenance/payments/:id/mark-failed
 */
export async function markPaymentFailed(paymentId: string): Promise<BackendPayment> {
  assertOrganizationContext();
  const { data } = await apiClient.patch<BackendPayment>(`/maintenance/payments/${paymentId}/mark-failed`);
  return data;
}
