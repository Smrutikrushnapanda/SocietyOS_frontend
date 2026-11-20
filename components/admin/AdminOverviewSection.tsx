'use client';

import React, { useState, useEffect } from 'react';
import {
  useVisitorStore,
  useComplaintStore,
  usePaymentStore,
  useSocietyStore,
  useToastStore,
  useAuthStore,
} from '../../store';
import { useSocietySettingsStore } from '../../store/useSocietySettingsStore';
import { useCampusImage } from '../common/SocietySettings';
import { societyDateKey } from '../../lib/calendar';
import { getFlats } from '../../lib/api/flats.api';
import { getResidents } from '../../lib/api/residents.api';
import { AdminSectionType } from './AdminSidebar';

interface AdminOverviewSectionProps {
  onNavigate: (sec: AdminSectionType) => void;
}

export const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({ onNavigate }) => {
  const { visitors } = useVisitorStore();
  const { complaints } = useComplaintStore();
  const { maintenanceDue } = usePaymentStore();
  const { society } = useSocietyStore();
  const branding = useSocietySettingsStore(state => state.data?.branding);
  const campusImage = useCampusImage(branding?.campusImageFileId);
  const { showToast } = useToastStore();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      setNow(new Date());
      // Society calendar uses IST; update the count at midnight without fetching.
      timer = setTimeout(update, 86400000 - ((Date.now() + 19800000) % 86400000));
    };
    timer = setTimeout(update, 86400000 - ((Date.now() + 19800000) % 86400000));
    return () => clearTimeout(timer);
  }, []);
  const todaysVisitors = visitors.filter(visitor => visitor.visitDate && societyDateKey(visitor.visitDate) === societyDateKey(now));
  const explainAnpr = () => showToast('ANPR means Automatic Number Plate Recognition. Camera and barrier hardware are not connected. Use Security & Access for visitor approvals and gate passes.');

  const { organizationId } = useAuthStore();
  const [totalFlats, setTotalFlats] = useState<number>(0);
  const [occupiedFlats, setOccupiedFlats] = useState<number>(0);

  useEffect(() => {
    if (!organizationId) {
      setTotalFlats(0);
      setOccupiedFlats(0);
      return;
    }
    let isCancelled = false;
    Promise.all([getFlats(), getResidents()])
      .then(([flats, residents]) => {
        if (isCancelled) return;
        const flatList = Array.isArray(flats) ? flats : (flats as any)?.data || [];
        const resList = Array.isArray(residents) ? residents : (residents as any)?.data || [];
        setTotalFlats(flatList.length);
        const occupied = flatList.filter((f: any) => resList.some((r: any) => r.flat_id === f.id)).length;
        setOccupiedFlats(occupied);
      })
      .catch(() => {
        if (!isCancelled) {
          setTotalFlats(0);
          setOccupiedFlats(0);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [organizationId]);

  const openComplaints = complaints.filter((c) => c.status === 'OPEN').length;
  const duesPending = maintenanceDue ? maintenanceDue.due - maintenanceDue.paid : 0;

  return (
    <div className="admin-section active" id="section-overview">
      {/* Interactive Quick Command Dock */}
      <div className="command-dock-container">
        <div className="dock-left-meta">
          <span className="dock-radar-pulse"></span>
          <div>
            <strong style={{ fontSize: '0.875rem' }}>Command Deck Active</strong>
            <span style={{ fontSize: '0.75rem', opacity: 0.85, display: 'block' }}>
              Visitor approvals, gate passes and society operations
            </span>
          </div>
        </div>
        <div className="dock-actions-row">
          <button className="dock-btn accent" onClick={explainAnpr}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="12" x2="12" y2="18" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <span>About ANPR</span>
          </button>
          <button className="dock-btn" onClick={() => onNavigate('visitors')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>Issue Gate Pass</span>
          </button>
          <button className="dock-btn" onClick={() => onNavigate('finance')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>Record Payment</span>
          </button>
          <button className="dock-btn" onClick={() => onNavigate('notices')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Broadcast Notice</span>
          </button>
          <button
            className="dock-btn"
            id="dock-gate-lock-btn"
            onClick={() => onNavigate('visitors')}
          >
            <span>Gate Operations</span>
          </button>
        </div>
      </div>

      {/* 3D Smart Campus Hero Banner with Interactive Hotspots */}
      <div className="campus-hero-banner">
        <img
          src={campusImage || "/assets/society_campus_3d.jpg"}
          alt="3D Smart Society Campus"
          className="campus-hero-img"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/shared/assets/society_campus_3d.jpg';
          }}
        />
        <div className="campus-hero-overlay"></div>

        {/* Interactive Hotspots */}
        <div
          className="campus-hotspot"
          style={{ top: '82%', left: '42%' }}
          onClick={explainAnpr}
        >
          <div className="hotspot-beacon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/></svg></div>
          <div className="hotspot-tooltip">Gate access • About number plate recognition</div>
        </div>

        <div
          className="campus-hotspot"
          style={{ top: '28%', left: '24%' }}
          onClick={() => onNavigate('buildings')}
        >
          <div className="hotspot-beacon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/></svg></div>
          <div className="hotspot-tooltip">Tower A (Gulmohar) • 20 Units (Click for 3D Slices)</div>
        </div>

        <div
          className="campus-hotspot"
          style={{ top: '24%', left: '52%' }}
          onClick={() => onNavigate('buildings')}
        >
          <div className="hotspot-beacon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/></svg></div>
          <div className="hotspot-tooltip">Tower B (Amaltas) • 20 Units (Click for 3D Slices)</div>
        </div>

        <div
          className="campus-hotspot"
          style={{ top: '76%', left: '74%' }}
          onClick={() => onNavigate('parking')}
        >
          <div className="hotspot-beacon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
          <div className="hotspot-tooltip">EV Charging Plaza & Stilt Bays (Click for Bay Map)</div>
        </div>

        <div className="campus-hero-content">
          <div className="campus-hero-title">
            <h3>{society.name} {branding?.campusTitle || 'Smart Living Campus'}</h3>
            <p>{branding?.campusDescription || 'Manage society buildings, visitor access and shared facilities.'}</p>
          </div>
          <div className="campus-telemetry-strip">
            <div className="telemetry-chip">Solar: —</div>
            <div className="telemetry-chip">Perimeter: —</div>
            <div className="telemetry-chip">EV Bays: —</div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('buildings')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Total Flats / Units</div>
          <div className="kpi-value">{totalFlats}</div>
          <div className="kpi-sub">
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{occupiedFlats} Occupied</span> • {Math.max(totalFlats - occupiedFlats, 0)} Vacant
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('visitors')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Today&apos;s Visitors</div>
          <div className="kpi-value">{todaysVisitors.length}</div>
          <div className="kpi-sub">
            <span style={{ color: 'var(--pine)', fontWeight: 600 }}>{todaysVisitors.filter(v => v.status === 'checked-in').length} Inside</span> • Today, IST
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('complaints')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Open Helpdesk Tickets</div>
          <div className="kpi-value" style={{ color: openComplaints > 0 ? 'var(--danger)' : undefined }}>
            {openComplaints}
          </div>
          <div className="kpi-sub">
            <span>SLA: —</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('finance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Maintenance Dues Pending</div>
          <div className="kpi-value" style={{ color: 'var(--saffron-dark)' }}>
            ₹{duesPending.toLocaleString('en-IN')}
          </div>
          <div className="kpi-sub">
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Collection Rate: —</span>
          </div>
        </div>
      </div>

      {/* 3D Feature Showcase Row: Smart Gate ANPR & Financial Vault */}
      <div className="overview-3d-visual-grid">
        <div className="interactive-3d-card" id="card-anpr-scanner">
          <div className="interactive-3d-header"><h4>Gate & Visitor Access</h4><span className="badge badge-neutral">Manual gate workflow</span></div>
          <div className="interactive-3d-media-wrap">
            <img src="/assets/security_ai_kiosk_3d.jpg" alt="Gate security illustration" />
          </div>
          <div className="interactive-3d-body">
            <strong>ANPR: Automatic Number Plate Recognition</strong>
            <p>A camera reads vehicle number plates and checks authorized vehicles. ANPR camera and barrier controls are not connected to this system.</p>
            <p>Guards can register arrivals, verify visitor passes, and record check-in and checkout through existing gate screens.</p>
            <button className="btn btn-sm btn-primary" onClick={() => onNavigate('visitors')}>Open Security & Access</button>
          </div>
        </div>

        {/* Right: Financial Health & Digital Collections Vault */}
        <div className="interactive-3d-card" id="card-fin-vault">
          <div className="interactive-3d-header">
            <h4>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--saffron)',
                  display: 'inline-block'
                }}
              ></span>
              Society Financial Reserves & Collections Vault
            </h4>
            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('finance')}>
              Open Ledger →
            </button>
          </div>
          <div className="interactive-3d-media-wrap">
            <img
              src="/assets/finance_vault_3d.jpg"
              alt="Financial Health Vault"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/shared/assets/finance_vault_3d.jpg';
              }}
            />
            <div className="anpr-scanner-overlay">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  className="anpr-hud-badge"
                  style={{ borderColor: 'var(--saffron)', color: '#fef08a' }}
                >
                  RECOVERY: —
                </span>
                <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                  —
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(15, 28, 24, 0.85)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(224, 138, 44, 0.4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#fed7aa' }}>Monthly Billing</div>
                  <strong style={{ fontSize: '1rem', color: '#ffffff' }}>₹0 Collected</strong>
                </div>
                <span className="badge badge-success">—</span>
              </div>
            </div>
          </div>
          <div className="interactive-3d-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--neutral)' }}>Reserve & Sinking Fund:</span>
              <strong style={{ color: 'var(--pine-dark)' }}>₹0</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--neutral)' }}>Auto-Debit & UPI Adoption:</span>
              <span className="badge badge-success">—</span>
            </div>
            <button className="btn btn-sm btn-accent" style={{ marginTop: '4px' }} onClick={() => onNavigate('finance')}>
              Reconcile Invoices & Auto-Remind Defaulters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
