'use client';

import React, { useState } from 'react';
import { useSocietyStore, useToastStore } from '../../store';

export const AdminSettingsSection: React.FC = () => {
  const { society, updateSettings } = useSocietyStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'general' | 'emergency' | 'billing-defaults' | 'templates' | 'roles'>('general');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'guard' | 'accountant' | 'resident'>('admin');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // General settings state
  const [socName, setSocName] = useState(society.name || 'Greenwood Heights Co-op Housing Society');
  const [socReg, setSocReg] = useState('BOM/GEN/2021/8892');
  const [socCurrency, setSocCurrency] = useState('₹ (INR)');
  const [socAddress, setSocAddress] = useState(society.address || 'Plot 42, Sector 18, Kharghar, Navi Mumbai - 410210');

  // Emergency contacts state
  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: '1', name: 'Main Security Gate Kiosk', phone: '+91 98200 11223', desc: 'Perimeter Gate #1 Guard Desk', priority: 'High', is24x7: true, resVisible: true, guardVisible: true, status: 'Active' },
    { id: '2', name: 'Estate Manager (Mr. Patil)', phone: '+91 98200 44556', desc: 'Administration & Escalation', priority: 'High', is24x7: false, resVisible: true, guardVisible: true, status: 'Active' },
    { id: '3', name: 'Otis Lift Breakdown 24x7', phone: '1800 120 8899', desc: 'Emergency Elevator Helpline', priority: 'Urgent', is24x7: true, resVisible: true, guardVisible: true, status: 'Active' },
    { id: '4', name: 'Local Police Control Room', phone: '112 / 100', desc: 'Kharghar Police Station', priority: 'Emergency', is24x7: true, resVisible: true, guardVisible: true, status: 'Active' },
    { id: '5', name: 'Apollo Emergency Ambulance', phone: '1066', desc: 'Navi Mumbai Trauma Centre', priority: 'Emergency', is24x7: true, resVisible: true, guardVisible: true, status: 'Active' }
  ]);

  // RBAC matrix definition
  const rbacModules = [
    { module: 'Overview & Command Deck', view: true, create: true, edit: true, del: false, exp: true },
    { module: 'Buildings & Unit Slices', view: true, create: true, edit: true, del: true, exp: true },
    { module: 'Vehicles & Parking Bays', view: true, create: true, edit: true, del: false, exp: true },
    { module: 'Gate Security & Visitors', view: true, create: true, edit: true, del: true, exp: true },
    { module: 'Clubhouse & Amenities', view: true, create: true, edit: true, del: false, exp: true },
    { module: 'Helpdesk Complaints & AMC', view: true, create: true, edit: true, del: true, exp: true },
    { module: 'Staff & Resident KYC', view: true, create: true, edit: true, del: true, exp: true },
    { module: 'Finance, Dues & Ledger', view: true, create: true, edit: true, del: false, exp: true }
  ];

  const handleSaveAll = () => {
    updateSettings({
      name: socName,
      address: socAddress
    });
    showToast('All society master settings and RBAC policies saved successfully!');
  };

  return (
    <div className="admin-section active" id="section-settings">
      <div className="section-header">
        <div>
          <h2>Society Master Configuration, Emergency & RBAC</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Configure society details, emergency SOS directory, billing rules, WhatsApp copy, and granular role permissions.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSaveAll}>
          Save All Settings
        </button>
      </div>

      <div className="settings-container">
        {/* Settings Navigation */}
        <div className="settings-nav">
          <button
            className={`settings-nav-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            Society Profile
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'emergency' ? 'active' : ''}`}
            onClick={() => setActiveTab('emergency')}
          >
            Emergency & SOS
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'billing-defaults' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing-defaults')}
          >
            Financial & Billing Defaults
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            WhatsApp Templates
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Roles & Permissions (RBAC)
          </button>
        </div>

        {/* Panel 1: General Profile */}
        {activeTab === 'general' && (
          <div className="settings-panel active" id="setpanel-general">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Society Identity & Legal Information</h3>
            <div className="form-group">
              <label className="form-label">Registered Housing Society Name</label>
              <input
                type="text"
                className="form-control"
                value={socName}
                onChange={(e) => setSocName(e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Registration / License Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={socReg}
                  onChange={(e) => setSocReg(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <input
                  type="text"
                  className="form-control"
                  value={socCurrency}
                  onChange={(e) => setSocCurrency(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Official Society Address</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={socAddress}
                onChange={(e) => setSocAddress(e.target.value)}
              ></textarea>
            </div>
          </div>
        )}

        {/* Panel 2: Emergency & SOS */}
        {activeTab === 'emergency' && (
          <div className="settings-panel active" id="setpanel-emergency">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>Emergency & SOS Helplines Directory</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                  Configure critical 24x7 emergency contacts visible across Resident and Guard apps.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowEmergencyModal(true)}>
                + Add Emergency Contact
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="statement-table">
                <thead>
                  <tr>
                    <th>Service / Name</th>
                    <th>Phone Number</th>
                    <th>Description</th>
                    <th>Priority</th>
                    <th>24x7</th>
                    <th>Resident Visible</th>
                    <th>Guard Visible</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emergencyContacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>
                        <code style={{ fontWeight: 700, color: 'var(--pine)' }}>{c.phone}</code>
                      </td>
                      <td>{c.desc}</td>
                      <td>
                        <span className="badge badge-danger">{c.priority}</span>
                      </td>
                      <td>{c.is24x7 ? 'Yes' : '—'}</td>
                      <td>{c.resVisible ? 'Visible' : '—'}</td>
                      <td>{c.guardVisible ? 'Visible' : '—'}</td>
                      <td>
                        <span className="badge badge-success">{c.status}</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => showToast(`Emergency contact ${c.name} updated.`)}
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

        {/* Panel 3: Billing Defaults */}
        {activeTab === 'billing-defaults' && (
          <div className="settings-panel active" id="setpanel-billing-defaults">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Assessment & Late Fee Policy</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Grace Period (Days)</label>
                <input type="number" className="form-control" defaultValue="10" />
              </div>
              <div className="form-group">
                <label className="form-label">Late Payment Interest / Penalty (%)</label>
                <input type="number" className="form-control" defaultValue="2" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Base Rate per Sq. Ft. (₹/sqft)</label>
              <input type="number" step="0.5" className="form-control" defaultValue="3.5" />
            </div>
          </div>
        )}

        {/* Panel 4: WhatsApp Templates */}
        {activeTab === 'templates' && (
          <div className="settings-panel active" id="setpanel-templates">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Customize WhatsApp Message Copy</h3>
            <div className="form-group">
              <label className="form-label">Visitor Gate Notification Template</label>
              <textarea
                className="form-textarea"
                rows={2}
                defaultValue="Namaste {resident_name}, {visitor_name} is at {gate_name} for Flat {flat_number}. Reply YES to approve or NO to deny."
              ></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">Maintenance Dues Reminder Template</label>
              <textarea
                className="form-textarea"
                rows={2}
                defaultValue="Dear {resident_name}, your maintenance bill of Rs. {amount} is pending. Tap to pay: {upi_link}"
              ></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">Society Notice Broadcast Template</label>
              <textarea
                className="form-textarea"
                rows={2}
                defaultValue="GREENWOOD RWA NOTICE: {notice_title}. Full details: {notice_link}"
              ></textarea>
            </div>
          </div>
        )}

        {/* Panel 5: Granular RBAC Permissions */}
        {activeTab === 'roles' && (
          <div className="settings-panel active" id="setpanel-roles">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>Granular Role-Based Access Control (RBAC) Matrix</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                  Authorize View, Create, Edit, Delete, and Export capabilities per module for each role.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>Role:</label>
                <select
                  className="form-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  style={{ fontWeight: 700 }}
                >
                  <option value="admin">System Admin / Chairman</option>
                  <option value="guard">Security Guard Console</option>
                  <option value="accountant">Treasurer / Accountant</option>
                  <option value="resident">Resident Member</option>
                </select>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="rbac-matrix-table">
                <thead>
                  <tr>
                    <th>Society Module</th>
                    <th>View Access</th>
                    <th>Create / Log</th>
                    <th>Edit Records</th>
                    <th>Delete Records</th>
                    <th>Export Data</th>
                  </tr>
                </thead>
                <tbody>
                  {rbacModules.map((m, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{m.module}</strong>
                      </td>
                      <td>
                        <input type="checkbox" defaultChecked={m.view} className="rbac-checkbox" />
                      </td>
                      <td>
                        <input type="checkbox" defaultChecked={m.create} className="rbac-checkbox" />
                      </td>
                      <td>
                        <input type="checkbox" defaultChecked={m.edit} className="rbac-checkbox" />
                      </td>
                      <td>
                        <input type="checkbox" defaultChecked={m.del} className="rbac-checkbox" />
                      </td>
                      <td>
                        <input type="checkbox" defaultChecked={m.exp} className="rbac-checkbox" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Emergency Contact */}
      {showEmergencyModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Emergency Helpline Contact</h3>
              <button className="modal-close-btn" onClick={() => setShowEmergencyModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Service / Contact Name</label>
                <input type="text" className="form-control" placeholder="e.g. 24x7 Snake Rescuer Helpline" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-control" placeholder="+91 98200 99887" />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select className="form-select">
                    <option>Urgent</option>
                    <option>Emergency</option>
                    <option>Standard Helpline</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEmergencyModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('Emergency helpline contact registered across mobile apps.');
                  setShowEmergencyModal(false);
                }}
              >
                Add Helpline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
