/**
 * SocietyOS Visitors API
 *
 * Dedicated typed client for visitor management, visitor visits, passes,
 * and approvals. Authenticated, permission-checked (visitor:read / visitor:manage),
 * and organization-scoped via X-Organization-Id.
 */

import apiClient, { ApiError } from './client';
import { useAuthStore } from '../../store/useAuthStore';

export interface BackendVisitor {
  id: string;
  organization_id: string;
  name: string;
  mobile: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendVisitorVisit {
  id: string;
  organization_id: string;
  visitor_id: string;
  host_resident_id?: string;
  visit_status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  visit_purpose?: string | null;
  expected_entry_time?: string | null;
  actual_entry_time?: string | null;
  createdAt?: string;
  updatedAt?: string;
  visitor?: BackendVisitor;
  pass?: BackendVisitorPass | null;
}

export interface PreApproveVisitorVisitPayload {
  send_whatsapp?: boolean;
  name: string;
  mobile: string;
  visit_purpose?: string;
  expected_entry_time?: string;
  validity_end?: string;
  visitor_id?: string;
}

export interface BackendVisitorPass {
  id: string;
  organization_id: string;
  visitor_id: string;
  visitor_visit_id?: string | null;
  issuer?: string | null;
  pass_status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  validity_start: string;
  validity_end: string;
  createdAt?: string;
  updatedAt?: string;
  visitor?: BackendVisitor;
  visitor_visit?: BackendVisitorVisit | null;
}

export interface BackendVisitorApproval {
  id: string;
  organization_id: string;
  visitor_visit_id: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver_id?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVisitorPayload {
  organization_id: string;
  name: string;
  mobile: string;
  active?: boolean;
}

export interface CreateVisitorVisitPayload {
  organization_id: string;
  visitor_id: string;
  host_resident_id?: string;
  visit_status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  visit_purpose?: string;
  expected_entry_time?: string;
}

export interface UpdateVisitorVisitPayload {
  pass_token?: string;
  check_in?: boolean;
  visit_status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  visit_purpose?: string;
  expected_entry_time?: string;
}

export interface CreateVisitorPassPayload {
  organization_id: string;
  visitor_id: string;
  visitor_visit_id?: string;
  issuer?: string;
  pass_status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  validity_start: string;
  validity_end: string;
}

export interface CreateVisitorApprovalPayload {
  organization_id: string;
  visitor_visit_id: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver_id?: string;
  approved_at?: string;
  rejected_at?: string;
}

/**
 * Fetch all visitors for the active organization.
 * GET /api/v1/visitors
 */
export async function getVisitors(params?: { search?: string }): Promise<BackendVisitor[]> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.get<BackendVisitor[]>('/visitors', { params });
  return data;
}

/**
 * Fetch a visitor by ID.
 * GET /api/v1/visitors/:id
 */
export async function getVisitorById(id: string): Promise<BackendVisitor> {
  const { data } = await apiClient.get<BackendVisitor>(`/visitors/${id}`);
  return data;
}

/**
 * Create a new visitor identity.
 * POST /api/v1/visitors
 */
export async function createVisitor(payload: CreateVisitorPayload): Promise<BackendVisitor> {
  const { data } = await apiClient.post<BackendVisitor>('/visitors', payload);
  return data;
}

/**
 * Fetch all visitor visits for the active organization.
 * GET /api/v1/visitor-visits
 */
export async function getVisitorVisits(): Promise<BackendVisitorVisit[]> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.get<BackendVisitorVisit[]>('/visitor-visits');
  return data;
}

/**
 * Create a new visitor visit.
 * POST /api/v1/visitor-visits
 */
export async function createVisitorVisit(payload: CreateVisitorVisitPayload): Promise<BackendVisitorVisit> {
  const { data } = await apiClient.post<BackendVisitorVisit>('/visitor-visits', payload);
  return data;
}

/**
 * Update visitor visit status (e.g. check-in, complete, cancel).
 * PATCH /api/v1/visitor-visits/:id
 */
