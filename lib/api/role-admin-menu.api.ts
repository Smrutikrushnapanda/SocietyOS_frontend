import apiClient from './client';

export interface RoleMasterItem {
  id: string;
  name: string;
  accessType: string;
  createdAt: string;
  updatedAt: string;
  adminUsers?: AdminUserItem[];
}

export interface AdminUserItem {
  id: string;
  whatsappNumber: string;
  email: string;
  fullName: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  role?: RoleMasterItem;
}

export interface MenuMasterItem {
  id: string;
  menuName: string;
  menuPath: string | null;
  iconName?: string;
  description?: string;
  parentId?: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  updatedById?: string;
  roleId?: string;
  roleIds?: string[];
  role?: RoleMasterItem;
  children?: MenuMasterItem[];
  roleMenus?: { role?: RoleMasterItem }[];
}

// ── Role Master APIs ────────────────────────────────────────────────────────
export async function getRoles(): Promise<RoleMasterItem[]> {
  const res = await apiClient.get<RoleMasterItem[]>('/role-master');
  return res.data;
}

export async function createRole(data: { name: string; accessType: string }): Promise<RoleMasterItem> {
  const res = await apiClient.post<RoleMasterItem>('/role-master', data);
  return res.data;
}

export async function updateRole(
  id: string,
  data: { name?: string; accessType?: string },
): Promise<RoleMasterItem> {
  const res = await apiClient.patch<RoleMasterItem>(`/role-master/${id}`, data);
  return res.data;
}

export async function deleteRole(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.delete<{ success: boolean; message: string }>(`/role-master/${id}`);
  return res.data;
}

// ── Admin Users APIs ────────────────────────────────────────────────────────
export async function getAdminUsers(): Promise<AdminUserItem[]> {
  const res = await apiClient.get<AdminUserItem[]>('/admin-users');
  return res.data;
}

export async function createAdminUser(data: {
  fullName: string;
  email: string;
  whatsappNumber: string;
  roleId: string;
}): Promise<AdminUserItem> {
  const res = await apiClient.post<AdminUserItem>('/admin-users', data);
  return res.data;
}

export async function updateAdminUser(
  id: string,
  data: {
    fullName?: string;
    email?: string;
    whatsappNumber?: string;
    roleId?: string;
  },
): Promise<AdminUserItem> {
  const res = await apiClient.patch<AdminUserItem>(`/admin-users/${id}`, data);
  return res.data;
}

export async function deleteAdminUser(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.delete<{ success: boolean; message: string }>(`/admin-users/${id}`);
  return res.data;
}

// ── Menu Master APIs ────────────────────────────────────────────────────────
export async function getMenus(includeInactive = false): Promise<MenuMasterItem[]> {
  const res = await apiClient.get<MenuMasterItem[]>('/menu-master', {
    params: includeInactive ? { includeInactive: true } : undefined,
  });
  return res.data;
}

export async function getMenuHierarchy(includeInactive = false): Promise<MenuMasterItem[]> {
  const res = await apiClient.get<MenuMasterItem[]>('/menu-master/hierarchy', {
    params: includeInactive ? { includeInactive: true } : undefined,
  });
  return res.data;
}

export async function createMenu(data: {
  menuName: string;
  menuPath?: string | null;
  iconName?: string;
  description?: string;
  parentId?: string | null;
  orderIndex?: number;
  isActive?: boolean;
  roleId?: string;
  roleIds?: string[];
}): Promise<MenuMasterItem> {
  const res = await apiClient.post<MenuMasterItem>('/menu-master', data);
  return res.data;
}

export async function updateMenu(
  id: string,
  data: Partial<MenuMasterItem>,
): Promise<MenuMasterItem> {
  const res = await apiClient.patch<MenuMasterItem>(`/menu-master/${id}`, data);
  return res.data;
}

export async function deleteMenu(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.delete<{ success: boolean; message: string }>(`/menu-master/${id}`);
  return res.data;
}

export interface MenuPage { items: MenuMasterItem[]; total: number; page: number; limit: number; totalPages: number; }
export async function getMenuPage(page: number, limit: number, search: string): Promise<MenuPage> {
  const res = await apiClient.get<MenuPage>('/menu-master/page', { params: { page, limit, search } });
  return res.data;
}
