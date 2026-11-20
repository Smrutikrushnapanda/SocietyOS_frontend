'use client';

import { useAdminLoading } from '../common/AdminLoading';
import React, { useState, useEffect, useMemo } from 'react';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getMenus,
  getMenuPage,
  createMenu,
  updateMenu,
  deleteMenu,
  RoleMasterItem,
  AdminUserItem,
  MenuMasterItem,
} from '../../lib/api/role-admin-menu.api';
import { getAuthMe } from '../../lib/api/auth.api';
import { useToastStore, useAuthStore } from '../../store';

export const AdminRoleMasterSection: React.FC = () => {
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  // ── States ─────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<RoleMasterItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [menus, setMenus] = useState<MenuMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs: 'roles' | 'users' | 'menus'
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'menus'>('roles');

  // Role Form State
  const [roleFormId, setRoleFormId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [accessType, setAccessType] = useState('Read + Write');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [rolePageSize, setRolePageSize] = useState(10);
  const [rolePage, setRolePage] = useState(1);

  // User Form State
  const [userFormId, setUserFormId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userPageSize, setUserPageSize] = useState(10);
  const [userPage, setUserPage] = useState(1);

  // Menu Form State
  const [menuFormId, setMenuFormId] = useState<string | null>(null);
  const [menuName, setMenuName] = useState('');
  const [menuPath, setMenuPath] = useState('');
  const [iconName, setIconName] = useState('');
  const [menuDescription, setMenuDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActiveMenu, setIsActiveMenu] = useState(true);
  const [menuRoleId, setMenuRoleId] = useState('');
  const [menuParentId, setMenuParentId] = useState('');
  const [isSectionGroup, setIsSectionGroup] = useState(false);
  const [isSubmittingMenu, setIsSubmittingMenu] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuPage, setMenuPage] = useState(1);
  const [menuPageSize, setMenuPageSize] = useState(10);
  const [menuTotal, setMenuTotal] = useState(0);
  const [menuRows, setMenuRows] = useState<MenuMasterItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuRetry, setMenuRetry] = useState(0);
  useEffect(() => {
    if (activeTab !== 'menus') return;
    let cancelled = false;
    setMenuLoading(true);
    setMenuError(null);
    const timer = window.setTimeout(() => {
      void getMenuPage(menuPage, menuPageSize, menuSearch).then(result => {
        if (cancelled) return;
        setMenuRows(result.items); setMenuTotal(result.total); setMenuPage(result.page);
      }).catch((err: any) => {
        if (!cancelled) { setMenuRows([]); setMenuTotal(0); setMenuError(err.message || 'Failed to load menus'); }
      }).finally(() => { if (!cancelled) setMenuLoading(false); });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeTab, menuPage, menuPageSize, menuSearch, menus, menuRetry]);

  useAdminLoading(isLoading || (activeTab === 'menus' && menuLoading), 'Loading registered records…');

  // ── Data Fetching ───────────────────────────────────────────────────────
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedRoles, fetchedUsers, fetchedMenus] = await Promise.all([
        getRoles(),
        getAdminUsers(),
        getMenus(true),
      ]);
      setRoles(fetchedRoles);
      setAdminUsers(fetchedUsers);
      setMenus(fetchedMenus);
      const societyRole = fetchedRoles.find(
        (r) => r.name.toUpperCase() === 'SOCIETY_ADMIN' || r.name.toUpperCase() === 'SOCIETY ADMIN',
      );
      if (societyRole) {
        setRoleId(societyRole.id);
      } else if (fetchedRoles.length > 0 && !roleId) {
        setRoleId(fetchedRoles[0].id);
      }
    } catch {
      showToast('Error loading role master and admin accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // ── Metrics ─────────────────────────────────────────────────────────────
  const totalRoles = roles.length;
  const readOnlyCount = roles.filter(
    (r) =>
      r.accessType.toLowerCase().includes('read') &&
      !r.accessType.toLowerCase().includes('write'),
  ).length;
  const readWriteCount = roles.filter((r) =>
    r.accessType.toLowerCase().includes('write'),
  ).length;
  const fullAccessCount = roles.filter((r) =>
    r.accessType.toLowerCase().includes('full'),
  ).length;
  const totalUsers = adminUsers.length;
  const activeMenusCount = menus.filter((m) => m.isActive).length;

  // ── Role Handlers ───────────────────────────────────────────────────────
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showToast('Please enter a role name');
      return;
    }
    setIsSubmittingRole(true);
    try {
      if (roleFormId) {
        await updateRole(roleFormId, { name: roleName.trim(), accessType });
        showToast('Role updated successfully');
      } else {
        await createRole({ name: roleName.trim(), accessType });
        showToast('Role created successfully');
      }
      resetRoleForm();
      const updated = await getRoles();
      setRoles(updated);
    } catch (err: any) {
      showToast(err.backendMessage || err.message || 'Failed to save role');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleEditRole = (r: RoleMasterItem) => {
    setRoleFormId(r.id);
    setRoleName(r.name);
    setAccessType(r.accessType);
  };

  const handleDeleteRole = async (r: RoleMasterItem) => {
    if (!confirm(`Are you sure you want to delete role "${r.name}"?`)) return;
    try {
      await deleteRole(r.id);
      showToast(`Role "${r.name}" deleted successfully`);
      const updated = await getRoles();
      setRoles(updated);
      if (roleFormId === r.id) resetRoleForm();
    } catch (err: any) {
      showToast(err.backendMessage || err.message || 'Cannot delete role');
    }
  };

  const resetRoleForm = () => {
    setRoleFormId(null);
    setRoleName('');
    setAccessType('Read + Write');
  };

  // ── User Handlers ───────────────────────────────────────────────────────
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !whatsappNumber.trim() || !roleId) {
      showToast('Please fill all required user fields');
      return;
    }
    setIsSubmittingUser(true);
    try {
      if (userFormId) {
        await updateAdminUser(userFormId, {
          fullName: fullName.trim(),
          email: email.trim(),
          whatsappNumber: whatsappNumber.trim(),
          roleId,
        });
        showToast('Admin user updated successfully');
      } else {
        await createAdminUser({
          fullName: fullName.trim(),
          email: email.trim(),
          whatsappNumber: whatsappNumber.trim(),
          roleId,
        });
        showToast('Admin user created successfully');
      }
      const before = useAuthStore.getState();
      try {
        const context = await getAuthMe();
        if (useAuthStore.getState().backendUser?.id === before.backendUser?.id) useAuthStore.getState().setAuthContext(context);
      } catch {}
      resetUserForm();
      const updated = await getAdminUsers();
      setAdminUsers(updated);
    } catch (err: any) {
      showToast(err.backendMessage || err.message || 'Failed to save user');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleEditUser = (u: AdminUserItem) => {
    setUserFormId(u.id);
    setFullName(u.fullName);
    setEmail(u.email);
    setWhatsappNumber(u.whatsappNumber);
    setRoleId(u.roleId);
  };

  const handleDeleteUser = async (u: AdminUserItem) => {
    if (!confirm(`Are you sure you want to delete admin user "${u.fullName}"?`)) return;
    try {
      await deleteAdminUser(u.id);
      showToast(`Admin user "${u.fullName}" deleted successfully`);
      const updated = await getAdminUsers();
      setAdminUsers(updated);
      if (userFormId === u.id) resetUserForm();
    } catch (err: any) {
      showToast(err.backendMessage || err.message || 'Cannot delete user');
    }
  };

  const resetUserForm = () => {
    setUserFormId(null);
    setFullName('');
    setEmail('');
    setWhatsappNumber('');
    if (roles.length > 0) setRoleId(roles[0].id);
  };

  // ── Menu Handlers ───────────────────────────────────────────────────────
  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuName.trim() || !menuPath.trim()) {
      showToast('Menu name and path are required');
      return;
    }
    setIsSubmittingMenu(true);
    try {
      const finalPath = isSectionGroup ? null : (menuPath.trim() || null);
      const finalParentId = isSectionGroup ? null : (menuParentId || null);

      if (menuFormId) {
        await updateMenu(menuFormId, {
          menuName: menuName.trim(),
          menuPath: finalPath,
          iconName: iconName.trim() || undefined,
          description: menuDescription.trim() || undefined,
          parentId: finalParentId,
          orderIndex: Number(orderIndex),
          isActive: isActiveMenu,
          roleId: menuRoleId || undefined,
        });
        showToast('Menu item updated successfully');
      } else {
        await createMenu({
          menuName: menuName.trim(),
          menuPath: finalPath,
          iconName: iconName.trim() || undefined,
          description: menuDescription.trim() || undefined,
          parentId: finalParentId,
          orderIndex: Number(orderIndex),
          isActive: isActiveMenu,
          roleId: menuRoleId || undefined,
        });
        showToast('Menu item created successfully');
      }
      resetMenuForm();
      const updated = await getMenus(true);
      setMenus(updated);
    } catch (err: any) {
      showToast(err.backendMessage || err.message || 'Failed to save menu');
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleEditMenu = (m: MenuMasterItem) => {
    setMenuFormId(m.id);
    setMenuName(m.menuName);
    setMenuPath(m.menuPath || '');
    setIconName(m.iconName || '');
    setMenuDescription(m.description || '');
    setOrderIndex(m.orderIndex);
    setIsActiveMenu(m.isActive);
    setMenuRoleId(m.roleId || '');
    setMenuParentId(m.parentId || '');
    setIsSectionGroup(!m.menuPath);
  };

  const handleDeleteMenu = async (m: MenuMasterItem) => {
    if (!confirm(`Are you sure you want to delete menu item "${m.menuName}"?`)) return;
    try {
      await deleteMenu(m.id);
      showToast(`Menu "${m.menuName}" deleted successfully`);
      const updated = await getMenus(true);
      setMenus(updated);
      if (menuFormId === m.id) resetMenuForm();
    } catch (err: any) {
      showToast(err.backendMessage || err.message || 'Cannot delete menu');
    }
  };

  const resetMenuForm = () => {
    setMenuFormId(null);
    setMenuName('');
    setMenuPath('');
    setIconName('');
    setMenuDescription('');
    setOrderIndex(0);
    setIsActiveMenu(true);
    setMenuRoleId('');
    setMenuParentId('');
    setIsSectionGroup(false);
  };

  // ── Hierarchy & Role Options ─────────────────────────────────────────────
  const allowedAdminRoles = useMemo(() => {
    return roles.filter(
      (r) => r.name.toUpperCase() === 'SOCIETY_ADMIN' || r.name.toUpperCase() === 'SOCIETY ADMIN',
    );
  }, [roles]);

  const parentGroups = useMemo(() => {
    return menus.filter((m) => !m.parentId && (!m.menuPath || m.menuPath.trim() === ''));
  }, [menus]);

  // ── Filters & Slicing ───────────────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.accessType.toLowerCase().includes(roleSearch.toLowerCase()),
    );
  }, [roles, roleSearch]);

  const pagedRoles = useMemo(() => {
    const start = (rolePage - 1) * rolePageSize;
    return filteredRoles.slice(start, start + rolePageSize);
  }, [filteredRoles, rolePage, rolePageSize]);

  const filteredUsers = useMemo(() => {
    return adminUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.whatsappNumber.includes(userSearch),
    );
  }, [adminUsers, userSearch]);

  const pagedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);



  const getBadgeClassForAccess = (access: string) => {
    const lower = access.toLowerCase();
    if (lower.includes('full')) return 'badge badge-success';
    if (lower.includes('write')) return 'badge badge-warning';
    return 'badge badge-info';
  };

  return (
    <div className="admin-section active" id="section-role-master">
      {/* ── 1. Section Header ────────────────────────────────────────────── */}
      <div className="section-header">
        <div>
          <h2>Role Master & Admin Users</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Manage role master entries, administrator permissions, credentials, and application navigation menus.
          </p>
        </div>
        <div className="section-actions">
          {activeTab === 'roles' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                resetRoleForm();
              }}
            >
              + Add New Role
            </button>
          )}
          {activeTab === 'users' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                resetUserForm();
              }}
            >
              + Add Admin User
            </button>
          )}
          {activeTab === 'menus' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                resetMenuForm();
              }}
            >
              + Add Menu Item
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Metric KPI Cards ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div className="card" style={{ padding: '16px 20px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Roles
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
            {totalRoles}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Read Only
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--info)', marginTop: '4px' }}>
            {readOnlyCount}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Read + Write
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)', marginTop: '4px' }}>
            {readWriteCount}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Full Access
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>
            {fullAccessCount}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Admin Users
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pine)', marginTop: '4px' }}>
            {totalUsers}
          </div>
        </div>
      </div>

      {/* ── 3. Module Subnavigation ─────────────────────────────────────── */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Roles Directory ({roles.length})
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Admin Users ({adminUsers.length})
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'menus' ? 'active' : ''}`}
          onClick={() => setActiveTab('menus')}
        >
          Menu Master ({menus.length})
        </button>
      </div>

      {/* ── 4. Tab 1: Roles Directory ───────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Form Card */}
          <div className="card" style={{ border: '1px solid var(--border-subtle)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>
                  {roleFormId ? 'Edit Role' : 'Add New Role'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
                  Define system roles and access classifications.
                </p>
              </div>
              {roleFormId && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={resetRoleForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Role Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. EVENT_MANAGER, VOLUNTEER"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Access Type *
                </label>
                <select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                >
                  <option value="Read">Read (View Only)</option>
                  <option value="Read + Write">Read + Write (Standard Operator)</option>
                  <option value="Full Access">Full Access (Super / Society Admin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  disabled={isSubmittingRole}
                >
                  {isSubmittingRole ? 'Saving...' : roleFormId ? 'Update Role' : 'Create Role'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={resetRoleForm}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Table Card */}
          <div className="card" style={{ border: '1px solid var(--border-subtle)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>Role Directory</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
                  All registered role master records and permissions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearch}
                  onChange={(e) => {
                    setRoleSearch(e.target.value);
                    setRolePage(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    minWidth: '200px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            </div>

            {isLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
                Loading role records...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
                No roles found matching query.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="rbac-matrix-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Role Name</th>
                      <th>Access Classification</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRoles.map((r) => (
                      <tr key={r.id}>
                        <td style={{ textAlign: 'left', fontWeight: 600 }}>{r.name}</td>
                        <td>
                          <span className={getBadgeClassForAccess(r.accessType)}>
                            {r.accessType}
                          </span>
                        </td>
                        <td style={{ color: 'var(--neutral)' }}>
                          {new Date(r.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ color: 'var(--neutral)' }}>
                          {new Date(r.updatedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={() => handleEditRole(r)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-xs btn-ghost"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteRole(r)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.8125rem', color: 'var(--neutral)' }}>
                  <span>
                    Showing {pagedRoles.length} of {filteredRoles.length} entries
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={rolePageSize}
                      onChange={(e) => {
                        setRolePageSize(Number(e.target.value));
                        setRolePage(1);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                      }}
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                    </select>

                    <button
                      className="btn btn-xs btn-ghost"
                      disabled={rolePage <= 1}
                      onClick={() => setRolePage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <span>Page {rolePage}</span>
                    <button
                      className="btn btn-xs btn-ghost"
                      disabled={rolePage * rolePageSize >= filteredRoles.length}
                      onClick={() => setRolePage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. Tab 2: Admin Users ───────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>
          {/* User Form Card */}
          <div className="card" style={{ border: '1px solid var(--border-subtle)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>
                  {userFormId ? 'Edit Society Admin' : 'Create Society Admin'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
                  Register Society Admins authorized to manage this society. Guard and Resident accounts are managed in their dedicated modules.
                </p>
              </div>
              {userFormId && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={resetUserForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Society Member"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="admin@society.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  WhatsApp / Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="+919876543210"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Assigned Role (Only Society Admin Allowed) *
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                  required
                >
                  {allowedAdminRoles.length > 0 ? (
                    allowedAdminRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.accessType})
                      </option>
                    ))
                  ) : (
                    <option value="">No SOCIETY_ADMIN role found</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  disabled={isSubmittingUser}
                >
                  {isSubmittingUser ? 'Saving...' : userFormId ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={resetUserForm}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* User Table Card */}
          <div className="card" style={{ border: '1px solid var(--border-subtle)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>Admin Accounts</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
                  All registered administrator accounts and credentials.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    minWidth: '200px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            </div>

            {isLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
                
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
                No admin accounts found matching query.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="rbac-matrix-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Full Name</th>
                      <th>Email Address</th>
                      <th>WhatsApp / Phone</th>
                      <th>Assigned Role</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map((u) => (
                      <tr key={u.id}>
                        <td style={{ textAlign: 'left', fontWeight: 600 }}>{u.fullName}</td>
                        <td style={{ color: 'var(--ink)' }}>{u.email}</td>
                        <td style={{ color: 'var(--neutral)' }}>{u.whatsappNumber}</td>
                        <td>
                          <span className={getBadgeClassForAccess(u.role?.accessType || 'Full Access')}>
                            {u.role?.name || 'Assigned'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={() => handleEditUser(u)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-xs btn-ghost"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteUser(u)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* User Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.8125rem', color: 'var(--neutral)' }}>
                  <span>
                    Showing {pagedUsers.length} of {filteredUsers.length} entries
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={userPageSize}
                      onChange={(e) => {
                        setUserPageSize(Number(e.target.value));
                        setUserPage(1);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                      }}
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                    </select>

                    <button
                      className="btn btn-xs btn-ghost"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <span>Page {userPage}</span>
                    <button
                      className="btn btn-xs btn-ghost"
                      disabled={userPage * userPageSize >= filteredUsers.length}
                      onClick={() => setUserPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. Tab 3: Menu Master ───────────────────────────────────────── */}
      {activeTab === 'menus' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Menu Form Card */}
          <div className="card" style={{ border: '1px solid var(--border-subtle)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>
                  {menuFormId ? 'Edit Menu Item' : 'Add Menu Item'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
                  Register dynamic navigation routes and permissions.
                </p>
              </div>
              {menuFormId && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={resetMenuForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleMenuSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Menu Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Operations or Societies & Buildings"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isSectionGroup"
                  checked={isSectionGroup}
                  onChange={(e) => {
                    setIsSectionGroup(e.target.checked);
                    if (e.target.checked) {
                      setMenuPath('');
                      setMenuParentId('');
                    }
                  }}
                  style={{ accentColor: 'var(--pine)', width: '16px', height: '16px' }}
                />
                <label htmlFor="isSectionGroup" style={{ fontSize: '0.8125rem', color: 'var(--ink)', cursor: 'pointer', fontWeight: 600 }}>
                  This is a Navigation Section Heading / Group (e.g. Main Operations)
                </label>
              </div>

              {!isSectionGroup && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Parent Section Heading
                  </label>
                  <select
                    value={menuParentId}
                    onChange={(e) => setMenuParentId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      fontSize: '0.875rem',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                  >
                    <option value="">None (Top-Level Item)</option>
                    {parentGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.menuName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Menu Route Path {isSectionGroup ? '(Disabled for Section Headings)' : '*'}
                </label>
                <input
                  type="text"
                  placeholder="/admin/societies"
                  value={menuPath}
                  disabled={isSectionGroup}
                  onChange={(e) => setMenuPath(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: isSectionGroup ? 'var(--surface-sunken)' : 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                  required={!isSectionGroup}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Icon Name
                </label>
                <input
                  type="text"
                  placeholder="building, shield, user, file, bell"
                  value={iconName}
                  onChange={(e) => setIconName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Order Index
                </label>
                <input
                  type="number"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Required Role
                </label>
                <select
                  value={menuRoleId}
                  onChange={(e) => setMenuRoleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                >
                  <option value="">Public to all administrators</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.accessType})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isActiveMenu"
                  checked={isActiveMenu}
                  onChange={(e) => setIsActiveMenu(e.target.checked)}
                  style={{ accentColor: 'var(--pine)', width: '16px', height: '16px' }}
                />
                <label htmlFor="isActiveMenu" style={{ fontSize: '0.8125rem', color: 'var(--ink)', cursor: 'pointer' }}>
                  Menu is currently active
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  disabled={isSubmittingMenu}
                >
                  {isSubmittingMenu ? 'Saving...' : menuFormId ? 'Update Menu' : 'Create Menu'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={resetMenuForm}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Menu Table Card */}
          <div className="card" style={{ border: '1px solid var(--border-subtle)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>Registered Menus</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
                  Dynamic navigation routing entries, hierarchy groups, and role gating.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search menus..."
                  value={menuSearch}
                  onChange={(e) => { setMenuSearch(e.target.value); setMenuPage(1); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    minWidth: '200px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            </div>

            {menuError && <div role="alert">{menuError}<button className="btn btn-sm btn-ghost" onClick={() => setMenuRetry(value => value + 1)}>Retry</button></div>}
            {menuLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
                
              </div>
            ) : menuRows.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
                No menu items found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="rbac-matrix-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Order & Name</th>
                      <th>Type / Hierarchy</th>
                      <th>Route Path</th>
                      <th>Required Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuRows.map((m) => {
                      const parent = menus.find((p) => p.id === m.parentId);
                      const isGroup = !m.menuPath;
                      return (
                        <tr key={m.id} style={{ background: isGroup ? 'rgba(46, 117, 89, 0.04)' : undefined }}>
                          <td style={{ textAlign: 'left' }}>
                            <span style={{ color: 'var(--neutral)', marginRight: '8px', fontSize: '0.75rem' }}>
                              #{m.orderIndex}
                            </span>
                            <span style={{ fontWeight: isGroup ? 700 : 500 }}>
                              {parent ? `↳ ${m.menuName}` : m.menuName}
                            </span>
                          </td>
                          <td>
                            {isGroup ? (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                Section Heading
                              </span>
                            ) : parent ? (
                              <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                                Child of {parent.menuName}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--neutral)', fontSize: '0.75rem' }}>Top-Level</span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: isGroup ? 'var(--neutral)' : 'var(--ink)' }}>
                            {m.menuPath || '—'}
                          </td>
                          <td>
                            {m.role ? (
                              <span className={getBadgeClassForAccess(m.role.accessType)}>
                                {m.role.name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--neutral)', fontSize: '0.75rem' }}>All Roles</span>
                            )}
                          </td>
                          <td>
                            <span className={m.isActive ? 'badge badge-success' : 'badge badge-neutral'}>
                              {m.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={() => handleEditMenu(m)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-xs btn-ghost"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleDeleteMenu(m)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="table-pagination">
              <label>Rows per page <select aria-label="Menus per page" value={menuPageSize} onChange={e => { setMenuPageSize(Number(e.target.value)); setMenuPage(1); }}>
                {[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
              </select></label>
              <span>{menuTotal} records · Page {menuPage} of {Math.max(1, Math.ceil(menuTotal / menuPageSize))}</span>
              <button className="btn btn-sm btn-ghost" disabled={menuLoading || menuPage <= 1} onClick={() => setMenuPage(page => page - 1)}>Previous</button>
              <button className="btn btn-sm btn-ghost" disabled={menuLoading || menuPage >= Math.ceil(menuTotal / menuPageSize)} onClick={() => setMenuPage(page => page + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
