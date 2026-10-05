'use client';

import React, { useState } from 'react';
import { useToastStore } from '../../store';

export const AdminStaffSection: React.FC = () => {
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'roster' | 'shifts' | 'rota' | 'residents'>('roster');
  const [rotaFilter, setRotaFilter] = useState<'all' | 'today' | 'tomorrow'>('all');
  const [kycFilter, setKycFilter] = useState<'all' | 'Owner' | 'Tenant' | 'Verified' | 'Pending'>('all');

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showRotaModal, setShowRotaModal] = useState(false);

  // Staff Roster
  const [staffList, setStaffList] = useState([
    { id: '1', name: 'Ramesh Singh', role: 'Head Security Officer', phone: '+91 98201 11223', gate: 'Gate 1 (Main Entry)', shift: 'Morning (06:00 - 14:00)', status: 'On Duty' },
    { id: '2', name: 'Manoj Kumar', role: 'Security Guard', phone: '+91 98202 22334', gate: 'Gate 2 (Pedestrian)', shift: 'Morning (06:00 - 14:00)', status: 'On Duty' },
    { id: '3', name: 'Vikas Yadav', role: 'Security Guard', phone: '+91 98203 33445', gate: 'Gate 1 (ANPR Barrier)', shift: 'Evening (14:00 - 22:00)', status: 'Off Duty' },
    { id: '4', name: 'Dinesh Patil', role: 'Estate Maintenance Supervisor', phone: '+91 98204 44556', gate: 'Clubhouse Desk', shift: 'General (09:00 - 18:00)', status: 'Active' },
    { id: '5', name: 'Suresh Plumber', role: 'Plumbing AMC Specialist', phone: '+91 98205 55667', gate: 'On-Call Campus', shift: 'General (09:00 - 18:00)', status: 'Active' }
  ]);

  // Guard Shifts
  const [shifts, setShifts] = useState([
    { id: '1', name: 'Morning Shift (Alpha)', start: '06:00 AM', end: '02:00 PM', req: 4, assigned: 4, gates: 'Gate 1, Gate 2', status: 'Active' },
    { id: '2', name: 'Evening Shift (Bravo)', start: '02:00 PM', end: '10:00 PM', req: 4, assigned: 4, gates: 'Gate 1, Gate 2', status: 'Active' },
    { id: '3', name: 'Night Shift (Charlie)', start: '10:00 PM', end: '06:00 AM', req: 3, assigned: 3, gates: 'Gate 1 Only (Gate 2 Locked)', status: 'Active' },
    { id: '4', name: 'General Maintenance (Delta)', start: '09:00 AM', end: '06:00 PM', req: 2, assigned: 2, gates: 'Facility Office', status: 'Active' }
  ]);

  // Gate Duty Rota
  const [rotaList, setRotaList] = useState([
    { id: '1', date: 'Today (29 Sep)', guard: 'Ramesh Singh', shift: 'Morning Shift (Alpha)', gate: 'Gate 1 (Main ANPR)', status: 'On Duty' },
    { id: '2', date: 'Today (29 Sep)', guard: 'Manoj Kumar', shift: 'Morning Shift (Alpha)', gate: 'Gate 2 (Pedestrian)', status: 'On Duty' },
    { id: '3', date: 'Today (29 Sep)', guard: 'Vikas Yadav', shift: 'Evening Shift (Bravo)', gate: 'Gate 1 (Main ANPR)', status: 'Scheduled' },
    { id: '4', date: 'Tomorrow (30 Sep)', guard: 'Ramesh Singh', shift: 'Morning Shift (Alpha)', gate: 'Gate 1 (Main ANPR)', status: 'Scheduled' },
    { id: '5', date: 'Tomorrow (30 Sep)', guard: 'Manoj Kumar', shift: 'Evening Shift (Bravo)', gate: 'Gate 2 (Pedestrian)', status: 'Scheduled' }
  ]);

  // Residents Directory
  const [residents, setResidents] = useState([
    { id: '1', name: 'Aarav Sharma', flat: 'A-101', type: 'Owner', phone: '+91 98200 11223', email: 'aarav@greenwood.in', kyc: 'Verified', moveIn: '15 Mar 2024', status: 'Active' },
    { id: '2', name: 'Priya Mukherjee', flat: 'A-102', type: 'Owner', phone: '+91 98201 33445', email: 'priya.m@gmail.com', kyc: 'Verified', moveIn: '01 Jun 2024', status: 'Active' },
    { id: '3', name: 'Deepak Verma', flat: 'A-201', type: 'Tenant', phone: '+91 98202 55667', email: 'deepak.v@corp.com', kyc: 'Verified', moveIn: '10 Jan 2025', status: 'Active' },
    { id: '4', name: 'Ananya Iyer', flat: 'A-202', type: 'Owner', phone: '+91 98203 77889', email: 'ananya.iyer@live.com', kyc: 'Verified', moveIn: '20 Feb 2024', status: 'Active' },
    { id: '5', name: 'Vikram Mehta', flat: 'A-301', type: 'Tenant', phone: '+91 98204 99001', email: 'vikram.mehta@yahoo.com', kyc: 'Pending', moveIn: '15 Sep 2026', status: 'Pending Verification' },
    { id: '6', name: 'Meera Rao', flat: 'B-303', type: 'Owner', phone: '+91 98205 12345', email: 'meera.rao@outlook.com', kyc: 'Verified', moveIn: '12 Nov 2024', status: 'Active' },
    { id: '7', name: 'Aditya Birla', flat: 'B-501', type: 'Owner', phone: '+91 98206 67890', email: 'aditya.b@enterprise.com', kyc: 'Verified', moveIn: '01 Aug 2024', status: 'Active' }
  ]);

  const filteredRota = rotaList.filter((r) => {
    if (rotaFilter === 'all') return true;
    if (rotaFilter === 'today') return r.date.includes('Today');
    if (rotaFilter === 'tomorrow') return r.date.includes('Tomorrow');
    return true;
  });

  const filteredResidents = residents.filter((r) => {
    if (kycFilter === 'all') return true;
    if (kycFilter === 'Owner') return r.type === 'Owner';
    if (kycFilter === 'Tenant') return r.type === 'Tenant';
    if (kycFilter === 'Verified') return r.kyc === 'Verified';
    if (kycFilter === 'Pending') return r.kyc === 'Pending';
    return true;
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowStaffModal(true)}>
            + Add Staff Member
          </button>
        </div>
      </div>

      {/* Subnav Bar */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          Security & Staff Roster
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'shifts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shifts')}
        >
          Guard Shifts
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'rota' ? 'active' : ''}`}
          onClick={() => setActiveTab('rota')}
        >
          Gate Duty Rota
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'residents' ? 'active' : ''}`}
          onClick={() => setActiveTab('residents')}
        >
          Residents & KYC Directory
        </button>
      </div>

      {/* TAB 1: Staff Roster */}
      {activeTab === 'roster' && (
        <div className="config-panel active" id="stafftab-roster">
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
                        fontSize: '1rem'
                      }}
                    >
                      {s.name[0]}
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
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    className="btn btn-xs btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => showToast(`Dialing ${s.name} (${s.phone})...`)}
                  >
                    Call
                  </button>
                  <button
                    className="btn btn-xs btn-primary"
                    onClick={() => showToast(`Duty reassigned for ${s.name}.`)}
                  >
                    Reassign Duty
                  </button>
                </div>
              </div>
            ))}
          </div>
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
            <button className="btn btn-primary btn-sm" onClick={() => setShowShiftModal(true)}>
              + Add Shift
            </button>
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
                {shifts.map((sh) => (
                  <tr key={sh.id}>
                    <td>
                      <strong>{sh.name}</strong>
                    </td>
                    <td>{sh.start}</td>
                    <td>{sh.end}</td>
                    <td>{sh.req} Guards</td>
                    <td>
                      <span className="badge badge-success">{sh.assigned} Assigned</span>
                    </td>
                    <td>{sh.gates}</td>
                    <td>
                      <span className="badge badge-success">{sh.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => showToast(`Editing shift '${sh.name}'.`)}
                      >
                        Edit
                      </button>
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
            <button className="btn btn-primary btn-sm" onClick={() => setShowRotaModal(true)}>
              + Assign Duty
            </button>
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
                    <td>{r.guard}</td>
                    <td>{r.shift}</td>
                    <td>
                      <span className="badge badge-pine">{r.gate}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'On Duty' ? 'badge-success' : 'badge-neutral'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => showToast(`Gate duty for ${r.guard} updated.`)}
                      >
                        Reassign
                      </button>
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
              {(['all', 'Owner', 'Tenant', 'Verified', 'Pending'] as const).map((k) => (
                <button
                  key={k}
                  className={`btn btn-sm btn-ghost ${kycFilter === k ? 'active' : ''}`}
                  onClick={() => setKycFilter(k)}
                >
                  {k === 'all' ? 'All Residents' : k === 'Owner' ? 'Owners' : k === 'Tenant' ? 'Tenants' : `KYC ${k}`}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Resident Name</th>
                  <th>Flat / Unit</th>
                  <th>Resident Type</th>
                  <th>Phone / Email</th>
                  <th>KYC Status</th>
                  <th>Move-in Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.map((res) => (
                  <tr key={res.id}>
                    <td>
                      <strong>{res.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-pine">Flat {res.flat}</span>
                    </td>
                    <td>{res.type}</td>
                    <td>
                      <div>{res.phone}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>{res.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${res.kyc === 'Verified' ? 'badge-success' : 'badge-warning'}`}>
                        {res.kyc}
                      </span>
                    </td>
                    <td>{res.moveIn}</td>
                    <td>
                      <span className="badge badge-success">{res.status}</span>
                    </td>
                    <td>
                      {res.kyc === 'Pending' ? (
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={() => {
                            setResidents((prev) =>
                              prev.map((r) =>
                                r.id === res.id ? { ...r, kyc: 'Verified', status: 'Active' } : r
                              )
                            );
                            showToast(`KYC verified for ${res.name} (Flat ${res.flat})!`);
                          }}
                        >
                          Verify KYC
                        </button>
                      ) : (
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => showToast(`Dossier for ${res.name} opened.`)}
                        >
                          View Dossier
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Staff */}
      {showStaffModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Society Staff Member</h3>
              <button className="modal-close-btn" onClick={() => setShowStaffModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" placeholder="e.g. Sunil Yadav" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role / Designation</label>
                  <input type="text" className="form-control" placeholder="e.g. Security Guard" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-control" placeholder="+91 98200 00000" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowStaffModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('Staff member added to society registry.');
                  setShowStaffModal(false);
                }}
              >
                Register Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
