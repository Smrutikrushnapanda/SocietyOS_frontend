'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import s from './GateSecuritySection.module.css';

type Result = 'allowed' | 'denied';
type Status = 'waiting' | Result;

interface Visitor {
  name: string;
  detail: string;
  car: string;
  tint: string;
}

interface LogEntry {
  id: string;
  name: string;
  result: Result;
  time: string;
}

const VISITORS: Visitor[] = [
  { name: 'Rohan Das', detail: 'Courier • for Flat B-402', car: '#C8553D', tint: '#FBE4DC' },
  { name: 'Meera Pattnaik', detail: 'Guest • for Flat A-1103', car: '#1e293b', tint: '#DDEBFA' },
  { name: 'Sanjay Electricals', detail: 'Vendor • booked by C-205', car: '#035F4F', tint: '#FDF0CF' },
];

const SEED_LOG: LogEntry[] = [
  { id: 'seed-1', name: 'OD 02 AB 1234', result: 'allowed', time: '14:20' },
  { id: 'seed-2', name: 'Grocery delivery', result: 'allowed', time: '14:05' },
];

const SECURITY_PILLARS = [
  {
    icon: '📷',
    title: 'ANPR Gate Access',
    desc: 'Automatic optical number plate recognition scans registered resident vehicles instantly.',
  },
  {
    icon: '📱',
    title: 'Guard Mobile App',
    desc: 'High-speed camera check-in, photo recording, and pre-entry security verifications.',
  },
  {
    icon: '⚡',
    title: 'QR Code Entry',
    desc: 'Invite guests with timed digital QR passes sent straight via WhatsApp or SMS.',
  },
  {
    icon: '🔔',
    title: 'Real-time Alerts',
    desc: 'Residents get instant ping approvals on phone before any stranger or courier enters.',
  },
  {
    icon: '🛡️',
    title: 'Visitor Pre-approval',
    desc: 'Pre-schedule maids, cooks, and service providers for frictionless recurring access.',
  },
  {
    icon: '⚠️',
    title: 'Unusual Activity Detection',
    desc: 'Instant committee alarms for overstayed visitor cars or unauthorized tailgate entries.',
  },
];

