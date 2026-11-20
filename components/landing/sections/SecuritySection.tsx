'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import s from './SecuritySection.module.css';

type Result = 'allowed' | 'denied';
type Status = 'waiting' | Result;

interface VisitorProfile {
  id: string;
  name: string;
  role: string;
  icon: string;
  flat: string;
  plate: string;
  carColor: string;
  windshieldTint: string;
  purpose: string;
}

interface LogEntry {
  id: string;
  name: string;
  plate: string;
  result: Result;
  time: string;
}

const VISITORS: VisitorProfile[] = [
  {
    id: 'courier-1',
    name: 'Rohan Das',
    role: 'Delivery Partner (Amazon)',
    icon: '📦',
    flat: 'Flat B-402',
    plate: 'OD 02 AB 1234',
    carColor: '#F28C28',
    windshieldTint: '#fed7aa',
    purpose: 'Package Delivery',
  },
  {
    id: 'guest-2',
    name: 'Meera Pattnaik',
    role: 'Pre-invited Guest',
    icon: '👋',
    flat: 'Flat A-1103',
    plate: 'OD 05 KK 8899',
    carColor: '#1e293b',
    windshieldTint: '#93c5fd',
    purpose: 'Family Visit (QR Code verified)',
  },
  {
    id: 'vendor-3',
    name: 'Sanjay Electricals',
    role: 'Society Vendor',
    icon: '⚡',
    flat: 'Flat C-205',
    plate: 'OD 33 X 4567',
    carColor: '#035F4F',
    windshieldTint: '#a7f3d0',
    purpose: 'AC Maintenance Call',
  },
  {
    id: 'resident-4',
    name: 'Dr. Alok Mohanty',
    role: 'Permanent Resident',
    icon: '🏡',
    flat: 'Penthouse P-1',
    plate: 'OD 02 Z 9999',
    carColor: '#0284c7',
    windshieldTint: '#e0f2fe',
    purpose: 'Fast ANPR Resident Entry',
  },
];

const SEED_LOG: LogEntry[] = [
  { id: '1', name: 'Dr. Alok Mohanty', plate: 'OD 02 Z 9999', result: 'allowed', time: '14:38' },
  { id: '2', name: 'BigBasket Grocery', plate: 'OD 02 EV 501', result: 'allowed', time: '14:22' },
  { id: '3', name: 'Unknown Vehicle', plate: 'DL 01 AB 0000', result: 'denied', time: '13:50' },
];

const SECURITY_CARDS = [
  {
    icon: '📷',
    title: 'ANPR Fast Gate Entry',
    desc: 'High-speed camera scans verified resident number plates, opening the barrier automatically in 0.8 seconds.',
  },
  {
    icon: '📱',
    title: 'Guard Tablet & Phone Console',
    desc: 'Digital check-in kiosk with fast camera photo capture, driver license verification, and guest validation.',
  },
  {
    icon: '🎟️',
    title: 'Digital QR Guest Passes',
    desc: 'Residents generate timed QR invitations via WhatsApp. The guard scans once for frictionless authorized entry.',
  },
  {
    icon: '🔔',
    title: '1-Tap Resident Call Approval',
    desc: 'Instant interactive push notification sent to the resident’s smartphone before any courier or cab is allowed in.',
  },
  {
    icon: '🛑',
    title: 'Tailgating & Blacklist Alarms',
    desc: 'AI detects cars tailgating authorized vehicles or blacklisted past offenders, raising instant audio alarms.',
  },
  {
    icon: '📑',
    title: 'Immutable Gate Logs',
    desc: 'Every vehicle entry, exit timestamp, vehicle photo, and resident authorization record is stored securely for audit.',
  },
];

