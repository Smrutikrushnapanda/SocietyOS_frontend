'use client';

import React from 'react';
import clsx from 'clsx';
import { useSocietyStore, useVisitorStore, useComplaintStore } from '../../store';

export type AdminSectionType =
  | 'overview'
  | 'buildings'
  | 'parking'
  | 'visitors'
  | 'amenities'
  | 'complaints'
  | 'staff'
  | 'finance'
  | 'documents'
  | 'notices'
  | 'reports'
  | 'whatsapp'
  | 'settings';

interface AdminSidebarProps {
  currentSection: AdminSectionType;
  onSectionChange: (sec: AdminSectionType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onSectionChange,
  isOpen,
  onClose
}) => {
  const { society } = useSocietyStore();
  const { visitors } = useVisitorStore();
  const { complaints } = useComplaintStore();

  const activeVisitorsCount = visitors.filter((v) => v.status === 'requested').length;
  const openComplaintsCount = complaints.filter((c) => c.status === 'open').length;

  return (
    <aside className={clsx('admin-sidebar', isOpen ? 'open' : 'closed')}>
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-logo">S</div>
          <div className="brand-text">
            <h1>SocietyOS</h1>
            <span>{society.name}</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-heading">Main Operations</div>

        <a
          className={clsx('sidebar-link', currentSection === 'overview' && 'active')}
          onClick={() => onSectionChange('overview')}
        >
          <svg viewBox="0 0 24 24">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
          <span>Overview</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'buildings' && 'active')}
          onClick={() => onSectionChange('buildings')}
        >
          <svg viewBox="0 0 24 24">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M8 10h.01" />
            <path d="M16 10h.01" />
            <path d="M8 14h.01" />
            <path d="M16 14h.01" />
          </svg>
          <span>Society & Buildings</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'parking' && 'active')}
          onClick={() => onSectionChange('parking')}
        >
          <svg viewBox="0 0 24 24">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
          </svg>
          <span>Vehicles & Parking</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'visitors' && 'active')}
          onClick={() => onSectionChange('visitors')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Security & Access</span>
          {activeVisitorsCount > 0 && (
            <span className="link-badge" id="badge-visitors">
              {activeVisitorsCount}
            </span>
          )}
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'amenities' && 'active')}
          onClick={() => onSectionChange('amenities')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M2 12h20" />
            <path d="M20 12v8H4v-8" />
            <path d="M4 12V4h16v8" />
          </svg>
          <span>Clubhouse & Amenities</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'complaints' && 'active')}
          onClick={() => onSectionChange('complaints')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="12" x2="12" y2="16" />
            <line x1="12" y1="12.01" x2="12" y2="18" />
          </svg>
          <span>Helpdesk & AMC</span>
          {openComplaintsCount > 0 && (
            <span className="link-badge" id="badge-complaints">
              {openComplaintsCount}
            </span>
          )}
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'staff' && 'active')}
          onClick={() => onSectionChange('staff')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>People & Staff</span>
        </a>

        <div className="nav-heading">Finance & Comms</div>

        <a
          className={clsx('sidebar-link', currentSection === 'finance' && 'active')}
          onClick={() => onSectionChange('finance')}
        >
          <svg viewBox="0 0 24 24">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
            <circle cx="12" cy="14" r="2" />
          </svg>
          <span>Finance & Payments</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'documents' && 'active')}
          onClick={() => onSectionChange('documents')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Documents & Vaults</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'notices' && 'active')}
          onClick={() => onSectionChange('notices')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span>Notices & Circulars</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'reports' && 'active')}
          onClick={() => onSectionChange('reports')}
        >
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Reports & Analytics</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'whatsapp' && 'active')}
          onClick={() => onSectionChange('whatsapp')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>WhatsApp API</span>
        </a>

        <a
          className={clsx('sidebar-link', currentSection === 'settings' && 'active')}
          onClick={() => onSectionChange('settings')}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Master Settings</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <div className="user-name">Anand Deshmukh</div>
            <div className="user-role">RWA Secretary</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
