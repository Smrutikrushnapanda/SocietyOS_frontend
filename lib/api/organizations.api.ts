import apiClient from './client';

/**
 * Organization as returned by the backend (SUPER_ADMIN platform scope or the
 * caller's own membership for non-SUPER_ADMIN roles).
 */
export interface Organization {
  id: string;
  name: string;
  identifier?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationPayload {
  name: string;
  identifier?: string;
  address?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  identifier?: string;
  address?: string;
  isActive?: boolean;
}

export interface ProvisionAdminPayload {
  phone: string;
  fullName?: string;
  email?: string;
}

export interface ProvisionAdminResult {
  organization_id: string;
  organization_name: string;
  user_id: string;
  phone: string;
  role: string;
  fullName: string | null;
  email: string | null;
}

export const organizationsApi = {
  async getOrganizations(): Promise<Organization[]> {
    const res = await apiClient.get<Organization[]>('/organizations');
    return res.data;
  },

  async getOrganization(id: string): Promise<Organization> {
    const res = await apiClient.get<Organization>(`/organizations/${id}`);
    return res.data;
  },

  async createOrganization(
    payload: CreateOrganizationPayload,
  ): Promise<Organization> {
    const res = await apiClient.post<Organization>('/organizations', payload);
    return res.data;
  },

  async updateOrganization(
    id: string,
    payload: UpdateOrganizationPayload,
  ): Promise<Organization> {
    const res = await apiClient.patch<Organization>(
      `/organizations/${id}`,
      payload,
    );
    return res.data;
  },

  async deleteOrganization(id: string): Promise<Organization> {
    // Backend DELETE deactivates (isActive=false); SUPER_ADMIN only.
    const res = await apiClient.delete<Organization>(`/organizations/${id}`);
    return res.data;
  },

  /**
   * Provision a SOCIETY_ADMIN membership for the target organization.
   * Creates/reuses the auth User from the phone and grants the role in
   * user_roles. SUPER_ADMIN only.
   */
  async provisionAdmin(
    orgId: string,
    payload: ProvisionAdminPayload,
  ): Promise<ProvisionAdminResult> {
    const res = await apiClient.post<ProvisionAdminResult>(
      `/organizations/${orgId}/provision-admin`,
      payload,
    );
    return res.data;
  },
};