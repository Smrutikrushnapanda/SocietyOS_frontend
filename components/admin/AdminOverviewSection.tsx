'use client';

import React, { useState } from 'react';
import { useVisitorStore, useComplaintStore, usePaymentStore, useSocietyStore, useNoticeStore, useToastStore } from '../../store';
import { AdminSectionType } from './AdminSidebar';

interface AdminOverviewSectionProps {
  onNavigate: (sec: AdminSectionType) => void;
}

export const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({ onNavigate }) => {
  const { visitors, approveVisitor } = useVisitorStore();
  const { complaints } = useComplaintStore();
  const { maintenanceDue } = usePaymentStore();
  const { society } = useSocietyStore();
  const { notices } = useNoticeStore();
  const { showToast } = useToastStore();

  const [isScanning, setIsScanning] = useState(false);
  const [anprTarget, setAnprTarget] = useState({
    plate: 'MH-02-CB-4491',
    flat: 'Flat A-101 (Aarav Sharma)',
    slot: 'Slot A-01 (Basement)',
    status: 'FASTAG CLEARED'
  });
  const [isGateLocked, setIsGateLocked] = useState(false);

  const triggerAnprScan = () => {
    setIsScanning(true);
    const plates = [
      { plate: 'MH-02-CB-4491', flat: 'Flat A-101 (Aarav Sharma)', slot: 'Slot A-01 (Basement)' },
      { plate: 'MH-02-AK-9920', flat: 'Flat A-102 (Priya Mukherjee)', slot: 'Slot A-02 (Basement)' },
      { plate: 'MH-02-EF-1029', flat: 'Flat A-201 (Deepak Verma)', slot: 'Slot A-05 (Basement)' },
      { plate: 'MH-02-ZA-5512', flat: 'Flat A-202 (Ananya Iyer)', slot: 'Slot A-06 (Basement)' }
    ];
    const picked = plates[Math.floor(Math.random() * plates.length)];

    setTimeout(() => {
      setAnprTarget({
        ...picked,
        status: 'FASTAG CLEARED'
      });
      setIsScanning(false);
      showToast(`ANPR Radar Matched: ${picked.plate} • Barrier Opened`);
    }, 1200);
  };

  const toggleLockdown = () => {
    setIsGateLocked((prev) => {
      const next = !prev;
      showToast(next ? 'Gate Emergency Lock Active' : 'Gate Normal Operation Restored');
      return next;
    });
  };

  const totalFlats = 40;
  const occupiedFlats = 34;
  const openComplaints = complaints.filter((c) => c.status === 'open').length;
  const duesPending = maintenanceDue.due - maintenanceDue.paid;

  return (
    <div className="admin-section active" id="section-overview">
      {/* Interactive Quick Command Dock */}
      <div className="command-dock-container">
        <div className="dock-left-meta">
          <span className="dock-radar-pulse"></span>
          <div>
            <strong style={{ fontSize: '0.875rem' }}>Command Deck Active</strong>
            <span style={{ fontSize: '0.75rem', opacity: 0.85, display: 'block' }}>
              Gates 1 & 2 Online • Meta Cloud API 100% Synced
            </span>
          </div>
        </div>
        <div className="dock-actions-row">
          <button className="dock-btn accent" onClick={triggerAnprScan}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="12" x2="12" y2="18" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <span>Simulate ANPR Scan</span>
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
            style={{ borderColor: isGateLocked ? '#b4402a' : undefined }}
            onClick={toggleLockdown}
          >
            <span>{isGateLocked ? 'Gate Locked' : 'Gate Normal'}</span>
          </button>
        </div>
      </div>

      {/* 3D Smart Campus Hero Banner with Interactive Hotspots */}
      <div className="campus-hero-banner">
        <img
          src="/assets/society_campus_3d.jpg"
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
          onClick={triggerAnprScan}
        >
          <div className="hotspot-beacon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/></svg></div>
          <div className="hotspot-tooltip">Main Gate #1 • FastTag & ANPR Kiosk (Click to Scan)</div>
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
            <h3>{society.name} Smart Living Campus</h3>
            <p>Real-time spatial telemetry, automated ANPR barrier access & green solar infrastructure.</p>
          </div>
          <div className="campus-telemetry-strip">
            <div className="telemetry-chip">Solar: 18.4 kWp</div>
            <div className="telemetry-chip">Perimeter: Secure</div>
            <div className="telemetry-chip">4/4 EV Bays Active</div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('buildings')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Total Flats / Units</div>
          <div className="kpi-value">{totalFlats}</div>
          <div className="kpi-sub">
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{occupiedFlats} Occupied</span> • 6 Vacant
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('visitors')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Today's Visitors</div>
          <div className="kpi-value">{visitors.length}</div>
          <div className="kpi-sub">
            <span style={{ color: 'var(--pine)', fontWeight: 600 }}>{visitors.filter(v => v.status === 'checked-in').length} Inside</span> • FastTag Active
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('complaints')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Open Helpdesk Tickets</div>
          <div className="kpi-value" style={{ color: openComplaints > 0 ? 'var(--danger)' : undefined }}>
            {openComplaints}
          </div>
          <div className="kpi-sub">
            <span>SLA: 96% on-time resolution</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('finance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Maintenance Dues Pending</div>
          <div className="kpi-value" style={{ color: 'var(--saffron-dark)' }}>
            ₹{duesPending.toLocaleString('en-IN')}
          </div>
          <div className="kpi-sub">
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>82% Collection Rate</span>
          </div>
        </div>
      </div>

      {/* 3D Feature Showcase Row: Smart Gate ANPR & Financial Vault */}
      <div className="overview-3d-visual-grid">
        {/* Left: Smart AI Gate Kiosk & ANPR Laser Scanner */}
        <div className="interactive-3d-card" id="card-anpr-scanner">
          <div className="interactive-3d-header">
            <h4>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#34d399',
                  display: 'inline-block'
                }}
              ></span>
              Smart Gate ANPR & FastTag Radar
            </h4>
            <button className="btn btn-sm btn-ghost" onClick={triggerAnprScan}>
              Scan Now
            </button>
          </div>
          <div className="interactive-3d-media-wrap">
            <img
              src="/assets/security_ai_kiosk_3d.jpg"
              alt="AI Gate Security Checkpoint"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/shared/assets/security_ai_kiosk_3d.jpg';
              }}
            />
            <div className="anpr-scanner-overlay">
              <div
                className="laser-beam"
                id="anpr-laser-beam"
                style={{ animationPlayState: isScanning ? 'running' : 'paused' }}
              ></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="anpr-hud-badge" id="anpr-hud-status">
                  {isScanning ? 'ANPR SCANNING...' : 'ANPR RADAR: ACTIVE'}
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  CAM 01 HD
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(15, 28, 24, 0.85)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#a7f3d0' }}>Target: Inbound Vehicle</div>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: '#ffffff' }}>
                    {anprTarget.plate}
                  </strong>
                </div>
                <span className="badge badge-success">{anprTarget.status}</span>
              </div>
            </div>
          </div>
          <div className="interactive-3d-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--neutral)' }}>Assigned Unit:</span>
              <strong>{anprTarget.flat}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--neutral)' }}>Allocated Bay:</span>
              <span className="badge badge-pine">{anprTarget.slot}</span>
            </div>
            <button className="btn btn-sm btn-primary" style={{ marginTop: '4px' }} onClick={triggerAnprScan}>
              Test FastTag Auto-Barrier Clearance
            </button>
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
                  RECOVERY: 82%
                </span>
                <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                  HDFC ESCROW
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
                  <div style={{ fontSize: '0.6875rem', color: '#fed7aa' }}>Monthly Billing (Sep 2026)</div>
                  <strong style={{ fontSize: '1rem', color: '#ffffff' }}>₹2,36,400 Collected</strong>
                </div>
                <span className="badge badge-success">AUDITED</span>
              </div>
            </div>
          </div>
          <div className="interactive-3d-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--neutral)' }}>Reserve & Sinking Fund:</span>
              <strong style={{ color: 'var(--pine-dark)' }}>₹14,50,000</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--neutral)' }}>Auto-Debit & UPI Adoption:</span>
              <span className="badge badge-success">91% Digital</span>
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
