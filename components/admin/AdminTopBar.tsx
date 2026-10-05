'use client';

import React from 'react';
import { AdminSectionType } from './AdminSidebar';

interface AdminTopBarProps {
  currentSection: AdminSectionType;
  onToggleSidebar: () => void;
}

const sectionTitles: Record<AdminSectionType, { title: string; subtitle: string }> = {
  overview: {
    title: 'Dashboard Overview',
    subtitle: 'Real-time society health, gate activity & alerts'
  },
  buildings: {
    title: 'Society & Buildings',
    subtitle: 'Manage towers, unit occupancy, tenants & floor maps'
  },
  parking: {
    title: 'Vehicles & Parking',
    subtitle: 'Live bay allocation, EV charging zones & vehicle tags'
  },
  visitors: {
    title: 'Security & Access',
    subtitle: 'Visitor verification pipeline & resident fastpasses'
  },
  amenities: {
    title: 'Clubhouse & Amenities',
    subtitle: 'Facility slots, banquet bookings & access passes'
  },
  complaints: {
    title: 'Helpdesk & AMC',
    subtitle: 'Kanban ticket pipeline, vendor SLAs & resident feedback'
  },
  staff: {
    title: 'People & Staff',
    subtitle: 'Security guards, technicians, KYC & emergency roster'
  },
  finance: {
    title: 'Finance & Payments',
    subtitle: 'Maintenance dues, itemized invoices & ledger ledger'
  },
  documents: {
    title: 'Documents & Flat Vaults',
    subtitle: 'Manage society compliance repository & assign private flat documents'
  },
  notices: {
    title: 'Notices & Circulars',
    subtitle: 'Broadcast society updates, AGM dates & PDF circulars'
  },
  reports: {
    title: 'Reports & Analytics',
    subtitle: 'Visitor footfall, complaint resolution & collection rates'
  },
  whatsapp: {
    title: 'WhatsApp Business API',
    subtitle: 'Automated 1-click approvals, payment links & SMS fallbacks'
  },
  settings: {
    title: 'Master Settings',
    subtitle: 'Society profile, billing rules, penalty tariffs & RBAC'
  }
};

import { useAuthStore, useToastStore } from '../../store';
import { useRouter } from 'next/navigation';

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  currentSection,
  onToggleSidebar
}) => {
  const meta = sectionTitles[currentSection] || sectionTitles.overview;
  const { user, logout } = useAuthStore();
  const { showToast } = useToastStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    showToast('Logged out of Admin Console');
    router.push('/admin/login');
  };

  const adminName = user?.name || 'Kailash Malhotra';
  const adminBadge = user?.designation || 'Estate Manager';
  const adminInitials = user?.avatarInitials || 'KM';

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <button
          className="sidebar-toggle-btn"
          id="sidebarToggle"
          aria-label="Toggle Navigation"
          onClick={onToggleSidebar}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="page-breadcrumb">
          <h2 className="page-breadcrumb-title" id="pageTitle">
            {meta.title}
          </h2>
          <span className="page-breadcrumb-sub" id="pageSubtitle">
            {meta.subtitle}
          </span>
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Actions & Status */}
        <div className="society-status-badge">
          <span className="live-indicator-dot"></span>
          <span>System Live</span>
        </div>

        {/* Current Admin User Account Dropdown / Logout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px 4px 4px'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--pine), var(--pine-dark))',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {adminInitials}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)' }}>
              {adminName}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
              {adminBadge}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ padding: '3px 8px', fontSize: '0.6875rem', marginLeft: '4px' }}
            onClick={handleLogout}
            title="Log out from Admin Console"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
};

