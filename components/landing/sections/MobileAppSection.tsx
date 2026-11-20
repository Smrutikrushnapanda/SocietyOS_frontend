'use client';

import React, { useState } from 'react';
import s from './MobileAppSection.module.css';

export default function MobileAppSection() {
  const [activeTab, setActiveTab] = useState<'resident' | 'guard' | 'admin'>('resident');

  return (
    <section id="mobile-app" className={s.section}>
      <div className={s.container}>
        <div className={s.header}>
          <div className={s.badge}>
            <span>📱</span> Mobile Applications
          </div>
          <h2 className={s.title}>
            Powerful Apps for <br />
            <span className={s.highlight}>Every Stakeholder</span>
          </h2>
          <p className={s.subtitle}>
            Dedicated mobile apps for Residents, Security Guards, and Society Admins. Access your society
            anytime, from anywhere.
          </p>
        </div>

        <div className={s.grid}>
          {/* Feature List */}
          <div className={s.cardList}>
            <div className={s.roleCard}>
              <div className={s.cardHead}>
                <div className={s.cardIcon}>📲</div>
                <h3 className={s.cardTitle}>Resident App (iOS & Android)</h3>
              </div>
              <p className={s.cardDesc}>
                Pre-approve delivery partners, pay maintenance invoices via UPI/Cards in 1 tap, raise
                tracked tickets, and book clubhouses.
              </p>
            </div>

            <div className={s.roleCard}>
              <div className={s.cardHead}>
                <div className={s.cardIcon}>🛡️</div>
                <h3 className={s.cardTitle}>Security Guard App</h3>
              </div>
              <p className={s.cardDesc}>
                Lightning-fast visitor entry logging with quick camera QR scan, vehicle plate capture,
                and instant resident call back.
              </p>
            </div>

            <div className={s.roleCard}>
              <div className={s.cardHead}>
                <div className={s.cardIcon}>📊</div>
                <h3 className={s.cardTitle}>Admin & Committee Portal</h3>
              </div>
              <p className={s.cardDesc}>
                Live collection statistics, staff attendance logs, asset status, digital notice broadcasts,
                and audit reports on your palm.
              </p>
            </div>

            <div className={s.storeButtons}>
              <button type="button" className={s.storeBtn}>
                <span>▶</span> Google Play Store
              </button>
              <button type="button" className={s.storeBtn}>
                <span>🍏</span> Apple App Store
              </button>
            </div>
          </div>

          {/* Interactive Phone Mockup */}
          <div className={s.mockupWrapper}>
            <div className={s.phoneFrame}>
              <div className={s.phoneScreen}>
                <div className={s.notch} />
                <div className={s.screenHeader}>
                  <div className={s.userRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={s.avatar}>SP</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '750' }}>Smruti Panda</div>
                        <div style={{ fontSize: '11px', opacity: 0.85 }}>Greenwood Heights</div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        background: 'rgba(255,255,255,0.2)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      Flat B-402
                    </span>
                  </div>
                </div>

                {/* Tab Switcher inside phone */}
                <div className={s.tabSwitch}>
                  {(['resident', 'guard', 'admin'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`${s.tabBtn} ${activeTab === tab ? s.tabBtnActive : ''}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Dynamic Screen Body */}
                <div className={s.screenBody}>
                  {activeTab === 'resident' && (
                    <>
                      <div className={s.actionCard}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Pending Maintenance</div>
                          <div style={{ fontSize: '16px', fontWeight: '850', color: '#035F4F' }}>₹3,500 DUE</div>
                        </div>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: '750',
                            background: '#035F4F',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: '8px',
                          }}
                        >
                          Pay Now
                        </span>
                      </div>
                      <div className={s.actionCard}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '750', color: '#0f172a' }}>Pre-approve</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Create quick WhatsApp pass</div>
                        </div>
                        <span style={{ fontSize: '18px' }}>🎟️</span>
                      </div>
                      <div className={s.actionCard}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '750', color: '#0f172a' }}>Clubhouse Booking</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Available slot: Tomorrow 6 PM</div>
                        </div>
                        <span style={{ fontSize: '18px' }}>🏸</span>
                      </div>
                    </>
                  )}

                  {activeTab === 'guard' && (
                    <>
                      <div
                        style={{
                          background: '#035F4F',
                          color: '#fff',
                          padding: '18px',
                          borderRadius: '16px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '32px', marginBottom: '6px' }}>📷</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800' }}>Scan Visitor QR Code</div>
                        <div style={{ fontSize: '11px', opacity: 0.85 }}>Hold camera over guest pass</div>
                      </div>
                      <div className={s.actionCard}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '750', color: '#0f172a' }}>Courier Logged</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Amazon • Flat A-1103</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '750', color: '#10b981' }}>Allowed</span>
                      </div>
                    </>
                  )}

                  {activeTab === 'admin' && (
                    <>
                      <div className={s.actionCard}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Monthly Collection Rate</div>
                          <div style={{ fontSize: '18px', fontWeight: '850', color: '#035F4F' }}>86% (₹12.45L)</div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '750', color: '#16A085' }}>+12%</span>
                      </div>
                      <div className={s.actionCard}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '750', color: '#0f172a' }}>Staff On Duty</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>14 of 16 Guards & Housekeeping</div>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '750',
                            background: '#e6f4f1',
                            color: '#035F4F',
                            padding: '4px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          Active
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
