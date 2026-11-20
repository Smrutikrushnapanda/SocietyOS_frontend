'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import s from './HeroSection.module.css';

export default function HeroSection() {
  return (
    <section className={s.heroSection}>
      <div className={s.heroGrid}>
        {/* Left Column Copy */}
        <div className={s.heroCopy}>
          <div className={s.heroBadge}>
            <span>✨</span> Next-Gen Residential Management
          </div>
          <h1 className={s.heroHeadline}>
            Manage Your <br />
            Society Smarter, <br />
            <span className={s.heroHighlight}>Not Harder</span>
          </h1>
          <p className={s.heroLede}>
            All your society operations — gate access, visitor tracking, automated maintenance dues,
            complaints desk, and committee accounting — on one unified calm platform.
          </p>

          <div className={s.heroCtaRow}>
            <Link href="/admin/login" className={s.btnPrimary}>
              Get Started Free →
            </Link>
            <Link href="#security" className={s.btnSecondary}>
              ▶ Try Interactive Gate Demo
            </Link>
          </div>

          <div className={s.heroCheckmarks}>
            <div className={s.checkItem}>
              <span className={s.checkDot}>✓</span>
              <span>No Setup Fees</span>
            </div>
            <div className={s.checkItem}>
              <span className={s.checkDot}>✓</span>
              <span>24h Assisted Onboarding</span>
            </div>
            <div className={s.checkItem}>
              <span className={s.checkDot}>✓</span>
              <span>Trusted by 100+ Societies</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual illustration with live telemetry chips */}
        <div className={s.heroVisualWrapper}>
          <div className={s.visualCard}>
            <div className={s.imageFrame}>
              <Image
                src="/images/landing-hero-demo.jpg"
                alt="SocietyOS 3D Community Smart Management Illustration"
                width={680}
                height={440}
                priority
                className={s.heroImg}
              />
            </div>

            {/* Floating Live Telemetry Chips */}
            <div className={`${s.floatingChip} ${s.chipSolar}`}>
              <div className={`${s.chipIcon} ${s.chipSolarIcon}`}>⚡</div>
              <div>
                <div className={s.chipLabel}>Solar Output</div>
                <div className={s.chipVal}>Generating 28.4 kW</div>
              </div>
            </div>

            <div className={`${s.floatingChip} ${s.chipVisitors}`}>
              <div className={`${s.chipIcon} ${s.chipVisitorsIcon}`}>👥</div>
              <div>
                <div className={s.chipLabel}>Today&apos;s Visitors</div>
                <div className={s.chipVal}>14 Verified</div>
              </div>
            </div>

            <div className={`${s.floatingChip} ${s.chipGate}`}>
              <div className={`${s.chipIcon} ${s.chipGateIcon}`}>🚪</div>
              <div>
                <div className={s.chipLabel}>Gate ANPR</div>
                <div className={s.chipVal} style={{ color: '#15803d' }}>
                  ● Barrier Ready
                </div>
              </div>
            </div>

            <div className={`${s.floatingChip} ${s.chipDues}`}>
              <div className={`${s.chipIcon} ${s.chipDuesIcon}`}>💳</div>
              <div>
                <div className={s.chipLabel}>Collections</div>
                <div className={s.chipVal}>92% Collected</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Metrics Bar */}
      <div className={s.metricsBar}>
        <div className={s.metricItem}>
          <div className={s.metricIconBox}>🏢</div>
          <div>
            <div className={s.metricValue}>1,200+</div>
            <div className={s.metricLabel}>Flats Active</div>
          </div>
        </div>
        <div className={s.metricItem}>
          <div className={s.metricIconBox}>🛡️</div>
          <div>
            <div className={s.metricValue}>99.98%</div>
            <div className={s.metricLabel}>Uptime & Security</div>
          </div>
        </div>
        <div className={s.metricItem}>
          <div className={s.metricIconBox}>📉</div>
          <div>
            <div className={s.metricValue}>40%</div>
            <div className={s.metricLabel}>Admin Work Saved</div>
          </div>
        </div>
        <div className={s.metricItem}>
          <div className={s.metricIconBox}>🤝</div>
          <div>
            <div className={s.metricValue}>100+</div>
            <div className={s.metricLabel}>Societies Trust Us</div>
          </div>
        </div>
      </div>
    </section>
  );
}