const getNowTime = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function SecuritySection() {
  const [activeVisitorIdx, setActiveVisitorIdx] = useState(0);
  const [status, setStatus] = useState<Status>('waiting');
  const [log, setLog] = useState<LogEntry[]>(SEED_LOG);
  const [autoPlay, setAutoPlay] = useState(true);

  const currentVisitor = VISITORS[activeVisitorIdx];

  const handleDecision = useCallback(
    (decision: Result) => {
      if (status !== 'waiting') return;
      setStatus(decision);

      setLog((prev) => [
        {
          id: `${Date.now()}`,
          name: currentVisitor.name,
          plate: currentVisitor.plate,
          result: decision,
          time: getNowTime(),
        },
        ...prev.slice(0, 4),
      ]);
    },
    [status, currentVisitor],
  );

  // Auto demonstration cycling if user doesn't interact
  useEffect(() => {
    if (!autoPlay || status !== 'waiting') return;
    const timer = setTimeout(() => {
      handleDecision('allowed');
    }, 6000);
    return () => clearTimeout(timer);
  }, [autoPlay, status, handleDecision]);

  // Transition to next vehicle after decision animation completes
  useEffect(() => {
    if (status === 'waiting') return;
    const nextTimer = setTimeout(() => {
      setActiveVisitorIdx((prev) => (prev + 1) % VISITORS.length);
      setStatus('waiting');
    }, 3200);
    return () => clearTimeout(nextTimer);
  }, [status]);

  const selectVisitorPreset = (index: number) => {
    setAutoPlay(false);
    setActiveVisitorIdx(index);
    setStatus('waiting');
  };

  const carAnimationClass =
    status === 'allowed' ? s.carPassing : status === 'denied' ? s.carDeclined : '';

  return (
    <section id="security" className={s.securitySection}>
      <div className={s.container}>
        {/* Section Header */}
        <div className={s.sectionHeader}>
          <div className={s.badge}>
            <span>🛡️</span> Security First Architecture
          </div>
          <h2 className={s.title}>
            A Safer Community <br />
            <span className={s.emeraldText}>for Every Resident</span>
          </h2>
          <p className={s.subtitle}>
            Experience how SocietyOS automates physical gate access, ANPR vehicle identification,
            and real-time resident authorization. Try the interactive gate simulator below!
          </p>
        </div>

        {/* Simulator Grid */}
        <div className={s.simLayout}>
          {/* Left Canvas: Live Gate SVG Animation & Interactive Test Bench */}
          <div className={s.simCanvasCard}>
            {/* Camera feed top header */}
            <div className={s.canvasTopBar}>
              <div className={s.camFeedInfo}>
                <div className={s.liveIndicator}>
                  <span className={s.liveDot} /> LIVE FEED
                </div>
                <span className={s.gateLocationTag}>Main Gate 01 • North Entrance</span>
              </div>
              <div className={s.anprPill}>
                <span>📷 ANPR:</span>
                <strong>{currentVisitor.plate}</strong>
              </div>
            </div>

            {/* SVG Stage */}
            <div
              className={s.stage}
              onMouseEnter={() => setAutoPlay(false)}
              aria-label="Interactive Gate Top-Down Simulation"
            >
              <svg viewBox="0 0 560 420" className={s.mapSvg} role="img">
                <defs>
                  {/* Subtle campus ground grid */}
                  <pattern id="campus-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                  </pattern>
                  {/* ANPR Camera Beam Gradient */}
                  <linearGradient id="scanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Ground */}
                <rect width="560" height="420" fill="#f1f5f9" />
                <rect width="560" height="420" fill="url(#campus-grid)" />

                {/* Society Perimeter Boundary Wall */}
                <path
                  d="M 24 400 L 24 24 L 536 24 L 536 400"
                  fill="none"
                  stroke="#035F4F"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Landscaping & Trees */}
                <rect x="36" y="36" width="488" height="210" rx="14" fill="#E6F2ED" />
                <path
                  d="M 46 130 Q 160 80 280 140 T 510 100"
                  fill="none"
                  stroke="#CDE7DC"
                  strokeWidth="16"
                  strokeLinecap="round"
                />

                {/* Society Residential Towers */}
                <g>
                  <rect x="56" y="56" width="112" height="78" rx="8" fill="#035F4F" />
                  <rect x="66" y="66" width="92" height="58" rx="4" fill="#16A085" />
                  <text x="112" y="100" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="800">
                    Tower A
                  </text>
                </g>

                <g>
                  <rect x="392" y="56" width="112" height="78" rx="8" fill="#035F4F" />
                  <rect x="402" y="66" width="92" height="58" rx="4" fill="#16A085" />
                  <text x="448" y="100" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="800">
                    Tower B
                  </text>
                </g>

                {/* Main 2-lane entrance road */}
                <path d="M 280 24 L 280 420" stroke="#1e293b" strokeWidth="84" />
                <path
                  d="M 280 24 L 280 420"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeDasharray="14 14"
                  opacity="0.8"
                />

                {/* Security Cabin */}
                <rect x="194" y="260" width="44" height="60" rx="8" fill="#0F172A" />
                <rect x="202" y="270" width="28" height="22" rx="4" fill="#E2E8F0" />
                <circle cx="216" cy="308" r="4" fill="#10b981" />

                {/* Optical ANPR Camera Unit on Pole */}
                <line x1="238" y1="262" x2="252" y2="250" stroke="#475569" strokeWidth="3" />
                <rect x="246" y="242" width="18" height="12" rx="3" fill="#035F4F" />
                <circle cx="260" cy="248" r="3" fill="#22c55e" />

                {/* Active Camera Scan Zone */}
                {status === 'waiting' && (
                  <polygon points="256,252 238,360 322,360" fill="url(#scanGrad)" />
                )}

                {/* Automatic Boom Barrier Arm */}
                <g className={`${s.gateArm} ${status === 'allowed' ? s.gateOpened : ''}`}>
                  <rect x="238" y="287" width="84" height="7" rx="3" fill="#F28C28" />
                  <line x1="254" y1="287" x2="254" y2="294" stroke="#FFFFFF" strokeWidth="3" />
                  <line x1="272" y1="287" x2="272" y2="294" stroke="#FFFFFF" strokeWidth="3" />
                  <line x1="290" y1="287" x2="290" y2="294" stroke="#FFFFFF" strokeWidth="3" />
                  <line x1="308" y1="287" x2="308" y2="294" stroke="#FFFFFF" strokeWidth="3" />
                </g>

                {/* Vehicle Car Model */}
                <g className={`${s.vehicleCar} ${carAnimationClass}`}>
                  <rect
                    x="262"
                    y="336"
                    width="36"
                    height="62"
                    rx="10"
                    fill={currentVisitor.carColor}
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />
                  {/* Windshield */}
                  <rect
                    x="267"
                    y="350"
                    width="26"
                    height="14"
                    rx="4"
                    fill={currentVisitor.windshieldTint}
                  />
                  {/* Headlights */}
                  <circle cx="269" cy="341" r="3" fill="#FEF08A" />
                  <circle cx="291" cy="341" r="3" fill="#FEF08A" />
                  {/* License Plate on front bumper */}
                  <rect x="272" y="337" width="16" height="5" rx="1.5" fill="#FFFFFF" />
                </g>
              </svg>

              {/* Status HUD Badge */}
              <div className={s.hudOverlay}>
                <div className={s.hudStatusRow}>
                  <span>Barrier Status:</span>
                  <strong
                    className={
                      status === 'allowed'
                        ? s.statusOk
                        : status === 'denied'
                        ? s.statusDenied
                        : s.statusPending
                    }
                  >
                    {status === 'allowed'
                      ? '● OPENED'
                      : status === 'denied'
                      ? '● ACCESS DENIED'
                      : '● WAITING DECISION'}
                  </strong>
                </div>
                <div style={{ opacity: 0.8 }}>Target: {currentVisitor.flat}</div>
              </div>
            </div>

            {/* Interactive Test Bench Controls (Visitors can switch cars & trigger actions) */}
            <div className={s.interactiveControlBar}>
              <div className={s.controlBarHeader}>
                <span className={s.controlBarTitle}>Select a Vehicle Scenario to Test:</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Click any card below</span>
              </div>

              {/* Visitor Presets */}
              <div className={s.visitorPresetTabs}>
                {VISITORS.map((v, idx) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectVisitorPreset(idx)}
                    className={`${s.presetTab} ${
                      activeVisitorIdx === idx ? s.presetTabActive : ''
                    }`}
                  >
                    <span>{v.icon}</span>
                    <span>{v.name}</span>
                  </button>
                ))}
              </div>

              {/* Action Prompt with instant Allow / Decline interactive buttons */}
              <div className={s.visitorPromptCard}>
                <div className={s.visitorDetails}>
                  <div className={s.visitorIcon}>{currentVisitor.icon}</div>
                  <div>
                    <h4 className={s.visitorName}>{currentVisitor.name}</h4>
                    <p className={s.visitorDesc}>
                      {currentVisitor.role} • for <strong>{currentVisitor.flat}</strong> ({currentVisitor.purpose})
                    </p>
                  </div>
                </div>

                <div className={s.actionButtonGroup}>
                  <button
                    type="button"
                    onClick={() => handleDecision('allowed')}
                    disabled={status !== 'waiting'}
                    className={`${s.btnAction} ${s.btnApprove}`}
                  >
                    ✓ Allow Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision('denied')}
                    disabled={status !== 'waiting'}
                    className={`${s.btnAction} ${s.btnDecline}`}
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Gate Log and 6 Feature Pillars */}
          <div className={s.rightColumn}>
            {/* Live Gate Log Card */}
            <div className={s.gateLogCard}>
              <div className={s.logCardHead}>
                <span className={s.logCardTitle}>Today at the Gate (Real-Time Log)</span>
                <span style={{ fontSize: '11px', color: '#035F4F', fontWeight: '750' }}>● Auto Sync</span>
              </div>

              <div className={s.logList}>
                {log.map((entry) => (
                  <div key={entry.id} className={s.logRow}>
                    <div className={s.logUser}>
                      <span className={`${s.logDot} ${entry.result === 'allowed' ? s.dotOk : s.dotNo}`} />
                      <div>
                        <div className={s.logName}>{entry.name}</div>
                        <div className={s.logPlate}>{entry.plate}</div>
                      </div>
                    </div>
                    <div className={s.logTimeBadge}>
                      {entry.result === 'allowed' ? 'Passed' : 'Turned Back'} • {entry.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6 Security Feature Cards */}
            <div className={s.featuresGrid}>
              {SECURITY_CARDS.map((card) => (
                <div key={card.title} className={s.featureCard}>
                  <div className={s.featureIconBox}>{card.icon}</div>
                  <h4 className={s.featureTitle}>{card.title}</h4>
                  <p className={s.featureDesc}>{card.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '8px' }}>
              <Link
                href="/guard/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '12px',
                  background: '#035F4F',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '750',
                  textDecoration: 'none',
                }}
              >
                Open Guard Gate Terminal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
