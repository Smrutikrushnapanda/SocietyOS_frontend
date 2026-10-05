'use client';

import React, { useState } from 'react';
import { useComplaintStore, useToastStore } from '../../store';
import { Complaint } from '../../types';

export const AdminComplaintsSection: React.FC = () => {
  const { complaints, updateComplaintStatus, addComplaint } = useComplaintStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'board' | 'sla' | 'vendors'>('board');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  // New ticket state
  const [ticketCategory, setTicketCategory] = useState('Plumbing');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [ticketFlat, setTicketFlat] = useState('A-101');

  // SLA Tiers
  const [slaTiers, setSlaTiers] = useState([
    { priority: 'Urgent (P1)', response: '15 Mins', resolution: '4 Hours', escalation: '2 Hours', recipient: 'Estate Manager + Chairman', status: 'Active' },
    { priority: 'High (P2)', response: '1 Hour', resolution: '12 Hours', escalation: '6 Hours', recipient: 'Operations Lead', status: 'Active' },
    { priority: 'Medium (P3)', response: '4 Hours', resolution: '24 Hours', escalation: '18 Hours', recipient: 'Supervisor', status: 'Active' },
    { priority: 'Low (P4)', response: '12 Hours', resolution: '48 Hours', escalation: '36 Hours', recipient: 'Facility Desk', status: 'Active' }
  ]);

  // AMC Vendors
  const [vendors, setVendors] = useState([
    { id: '1', name: 'Otis Elevator AMC', category: 'Lift & Elevator', contact: 'Rajesh Nair', phone: '+91 98210 11223', sla: '2 Hours 24x7', tickets: 1, status: 'Active' },
    { id: '2', name: 'Kirloskar DG AMC', category: 'Backup Generators', contact: 'Anil Salve', phone: '+91 98330 44556', sla: '4 Hours', tickets: 0, status: 'Active' },
    { id: '3', name: 'AquaFlow Plumbing Care', category: 'Plumbing & Drainage', contact: 'Suresh Kumar', phone: '+91 98190 77889', sla: '1 Hour', tickets: 2, status: 'Active' },
    { id: '4', name: 'SecureForce Security Services', category: 'Manned Security', contact: 'Capt. Deshmukh', phone: '+91 98201 99001', sla: 'Instant', tickets: 0, status: 'Active' }
  ]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim()) return;

    addComplaint({
      id: `CMP-${Date.now().toString().slice(-4)}`,
      category: ticketCategory,
      title: ticketTitle.trim(),
      description: ticketDescription.trim() || 'Logged via Admin Console',
      status: 'open',
      priority: ticketPriority,
      createdAt: 'Today',
      flat: ticketFlat,
      timeline: [
        { status: 'open', timestamp: 'Today', description: 'Ticket created via Admin Console' }
      ]
    });

    showToast(`Ticket '${ticketTitle}' created for Flat ${ticketFlat}!`);
    setTicketTitle('');
    setTicketDescription('');
    setShowNewModal(false);
  };

  const openList = complaints.filter((c) => c.status === 'open');
  const inProgList = complaints.filter((c) => c.status === 'in-progress');
  const resolvedList = complaints.filter((c) => c.status === 'resolved');

  return (
    <div className="admin-section active" id="section-complaints">
      <div className="section-header">
        <div>
          <h2>Helpdesk, Complaints & AMC Vendors</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Maintenance tickets, SLA escalation rules, and annual maintenance contract vendors.
          </p>
        </div>
        <div className="section-actions" id="complaints-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('sla')}>
            + View SLA Tiers
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)}>
            + New Ticket
          </button>
        </div>
      </div>

      {/* Subnav Bar */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'board' ? 'active' : ''}`}
          onClick={() => setActiveTab('board')}
        >
          Complaints Kanban
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'sla' ? 'active' : ''}`}
          onClick={() => setActiveTab('sla')}
        >
          SLA & Escalation Rules
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'vendors' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendors')}
        >
          AMC & Maintenance Vendors
        </button>
      </div>

      {/* TAB 1: Kanban Board */}
      {activeTab === 'board' && (
        <div className="config-panel active" id="cmptab-board">
          <div className="complaints-board">
            {/* Col 1: Open */}
            <div className="complaint-col">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--danger)' }}></span>
                  Open Tickets
                </div>
                <span className="badge badge-danger" id="count-cmp-open">
                  {openList.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {openList.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    No open tickets
                  </div>
                ) : (
                  openList.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <code style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pine)' }}>{c.id}</code>
                        <span className={`badge badge-${c.priority === 'urgent' ? 'danger' : 'warning'}`}>
                          {c.priority.toUpperCase()}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.875rem', marginBottom: '4px', color: 'var(--ink)' }}>{c.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
                        {c.description}
                      </p>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)', marginBottom: '10px' }}>
                        Flat {c.flat || 'A-101'} • {c.createdAt}
                      </div>
                      <button
                        className="btn btn-xs btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => {
                          updateComplaintStatus(c.id, 'in-progress');
                          showToast(`Ticket ${c.id} assigned to technician.`);
                        }}
                      >
                        Assign & Start Progress →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Col 2: In Progress */}
            <div className="complaint-col">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--warning)' }}></span>
                  In Progress / Assigned
                </div>
                <span className="badge badge-warning" id="count-cmp-inprog">
                  {inProgList.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {inProgList.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    No active in-progress tickets
                  </div>
                ) : (
                  inProgList.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <code style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pine)' }}>{c.id}</code>
                        <span className="badge badge-warning">{c.priority.toUpperCase()}</span>
                      </div>
                      <h4 style={{ fontSize: '0.875rem', marginBottom: '4px', color: 'var(--ink)' }}>{c.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
                        {c.description}
                      </p>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)', marginBottom: '10px' }}>
                        Assigned: Suresh Plumber • Flat {c.flat || 'A-101'}
                      </div>
                      <button
                        className="btn btn-xs btn-primary"
                        style={{ width: '100%', background: 'var(--success)', borderColor: 'var(--success)' }}
                        onClick={() => {
                          updateComplaintStatus(c.id, 'resolved');
                          showToast(`Ticket ${c.id} marked as RESOLVED! WhatsApp update dispatched.`);
                        }}
                      >
                        Mark as Resolved
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Col 3: Resolved */}
            <div className="complaint-col">
              <div className="pipeline-col-header">
                <div className="pipeline-col-title">
                  <span className="status-dot" style={{ backgroundColor: 'var(--success)' }}></span>
                  Resolved
                </div>
                <span className="badge badge-success" id="count-cmp-resolved">
                  {resolvedList.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resolvedList.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
                    No resolved tickets yet
                  </div>
                ) : (
                  resolvedList.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: '#fafaf9',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        opacity: 0.9
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <code style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>{c.id}</code>
                        <span className="badge badge-success">RESOLVED</span>
                      </div>
                      <h4 style={{ fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '4px' }}>{c.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>Flat {c.flat || 'A-101'} • Closed</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SLA Rules */}
      {activeTab === 'sla' && (
        <div className="config-panel active" id="cmptab-sla">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Priority Levels & Escalation Deadlines</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Set response and resolution SLAs and configure automated committee escalation paths.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Priority Level</th>
                  <th>Response SLA</th>
                  <th>Resolution SLA</th>
                  <th>Auto-Escalation Window</th>
                  <th>Escalation Recipient</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slaTiers.map((s, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{s.priority}</strong>
                    </td>
                    <td>{s.response}</td>
                    <td>{s.resolution}</td>
                    <td>{s.escalation}</td>
                    <td>{s.recipient}</td>
                    <td>
                      <span className="badge badge-success">{s.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => showToast(`SLA config for ${s.priority} opened.`)}
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

      {/* TAB 3: AMC Vendors */}
      {activeTab === 'vendors' && (
        <div className="config-panel active" id="cmptab-vendors">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Society AMC Contracts & Maintenance Vendors</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Approved contractors for lift, generator, plumbing, security, and pest control.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowVendorModal(true)}>
              + Add AMC Vendor
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Vendor / Contractor</th>
                  <th>Service Category</th>
                  <th>Contact Person</th>
                  <th>Phone / Email</th>
                  <th>SLA Commitment</th>
                  <th>Assigned Open Tickets</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-pine">{v.category}</span>
                    </td>
                    <td>{v.contact}</td>
                    <td>{v.phone}</td>
                    <td>{v.sla}</td>
                    <td>
                      <span className={`badge ${v.tickets > 0 ? 'badge-warning' : 'badge-neutral'}`}>
                        {v.tickets} Tickets
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-success">{v.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => showToast(`Contract terms for ${v.name} loaded.`)}
                      >
                        View Contract
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Ticket */}
      {showNewModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Raise Helpdesk Maintenance Ticket</h3>
              <button className="modal-close-btn" onClick={() => setShowNewModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                    >
                      <option value="Plumbing">Plumbing & Drainage</option>
                      <option value="Electrical">Electrical & Power</option>
                      <option value="Lift / Elevator">Lift / Elevator</option>
                      <option value="Carpentry">Carpentry & Hardware</option>
                      <option value="Security / CCTV">Security / CCTV</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                    >
                      <option value="low">Low (P4)</option>
                      <option value="medium">Medium (P3)</option>
                      <option value="high">High (P2)</option>
                      <option value="urgent">Urgent (P1)</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit / Flat</label>
                    <input
                      type="text"
                      className="form-control"
                      value={ticketFlat}
                      onChange={(e) => setTicketFlat(e.target.value)}
                      placeholder="e.g. A-101"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject / Issue Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={ticketTitle}
                      onChange={(e) => setTicketTitle(e.target.value)}
                      placeholder="e.g. Main pipeline pressure drop"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Details / Notes</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide diagnostic info or exact location..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Dispatch Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Vendor */}
      {showVendorModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Register New AMC Vendor</h3>
              <button className="modal-close-btn" onClick={() => setShowVendorModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Vendor Company Name</label>
                <input type="text" className="form-control" placeholder="e.g. Voltas AC Maintenance" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Service Domain</label>
                  <input type="text" className="form-control" placeholder="e.g. Clubhouse HVAC" />
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Contact Person</label>
                  <input type="text" className="form-control" placeholder="e.g. Rakesh Sharma" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowVendorModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('AMC contractor registered into society vendor roster.');
                  setShowVendorModal(false);
                }}
              >
                Save Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
