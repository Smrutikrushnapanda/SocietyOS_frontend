'use client';

import { useSocietySettingsStore } from '../../store/useSocietySettingsStore';
import { SocietySettingsBootstrap } from '../common/SocietySettings';
import { VisitorLiveStatus } from '../visitors/VisitorLiveStatus';
import { AdminLoadingProvider } from '../common/AdminLoading';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar, AdminSectionType } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { AdminOverviewSection } from './AdminOverviewSection';
import { AdminBuildingsSection } from './AdminBuildingsSection';
import { AdminResidentsSection } from './AdminResidentsSection';
import { AdminParkingSection } from './AdminParkingSection';
import { AdminVisitorsSection } from './AdminVisitorsSection';
import { AdminAmenitiesSection } from './AdminAmenitiesSection';
import { AdminComplaintsSection } from './AdminComplaintsSection';
import { AdminStaffSection } from './AdminStaffSection';
import { AdminFinanceSection } from './AdminFinanceSection';
import { AdminDocumentsSection } from './AdminDocumentsSection';
import { AdminNoticesSection } from './AdminNoticesSection';
import { AdminReportsSection } from './AdminReportsSection';
import { AdminAuditSection } from './AdminAuditSection';
import { AdminWhatsappSection } from './AdminWhatsappSection';
import { AdminRoleMasterSection } from './AdminRoleMasterSection';
import { AdminSettingsSection } from './AdminSettingsSection';
import { AdminOrganizationsSection } from './AdminOrganizationsSection';
import {
  useAuthStore,
} from '../../store';
import { getAuthMe } from '../../lib/api/auth.api';
import { adminSectionHref, isAdminSection } from '../../lib/api/admin-sections';

/** Query param used to carry the active section in the URL across reloads. */
const SECTION_QUERY_PARAM = 'section';

/** Read the section persisted in the URL (?section=overview&…), if valid. */
function readStoredSection(): AdminSectionType | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get(
    SECTION_QUERY_PARAM,
  );
  return isAdminSection(value) ? value : null;
}

export const AdminApp: React.FC<{ initialSection?: AdminSectionType }> = ({ initialSection = 'overview' }) => {
  const router = useRouter();
  const [currentSection, setCurrentSectionState] =
    useState<AdminSectionType>(initialSection);
  const organizationId = useAuthStore(state => state.organizationId);
  const authenticatedUserId = useAuthStore(state => state.backendUser?.id);
  const accent = useSocietySettingsStore(state => state.data?.branding.accent ?? 'forest');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [settingsOpened, setSettingsOpened] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Retain settings after the URL or sidebar opens it.
    if (currentSection === 'settings') setSettingsOpened(true);
  }, [currentSection]);

  // Change section AND persist it in the URL (?section=…) so a page reload
  // lands back on the same section instead of always the index/overview.
  const setCurrentSection = useCallback((sec: AdminSectionType) => {
    if (window.matchMedia('(max-width: 900px)').matches) setIsSidebarOpen(false);
    if (sec === 'residents' || initialSection === 'residents') {
      router.push(adminSectionHref(sec));
      return;
    }
    setCurrentSectionState(sec);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set(SECTION_QUERY_PARAM, sec);
      window.history.replaceState(null, '', url.toString());
    }
  }, [initialSection, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Match browser viewport after hydration.
    if (window.matchMedia('(max-width: 900px)').matches) setIsSidebarOpen(false);
  }, []);

  // Restore the section carried in the URL after hydration. Runs once, after
  // mount, so there is no server/client hydration mismatch. Invalid sections
  // and the SUPER_ADMIN-only platform section for non-super-admins fall back
  // to the overview.
  useEffect(() => {
    if (initialSection === 'residents') return;
    const stored = readStoredSection();
    if (!stored) return;
    if (stored === 'residents') {
      router.replace(adminSectionHref(stored));
      return;
    }
    const { roles } = useAuthStore.getState();
    if (stored === 'organizations' && !roles.includes('SUPER_ADMIN')) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore section from browser URL after hydration.
    setCurrentSectionState(stored);
  }, [initialSection, router]);

  useEffect(() => {
    const refreshProfile = async () => {
      const before = useAuthStore.getState();
      if (!before.accessToken) return;
      try {
        const context = await getAuthMe();
        const current = useAuthStore.getState();
        if (current.isAuthenticated && (current.backendUser?.id ?? current.user?.id) === (before.backendUser?.id ?? before.user?.id)) current.setAuthContext(context);
      } catch { /* API client handles expired sessions. */ }
    };
    void refreshProfile();
    window.addEventListener('focus', refreshProfile);
    return () => window.removeEventListener('focus', refreshProfile);
  }, []);

  return (
    <div className="admin-body">
      <div className="admin-layout" data-society-accent={accent} style={{ '--admin-sidebar-width': isSidebarOpen ? '248px' : '76px' } as React.CSSProperties}>
        {/* Sidebar Backdrop on Mobile */}
        {isSidebarOpen && (
          <div
            className="admin-sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <AdminSidebar
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="admin-main">
          <SocietySettingsBootstrap />
          <VisitorLiveStatus />
          <AdminTopBar
            currentSection={currentSection}
            sidebarExpanded={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />

          <div className="admin-content" id="adminContent">
            <AdminLoadingProvider key={`section-${currentSection}-${organizationId}-${authenticatedUserId}`}>
            {currentSection === 'overview' && (
              <AdminOverviewSection onNavigate={setCurrentSection} />
            )}
            {currentSection === 'buildings' && <AdminBuildingsSection />}
            {currentSection === 'residents' && <AdminResidentsSection />}
            {currentSection === 'parking' && <AdminParkingSection />}
            {currentSection === 'visitors' && <AdminVisitorsSection />}
            {currentSection === 'amenities' && <AdminAmenitiesSection />}
            {currentSection === 'complaints' && <AdminComplaintsSection />}
            {currentSection === 'staff' && <AdminStaffSection />}
            {currentSection === 'finance' && <AdminFinanceSection />}
            {currentSection === 'documents' && <AdminDocumentsSection />}
            {currentSection === 'notices' && <AdminNoticesSection />}
            {currentSection === 'reports' && <AdminReportsSection />}
            {currentSection === 'audit' && <AdminAuditSection />}
            {currentSection === 'whatsapp' && <AdminWhatsappSection />}
            {currentSection === 'role_master' && <AdminRoleMasterSection />}
            {currentSection === 'organizations' && <AdminOrganizationsSection />}
            </AdminLoadingProvider>
            {(settingsOpened || currentSection === 'settings') && <div hidden={currentSection !== 'settings'} key={`settings-${organizationId}-${authenticatedUserId}`}><AdminSettingsSection /></div>}
          </div>
        </main>
      </div>

    </div>
  );
};
