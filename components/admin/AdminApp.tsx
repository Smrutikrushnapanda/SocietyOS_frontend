'use client';

import React, { useState } from 'react';
import { AdminSidebar, AdminSectionType } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { AdminOverviewSection } from './AdminOverviewSection';
import { AdminBuildingsSection } from './AdminBuildingsSection';
import { AdminParkingSection } from './AdminParkingSection';
import { AdminVisitorsSection } from './AdminVisitorsSection';
import { AdminAmenitiesSection } from './AdminAmenitiesSection';
import { AdminComplaintsSection } from './AdminComplaintsSection';
import { AdminStaffSection } from './AdminStaffSection';
import { AdminFinanceSection } from './AdminFinanceSection';
import { AdminDocumentsSection } from './AdminDocumentsSection';
import { AdminNoticesSection } from './AdminNoticesSection';
import { AdminReportsSection } from './AdminReportsSection';
import { AdminWhatsappSection } from './AdminWhatsappSection';
import { AdminSettingsSection } from './AdminSettingsSection';
import { useToastStore } from '../../store';

export const AdminApp: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AdminSectionType>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { message, visible } = useToastStore();

  return (
    <div className="admin-body">
      <div className="admin-layout">
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
          onSectionChange={(sec) => setCurrentSection(sec)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="admin-main">
          <AdminTopBar
            currentSection={currentSection}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />

          <div className="admin-content" id="adminContent">
            {currentSection === 'overview' && (
              <AdminOverviewSection onNavigate={setCurrentSection} />
            )}
            {currentSection === 'buildings' && <AdminBuildingsSection />}
            {currentSection === 'parking' && <AdminParkingSection />}
            {currentSection === 'visitors' && <AdminVisitorsSection />}
            {currentSection === 'amenities' && <AdminAmenitiesSection />}
            {currentSection === 'complaints' && <AdminComplaintsSection />}
            {currentSection === 'staff' && <AdminStaffSection />}
            {currentSection === 'finance' && <AdminFinanceSection />}
            {currentSection === 'documents' && <AdminDocumentsSection />}
            {currentSection === 'notices' && <AdminNoticesSection />}
            {currentSection === 'reports' && <AdminReportsSection />}
            {currentSection === 'whatsapp' && <AdminWhatsappSection />}
            {currentSection === 'settings' && <AdminSettingsSection />}
          </div>
        </main>
      </div>

      {/* Global Toast Notification */}
      {visible && message && (
        <div
          className="toast show"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: 'var(--pine-dark)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <span>{message}</span>
        </div>
      )}
    </div>
  );
};
