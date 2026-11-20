'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google';
import apiClient from '../../lib/api/client';
import s from './SocietyHero.module.css';

/* ─────────────────────────────────────────────────────────────
   EDIT THESE: your society's details. Everything on the page
   that is "sample data" is driven from here.
   ───────────────────────────────────────────────────────────── */
const SOCIETY = {
  name: 'Your Society Name',
  totalFlats: 412,
  paidFlats: 354, // this month's maintenance, shown in the dues card
};

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

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

interface WeatherInfo {
  temperature: number;
  condition: string;
  location: string;
}

const VISITORS: Visitor[] = [
  { name: 'Rohan Das', detail: 'Courier · for Flat B-402', car: '#C8553D', tint: '#FBE4DC' },
  { name: 'Meera Pattnaik', detail: 'Guest · for Flat A-1103', car: '#F1F5F9', tint: '#DDEBFA' },
  { name: 'Sanjay Electricals', detail: 'Vendor · booked by C-205', car: '#2F6FB0', tint: '#FDF0CF' },
];

const SEED_LOG: LogEntry[] = [
  { id: 'seed-1', name: 'Aman Verma', result: 'allowed', time: '09:40' },
  { id: 'seed-2', name: 'Grocery delivery', result: 'allowed', time: '09:12' },
];

const nowLabel = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

/* ── Small inline icons (no emoji, so they render the same everywhere) ── */
const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const FEATURES = [
  {
    title: 'Visitors at the gate',
    text: 'Residents approve or decline entries from their phone.',
    icon: (
      <Icon>
        <path d="M5 21V4h9v17M14 8l5 1.5V21M3 21h18" />
        <circle cx="11" cy="13" r="0.8" fill="currentColor" />
      </Icon>
    ),
  },
  {
    title: 'Dues and receipts',
    text: 'Maintenance is collected online and receipts go out on their own.',
    icon: (
      <Icon>
        <rect x="3" y="6" width="18" height="13" rx="3" />
        <path d="M3 10h18M16 14.5h2" />
      </Icon>
    ),
  },
  {
    title: 'Complaints',
    text: 'Raised by residents, assigned to staff, closed with a record.',
    icon: (
      <Icon>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M8.5 10.5l2 2 4-4" />
      </Icon>
    ),
  },
  {
    title: 'Notices',
    text: 'One post reaches every flat, with no WhatsApp group needed.',
    icon: (
      <Icon>
        <path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z" />
        <path d="M10 21h4" />
      </Icon>
    ),
  },
];

