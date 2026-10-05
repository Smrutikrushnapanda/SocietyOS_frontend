'use client';

import React, { useState, useEffect } from 'react';
import { PhoneHeader } from './layout/PhoneHeader';
import { BottomNav, TabType } from './layout/BottomNav';
import { HeroBanner } from './home/HeroBanner';
import { DuesDonutCard } from './home/DuesDonutCard';
import { QuickActionsGrid } from './home/QuickActionsGrid';
import { AmenitiesSpotlight } from './home/AmenitiesSpotlight';
import { WhatsAppBanner } from './home/WhatsAppBanner';
import { GateApprovalsPreview } from './home/GateApprovalsPreview';
import { CircularsPreview } from './home/CircularsPreview';
import { PipelineFilter } from './visitors/PipelineFilter';
import { VisitorsList } from './visitors/VisitorsList';
import { ComplaintsList } from './complaints/ComplaintsList';
import { DuesSummaryCard } from './payments/DuesSummaryCard';
import { InvoiceBreakdown } from './payments/InvoiceBreakdown';
import { WhatsAppBillingToggle } from './payments/WhatsAppBillingToggle';
import { NoticesList } from './notices/NoticesList';
import { useModalStore } from '../store';
import { Badge } from './common/Badge';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface ResidentPortalAppProps {
  initialTab?: TabType;
}

export const ResidentPortalApp: React.FC<ResidentPortalAppProps> = ({
  initialTab = 'home'
}) => {
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);
  const { openModal } = useModalStore();

  // Push notification registration.
  // Triggered once on mount when the resident enters the authenticated portal.
  // - "default": request permission (browser prompt shown once per origin).
  // - "granted": skip prompt and go straight to FCM token acquisition.
  // - "denied": stop silently — do not re-prompt.
  // authToken is null in mock-auth mode; registerFCMToken gracefully skips
  // the backend POST /push-tokens and only logs the acquired token locally.
  const { requestPermission, status: pushStatus } = usePushNotifications();

  useEffect(() => {
    // Guard: browser APIs only (no SSR).
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const permission = Notification.permission;

    // Do not prompt if the user has already explicitly denied permission.
    if (permission === 'denied') return;

    // Do not re-run if already registered or mid-flight.
    if (pushStatus === 'registered' || pushStatus === 'requesting') return;

    // "granted" → proceed directly to FCM token acquisition.
    // "default" → show the browser permission prompt once.
    requestPermission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount; requestPermission is stable (useCallback).

  const getHeaderTitle = () => {
    switch (currentTab) {
      case 'home':
        return 'Namaste, Aarav';
      case 'visitors':
        return 'Visitor Passes';
      case 'complaints':
        return 'Facility Helpdesk';
      case 'payments':
        return 'Society Dues & UPI';
      case 'notices':
        return 'Circulars & Notices';
      default:
        return 'Namaste, Aarav';
    }
  };

  return (
    <>
      <PhoneHeader title={getHeaderTitle()} />

      <main className="phone-body">
        {/* 1. HOME SCREEN */}
        {currentTab === 'home' && (
          <div className="society-screen" id="screen-home">
            <HeroBanner />
            <DuesDonutCard />
            <QuickActionsGrid onNavigateTab={setCurrentTab} />

            {/* Flat Document Vault Quick Card */}
            <div
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                marginBottom: '12px',
                background: 'linear-gradient(135deg, rgba(46, 117, 89, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%)',
                border: '1.5px solid rgba(46, 117, 89, 0.25)',
                cursor: 'pointer'
              }}
              onClick={() => openModal('residentDocuments')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--pine)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--pine-dark)', display: 'block' }}>
                    Flat A-101 Vault &amp; Documents
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                    Possession deed, renovation NOC &amp; bylaws
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ padding: '6px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              >
                View Vault
              </button>
            </div>

            <AmenitiesSpotlight />
            <WhatsAppBanner />
            <GateApprovalsPreview onViewAll={() => setCurrentTab('visitors')} />
            <CircularsPreview onViewAll={() => setCurrentTab('notices')} />
          </div>
        )}

        {/* 2. VISITORS SCREEN */}
        {currentTab === 'visitors' && (
          <div className="society-screen" id="screen-visitors">
            <div
              className="resident-hero-card"
              style={{ height: '130px', marginBottom: '12px' }}
            >
              <img
                src="/assets/resident_guest_pass_3d.jpg"
                alt="Guest Pass Scanner"
                className="resident-hero-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/shared/assets/resident_guest_pass_3d.jpg';
                }}
              />
              <div className="resident-hero-overlay"></div>
              <div className="resident-hero-content">
                <div className="resident-hero-title">
                  <h4>Smart Gate Passes</h4>
                  <p>QR Passes & FastTag Approvals</p>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => openModal('preApproveGuest')}
                >
                  + Pass
                </button>
              </div>
            </div>

            <PipelineFilter />
            <VisitorsList />
          </div>
        )}

        {/* 3. COMPLAINTS SCREEN */}
        {currentTab === 'complaints' && (
          <div className="society-screen" id="screen-complaints">
            <div
              className="resident-hero-card"
              style={{ height: '130px', marginBottom: '12px' }}
            >
              <img
                src="/assets/resident_services_3d.jpg"
                alt="Facility Helpdesk"
                className="resident-hero-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/shared/assets/resident_services_3d.jpg';
                }}
              />
              <div className="resident-hero-overlay"></div>
              <div className="resident-hero-content">
                <div className="resident-hero-title">
                  <h4>Facility Helpdesk</h4>
                  <p>Plumbers, Electricians & AMCs</p>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => openModal('raiseComplaint')}
                >
                  + Ticket
                </button>
              </div>
            </div>

            <ComplaintsList />
          </div>
        )}

        {/* 4. PAYMENTS SCREEN */}
        {currentTab === 'payments' && (
          <div className="society-screen" id="screen-payments">
            <div
              className="resident-hero-card"
              style={{ height: '130px', marginBottom: '12px' }}
            >
              <img
                src="/assets/finance_vault_3d.jpg"
                alt="Financial Vault"
                className="resident-hero-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/shared/assets/finance_vault_3d.jpg';
                }}
              />
              <div className="resident-hero-overlay"></div>
              <div className="resident-hero-content">
                <div className="resident-hero-title">
                  <h4>Maintenance Ledger</h4>
                  <p>Instant UPI & e-Receipts</p>
                </div>
                <Badge variant="success">Verified Account</Badge>
              </div>
            </div>

            <DuesSummaryCard />
            <InvoiceBreakdown />
            <WhatsAppBillingToggle />
          </div>
        )}

        {/* 5. NOTICES SCREEN */}
        {currentTab === 'notices' && (
          <div className="society-screen" id="screen-notices">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
              Official Society Circulars
            </h3>
            <NoticesList />
          </div>
        )}
      </main>

      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
    </>
  );
};
