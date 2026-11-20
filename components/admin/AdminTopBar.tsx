'use client';

import { authenticatedAdminName } from '../../lib/display';
import React, { useEffect } from 'react';
import { AdminSectionType } from './AdminSidebar';

interface AdminTopBarProps {
  currentSection: AdminSectionType;
  onToggleSidebar: () => void;
  sidebarExpanded: boolean;
}

const sectionTitles: Record<AdminSectionType, { title: string; subtitle: string }> = {
  overview: {
    title: 'Dashboard Overview',
    subtitle: 'Real-time society health, gate activity & alerts'
  },
  residents: {
    title: 'Residents & App Access',
    subtitle: 'Manage resident profiles, documents, and mobile application access.'
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
  audit: {
    title: 'System Audit Logs',
    subtitle: 'Tamper-evident, append-only security logs & change history'
  },
  whatsapp: {
    title: 'WhatsApp Business API',
    subtitle: 'Automated 1-click approvals, payment links & SMS fallbacks'
  },
  role_master: {
    title: 'Role Master & Admin Users',
    subtitle: 'Manage role master entries, permissions and admin user accounts'
  },
  settings: {
    title: 'Master Settings',
    subtitle: 'Society profile, emergency directory, billing & branding'
  },
  organizations: {
    title: 'Organization Management',
    subtitle: 'Manage all client societies, lifecycle & SOCIETY_ADMIN provisioning'
  }
};

import { useAuthStore, useToastStore, useSocietyStore } from '../../store';
import { useRouter } from 'next/navigation';
import { logoutCurrentSession } from '../../lib/auth/logout-session';

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  currentSection,
  onToggleSidebar,
  sidebarExpanded
}) => {
  const meta = sectionTitles[currentSection] || sectionTitles.overview;
  const { backendUser, roles, organizationId, availableOrganizations, setOrganizationId } = useAuthStore();
  const { society } = useSocietyStore();
  const { showToast } = useToastStore();
  const router = useRouter();

  const handleLogout = async () => {
    const confirmed = await logoutCurrentSession();
    if (confirmed) showToast('Logged out of Admin Console');
    if (!useAuthStore.getState().isAuthenticated) router.push('/admin/login');
  };

  useEffect(() => {
    if (!organizationId && availableOrganizations.length > 0) {
      setOrganizationId(availableOrganizations[0].id);
    }
  }, [organizationId, availableOrganizations, setOrganizationId]);

  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const adminName = authenticatedAdminName(backendUser);
  const adminBadge = isSuperAdmin ? 'Super Admin' : 'Estate Manager';
  const adminInitials =
    adminName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('') || 'SA';

  const societyName = society?.name || availableOrganizations.find(org => org.id === organizationId)?.name || 'Society';

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <button
          className="sidebar-toggle-btn"
          id="sidebarToggle"
          aria-label={sidebarExpanded ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={sidebarExpanded}
          aria-controls="admin-navigation"
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
        {/* Highlighted Society Name Pill */}
        <div
          className="society-highlight-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            background: 'linear-gradient(135deg, #0a2540 0%, #0f4c81 60%, #0284c7 100%)',
            color: '#ffffff',
            borderRadius: 'var(--radius-full)',
            fontWeight: 700,
            fontSize: '0.8125rem',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            letterSpacing: '-0.01em',
          }}
          title={`Active Society: ${societyName}`}
        >
          <span style={{ fontSize: '0.9rem' }}>🏢</span>
          <span>{societyName}</span>
        </div>

        {/* Live System Status */}
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