export default function SocietyHero() {
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>('waiting');
  const [log, setLog] = useState<LogEntry[]>(SEED_LOG);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  const visitor = VISITORS[idx];
  const pct = SOCIETY.paidFlats / SOCIETY.totalFlats;

  /* Live weather from your existing backend. Silent if unavailable. */
  const fetchWeather = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/weather/current');
      const data = res.data?.data || res.data;
      if (data && typeof data.temperature === 'number') {
        setWeather({
          temperature: data.temperature,
          condition: data.condition ?? 'Clear',
          location: data.location ?? '',
        });
      }
    } catch {
      /* offline or not configured: the chip simply stays hidden */
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void fetchWeather();
  }, [fetchWeather]);

  const decide = useCallback(
    (result: Result) => {
      if (status !== 'waiting') return;
      setStatus(result);
      setLog((prev) =>
        [{ id: `${Date.now()}`, name: visitor.name, result, time: nowLabel() }, ...prev].slice(0, 3)
      );
    },
    [status, visitor.name]
  );

  /* Demo loop: a request arrives, gets approved automatically unless the
     visitor of the page acts first (or hovers/focuses the demo). */
  useEffect(() => {
    if (status !== 'waiting' || paused) return;
    const t = setTimeout(() => decide('allowed'), 5200);
    return () => clearTimeout(t);
  }, [status, paused, decide]);

  useEffect(() => {
    if (status === 'waiting') return;
    const t = setTimeout(() => {
      setIdx((i) => (i + 1) % VISITORS.length);
      setStatus('waiting');
    }, 3800);
    return () => clearTimeout(t);
  }, [status]);

  const carClass =
    status === 'allowed' ? s.carPass : status === 'denied' ? s.carBack : '';

  return (
    <div className={`${s.hero} ${display.variable} ${body.variable}`}>
      {/* ── Navigation ── */}
      <header className={s.nav}>
        <Link href="/" className={s.brand}>
          <span className={s.brandMark}>{SOCIETY.name.charAt(0)}</span>
          <span className={s.brandName}>{SOCIETY.name}</span>
        </Link>

        <nav className={s.navLinks} aria-label="Primary">
          <Link href="#features" className={s.navLink}>Features</Link>
          <Link href="#pricing" className={s.navLink}>Pricing</Link>
          <Link href="#faq" className={s.navLink}>FAQ</Link>
          <Link href="#contact" className={s.navLink}>Contact</Link>
        </nav>

        <div className={s.navActions}>
          <Link href="/login" className={s.signIn}>Sign in</Link>
          <Link href="/admin/login" className={s.btnSolid}>Get started</Link>
        </div>
      </header>

      <main className={s.main}>
        {/* ── Copy ── */}
        <section className={s.copy}>
          <h1 className={s.headline}>A calmer society starts at the gate.</h1>

          <p className={s.lede}>
            Approve visitors, collect dues, resolve complaints and post notices from one place
            that residents, guards and the committee all use.
          </p>

          <div className={s.ctaRow}>
            <Link href="/admin/login" className={s.btnSolid}>See the live demo</Link>
            <Link href="/resident/login" className={s.btnOutline}>Resident login</Link>
          </div>

          <p className={s.ctaNote}>Separate sign-ins for residents and the committee.</p>

          <ul id="features" className={s.features}>
            {FEATURES.map((f) => (
              <li key={f.title} className={s.feature}>
                <span className={s.featureIcon}>{f.icon}</span>
                <span>
                  <span className={s.featureTitle}>{f.title}</span>
                  <span className={s.featureText}>{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Live gate demo ── */}
        <section
          className={s.visual}
          aria-label="Live demo of a visitor request at the society gate"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className={s.stage}>
            <svg viewBox="0 0 560 440" className={s.map} role="img" aria-label="Top-down plan of the society gate and campus">
              {/* ground */}
              <rect width="560" height="440" fill="#D6E6DA" />
              <rect width="200" height="440" fill="#E9EEE9" />

              {/* roads */}
              <rect x="0" y="250" width="560" height="60" fill="#2C3B4E" />
              <line x1="0" y1="280" x2="560" y2="280" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="10 12" />

              {/* boundary wall */}
              <rect x="196" y="0" width="8" height="250" fill="#A9BFAF" />
              <rect x="196" y="310" width="8" height="130" fill="#A9BFAF" />

              {/* trees */}
              {[
                [34, 62, 16], [124, 96, 12], [44, 372, 16], [142, 394, 13],
                [228, 222, 11], [384, 222, 10], [544, 222, 12],
                [226, 334, 11], [376, 334, 10], [534, 334, 12],
              ].map(([cx, cy, r]) => (
                <g key={`${cx}-${cy}`}>
                  <circle cx={cx} cy={cy} r={r} fill="#8DB99B" />
                  <circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r * 0.6} fill="#79AA89" />
                </g>
              ))}

              {/* A wing */}
              <rect x="239" y="76" width="125" height="120" rx="10" fill="#0B1F36" opacity="0.1" />
              <rect x="235" y="70" width="125" height="120" rx="10" fill="#fff" />
              <rect x="245" y="80" width="105" height="100" rx="6" fill="#EEF3F7" />
              <rect x="256" y="90" width="18" height="12" rx="2" fill="#C9D6E2" />
              <rect x="326" y="158" width="14" height="14" rx="2" fill="#C9D6E2" />
              <text x="297" y="138" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0E3B66">A Wing</text>

              {/* B wing */}
              <rect x="404" y="66" width="135" height="130" rx="10" fill="#0B1F36" opacity="0.1" />
              <rect x="400" y="60" width="135" height="130" rx="10" fill="#fff" />
              <rect x="410" y="70" width="115" height="110" rx="6" fill="#EEF3F7" />
              <rect x="420" y="80" width="18" height="12" rx="2" fill="#C9D6E2" />
              <rect x="494" y="158" width="14" height="14" rx="2" fill="#C9D6E2" />
              <text x="467" y="130" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0E3B66">B Wing</text>

              {/* pool + clubhouse */}
              <rect x="250" y="345" width="110" height="62" rx="16" fill="#fff" />
              <rect x="256" y="351" width="98" height="50" rx="12" fill="#BFE0EE" />
              <rect x="405" y="345" width="100" height="62" rx="10" fill="#fff" />
              <rect x="413" y="353" width="84" height="46" rx="6" fill="#E1F2EC" />
              <text x="455" y="381" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1F6E57">Clubhouse</text>

              {/* gate booth */}
              <text x="170" y="226" textAnchor="end" fontSize="11" fontWeight="700" fill="#0E3B66">Main gate</text>
              <rect x="180" y="208" width="44" height="42" rx="8" fill="#0B1F36" opacity="0.15" />
              <rect x="176" y="204" width="44" height="42" rx="8" fill="#0E3B66" />
              <rect x="181" y="209" width="34" height="14" rx="4" fill="#1B5A94" />
              <circle cx="200" cy="252" r="6" fill="#0A2C4D" />

              {/* boom barrier */}
              <g className={`${s.arm} ${status === 'allowed' ? s.armOpen : ''}`}>
                <rect x="197" y="252" width="6" height="56" rx="3" fill="#F4A623" />
                {[264, 282, 300].map((y) => (
                  <rect key={y} x="197" y={y} width="6" height="6" fill="#fff" />
                ))}
              </g>

              {/* decision ripple at the gate */}
              {status !== 'waiting' && (
                <circle
                  key={`${idx}-${status}`}
                  className={`${s.ping} ${status === 'allowed' ? s.pingOk : s.pingNo}`}
                  cx="200"
                  cy="280"
                  r="8"
                />
              )}

              {/* vehicle */}
              <g key={idx} className={`${s.car} ${carClass}`}>
                <rect x="102" y="274" width="56" height="26" rx="10" fill="#000" opacity="0.18" />
                <rect x="100" y="268" width="56" height="26" rx="9" fill={visitor.car} />
                <rect x="118" y="272" width="24" height="18" rx="5" fill="#fff" opacity="0.4" />
                <rect x="151" y="271" width="5" height="5" rx="1.5" fill="#FFF3C4" />
                <rect x="151" y="286" width="5" height="5" rx="1.5" fill="#FFF3C4" />
              </g>
            </svg>

            {weather && (
              <div className={s.weather}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
                <span>
                  {Math.round(weather.temperature)}°C, {weather.condition}
                  {weather.location ? ` · ${weather.location}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Gate request (the interactive moment) */}
          <div className={`${s.card} ${s.cardRequest}`}>
            <div className={s.cardHead}>
              <span className={s.liveDot} />
              <span className={s.cardTitle}>Gate request</span>
              <span className={s.cardMeta}>Main gate</span>
            </div>

            <div className={s.visitorRow}>
              <span className={s.avatar} style={{ background: visitor.tint }}>
                {visitor.name.charAt(0)}
              </span>
              <span>
                <span className={s.visitorName}>{visitor.name}</span>
                <span className={s.visitorDetail}>{visitor.detail}</span>
              </span>
            </div>

            <div className={s.decision} aria-live="polite">
              {status === 'waiting' ? (
                <div className={s.actions}>
                  <button type="button" className={s.btnDecline} onClick={() => decide('denied')}>
                    Decline
                  </button>
                  <button type="button" className={s.btnAllow} onClick={() => decide('allowed')}>
                    Allow entry
                  </button>
                </div>
              ) : (
                <div className={`${s.result} ${status === 'allowed' ? s.resultOk : s.resultNo}`}>
                  <strong>{status === 'allowed' ? 'Entry allowed' : 'Entry declined'}</strong>
                  <span>{status === 'allowed' ? 'Guard notified, gate opening' : 'Guard has been told'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Entry log */}
          <div className={`${s.card} ${s.cardLog}`}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>Today at the gate</span>
            </div>
            <ul className={s.logList}>
              {log.map((entry) => (
                <li key={entry.id} className={s.logRow}>
                  <span className={`${s.logDot} ${entry.result === 'allowed' ? s.dotOk : s.dotNo}`} />
                  <span className={s.logName}>{entry.name}</span>
                  <span className={s.logTime}>
                    {entry.result === 'allowed' ? 'Allowed' : 'Declined'} {entry.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dues */}
          <div className={`${s.card} ${s.cardDues}`}>
            <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className={s.ring}>
              <circle cx="28" cy="28" r={RING_R} fill="none" stroke="#E1F2EC" strokeWidth="6" />
              <circle
                cx="28"
                cy="28"
                r={RING_R}
                fill="none"
                stroke="#1F8A6B"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={mounted ? RING_C * (1 - pct) : RING_C}
                className={s.ringFill}
                transform="rotate(-90 28 28)"
              />
            </svg>
            <div>
              <span className={s.duesLabel}>This month’s maintenance</span>
              <span className={s.duesValue}>
                {SOCIETY.paidFlats} of {SOCIETY.totalFlats} flats paid
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}