'use client';

import React from 'react';
import { useModalStore } from '../../store';
import { IconBell, IconClose } from '../common/Icons';

const mockNotifications = [
  {
    id: 'notif-1',
    title: 'Guest at Gate 1',
    body: 'Rohan Sharma (Guest) is requesting entry for Flat A-101.',
    time: '10 mins ago',
    type: 'visitor',
    read: false
  },
  {
    id: 'notif-2',
    title: 'Society Circular Published',
    body: 'Water tank cleaning scheduled for tomorrow 10:00 AM.',
    time: '2 hours ago',
    type: 'notice',
    read: false
  },
  {
    id: 'notif-3',
    title: 'Maintenance Invoice Generated',
    body: 'September 2026 invoice of ₹4,500 is ready for payment.',
    time: 'Yesterday',
    type: 'payment',
    read: true
  },
  {
    id: 'notif-4',
    title: 'Helpdesk Update',
    body: 'Ticket #CMP-304 updated to in-progress by Security Supervisor.',
    time: '2 days ago',
    type: 'complaint',
    read: true
  }
];

export const NotificationsModal: React.FC = () => {
  const { closeModal } = useModalStore();

  return (
    <div
      className="mobile-modal-overlay"
      id="notifications-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet" style={{ maxHeight: '85vh' }}>
        <div className="sheet-handle"></div>

        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon saffron">
              <IconBell size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Notifications & Alerts</h3>
              <p>Real-time gate and society activity</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mockNotifications.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '10px 12px',
                background: n.read ? '#ffffff' : '#f8fafc',
                borderLeft: n.read ? undefined : '3px solid var(--pine)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}
              >
                <strong style={{ fontSize: '0.8125rem' }}>{n.title}</strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--neutral)' }}>
                  {n.time}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                {n.body}
              </p>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  );
};
