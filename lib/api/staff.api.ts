import apiClient from './client';
import { useAuthStore } from '../../store/useAuthStore';

function getActiveOrganizationId(): string | null {
  const state = useAuthStore.getState();
  return state.organizationId || null;
}

export interface BackendStaffMember {
  id: string;
  organization_id: string;
  user_id?: string | null;
  name: string;
  role: string;
  phone: string;
  gate: string;
  shift: string;
  status: 'On Duty' | 'Off Duty' | 'Active' | 'Inactive';
  profile_photo_url?: string | null;
  aadhaar_photo_url?: string | null;
  aadhaar_number?: string | null;
  gender?: string | null;
  emergency_contact?: string | null;
  address?: string | null;
  date_of_joining?: string | null;
  /**
   * App login role actually granted in `user_roles`. `role` above is only the
   * staff designation (job title); these two fields are the authoritative
   * answer to "can this person sign in, and as what?".
   */
  assigned_role_id?: string | null;
  assigned_role_name?: string | null;
  created_at: string;
  updated_at: string;
}

/** Role-master entry that may be granted to a staff member. */
export interface AssignableStaffRole {
  id: string;
  name: string;
  access_type: string;
}

export interface CreateStaffInput {
  name: string;
  role: string;
  phone: string;
  gate?: string;
  shift?: string;
  status?: string;
  user_id?: string;
  profile_photo_url?: string | null;
  aadhaar_photo_url?: string | null;
  aadhaar_number?: string | null;
  gender?: string | null;
  emergency_contact?: string | null;
  address?: string | null;
  date_of_joining?: string | null;
}

export interface BackendGuardShift {
  id: string;
  organization_id: string;
  name: string;
  start_time: string;
  end_time: string;
  required_guards: number;
  assigned_guards: number;
  assigned_gates: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftInput {
  name: string;
  start_time: string;
  end_time: string;
  required_guards?: number;
  assigned_guards?: number;
  assigned_gates?: string;
  status?: string;
}

export interface BackendDutyRota {
  id: string;
  organization_id: string;
  guard_name: string;
  shift_name: string;
  gate: string;
  date: string;
  status: 'On Duty' | 'Scheduled' | 'Completed';
  created_at: string;
  updated_at: string;
}

export interface CreateRotaInput {
  guard_name: string;
  shift_name: string;
  gate?: string;
  date?: string;
  status?: string;
}

// --- STAFF ROSTER ---

export async function getStaffMembers(): Promise<BackendStaffMember[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.get<BackendStaffMember[]>('/staff', {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function createStaffMember(input: CreateStaffInput): Promise<BackendStaffMember> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<BackendStaffMember>('/staff', input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function onboardGuard(input: {
  name: string;
  phone: string;
  gate?: string;
  shift?: string;
  role?: string;
}): Promise<BackendStaffMember> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<BackendStaffMember>('/staff/onboard-guard', input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function bulkImportStaff(records: any[]): Promise<{
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; identifier: string; error: string }>;
}> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<any>('/staff/bulk-import', { records }, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function updateStaffMember(id: string, input: Partial<CreateStaffInput>): Promise<BackendStaffMember> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.put<BackendStaffMember>(`/staff/${id}`, input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

// --- APP ROLE ASSIGNMENT ---
// Separate from designation on purpose: the job title is cosmetic, this is what
// actually grants the staff member permission to sign in to the app.

export async function getAssignableStaffRoles(): Promise<AssignableStaffRole[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.get<AssignableStaffRole[]>('/staff/assignable-roles', {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function assignStaffRole(
  staffId: string,
  roleId: string,
): Promise<BackendStaffMember> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.patch<BackendStaffMember>(
    `/staff/${staffId}/assign-role`,
    { role_id: roleId },
    { headers: { 'X-Organization-Id': orgId } },
  );
  return res.data;
}

export async function deleteStaffMember(id: string): Promise<void> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  await apiClient.delete(`/staff/${id}`, {
    headers: { 'X-Organization-Id': orgId },
  });
}

// --- SHIFTS ---

export async function getGuardShifts(): Promise<BackendGuardShift[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.get<BackendGuardShift[]>('/staff/shifts', {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function createGuardShift(input: CreateShiftInput): Promise<BackendGuardShift> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<BackendGuardShift>('/staff/shifts', input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function updateGuardShift(id: string, input: Partial<CreateShiftInput>): Promise<BackendGuardShift> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.put<BackendGuardShift>(`/staff/shifts/${id}`, input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function deleteGuardShift(id: string): Promise<void> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  await apiClient.delete(`/staff/shifts/${id}`, {
    headers: { 'X-Organization-Id': orgId },
  });
}

// --- ROTA ---

export async function getDutyRotas(): Promise<BackendDutyRota[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.get<BackendDutyRota[]>('/staff/rota', {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function createDutyRota(input: CreateRotaInput): Promise<BackendDutyRota> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.post<BackendDutyRota>('/staff/rota', input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function updateDutyRota(id: string, input: Partial<CreateRotaInput>): Promise<BackendDutyRota> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  const res = await apiClient.put<BackendDutyRota>(`/staff/rota/${id}`, input, {
    headers: { 'X-Organization-Id': orgId },
  });
  return res.data;
}

export async function deleteDutyRota(id: string): Promise<void> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required');

  await apiClient.delete(`/staff/rota/${id}`, {
    headers: { 'X-Organization-Id': orgId },
  });
}
