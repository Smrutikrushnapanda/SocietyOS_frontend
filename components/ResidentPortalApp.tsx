'use client';

import { SocietySettingsBootstrap } from './common/SocietySettings';
import { VisitorLiveStatus } from './visitors/VisitorLiveStatus';
import React, { useState, useEffect, useCallback } from 'react';
import { EmergencyNoticeAlert } from './notices/EmergencyNoticeAlert';
import { SocietySmartIsland } from './SocietySmartIsland';
import { PhoneHeader } from './layout/PhoneHeader';
import { BottomNav, TabType } from './layout/BottomNav';
import { HeroBanner } from './home/HeroBanner';
import { DuesDonutCard } from './home/DuesDonutCard';
import { QuickActionsGrid } from './home/QuickActionsGrid';
import { AmenitiesSpotlight } from './home/AmenitiesSpotlight';
import { AmenityBookingsList } from './amenities/AmenityBookingsList';
import { GateApprovalsPreview } from './home/GateApprovalsPreview';
import { CircularsPreview } from './home/CircularsPreview';
import { PipelineFilter } from './visitors/PipelineFilter';
import { VisitorsList } from './visitors/VisitorsList';
import { ComplaintsList } from './complaints/ComplaintsList';
import { DuesSummaryCard } from './payments/DuesSummaryCard';
import { InvoiceBreakdown } from './payments/InvoiceBreakdown';
import { PaymentHistoryCard } from './payments/PaymentHistoryCard';
import { WhatsAppBillingToggle } from './payments/WhatsAppBillingToggle';
import { NoticesList } from './notices/NoticesList';
import { PollsList } from './polls/PollsList';
import {
  useModalStore,
  useResidentStore,
  useAuthStore,
  usePaymentStore,
  useComplaintStore,
  useNoticeStore,
  useVisitorStore,
} from '../store';
import { Badge } from './common/Badge';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useResidentPushMessages } from '../hooks/useResidentPushMessages';
import type { PushDestination } from '../lib/firebase/resident-push';
import { usePollStore } from '../store/usePollStore';
import { getAuthenticatedResidentProfile } from '../lib/api/resident.api';
import { ApiError } from '../lib/api/client';
import { greetingFor } from '../lib/display';
import apiClient from '../lib/api/client';
import { refreshResidentFeeds, RESIDENT_COMPLAINT_CREATED } from '../lib/resident-refresh';
import { useSocietySettingsStore } from '../store/useSocietySettingsStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAmenityStore } from '../store/useAmenityStore';
import { getPollById } from '../lib/api/polls.api';
import { useToastStore } from '../store/useToastStore';

interface ResidentPortalAppProps {
  initialTab?: TabType;
}

