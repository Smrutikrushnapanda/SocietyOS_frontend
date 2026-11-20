'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore, useToastStore } from '../../store';
import {
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  getAssignableStaffRoles,
  assignStaffRole,
  getGuardShifts,
  createGuardShift,
  updateGuardShift,
  deleteGuardShift,
  getDutyRotas,
  createDutyRota,
  updateDutyRota,
  deleteDutyRota,
  BackendStaffMember,
  BackendGuardShift,
  BackendDutyRota,
  AssignableStaffRole,
} from '../../lib/api/staff.api';
import {
  getAllResidents,
  updateResidentKyc,
  AuthenticatedResidentProfile,
} from '../../lib/api/resident.api';
import { staffRoleOptions, isKnownStaffRole } from '../../lib/api/staff-roles';

/** Sentinel used by the Role / Designation dropdown for free-form entry. */
const CUSTOM_ROLE_VALUE = '__custom__';

export const AdminStaffSection: React.FC = () => {
  const { organizationId } = useAuthStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'roster' | 'shifts' | 'rota' | 'residents'>('roster');
  const [rotaFilter, setRotaFilter] = useState<'all' | 'today' | 'tomorrow'>('all');
  const [kycFilter, setKycFilter] = useState<'all' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('all');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Lists
  const [staffList, setStaffList] = useState<BackendStaffMember[]>([]);
  const [shiftsList, setShiftsList] = useState<BackendGuardShift[]>([]);
  const [rotaList, setRotaList] = useState<BackendDutyRota[]>([]);
  const [residentsList, setResidentsList] = useState<AuthenticatedResidentProfile[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<AssignableStaffRole[]>([]);

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<BackendStaffMember | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: 'Security Guard',
    phone: '',
    gate: 'Gate 1 (Main Entry)',
    shift: 'Morning (06:00 - 14:00)',
    status: 'On Duty',
    gender: 'Male',
    aadhaar_number: '',
    emergency_contact: '',
    address: '',
    date_of_joining: new Date().toISOString().slice(0, 10),
    profile_photo_url: '',
    aadhaar_photo_url: '',
  });

  const MAX_STAFF_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_STAFF_FILE_SIZE) {
      showToast('Profile photo must be 2MB or less.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setStaffForm((prev) => ({
        ...prev,
        profile_photo_url: (event.target?.result as string) || '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAadhaarPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_STAFF_FILE_SIZE) {
      showToast('Aadhaar photo must be 2MB or less.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setStaffForm((prev) => ({
        ...prev,
        aadhaar_photo_url: (event.target?.result as string) || '',
      }));
    };
    reader.readAsDataURL(file);
  };

  // App-role assignment modal — deliberately separate from the designation
  // form: designation is a job title, this is what grants sign-in access.
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [assigningStaff, setAssigningStaff] = useState<BackendStaffMember | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // Role / Designation dropdown — curated designations + roles already on the
  // roster, so entries stay consistent. A free-form value is reachable via the
  // "Other / Custom…" option.
  const roleOptions = useMemo(
    () => staffRoleOptions({ inUse: staffList.map((s) => s.role) }),
    [staffList],
  );
  const isCustomRole = !isKnownStaffRole(staffForm.role, roleOptions);

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<BackendGuardShift | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    start_time: '06:00 AM',
    end_time: '02:00 PM',
    required_guards: 4,
    assigned_guards: 4,
    assigned_gates: 'Gate 1, Gate 2',
    status: 'Active',
  });

  const [showRotaModal, setShowRotaModal] = useState(false);
  const [editingRota, setEditingRota] = useState<BackendDutyRota | null>(null);
  const [rotaForm, setRotaForm] = useState({
    date: 'Today',
    guard_name: '',
    shift_name: '',
    gate: 'Gate 1 (Main ANPR)',
    status: 'On Duty',
  });

  // Loaders
  const loadStaffData = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [sData, shData, rData, resData, roleData] = await Promise.all([
        getStaffMembers(),
        getGuardShifts(),
        getDutyRotas(),
        getAllResidents().catch(() => []),
        // Read-only helper for the assignment dropdown; a missing
        // staff:read grant must not blank out the whole roster tab.
        getAssignableStaffRoles().catch(() => [] as AssignableStaffRole[]),
      ]);
      setStaffList(sData);
      setShiftsList(shData);
      setRotaList(rData);
      setResidentsList(resData);
      setAssignableRoles(roleData);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to load staff roster data');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => {
    if (organizationId) {
      void loadStaffData();
    }
  }, [organizationId, loadStaffData]);

  // Staff Submit
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.phone.trim()) {
      alert('Please provide name and phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        await updateStaffMember(editingStaff.id, staffForm as any);
        showToast(`Staff member '${staffForm.name}' updated.`);
      } else {
        await createStaffMember(staffForm as any);
        showToast(`Staff member '${staffForm.name}' added to roster.`);
      }
      setShowStaffModal(false);
      setEditingStaff(null);
      await loadStaffData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Delete '${name}' from roster?`)) return;
    try {
      await deleteStaffMember(id);
      showToast(`'${name}' removed from roster.`);
      await loadStaffData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete staff member');
    }
  };

  // App Role Assignment
  // Grants (or replaces) the backend `user_roles` membership, which is the sole
  // source of society membership — without it the guard's login is rejected
  // with 403 because no authoritative role exists for the organization.
  //
  // Only a role actually offered by the assignable list may be submitted. The
  // stored `assigned_role_id` can easily be absent from that list (it reflects
  // whatever user is currently linked, and SOCIETY_ADMIN is only offered to a
  // SUPER_ADMIN), and a <select> holding a value with no matching <option>
  // silently posts the stale value — which is how a GUARD request turned into a
  // rejected SOCIETY_ADMIN grant.
  const effectiveSelectedRoleId = assignableRoles.some((r) => r.id === selectedRoleId)
    ? selectedRoleId
    : '';
  const currentRoleIsAssignable = Boolean(
    assigningStaff?.assigned_role_id &&
      assignableRoles.some((r) => r.id === assigningStaff.assigned_role_id),
  );

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStaff) return;
    if (!effectiveSelectedRoleId) {
      showToast('Please select an app role to assign.');
      return;
    }

    const targetRole = assignableRoles.find((r) => r.id === effectiveSelectedRoleId);
    if (assigningStaff.assigned_role_name) {
      const replacing = `${assigningStaff.assigned_role_name} with ${targetRole?.name ?? 'the selected role'}`;
      if (!confirm(`Replace ${replacing} for '${assigningStaff.name}'? A person holds one role per society.`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updated = await assignStaffRole(assigningStaff.id, effectiveSelectedRoleId);
      const roleName = updated.assigned_role_name ?? 'the selected role';
      showToast(`'${assigningStaff.name}' can now sign in as ${roleName}.`);
      setShowRoleModal(false);
      setAssigningStaff(null);
      setSelectedRoleId('');
      await loadStaffData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to assign app role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shift Submit
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingShift) {
        await updateGuardShift(editingShift.id, shiftForm);
        showToast(`Shift '${shiftForm.name}' updated.`);
      } else {
        await createGuardShift(shiftForm);
        showToast(`Shift '${shiftForm.name}' created.`);
      }
      setShowShiftModal(false);
      setEditingShift(null);
      await loadStaffData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save shift pattern');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async (id: string, name: string) => {
    if (!confirm(`Delete shift '${name}'?`)) return;
    try {
      await deleteGuardShift(id);
      showToast(`Shift '${name}' deleted.`);
      await loadStaffData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete shift');
    }
  };

  // Rota Submit
  const handleSaveRota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotaForm.guard_name.trim() || !rotaForm.shift_name.trim()) {
      alert('Please select guard and shift.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRota) {
        await updateDutyRota(editingRota.id, rotaForm as any);
        showToast(`Duty rota for '${rotaForm.guard_name}' updated.`);
      } else {
        await createDutyRota(rotaForm as any);
        showToast(`Duty assigned to '${rotaForm.guard_name}'.`);
      }
      setShowRotaModal(false);
      setEditingRota(null);
      await loadStaffData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save duty rota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRota = async (id: string) => {
    if (!confirm('Remove duty rota assignment?')) return;
    try {
      await deleteDutyRota(id);
      showToast('Duty assignment removed.');
      await loadStaffData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to remove duty rota');
    }
  };

  // KYC Verify
  const handleVerifyResidentKyc = async (residentId: string, residentName: string) => {
    try {
      await updateResidentKyc(residentId, 'VERIFIED');
      showToast(`KYC verified for resident '${residentName}'!`);
      await loadStaffData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to verify KYC');
    }
  };

  // Filters
  const filteredRota = rotaList.filter((r) => {
    if (rotaFilter === 'all') return true;
    if (rotaFilter === 'today') return r.date.toLowerCase().includes('today');
    if (rotaFilter === 'tomorrow') return r.date.toLowerCase().includes('tomorrow');
    return true;
  });

  const filteredResidents = residentsList.filter((r) => {
    if (kycFilter === 'all') return true;
    return r.kyc_status === kycFilter;
  });

  return (
    <div className="admin-section active" id="section-staff">
      <div className="section-header">
        <div>
          <h2>People, Staff, Guard Shifts & Resident KYC</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Security rosters, guard shift patterns, gate rotas, and resident KYC verification directory.
          </p>
        </div>
        <div className="section-actions" id="staff-header-actions">
          {activeTab === 'roster' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingStaff(null);
                setStaffForm({
                  name: '',
                  role: 'Security Guard',
                  phone: '',
                  gate: 'Gate 1 (Main Entry)',
                  shift: 'Morning (06:00 - 14:00)',
                  status: 'On Duty',
                  gender: 'Male',
                  aadhaar_number: '',
                  emergency_contact: '',
                  address: '',
                  date_of_joining: new Date().toISOString().slice(0, 10),
                  profile_photo_url: '',
                  aadhaar_photo_url: '',
                });
                setShowStaffModal(true);
              }}
            >
              + Add Staff Member
            </button>
          )}
          {activeTab === 'shifts' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingShift(null);
                setShiftForm({
                  name: '',
                  start_time: '06:00 AM',
                  end_time: '02:00 PM',
                  required_guards: 4,
                  assigned_guards: 4,
                  assigned_gates: 'Gate 1, Gate 2',
                  status: 'Active',
                });
                setShowShiftModal(true);
              }}
            >
              + Add Shift
            </button>
          )}
          {activeTab === 'rota' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (staffList.length === 0) {
                  showToast('Please add staff members first');
                  return;
                }
                setEditingRota(null);
                setRotaForm({
                  date: 'Today',
                  guard_name: staffList[0].name,
                  shift_name: shiftsList[0]?.name || 'Morning Shift (Alpha)',
                  gate: 'Gate 1 (Main ANPR)',
                  status: 'On Duty',
                });
                setShowRotaModal(true);
              }}
            >
              + Assign Duty
            </button>
          )}
        </div>
      </div>

      {/* Subnav Bar */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          Security & Staff Roster ({staffList.length})
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'shifts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shifts')}
        >
          Guard Shifts ({shiftsList.length})
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'rota' ? 'active' : ''}`}
          onClick={() => setActiveTab('rota')}
        >
          Gate Duty Rota ({rotaList.length})
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'residents' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('residents');
            void loadStaffData();
          }}
        >
          Residents & KYC Directory ({residentsList.length})
        </button>
      </div>

      {/* TAB 1: Staff Roster */}
      {activeTab === 'roster' && (
        <div className="config-panel active" id="stafftab-roster">
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
              Loading staff roster...
            </div>
          ) : staffList.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
              No staff members registered. Click &quot;+ Add Staff Member&quot; to add one.
            </div>
          ) : (
            <div className="staff-grid">
              {staffList.map((s) => (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--pine-tint)',
                          color: 'var(--pine)',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: s.profile_photo_url ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        {s.profile_photo_url ? (
                          <img
                            src={s.profile_photo_url}
                            alt={s.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          s.name[0]
                        )}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{s.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--pine)', fontWeight: 600 }}>{s.role}</span>
                      </div>
                    </div>
                    <span className={`badge ${s.status === 'On Duty' || s.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                      {s.status}
                    </span>
                  </div>

                  <div
                    style={{
                      background: 'var(--surface-sunken)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--neutral)' }}>Assigned Post:</span>
                      <strong>{s.gate}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--neutral)' }}>Shift Timing:</span>
                      <strong>{s.shift}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--neutral)' }}>Helpline Phone:</span>
                      <strong>{s.phone}</strong>
                    </div>
                    {s.aadhaar_photo_url && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neutral)' }}>Aadhaar KYC:</span>
                        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>✓ Document Uploaded</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--neutral)' }}>App Role:</span>
                      {s.assigned_role_name ? (
                        <span className="badge badge-success">{s.assigned_role_name}</span>
                      ) : (
                        <span className="badge badge-warning">Not assigned — cannot sign in</span>
                      )}
                    </div>
                  </div>

                  <button
                    className="btn btn-xs btn-primary"
                    onClick={() => {
                      setAssigningStaff(s);
                      setSelectedRoleId(s.assigned_role_id ?? '');
                      setShowRoleModal(true);
                    }}
                  >
                    {s.assigned_role_name ? 'Change App Role' : 'Assign Role'}
                  </button>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      className="btn btn-xs btn-ghost"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setEditingStaff(s);
                        setStaffForm({
                          name: s.name,
                          role: s.role,
                          phone: s.phone,
                          gate: s.gate,
                          shift: s.shift,
                          status: s.status,
                          gender: s.gender || 'Male',
                          aadhaar_number: s.aadhaar_number || '',
                          emergency_contact: s.emergency_contact || '',
                          address: s.address || '',
                          date_of_joining: s.date_of_joining || '',
                          profile_photo_url: s.profile_photo_url || '',
                          aadhaar_photo_url: s.aadhaar_photo_url || '',
                        });
                        setShowStaffModal(true);
                      }}
                    >
                      Edit Details
                    </button>
                    <button
                      className="btn btn-xs btn-ghost"
                      style={{ color: 'var(--danger, #dc2626)' }}
                      onClick={() => handleDeleteStaff(s.id, s.name)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Guard Shifts */}
      {activeTab === 'shifts' && (
        <div className="config-panel active" id="stafftab-shifts">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Security Guard Shift Configurations</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Define morning, evening, night, and general duty shift timings.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Shift Name</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Required Guards</th>
                  <th>Assigned Guards</th>
                  <th>Assigned Gates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shiftsList.map((sh) => (
                  <tr key={sh.id}>
                    <td>
                      <strong>{sh.name}</strong>
                    </td>
                    <td>{sh.start_time}</td>
                    <td>{sh.end_time}</td>
                    <td>{sh.required_guards} Guards</td>
                    <td>
                      <span className="badge badge-success">{sh.assigned_guards} Assigned</span>
                    </td>
                    <td>{sh.assigned_gates}</td>
                    <td>
                      <span className="badge badge-success">{sh.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            setEditingShift(sh);
                            setShiftForm({
                              name: sh.name,
                              start_time: sh.start_time,
                              end_time: sh.end_time,
                              required_guards: sh.required_guards,
                              assigned_guards: sh.assigned_guards,
                              assigned_gates: sh.assigned_gates,
                              status: sh.status,
                            });
                            setShowShiftModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          style={{ color: 'var(--danger, #dc2626)' }}
                          onClick={() => handleDeleteShift(sh.id, sh.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Gate Duty Rota */}
      {activeTab === 'rota' && (
        <div className="config-panel active" id="stafftab-rota">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'today', 'tomorrow'] as const).map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm btn-ghost ${rotaFilter === f ? 'active' : ''}`}
                  onClick={() => setRotaFilter(f)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {f === 'all' ? 'All Dates' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Security Guard</th>
                  <th>Shift</th>
                  <th>Assigned Gate</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRota.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.date}</strong>
                    </td>
                    <td>{r.guard_name}</td>
                    <td>{r.shift_name}</td>
                    <td>
                      <span className="badge badge-pine">{r.gate}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'On Duty' ? 'badge-success' : 'badge-neutral'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            setEditingRota(r);
                            setRotaForm({
                              date: r.date,
                              guard_name: r.guard_name,
                              shift_name: r.shift_name,
                              gate: r.gate,
                              status: r.status,
                            });
                            setShowRotaModal(true);
                          }}
                        >
                          Reassign
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          style={{ color: 'var(--danger, #dc2626)' }}
                          onClick={() => handleDeleteRota(r.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Residents & KYC */}
      {activeTab === 'residents' && (
        <div className="config-panel active" id="stafftab-residents">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'VERIFIED', 'PENDING', 'REJECTED'] as const).map((k) => (
                <button
                  key={k}
                  className={`btn btn-sm btn-ghost ${kycFilter === k ? 'active' : ''}`}
                  onClick={() => setKycFilter(k)}
                >
                  {k === 'all' ? 'All Residents' : `KYC: ${k}`}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Resident Name</th>
                  <th>Resident ID</th>
                  <th>Mobile Number</th>
                  <th>Flat / Building</th>
                  <th>KYC Status</th>
                  <th>App Access</th>
                  <th>Registered On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--neutral)' }}>
                      No residents found for selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((res) => {
                    const flatNum = res.flat?.flat_identifier ? `Flat ${res.flat.flat_identifier}` : 'Unassigned';
                    const bldgName = res.flat?.building?.name ? `(${res.flat.building.name})` : '';
                    return (
                      <tr key={res.id}>
                        <td>
                          <strong>{res.name || 'Resident'}</strong>
                        </td>
                        <td>
                          <code>{res.id.slice(0, 8)}</code>
                        </td>
                        <td>
                          <strong>{res.user?.mobileNumber || 'N/A'}</strong>
                        </td>
                        <td>
                          <span className="badge badge-pine">
                            {flatNum} {bldgName}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              res.kyc_status === 'VERIFIED'
                                ? 'badge-success'
                                : res.kyc_status === 'PENDING'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                          >
                            {res.kyc_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${res.app_access_status ? 'badge-success' : 'badge-neutral'}`}>
                            {res.app_access_status ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>{res.createdAt ? new Date(res.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          {res.kyc_status === 'PENDING' ? (
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => handleVerifyResidentKyc(res.id, res.name || res.user?.mobileNumber || res.id.slice(0, 8))}
                            >
                              Verify KYC
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Staff */}
      {showStaffModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <h3>{editingStaff ? 'Edit Staff Member' : '+ Add Society Staff Member'}</h3>
              <button className="modal-close-btn" onClick={() => setShowStaffModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveStaff}>
              <div className="modal-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
                {/* 1. Profile Photo Header (Max 2MB) */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '76px',
                      height: '76px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      border: '2px dashed #94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {staffForm.profile_photo_url ? (
                      <img
                        src={staffForm.profile_photo_url}
                        alt="Profile preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.6875rem', color: '#64748b', textAlign: 'center', padding: '4px' }}>
                        No Photo
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Staff Profile Photo <span style={{ fontSize: '0.75rem', color: 'var(--neutral)', fontWeight: 400 }}>(Max 2 MB • JPG, PNG, WEBP)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="form-control"
                      style={{ fontSize: '0.8125rem' }}
                      onChange={handleProfilePhotoChange}
                    />
                    {staffForm.profile_photo_url && (
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        style={{ color: 'var(--danger, #dc2626)', marginTop: '4px', padding: '2px 6px' }}
                        onClick={() => setStaffForm((prev) => ({ ...prev, profile_photo_url: '' }))}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Personal & Contact Information */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1.2 }}>
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Pramita Nayak"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 93483 81944"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Designation / Role *</label>
                    <select
                      className="form-select"
                      value={isCustomRole ? CUSTOM_ROLE_VALUE : staffForm.role}
                      onChange={(e) => {
                        const value = e.target.value;
                        setStaffForm({
                          ...staffForm,
                          role: value === CUSTOM_ROLE_VALUE ? '' : value,
                        });
                      }}
                      required={!isCustomRole}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                      <option value={CUSTOM_ROLE_VALUE}>Other / Custom…</option>
                    </select>
                    {isCustomRole && (
                      <input
                        type="text"
                        className="form-control"
                        style={{ marginTop: 'var(--space-2)' }}
                        placeholder="e.g. Plumbing AMC Specialist"
                        value={staffForm.role}
                        onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                        required
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-select"
                      value={staffForm.gender}
                      onChange={(e) => setStaffForm({ ...staffForm, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* 3. Duty Post & Shifts */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assigned Gate / Post *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Gate 1 (Main Entry)"
                      value={staffForm.gate}
                      onChange={(e) => setStaffForm({ ...staffForm, gate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duty Shift *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Morning (06:00 - 14:00)"
                      value={staffForm.shift}
                      onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={staffForm.status}
                      onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                    >
                      <option value="On Duty">On Duty</option>
                      <option value="Off Duty">Off Duty</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Joining</label>
                    <input
                      type="date"
                      className="form-control"
                      value={staffForm.date_of_joining}
                      onChange={(e) => setStaffForm({ ...staffForm, date_of_joining: e.target.value })}
                    />
                  </div>
                </div>

                {/* 4. Aadhaar Card Verification (Max 2MB) */}
                <div style={{ marginTop: '12px', padding: '14px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>
                    Identity Verification (Aadhaar)
                  </h4>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Aadhaar Card Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="XXXX XXXX XXXX"
                        maxLength={16}
                        value={staffForm.aadhaar_number}
                        onChange={(e) => setStaffForm({ ...staffForm, aadhaar_number: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1.3 }}>
                      <label className="form-label">
                        Aadhaar Document / Photo <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>(Max 2 MB)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                        className="form-control"
                        style={{ fontSize: '0.8125rem' }}
                        onChange={handleAadhaarPhotoChange}
                      />
                    </div>
                  </div>

                  {staffForm.aadhaar_photo_url && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {staffForm.aadhaar_photo_url.startsWith('data:application/pdf') ? (
                        <span className="badge badge-neutral">📄 PDF Document Attached</span>
                      ) : (
                        <img
                          src={staffForm.aadhaar_photo_url}
                          alt="Aadhaar Preview"
                          style={{ width: '84px', height: '54px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      )}
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        style={{ color: 'var(--danger, #dc2626)' }}
                        onClick={() => setStaffForm((prev) => ({ ...prev, aadhaar_photo_url: '' }))}
                      >
                        Remove Document
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Address & Emergency Contact */}
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label className="form-label">Emergency Contact (Name & Phone)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Brother: +91 98765 43210"
                    value={staffForm.emergency_contact}
                    onChange={(e) => setStaffForm({ ...staffForm, emergency_contact: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Residential Address</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Residential / permanent address..."
                    value={staffForm.address}
                    onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowStaffModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Shift */}
      {showShiftModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{editingShift ? 'Edit Guard Shift' : '+ Add Guard Shift'}</h3>
              <button className="modal-close-btn" onClick={() => setShowShiftModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveShift}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Shift Pattern Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Morning Shift (Alpha)"
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="06:00 AM"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="02:00 PM"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Required Guards</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={shiftForm.required_guards}
                      onChange={(e) => setShiftForm({ ...shiftForm, required_guards: parseInt(e.target.value, 10) || 1 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned Gates</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Gate 1, Gate 2"
                      value={shiftForm.assigned_gates}
                      onChange={(e) => setShiftForm({ ...shiftForm, assigned_gates: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowShiftModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Rota Assignment */}
      {showRotaModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{editingRota ? 'Reassign Duty' : '+ Assign Gate Duty'}</h3>
              <button className="modal-close-btn" onClick={() => setShowRotaModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveRota}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Select Security Guard</label>
                    <select
                      className="form-select"
                      value={rotaForm.guard_name}
                      onChange={(e) => setRotaForm({ ...rotaForm, guard_name: e.target.value })}
                      required
                    >
                      {staffList.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Select Shift</label>
                    <select
                      className="form-select"
                      value={rotaForm.shift_name}
                      onChange={(e) => setRotaForm({ ...rotaForm, shift_name: e.target.value })}
                      required
                    >
                      {shiftsList.map((sh) => (
                        <option key={sh.id} value={sh.name}>
                          {sh.name} ({sh.start_time} - {sh.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Today or 2026-10-10"
                      value={rotaForm.date}
                      onChange={(e) => setRotaForm({ ...rotaForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned Gate</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Gate 1 (Main ANPR)"
                      value={rotaForm.gate}
                      onChange={(e) => setRotaForm({ ...rotaForm, gate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={rotaForm.status}
                    onChange={(e) => setRotaForm({ ...rotaForm, status: e.target.value })}
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowRotaModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Assign Duty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign App Role (role master) */}
      {showRoleModal && assigningStaff && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Assign App Role</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowRoleModal(false);
                  setAssigningStaff(null);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignRole}>
              <div className="modal-body">
                <div
                  style={{
                    background: 'var(--surface-sunken)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px',
                    fontSize: '0.8125rem',
                  }}
                >
                  <strong>{assigningStaff.name}</strong>
                  <div style={{ color: 'var(--neutral)', marginTop: '4px' }}>
                    Designation: {assigningStaff.role} · {assigningStaff.phone}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    Current app role:{' '}
                    {assigningStaff.assigned_role_name ? (
                      <span className="badge badge-success">{assigningStaff.assigned_role_name}</span>
                    ) : (
                      <span className="badge badge-warning">None — cannot sign in</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">App Role (from Role Master)</label>
                  <select
                    className="form-select"
                    value={effectiveSelectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select a role…
                    </option>
                    {assignableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.7rem', color: 'var(--neutral)', marginTop: 'var(--space-2)' }}>
                    This is what actually lets the person sign in to the SocietyOS app.
                    Assign GUARD to give gate staff access to the Guard portal.
                    A person holds one role per society, so assigning a new role replaces the current one.
                  </p>
                  {assigningStaff.assigned_role_name && !currentRoleIsAssignable && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--warning, #d97706)', marginTop: 'var(--space-2)' }}>
                      Current role {assigningStaff.assigned_role_name} is not in the list you can grant —
                      pick a role below to replace it. If this person should keep {assigningStaff.assigned_role_name},
                      ask a SUPER_ADMIN.
                    </p>
                  )}
                  {assignableRoles.length === 0 && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--danger, #dc2626)', marginTop: 'var(--space-2)' }}>
                      No assignable roles available. Contact your platform administrator to seed the role master.
                    </p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowRoleModal(false);
                    setAssigningStaff(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !effectiveSelectedRoleId}
                >
                  {isSubmitting ? 'Assigning…' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
