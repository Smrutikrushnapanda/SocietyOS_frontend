'use client';

import React, { useState } from 'react';
import { useNoticeStore, useToastStore } from '../../store';

export const AdminNoticesSection: React.FC = () => {
  const { notices, addNotice, deleteNotice } = useNoticeStore();
  const { showToast } = useToastStore();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'maintenance' | 'event' | 'rule' | 'general'>('maintenance');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('important');

  const handlePostNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addNotice({
      id: `notice-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Notice details broadcasted to all residents.',
      category,
      priority,
      date: 'Today',
      dayShort: 'TODAY',
      broadcastViaWhatsApp: true
    });

    showToast(`Notice '${title}' posted & broadcasted via WhatsApp!`);
    setTitle('');
    setDescription('');
    setShowModal(false);
  };

  const daysOfWeek = [
    { day: 'Mon', date: '25', count: 0 },
    { day: 'Tue', date: '26', count: 1 },
    { day: 'Wed', date: '27', count: 0 },
    { day: 'Thu', date: '28', count: 1 },
    { day: 'Fri', date: '29', count: notices.length, active: true },
    { day: 'Sat', date: '30', count: 1 },
    { day: 'Sun', date: '01', count: 0 }
  ];

  return (
    <div className="admin-section active" id="section-notices">
      <div className="section-header">
        <div>
          <h2>Society Notice Board & Calendar</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Weekly scheduled maintenance drives, AGM circulars, and official notices.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + Post New Notice
        </button>
      </div>

      {/* Week Calendar Strip */}
      <div className="calendar-strip">
        {daysOfWeek.map((d, i) => (
          <div
            key={i}
            className={`calendar-day-card ${d.active ? 'active' : ''}`}
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: d.active ? '2px solid var(--pine)' : '1px solid var(--border-subtle)',
              background: d.active ? 'var(--pine-tint)' : '#ffffff',
              textAlign: 'center',
              flex: 1,
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: d.active ? 'var(--pine-dark)' : 'var(--neutral)' }}>
              {d.day}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: d.active ? 'var(--pine)' : 'var(--ink)', margin: '4px 0' }}>
              {d.date}
            </div>
            <span
              className={`badge ${d.count > 0 ? (d.active ? 'badge-pine' : 'badge-neutral') : ''}`}
              style={{ fontSize: '0.625rem', padding: '2px 6px' }}
            >
              {d.count > 0 ? `${d.count} Events` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Full Notices List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
        {notices.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              border: '1px solid var(--border-subtle)',
              borderLeft: n.priority === 'urgent' ? '4px solid var(--danger)' : n.priority === 'important' ? '4px solid var(--saffron)' : '4px solid var(--pine)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className={`badge ${
                    n.priority === 'urgent' ? 'badge-danger' : n.priority === 'important' ? 'badge-warning' : 'badge-pine'
                  }`}
                >
                  {n.priority?.toUpperCase() || 'GENERAL'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>{n.date}</span>
                {n.broadcastViaWhatsApp && (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                    WhatsApp Sent
                  </span>
                )}
              </div>
              <button
                className="btn btn-xs btn-danger"
                onClick={() => {
                  deleteNotice(n.id);
                  showToast('Notice removed from board.');
                }}
              >
                Delete
              </button>
            </div>

            <h3 style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{n.title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-dark)', lineHeight: 1.5 }}>
              {n.description}
            </p>
          </div>
        ))}
      </div>

      {/* Modal: Post New Notice */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Broadcast New Society Notice</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handlePostNotice}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Notice Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Overhead Tank Cleaning & Water Supply Suspension"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                    >
                      <option value="maintenance">Maintenance Drive</option>
                      <option value="event">Community Event / Festival</option>
                      <option value="rule">Society Rules & Guidelines</option>
                      <option value="general">General Circular</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent Alert</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notice Content</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Write detailed instructions for residents..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  ></textarea>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px' }}>
                  <input type="checkbox" id="chk-wa-broadcast" defaultChecked />
                  <label htmlFor="chk-wa-broadcast" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    Instant WhatsApp Broadcast to all 40 resident phones via Meta Cloud API
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