export const ResidentPortalApp: React.FC<ResidentPortalAppProps> = ({
  initialTab = 'home'
}) => {
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);
  const [currentTemperature, setCurrentTemperature] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);
  const [noticeSubTab, setNoticeSubTab] = useState<'notices' | 'polls'>('notices');
  const { openModal } = useModalStore();
  const { organizationId, isAuthenticated, roles } = useAuthStore();
  useEffect(() => {
    const created = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; organizationId: string; userId: string }>).detail;
      if (!detail?.id || detail.organizationId !== organizationId || detail.userId !== useAuthStore.getState().backendUser?.id) return;
      setSelectedRequest(detail.id);
      setCurrentTab('complaints');
    };
    window.addEventListener(RESIDENT_COMPLAINT_CREATED, created);
    return () => window.removeEventListener(RESIDENT_COMPLAINT_CREATED, created);
  }, [organizationId]);
  const openPushDestination = useCallback((destination: PushDestination) => {
    if (destination.screen === 'amenities') { openModal('amenitiesBooking'); return; }
    if (destination.screen === 'polls') { setCurrentTab('notices'); setNoticeSubTab('polls'); return; }
    setCurrentTab(destination.screen);
    if (destination.screen === 'notices') { setNoticeSubTab('notices'); setSelectedNotice(destination.referenceId); }
    if (destination.screen === 'complaints') setSelectedRequest(destination.referenceId);
    if (destination.screen === 'visitors') setSelectedVisitor(destination.referenceId);
  }, [openModal]);
  useResidentPushMessages(openPushDestination);
  const userId = useAuthStore(state => state.backendUser?.id);
  useEffect(() => {
    let active = true;
    const openPoll = (event: Event) => {
      const id = (event as CustomEvent<{ pollId?: string }>).detail?.pollId;
      if (!id) return;
      void getPollById(id).then(poll => {
        if (!active || useAuthStore.getState().organizationId !== organizationId || useAuthStore.getState().backendUser?.id !== userId) return;
        if (!poll || !['PUBLISHED', 'CLOSED'].includes(poll.status)) { useToastStore.getState().showToast('This poll is no longer available.', 'info'); return; }
        useModalStore.getState().closeModal(); setCurrentTab('notices'); setNoticeSubTab('polls');
      }).catch(() => { if (active) useToastStore.getState().showToast('Unable to open this poll. Try again.', 'error'); });
    };
    window.addEventListener('resident:open-poll', openPoll);
    return () => { active = false; window.removeEventListener('resident:open-poll', openPoll); };
  }, [organizationId, userId]);
  const permissions = useAuthStore(state => state.permissions);
  const { polls, hasLoaded: pollsLoaded, loadPolls } = usePollStore();
  const [dismissedPollIds, setDismissedPollIds] = useState<string[]>([]);
  const {
    resident,
    profile,
    isLoading,
    error,
    setProfile,
    setLoading,
    setError,
  } = useResidentStore();
  const { loadResidentDues, loadResidentPayments } = usePaymentStore();
  const { loadResidentComplaints } = useComplaintStore();
  const { loadNotices } = useNoticeStore();
  const pollStorageKey = organizationId && userId
    ? `societyos_seen_polls:${organizationId}:${userId}`
    : null;

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const loadWeather = async (latitude?: number, longitude?: number) => {
      try {
        const response = await apiClient.get<{ temperature: number }>('/weather/current', {
          params: latitude == null || longitude == null ? undefined : { latitude, longitude },
        });
        if (active) setCurrentTemperature(response.data.temperature);
      } catch { /* Weather is an optional home detail. */ }
    };
    let resolved = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    const fetchFallback = () => {
      if (!resolved && active) {
        resolved = true;
        void loadWeather();
      }
    };
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      fallbackTimer = setTimeout(fetchFallback, 1200);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!active) return;
          if (fallbackTimer) clearTimeout(fallbackTimer);
          resolved = true;
          void loadWeather(coords.latitude, coords.longitude);
        },
        () => {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          fetchFallback();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    } else {
      fetchFallback();
    }
    return () => {
      active = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [isAuthenticated, organizationId, userId]);

  const storedSeenPollIds = (() : string[] | null => {
    if (!pollStorageKey) return null;
    try {
      const saved = window.localStorage.getItem(pollStorageKey);
      if (saved === null) return null;
      const parsed: unknown = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.every(id => typeof id === 'string') ? parsed : [];
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!organizationId || !userId || !permissions.includes('poll:read')) return;
    let busy = false;
    const refreshPolls = () => {
      if (busy || document.hidden || !navigator.onLine) return;
      busy = true; void loadPolls().finally(() => { busy = false; });
    };
    refreshPolls();
    const timer = window.setInterval(refreshPolls, 60000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshPolls();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [organizationId, userId, permissions, loadPolls]);

  const seenPollIds = Array.from(new Set([
    ...(storedSeenPollIds ?? (pollsLoaded ? polls.filter(poll => poll.status === 'PUBLISHED').map(poll => poll.id) : [])),
    ...dismissedPollIds,
  ]));
  const hasNewPoll = pollsLoaded && polls.some(poll => poll.status === 'PUBLISHED' && !seenPollIds.includes(poll.id));
  const markPollsSeen = useCallback(() => {
    const publishedIds = polls.filter(poll => poll.status === 'PUBLISHED').map(poll => poll.id);
    const nextSeen = Array.from(new Set([...seenPollIds, ...publishedIds]));
    setDismissedPollIds(nextSeen);
    if (pollStorageKey) {
      try { window.localStorage.setItem(pollStorageKey, JSON.stringify(nextSeen)); } catch { /* storage may be unavailable */ }
    }
  }, [pollStorageKey, polls, seenPollIds]);

  useEffect(() => {
    if (!pollStorageKey || !pollsLoaded) return;
    try {
      if (window.localStorage.getItem(pollStorageKey) === null) {
        const existingPollIds = polls.filter(poll => poll.status === 'PUBLISHED').map(poll => poll.id);
        window.localStorage.setItem(pollStorageKey, JSON.stringify(existingPollIds));
      }
    } catch {
      // Keep first-load polls visible as new when browser storage is unavailable.
    }
  }, [pollStorageKey, polls, pollsLoaded]);

  const openNoticesTab = useCallback((tab: TabType) => {
    if (tab === 'notices' && hasNewPoll) {
      markPollsSeen();
      setNoticeSubTab('polls');
    }
    setCurrentTab(tab);
  }, [hasNewPoll, markPollsSeen]);

  const loadResidentProfile = useCallback(async () => {
    if (!organizationId) {
      setError('No organization selected. Please select an organization.');
      return;
    }

    setLoading(true);
    setError(null);
    const scope = useAuthStore.getState();
    const current = () => {
      const state = useAuthStore.getState();
      return state.organizationId === scope.organizationId && state.backendUser?.id === scope.backendUser?.id && state.isAuthenticated;
    };

    try {
      const data = await getAuthenticatedResidentProfile();
      if (current()) setProfile(data);
    } catch (err: unknown) {
      if (!current()) return;
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Resident profile not found for this organization.');
        } else if (err.status === 403) {
          setError('Access forbidden. You do not have permission to view this resident profile.');
        } else {
          setError(err.backendMessage || 'Failed to load resident profile.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Network error: Unable to load resident profile.');
      }
    } finally {
      if (current()) setLoading(false);
    }
  }, [organizationId, setProfile, setLoading, setError]);

  useEffect(() => {
    if (organizationId) {
      void loadResidentProfile();
      void loadResidentDues();
      void loadResidentComplaints();
    }
  }, [
    organizationId,
    loadResidentProfile,
    loadResidentDues,
    loadResidentComplaints,
  ]);

  useEffect(() => {
    if (!organizationId || !permissions.includes('notice:read')) return;
    let busy = false;
    const refresh = () => {
      if (busy || document.hidden || !navigator.onLine) return;
      busy = true; void loadNotices().finally(() => { busy = false; });
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh); window.addEventListener('societyos:notices-changed', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('societyos:notices-changed', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [organizationId, permissions, loadNotices]);

  useEffect(() => {
    let pending: Promise<void> | null = null;
    const refresh = (event: Event) => {
      const completion = (event as CustomEvent<{ resolve: () => void; reject: (reason: Error) => void }>).detail;
      if (!pending) {
        pending = (async () => {
          const feeds = refreshResidentFeeds();
          const jobs: Promise<unknown>[] = [
            ...feeds,
            useSocietySettingsStore.getState().load(),
            useNotificationStore.getState().fetchUnreadCount(),
          ];
          if (currentTab === 'home') jobs.push(loadResidentProfile(), useVisitorStore.getState().loadMyVisits(), loadResidentDues(), loadResidentPayments(), useAmenityStore.getState().loadAmenities());
          if (currentTab === 'visitors' && !feeds.length) jobs.push(useVisitorStore.getState().loadMyVisits());
          if (currentTab === 'home' || (currentTab === 'complaints' && !feeds.length)) jobs.push(loadResidentComplaints());
          if (currentTab === 'home' || (currentTab === 'notices' && !feeds.length)) jobs.push(loadNotices(), loadPolls());
          if (currentTab === 'payments') {
            jobs.push(loadResidentDues());
            if (!feeds.length) jobs.push(loadResidentPayments());
          }
          const results = await Promise.allSettled(jobs);
          if (results.some(result => result.status === 'rejected') ||
              (currentTab === 'home' && useResidentStore.getState().error) ||
              (currentTab === 'notices' && !feeds.length && useNoticeStore.getState().error) ||
              (currentTab === 'complaints' && !feeds.length && useComplaintStore.getState().error) ||
              (currentTab === 'payments' && usePaymentStore.getState().residentError) ||
              (currentTab === 'visitors' && !feeds.length && useVisitorStore.getState().error)) {
            throw new Error('Some updates could not be refreshed. Your last loaded content remains available.');
          }
        })().finally(() => { pending = null; });
      }
      void pending.then(completion.resolve, completion.reject);
    };
    window.addEventListener('resident:refresh-request', refresh);
    return () => window.removeEventListener('resident:refresh-request', refresh);
  }, [currentTab, loadResidentProfile, loadResidentComplaints, loadNotices, loadPolls, loadResidentDues, loadResidentPayments]);

  // Push notification registration.
  // Triggered once on mount when the resident enters the authenticated portal.
  const { requestPermission, status: pushStatus } = usePushNotifications();

  useEffect(() => {
    // Guard: browser APIs only (no SSR).
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const permission = Notification.permission;
    if (permission === 'denied') return;
    if (pushStatus === 'registered' || pushStatus === 'requesting') return;

    requestPermission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHeaderTitle = () => {
    switch (currentTab) {
      case 'home':
        return greetingFor(resident?.name);
      case 'visitors':
        return 'Visitor Passes';
      case 'complaints':
        return 'Facility Helpdesk';
      case 'amenity-bookings':
        return 'My Amenity Bookings';
      case 'payments':
        return 'Society Dues & UPI';
      case 'notices':
        return 'Circulars & Notices';
      default:
        return greetingFor(resident?.name);
    }
  };

  const flatTitle = resident?.flat && resident.flat !== 'No flat'
    ? `Flat ${resident.flat} Vault & Documents`
    : 'Document Vault';

  return (
    <>
      <PhoneHeader title={getHeaderTitle()} managedUpdates />
      <EmergencyNoticeAlert key={`${organizationId}:${userId}`} />
      <SocietySettingsBootstrap />
          <VisitorLiveStatus />
      <SocietySmartIsland
        onOpenVisitors={id => { setSelectedVisitor(id ?? null); setCurrentTab('visitors'); }}
        onOpenNotice={id => { setSelectedNotice(id ?? null); setNoticeSubTab('notices'); setCurrentTab('notices'); void loadNotices(); }}
        key={`${organizationId}-${useAuthStore.getState().backendUser?.id}`}
        onOpenRequest={id => { setSelectedRequest(id); setCurrentTab('complaints'); }}
      />

      <main className="phone-body">
        {/* Loading skeleton / progress */}
        {isLoading && !profile ? (
          <div
            className="card resident-profile-skeleton"
            role="status"
            aria-label="Loading resident profile"
            style={{
              padding: '16px',
              marginBottom: '16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ height: '140px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', marginBottom: '14px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <span className="skeleton-line" style={{ width: '50%', height: '16px', marginBottom: '8px' }} />
              <span className="skeleton-line" style={{ width: '30%', height: '12px', margin: 0 }} />
            </div>
            <div style={{ height: '76px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', marginBottom: '14px', padding: '14px' }}>
              <span className="skeleton-line" style={{ width: '40%', height: '14px', marginBottom: '8px' }} />
              <span className="skeleton-line" style={{ width: '65%', height: '10px', margin: 0 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ height: '68px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                  <span className="skeleton-line" style={{ width: '30px', height: '30px', borderRadius: '10px', margin: '0 0 4px 0' }} />
                  <span className="skeleton-line" style={{ width: '40px', height: '6px', margin: 0 }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>

        {/* Missing organization context banner */}
        {!organizationId && (
          <div
            className="card"
            style={{
              padding: '16px',
              textAlign: 'center',
              marginBottom: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <strong style={{ fontSize: '0.875rem', display: 'block', color: 'var(--ink)' }}>
              Organization Required
            </strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '4px' }}>
              Please select a society organization context to access your resident portal.
            </p>
          </div>
        )}

        {/* Error banner with retry */}
        {error && !isLoading && (
          <div
            className="card"
            style={{
              padding: '14px',
              marginBottom: '12px',
              backgroundColor: 'var(--danger-tint)',
              border: '1px solid rgba(180, 64, 42, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.8125rem', color: 'var(--danger)', display: 'block' }}>
                Profile Load Error
              </strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--danger)', margin: 0 }}>
                {error}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              style={{ padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0 }}
              onClick={loadResidentProfile}
            >
              Retry
            </button>
          </div>
        )}

        {/* Unassigned Flat Notice */}
        {profile && !profile.flat_id && (
          <div
            className="card"
            style={{
              padding: '10px 14px',
              marginBottom: '12px',
              backgroundColor: 'var(--warning-tint)',
              border: '1px solid rgba(201, 138, 31, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.875rem' }}>⚠️</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>
              <strong>No flat assigned.</strong> Contact your society administrator to assign your unit.
            </div>
          </div>
        )}

        {/* 1. HOME SCREEN */}
        {currentTab === 'home' && (
          <div className="society-screen" id="screen-home">
            <HeroBanner />
            <DuesDonutCard />
            <QuickActionsGrid onNavigateTab={setCurrentTab} />

            <AmenitiesSpotlight temperature={currentTemperature} />
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
                    {flatTitle}
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
            <VisitorsList selectedVisitorId={selectedVisitor} />
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

            <ComplaintsList key={selectedRequest || 'helpdesk'} selectedRequest={selectedRequest} />
          </div>
        )}

        {currentTab === 'amenity-bookings' && <AmenityBookingsList onBack={() => setCurrentTab('home')} />}

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
            <PaymentHistoryCard />
            <WhatsAppBillingToggle />
          </div>
        )}

        {/* 5. NOTICES & POLLS SCREEN */}
        {currentTab === 'notices' && (
          <div className="society-screen" id="screen-notices">
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '8px',
              }}
            >
              <button
                type="button"
                className={`btn btn-sm ${noticeSubTab === 'notices' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setNoticeSubTab('notices')}
              >
                Circulars & Notices
              </button>
              <button
                type="button"
                className={`btn btn-sm ${noticeSubTab === 'polls' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { markPollsSeen(); setNoticeSubTab('polls'); }}
              >
                Community Polls
              </button>
            </div>

            {noticeSubTab === 'notices' ? <NoticesList selectedNoticeId={selectedNotice} /> : <PollsList />}
          </div>
        )}
          </>
        )}
      </main>

      <BottomNav currentTab={currentTab} onTabChange={openNoticesTab} hasNewPoll={hasNewPoll} />
    </>
  );
};