export async function updateVisitorVisit(
  id: string,
  payload: UpdateVisitorVisitPayload,
): Promise<BackendVisitorVisit> {
  const { data } = await apiClient.patch<BackendVisitorVisit>(`/visitor-visits/${id}`, payload);
  return data;
}

/**
 * Fetch all visitor passes for the active organization.
 * GET /api/v1/visitor-passes
 */
export async function getVisitorPasses(): Promise<BackendVisitorPass[]> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.get<BackendVisitorPass[]>('/visitor-passes');
  return data;
}

/**
 * Create a new visitor pass.
 * POST /api/v1/visitor-passes
 */
export async function createVisitorPass(payload: CreateVisitorPassPayload): Promise<BackendVisitorPass> {
  const { data } = await apiClient.post<BackendVisitorPass>('/visitor-passes', payload);
  return data;
}

export async function deleteVisitorPass(id: string): Promise<BackendVisitorPass> {
  const { data } = await apiClient.delete<BackendVisitorPass>(`/visitor-passes/${id}`);
  return data;
}

/**
 * Fetch all visitor approvals for the active organization.
 * GET /api/v1/visitor-approvals
 */
export async function getVisitorApprovals(): Promise<BackendVisitorApproval[]> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.get<BackendVisitorApproval[]>('/visitor-approvals');
  return data;
}

/**
 * Create a new visitor approval record.
 * POST /api/v1/visitor-approvals
 */
export async function createVisitorApproval(
  payload: CreateVisitorApprovalPayload,
): Promise<BackendVisitorApproval> {
  const { data } = await apiClient.post<BackendVisitorApproval>('/visitor-approvals', payload);
  return data;
}

/**
 * Fetch all visitor visits for the authenticated resident.
 * GET /api/v1/visitor-visits/my
 */
export async function getMyVisitorVisits(): Promise<BackendVisitorVisit[]> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.get<BackendVisitorVisit[]>('/visitor-visits/my');
  return data;
}

export async function decideMyVisitorVisit(
  visitId: string,
  decision: 'APPROVED' | 'REJECTED',
): Promise<BackendVisitorVisit> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.patch<BackendVisitorVisit>(
    `/visitor-visits/my/${visitId}/decision`,
    { decision },
  );
  return data;
}

/**
 * Pre-approve a visitor visit for the authenticated resident's flat.
 * POST /api/v1/visitor-visits/pre-approve
 */
export async function preApproveVisitorVisit(
  payload: PreApproveVisitorVisitPayload,
): Promise<BackendVisitorVisit> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.post<BackendVisitorVisit>('/visitor-visits/pre-approve', payload);
  return data;
}

export interface VisitPassDetails {
  passId: string;
  passCode: string;
  qrToken: string;
  qrImageData: string;
  passStatus: string;
  validityStart: string;
  validityEnd: string;
  visitId: string;
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  status: string;
  flat?: string;
}

export interface SendPassWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  passCode: string;
  recipient: string;
}

/**
 * Fetch or idempotently ensure active digital pass for an authorized visitor visit.
 * GET /api/v1/visitor-visits/:id/pass
 */
export async function getVisitPass(visitId: string): Promise<VisitPassDetails> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.get<VisitPassDetails>(`/visitor-visits/${visitId}/pass`);
  return data;
}

/**
 * Dispatch authorized digital pass via configured SocietyOS WhatsApp provider (WAHA).
 * POST /api/v1/visitor-visits/:id/send-whatsapp
 */
export async function sendVisitPassWhatsApp(visitId: string): Promise<SendPassWhatsAppResult> {
  const orgId = typeof window !== 'undefined' ? useAuthStore.getState().organizationId : null;
  if (!orgId) {
    throw new ApiError(400, 'No organization selected. Please select an organization.');
  }
  const { data } = await apiClient.post<SendPassWhatsAppResult>(`/visitor-visits/${visitId}/send-whatsapp`);
  return data;
}


export interface ValidatedVisitorPass extends Omit<VisitPassDetails, 'qrImageData'> {
  residentName: string;
}

export async function validateVisitorPass(token: string): Promise<ValidatedVisitorPass> {
  const { data } = await apiClient.post<ValidatedVisitorPass>('/visitor-visits/validate-pass', { token });
  return data;
}
