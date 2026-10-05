'use client';

import React, { useState } from 'react';
import { useVisitorStore, useToastStore } from '../../store';
import { VisitorRecord } from '../../types';

export const AdminVisitorsSection: React.FC = () => {
  const { visitors, approveVisitor, checkInVisitor, checkOutVisitor, rejectVisitor, addVisitor } = useVisitorStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'policies' | 'delivery' | 'fastgate'>('pipeline');
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  // Policies State
  const [policies, setPolicies] = useState([
    { id: '1', type: 'Guest / Personal', autoApprove: 'Resident WhatsApp / App', maxDuration: '8 Hours', photoReq: 'Optional', idReq: 'No', vehicleReq: 'Yes', allowedGates: 'Gate 1, 2', status: 'Active' },
    { id: '2', type: 'Delivery / Courier', autoApprove: 'Allowed (OTP / Gate Log)', maxDuration: '30 Mins', photoReq: 'Mandatory', idReq: 'Company ID', vehicleReq: 'Yes', allowedGates: 'Gate 1 Only', status: 'Active' },
    { id: '3', type: 'Cab / Taxi (Uber/Ola)', autoApprove: 'Auto-Cleared on Entry', maxDuration: '20 Mins', photoReq: 'No', idReq: 'No', vehicleReq: 'Mandatory', allowedGates: 'Gate 1, 2', status: 'Active' },
    { id: '4', type: 'Daily Help / Maid', autoApprove: 'Biometric / Passcode', maxDuration: '12 Hours', photoReq: 'Mandatory', idReq: 'Aadhaar Verified', vehicleReq: 'No', allowedGates: 'Gate 2 (Pedestrian)', status: 'Active' },
    { id: '5', type: 'Service / Contractor', autoApprove: 'Resident Approval Required', maxDuration: '10 Hours', photoReq: 'Mandatory', idReq: 'Govt ID', vehicleReq: 'Yes', allowedGates: 'Gate 1 Only', status: 'Active' }
  ]);

  // Delivery Partners State
  const [deliveryPartners, setDeliveryPartners] = useState([
    { id: '1', name: 'Blinkit / Zepto', type: '10-Min Grocery', allowedGate: 'Gate 1', hours: '06:00 AM - 11:30 PM', verification: 'App Notification', push: 'Instant', status: 'Active' },
    { id: '2', name: 'Swiggy / Zomato', type: 'Food Delivery', allowedGate: 'Gate 1 & 2', hours: '07:00 AM - 01:00 AM', verification: 'Order Pin / SMS', push: 'Instant', status: 'Active' },
    { id: '3', name: 'Amazon / Flipkart', type: 'E-Commerce Courier', allowedGate: 'Gate 1 Only', hours: '09:00 AM - 08:00 PM', verification: 'Delivery Passcode', push: 'Batch Digest', status: 'Active' },
    { id: '4', name: 'Dunzo / Porter', type: 'Parcel Logistics', allowedGate: 'Gate 1 Only', hours: '08:00 AM - 09:00 PM', verification: 'Driver Phone Match', push: 'Instant', status: 'Active' }
  ]);

  // FastGate Passes State
  const [fastGatePasses, setFastGatePasses] = useState([
    { id: 'FP-8891', resident: 'Aarav Sharma', flat: 'A-101', type: 'Windshield RFID Tag', token: 'RFID-TAG-4491-01', vehicle: 'MH-02-CB-4491', issued: '15 Jan 2026', expiry: '15 Jan 2027', status: 'Active' },
    { id: 'FP-8892', resident: 'Priya Mukherjee', flat: 'A-102', type: 'Windshield RFID Tag', token: 'RFID-TAG-9920-02', vehicle: 'MH-02-AK-9920', issued: '20 Jan 2026', expiry: '20 Jan 2027', status: 'Active' },
    { id: 'FP-8893', resident: 'Deepak Verma', flat: 'A-201', type: 'Resident QR FastPass', token: 'QR-PASS-1029-A201', vehicle: 'MH-02-EF-1029', issued: '01 Feb 2026', expiry: '01 Feb 2027', status: 'Active' },
    { id: 'FP-8894', resident: 'Meera Rao', flat: 'B-303', type: 'Frequent Guest Pass', token: 'QR-GUEST-303-99', vehicle: 'KA-01-MM-3211', issued: '10 Sep 2026', expiry: '30 Sep 2026', status: 'Active' }
  ]);

  // New Guest Form
  const [guestName, setGuestName] = useState('');
  const [guestFlat, setGuestFlat] = useState('A-101');
  const [guestPurpose, setGuestPurpose] = useState('Guest');
  const [guestPhone, setGuestPhone] = useState('');

  const handleLogGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    addVisitor({
      id: `vis-${Date.now()}`,
      name: guestName.trim(),
      phone: guestPhone.trim() || '+91 98765 43210',
      flat: guestFlat,
      purpose: guestPurpose,
      photo: '/assets/visitor_avatar.png',
      status: 'approved',
      requestedAt: 'Just now',
      passcode: Math.floor(100000 + Math.random() * 900000).toString(),
      isPreApproved: true
    });

    showToast(`Guest ${guestName} logged & approved for Flat ${guestFlat}!`);
    setGuestName('');
    setGuestPhone('');
    setShowLogModal(false);
  };

  const requestedVisitors = visitors.filter((v) => v.status === 'requested');
  const approvedVisitors = visitors.filter((v) => v.status === 'approved');
  const checkedInVisitors = visitors.filter((v) => v.status === 'checked-in');
  const checkedOutVisitors = visitors.filter((v) => v.status === 'checked-out');

  return (
    <div className="admin-section active" id="section-visitors">
      <div className="section-header">
        <div>
          <h2>Security, Access Control & Visitors</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Live gate pipeline, category policies, delivery partner restrictions, and FastGate RFID passes.
          </p>
        </div>
        <div className="section-actions" id="visitors-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPolicyModal(true)}>
            + Add Policy
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowLogModal(true)}>
            + Log Guest Entry
          </button>
        </div>
      </div>

      {/* Subnav Bar */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          Live Visitor Pipeline
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          Visitor Policies
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivery')}
        >
          Delivery Policies
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'fastgate' ? 'active' : ''}`}
          onClick={() => setActiveTab('fastgate')}
        >
          FastGate Pass Management
        </button>
      </div>

      {/* TAB 1: Live Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="config-panel active" id="vistab-pipeline">
          <div className="pipeline-board">
            {/* Column 1: Requested */}
            <div className="pipeline-column">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--saffron)' }}></span>
                  Requested
                </div>
                <span className="badge badge-warning" id="count-requested">
                  {requestedVisitors.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requestedVisitors.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    No pending requests
                  </div>
                ) : (
                  requestedVisitors.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.875rem' }}>{v.name}</strong>
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                          Flat {v.flat}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
                        {v.purpose} • {v.requestedAt || 'Just now'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-xs btn-primary"
                          style={{ flex: 1 }}
                          onClick={() => {
                            approveVisitor(v.id);
                            showToast(`Approved ${v.name} for Flat ${v.flat}`);
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-xs btn-danger"
                          onClick={() => {
                            rejectVisitor(v.id);
                            showToast(`Denied entry to ${v.name}`);
                          }}
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Approved */}
            <div className="pipeline-column">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--pine)' }}></span>
                  Approved by Resident
                </div>
                <span className="badge badge-pine" id="count-approved">
                  {approvedVisitors.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {approvedVisitors.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    No approved guests waiting
                  </div>
                ) : (
                  approvedVisitors.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.875rem' }}>{v.name}</strong>
                        <span className="badge badge-pine" style={{ fontSize: '0.65rem' }}>
                          Flat {v.flat}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
                        Passcode: <strong>{v.passcode || 'PASS-99'}</strong> • {v.purpose}
                      </div>
                      <button
                        className="btn btn-xs btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => {
                          checkInVisitor(v.id);
                          showToast(`${v.name} checked in at Gate 1`);
                        }}
                      >
                        Check In at Gate
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Checked In */}
            <div className="pipeline-column">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--success)' }}></span>
                  Checked-in (Inside)
                </div>
                <span className="badge badge-success" id="count-checkedin">
                  {checkedInVisitors.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {checkedInVisitors.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    No visitors currently inside
                  </div>
                ) : (
                  checkedInVisitors.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.875rem' }}>{v.name}</strong>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                          Inside • Flat {v.flat}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
                        Entry: {v.entryTime || 'Today'} • {v.purpose}
                      </div>
                      <button
                        className="btn btn-xs btn-ghost"
                        style={{ width: '100%', borderColor: 'var(--border-subtle)' }}
                        onClick={() => {
                          checkOutVisitor(v.id);
                          showToast(`${v.name} checked out.`);
                        }}
                      >
                        Record Exit & Check Out
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 4: Checked Out */}
            <div className="pipeline-column">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--neutral)' }}></span>
                  Checked-out (Exited)
                </div>
                <span className="badge badge-neutral" id="count-checkedout">
                  {checkedOutVisitors.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {checkedOutVisitors.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    No past checkout logs today
                  </div>
                ) : (
                  checkedOutVisitors.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        background: '#fafaf9',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        opacity: 0.85
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.8125rem', color: 'var(--neutral-dark)' }}>{v.name}</strong>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                          Flat {v.flat}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                        Exited at {v.exitTime || 'Earlier'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Visitor Policies */}
      {activeTab === 'policies' && (
        <div className="config-panel active" id="vistab-policies">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Visitor Categories & Automated Verification Policies</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Configure auto-approval rules, max duration limits, and mandatory check-in credentials.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPolicyModal(true)}>
              + Add Visitor Category
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Visitor Type</th>
                  <th>Auto Approval</th>
                  <th>Max Duration</th>
                  <th>Photo Req.</th>
                  <th>ID Req.</th>
                  <th>Vehicle Req.</th>
                  <th>Allowed Gates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.type}</strong>
                    </td>
                    <td>{p.autoApprove}</td>
                    <td>{p.maxDuration}</td>
                    <td>{p.photoReq}</td>
                    <td>{p.idReq}</td>
                    <td>{p.vehicleReq}</td>
                    <td>{p.allowedGates}</td>
                    <td>
                      <span className="badge badge-success">{p.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => {
                          setPolicies((prev) =>
                            prev.map((item) =>
                              item.id === p.id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item
                            )
                          );
                          showToast(`Policy for ${p.type} toggled.`);
                        }}
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Delivery Policies */}
      {activeTab === 'delivery' && (
        <div className="config-panel active" id="vistab-delivery">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Authorized Delivery Partners & Vendor Rules</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Manage e-commerce and food delivery entry protocols, allowed gate checkpoints, and active hours.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowDeliveryModal(true)}>
              + Add Delivery Partner
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Company / Partner</th>
                  <th>Delivery Type</th>
                  <th>Allowed Gate</th>
                  <th>Operating Window</th>
                  <th>Verification</th>
                  <th>Push Notification</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveryPartners.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.name}</strong>
                    </td>
                    <td>{d.type}</td>
                    <td>
                      <span className="badge badge-pine">{d.allowedGate}</span>
                    </td>
                    <td>{d.hours}</td>
                    <td>{d.verification}</td>
                    <td>{d.push}</td>
                    <td>
                      <span className="badge badge-success">{d.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => {
                          setDeliveryPartners((prev) =>
                            prev.map((item) =>
                              item.id === d.id ? { ...item, status: item.status === 'Active' ? 'Disabled' : 'Active' } : item
                            )
                          );
                          showToast(`Partner ${d.name} status updated.`);
                        }}
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FastGate Passes */}
      {activeTab === 'fastgate' && (
        <div className="config-panel active" id="vistab-fastgate">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Resident FastGate Digital RFID & QR Passes</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Manage instant contactless QR and RFID windshield passes issued to residents and frequent guests.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPassModal(true)}>
              + Issue FastGate Pass
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Pass ID</th>
                  <th>Resident Name</th>
                  <th>Flat / Unit</th>
                  <th>Pass Type</th>
                  <th>QR / RFID Token</th>
                  <th>Linked Vehicle</th>
                  <th>Issued Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fastGatePasses.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code>{p.id}</code>
                    </td>
                    <td>
                      <strong>{p.resident}</strong>
                    </td>
                    <td>Flat {p.flat}</td>
                    <td>{p.type}</td>
                    <td>
                      <code style={{ fontSize: '0.75rem', color: 'var(--pine)' }}>{p.token}</code>
                    </td>
                    <td>{p.vehicle}</td>
                    <td>{p.issued}</td>
                    <td>{p.expiry}</td>
                    <td>
                      <span className="badge badge-success">{p.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => {
                          showToast(`FastGate Pass ${p.id} re-synced with ANPR Barrier Controllers.`);
                        }}
                      >
                        Re-sync
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Log Guest Entry */}
      {showLogModal && (
        <div className="modal-overlay" id="modal-log-visitor">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Log Guest Entry at Gate</h3>
              <button className="modal-close-btn" onClick={() => setShowLogModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handleLogGuestSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Visitor Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Vikram Seth"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Target Flat / Unit</label>
                    <select
                      className="form-select"
                      value={guestFlat}
                      onChange={(e) => setGuestFlat(e.target.value)}
                    >
                      <option value="A-101">Flat A-101 (Aarav Sharma)</option>
                      <option value="A-102">Flat A-102 (Priya Mukherjee)</option>
                      <option value="A-201">Flat A-201 (Deepak Verma)</option>
                      <option value="B-303">Flat B-303 (Meera Rao)</option>
                      <option value="B-501">Flat B-501 (Aditya Birla)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purpose of Visit</label>
                    <select
                      className="form-select"
                      value={guestPurpose}
                      onChange={(e) => setGuestPurpose(e.target.value)}
                    >
                      <option value="Guest">Personal Guest</option>
                      <option value="Delivery">Delivery / Courier</option>
                      <option value="Cab">Cab / Ride Pick/Drop</option>
                      <option value="Home Repair">Home Service / Contractor</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+91 98765 43210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowLogModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Log Entry & Open Barrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Policy Add */}
      {showPolicyModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Visitor Category Policy</h3>
              <button className="modal-close-btn" onClick={() => setShowPolicyModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--neutral)' }}>
                New visitor validation rules will automatically apply across Guard Gate terminals and WhatsApp webhooks.
              </p>
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">Category Name</label>
                <input type="text" className="form-control" placeholder="e.g. Real Estate Agent / Broker" />
              </div>
              <div className="form-group">
                <label className="form-label">Max Allowed Duration (Hours)</label>
                <input type="number" className="form-control" defaultValue="4" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPolicyModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('New visitor category policy registered.');
                  setShowPolicyModal(false);
                }}
              >
                Save Category Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: FastGate Pass Issue */}
      {showPassModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Issue FastGate Windshield RFID / QR Pass</h3>
              <button className="modal-close-btn" onClick={() => setShowPassModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Resident Name</label>
                <input type="text" className="form-control" placeholder="e.g. Sonia Kapadia" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Flat / Unit</label>
                  <input type="text" className="form-control" placeholder="e.g. B-402" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Registration No.</label>
                  <input type="text" className="form-control" placeholder="e.g. MH-02-ZZ-8899" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPassModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('FastGate RFID Tag assigned and synced with Gate 1 & 2!');
                  setShowPassModal(false);
                }}
              >
                Issue Digital Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