const nowLabel = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function GateSecuritySection() {
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>('waiting');
  const [log, setLog] = useState<LogEntry[]>(SEED_LOG);
  const [paused, setPaused] = useState(false);

  const visitor = VISITORS[idx];

  const decide = React.useCallback(
    (result: Result) => {
      if (status !== 'waiting') return;
      setStatus(result);
      setLog((prev) =>
        [{ id: `${Date.now()}`, name: visitor.name, result, time: nowLabel() }, ...prev].slice(0, 3),
      );
    },
    [status, visitor.name],
  );

  React.useEffect(() => {
    if (status !== 'waiting' || paused) return;
    const timer = setTimeout(() => decide('allowed'), 5200);
    return () => clearTimeout(timer);
  }, [status, paused, decide]);

  React.useEffect(() => {
    if (status === 'waiting') return;
    const timer = setTimeout(() => {
      setIdx((i) => (i + 1) % VISITORS.length);
      setStatus('waiting');
    }, 3800);
    return () => clearTimeout(timer);
  }, [status]);

  const carClass =
    status === 'allowed' ? s.carPass : status === 'denied' ? s.carBack : '';

  return (
    <section id="security" className={s.securitySection}>
      <div className={s.container}>
        <div className={s.layoutGrid}>
          {/* Left: Interactive Gate Simulation authored by user */}
          <div
            className={s.interactiveStageWrapper}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div className={s.stage}>
              <svg
                viewBox="0 0 560 440"
                className={s.map}
                role="img"
                aria-label="Top-down plan of the society gate and campus"
              >
                {/* ground */}
                <rect width="560" height="440" fill="#E6F2ED" />

                {/* decorative grid */}
                <defs>
                  <pattern id="sec-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#D1E8DF" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="560" height="440" fill="url(#sec-grid)" />

                {/* perimeter wall */}
                <path
                  d="M 20 420 L 20 20 L 540 20 L 540 420"
                  fill="none"
                  stroke="#035F4F"
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                {/* campus lawn */}
                <rect x="36" y="36" width="488" height="230" rx="14" fill="#CDE7DC" />
                <path
                  d="M 50 150 Q 180 80 300 160 T 510 110"
                  fill="none"
                  stroke="#B8DFC7"
                  strokeWidth="18"
                  strokeLinecap="round"
                />

                {/* residential towers */}
                <g className={s.buildingA}>
                  <rect x="56" y="56" width="110" height="84" rx="8" fill="#035F4F" />
                  <rect x="66" y="66" width="90" height="64" rx="4" fill="#16A085" />
                  <text x="111" y="103" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700">
                    Tower A
                  </text>
                </g>

                <g className={s.buildingB}>
                  <rect x="394" y="56" width="110" height="84" rx="8" fill="#035F4F" />
                  <rect x="404" y="66" width="90" height="64" rx="4" fill="#16A085" />
                  <text x="449" y="103" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700">
                    Tower B
                  </text>
                </g>

                {/* internal campus roadway */}
                <path
                  d="M 280 20 L 280 440"
                  stroke="#334155"
                  strokeWidth="76"
                  strokeLinecap="square"
                />
                <path
                  d="M 280 20 L 280 440"
                  stroke="#F8FAFC"
                  strokeWidth="3"
                  strokeDasharray="14 14"
                />

                {/* security cabin */}
                <rect x="200" y="278" width="40" height="52" rx="6" fill="#0F172A" />
                <rect x="206" y="286" width="28" height="20" rx="3" fill="#E2E8F0" />
                <circle cx="220" cy="318" r="4" fill="#16A085" />

                {/* boom barrier arm */}
                <g className={`${s.gateArm} ${status === 'allowed' ? s.gateOpen : ''}`}>
                  <rect x="242" y="300" width="76" height="6" rx="2" fill="#F28C28" />
                  <line x1="256" y1="300" x2="256" y2="306" stroke="#FFFFFF" strokeWidth="3" />
                  <line x1="274" y1="300" x2="274" y2="306" stroke="#FFFFFF" strokeWidth="3" />
                  <line x1="292" y1="300" x2="292" y2="306" stroke="#FFFFFF" strokeWidth="3" />
                </g>

                {/* approaching car */}
                <g className={`${s.carGroup} ${carClass}`}>
                  <rect
                    x="264"
                    y="350"
                    width="32"
                    height="56"
                    rx="8"
                    fill={visitor.car}
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  {/* windshield */}
                  <rect x="268" y="362" width="24" height="12" rx="3" fill={visitor.tint} opacity="0.9" />
                  {/* headlights */}
                  <circle cx="270" cy="354" r="2.5" fill="#FEF08A" />
                  <circle cx="290" cy="354" r="2.5" fill="#FEF08A" />
                </g>
              </svg>

              {/* ANPR Overlay badge on gate feed */}
              <div className={s.anprBadge}>
                <span className={s.anprPulse} />
                <span>ANPR Detected: <strong>OD 02 AB 1234</strong></span>
              </div>
            </div>

            {/* Decision prompt & entry log row */}
            <div className={s.decisionGrid}>
              <div className={s.visitorCard}>
                <div className={s.visitorHeader}>
                  <div className={s.visitorAvatar}>🚗</div>
                  <div>
                    <h4 className={s.visitorName}>{visitor.name}</h4>
                    <p className={s.visitorSub}>{visitor.detail}</p>
                  </div>
                </div>

                <div className={s.btnRow}>
                  <button
                    type="button"
                    onClick={() => decide('allowed')}
                    disabled={status !== 'waiting'}
                    className={`${s.actionBtn} ${s.btnAllow}`}
                  >
                    ✓ Allow Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => decide('denied')}
                    disabled={status !== 'waiting'}
                    className={`${s.actionBtn} ${s.btnDeny}`}
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>

              <div className={s.gateLogCard}>
                <div className={s.logTitle}>Recent Gate Log</div>
                <div className={s.logList}>
                  {log.map((item) => (
                    <div key={item.id} className={s.logRow}>
                      <span className={`${s.logDot} ${item.result === 'allowed' ? s.dotAllow : s.dotDeny}`} />
                      <span className={s.logName}>{item.name}</span>
                      <span className={s.logTime}>{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Security copy & 6 feature items */}
          <div className={s.copySide}>
            <div className={s.badge}>
              <span>🛡️</span> SECURITY FIRST
            </div>
            <h2 className={s.title}>
              A Safer Community <br />
              <span className={s.greenAccent}>for Everyone</span>
            </h2>
            <p className={s.desc}>
              Advanced security tools to keep your society safe and secure 24×7 with smart gate access,
              real-time monitoring, and instant visitor management.
            </p>

            <div className={s.pillarsGrid}>
              {SECURITY_PILLARS.map((p) => (
                <div key={p.title} className={s.pillarItem}>
                  <div className={s.pillarIcon}>{p.icon}</div>
                  <div>
                    <h3 className={s.pillarTitle}>{p.title}</h3>
                    <p className={s.pillarDesc}>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={s.ctaContainer}>
              <Link href="/guard/login" className={s.guardCtaBtn}>
                Explore Guard Gate Console →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
