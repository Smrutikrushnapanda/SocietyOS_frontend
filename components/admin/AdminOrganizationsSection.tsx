'use client';

import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useToastStore, useAuthStore } from '../../store';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import {
  organizationsApi,
  Organization,
  ProvisionAdminResult,
} from '../../lib/api/organizations.api';

type OrgModal = 'create' | 'edit' | 'provision' | null;

interface CreateForm {
  name: string;
  identifier: string;
  address: string;
}

const EMPTY_CREATE: CreateForm = { name: '', identifier: '', address: '' };

export const AdminOrganizationsSection: React.FC = () => {
  const { showToast } = useToastStore();
  const { roles } = useAuthStore();
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modal, setModal] = useState<OrgModal>(null);
  const [targetOrg, setTargetOrg] = useState<Organization | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editForm, setEditForm] = useState<CreateForm>(EMPTY_CREATE);
  const [provisionForm, setProvisionForm] = useState({
    phone: '',
    fullName: '',
    email: '',
  });
  const [lastProvisioned, setLastProvisioned] = useState<ProvisionAdminResult | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await organizationsApi.getOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const message = getUserFriendlyErrorMessage(err);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      void fetchOrganizations();
    }
  }, [isSuperAdmin, fetchOrganizations]);

  const openCreateModal = () => {
    setCreateForm(EMPTY_CREATE);
    setModal('create');
  };

  const openEditModal = (org: Organization) => {
    setTargetOrg(org);
    setEditForm({
      name: org.name || '',
      identifier: org.identifier || '',
      address: org.address || '',
    });
    setModal('edit');
  };

  const openProvisionModal = (org: Organization) => {
    setTargetOrg(org);
    setProvisionForm({ phone: '', fullName: '', email: '' });
    setLastProvisioned(null);
    setModal('provision');
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      showToast('Organization name is required');
      return;
    }
    setIsSaving(true);
    try {
      await organizationsApi.createOrganization({
        name: createForm.name.trim(),
        identifier: createForm.identifier.trim() || undefined,
        address: createForm.address.trim() || undefined,
      });
      showToast('Organization created successfully');
      setModal(null);
      await fetchOrganizations();
    } catch (err: any) {
      showToast(getUserFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!targetOrg || !editForm.name.trim()) {
      showToast('Organization name is required');
      return;
    }
    setIsSaving(true);
    try {
      await organizationsApi.updateOrganization(targetOrg.id, {
        name: editForm.name.trim(),
        identifier: editForm.identifier.trim() || undefined,
        address: editForm.address.trim() || undefined,
      });
      showToast('Organization updated successfully');
      setModal(null);
      await fetchOrganizations();
    } catch (err: any) {
      showToast(getUserFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (org: Organization) => {
    setIsSaving(true);
    try {
      await organizationsApi.updateOrganization(org.id, {
        isActive: !org.isActive,
      });
      showToast(
        org.isActive
          ? `"${org.name}" deactivated`
          : `"${org.name}" activated`,
      );
      await fetchOrganizations();
    } catch (err: any) {
      showToast(getUserFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleProvision = async () => {
    if (!targetOrg || !provisionForm.phone.trim()) {
      showToast('Admin phone number is required');
      return;
    }
    setIsSaving(true);
    try {
      const result = await organizationsApi.provisionAdmin(targetOrg.id, {
        phone: provisionForm.phone.trim(),
        fullName: provisionForm.fullName.trim() || undefined,
        email: provisionForm.email.trim() || undefined,
      });
      setLastProvisioned(result);
      showToast(`SOCIETY_ADMIN added for ${targetOrg.name}`);
    } catch (err: any) {
      showToast(getUserFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="admin-section active" id="section-organizations">
        <div className="empty-state">
          <h3>Access Denied</h3>
          <p>Only SUPER_ADMIN can manage platform organizations.</p>
        </div>
      </div>
    );
  }

  const activeCount = organizations.filter((o) => o.isActive).length;
  const inactiveCount = organizations.length - activeCount;

  return (
    <div className="admin-section active" id="section-organizations">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Organizations</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Platform-wide client societies. Create societies, manage lifecycle
            and provision SOCIETY_ADMIN accounts.
          </p>
        </div>
        <div className="section-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={openCreateModal}
          >
            New Organization
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid" style={{ marginBottom: '16px' }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Organizations</div>
          <div className="kpi-value">{organizations.length}</div>
          <div className="kpi-sub">All client societies on platform</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active</div>
          <div className="kpi-value" style={{ color: 'var(--saffron-dark)' }}>
            {activeCount}
          </div>
          <div className="kpi-sub">Live & operational societies</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Inactive</div>
          <div className="kpi-value" style={{ color: 'var(--neutral)' }}>
            {inactiveCount}
          </div>
          <div className="kpi-sub">Deactivated client societies</div>
        </div>
      </div>

      {/* Loading / Error / Empty / Table */}
      {isLoading ? (
        <div className="card" style={{ padding: '24px' }}>
          <div className="kpi-label">Loading organizations…</div>
        </div>
      ) : loadError ? (
        <div className="card" style={{ padding: '24px' }}>
          <div className="empty-state">
            <h3>Unable to load organizations</h3>
            <p>{loadError}</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void fetchOrganizations()}
            >
              Retry
            </button>
          </div>
        </div>
      ) : organizations.length === 0 ? (
        <div className="card" style={{ padding: '24px' }}>
          <div className="empty-state">
            <h3>No organizations found</h3>
            <p>Create the first client society to get started.</p>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Identifier</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>
                    <strong>{org.name}</strong>
                    {org.address ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                        {org.address}
                      </div>
                    ) : null}
                  </td>
                  <td>{org.identifier || '—'}</td>
                  <td>
                    <span
                      className={clsx(
                        'badge',
                        org.isActive ? 'badge-success' : 'badge-warning',
                      )}
                    >
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {org.createdAt
                      ? new Date(org.createdAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => openProvisionModal(org)}
                      disabled={isSaving}
                    >
                      Add Admin
                    </button>
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => openEditModal(org)}
                      disabled={isSaving}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => void handleToggleActive(org)}
                      disabled={isSaving}
                    >
                      {org.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Organization Modal */}
      {modal === 'create' && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>New Organization</h3>
              <button className="modal-close-btn" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Organization Name *</label>
                <input
                  className="form-control"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="e.g. Emerald Meadows"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Identifier</label>
                <input
                  className="form-control"
                  value={createForm.identifier}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      identifier: e.target.value,
                    })
                  }
                  placeholder="Short unique alias (defaults to name)"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  className="form-control"
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, address: e.target.value })
                  }
                  placeholder="Registered society address"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => void handleCreate()}
                disabled={isSaving}
              >
                {isSaving ? 'Creating…' : 'Create Organization'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {modal === 'edit' && targetOrg && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Edit Organization</h3>
              <button className="modal-close-btn" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Organization Name *</label>
                <input
                  className="form-control"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Identifier</label>
                <input
                  className="form-control"
                  value={editForm.identifier}
                  onChange={(e) =>
                    setEditForm({ ...editForm, identifier: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  className="form-control"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => void handleUpdate()}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Admin Modal */}
      {modal === 'provision' && targetOrg && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>Add Society Admin</h3>
              <button className="modal-close-btn" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)', marginBottom: '12px' }}>
                Grant <strong>SOCIETY_ADMIN</strong> access to{' '}
                <strong>{targetOrg.name}</strong>. The phone number is used to
                create (or reuse) the login account and membership is granted in
                user_roles.
              </p>
              <div className="form-group">
                <label className="form-label">Admin Phone Number *</label>
                <input
                  className="form-control"
                  value={provisionForm.phone}
                  onChange={(e) =>
                    setProvisionForm({ ...provisionForm, phone: e.target.value })
                  }
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-control"
                  value={provisionForm.fullName}
                  onChange={(e) =>
                    setProvisionForm({
                      ...provisionForm,
                      fullName: e.target.value,
                    })
                  }
                  placeholder="Client admin name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  value={provisionForm.email}
                  onChange={(e) =>
                    setProvisionForm({
                      ...provisionForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="admin@example.com"
                />
              </div>
              {lastProvisioned && (
                <div
                  className="card"
                  style={{
                    padding: '10px',
                    fontSize: '0.8125rem',
                    background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                  }}
                >
                  <strong>SOCIETY_ADMIN granted.</strong> Login phone:{' '}
                  {lastProvisioned.phone} · Account ID:{' '}
                  <code style={{ fontSize: '0.75rem' }}>
                    {lastProvisioned.user_id}
                  </code>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setModal(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => void handleProvision()}
                disabled={isSaving}
              >
                {isSaving ? 'Adding…' : 'Add Society Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};