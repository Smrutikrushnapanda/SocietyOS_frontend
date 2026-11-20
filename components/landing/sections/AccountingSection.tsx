'use client';

import React from 'react';
import s from './AccountingSection.module.css';

const ACCOUNTING_POINTS = [
  {
    icon: '🧾',
    title: 'Automated Dues Generation',
    desc: 'Configure sq. ft rates, flat formula fees, and auto-dispatch digital invoices with WhatsApp notifications.',
  },
  {
    icon: '💳',
    title: 'Integrated Payment Gateway (UPI / Cards)',
    desc: 'Residents pay instantly via QR, Google Pay, or Credit Cards with zero manual ledger reconciliation.',
  },
  {
    icon: '📈',
    title: 'Society Expense Tracking & Vouchers',
    desc: 'Log generator diesel expenses, security agency payments, and maintenance costs with committee approval.',
  },
  {
    icon: '📑',
    title: 'Comprehensive Financial Reports',
    desc: 'One-click balance sheets, income vs. expense statements, defaulter summaries, and Excel audit sheets.',
  },
  {
    icon: '🔒',
    title: 'Tamper-proof Audit Logs',
    desc: 'Every fee modification, waiver, or ledger update is stamped with the committee member’s digital signature.',
  },
];

export default function AccountingSection() {
  return (
    <section id="accounting" className={s.section}>
      <div className={s.container}>
        <div className={s.grid}>
          {/* Left Financial Visual Card */}
          <div className={s.visualCard}>
            <div className={s.cardHead}>
              <div>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '750',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Financial Overview
                </span>
                <div style={{ fontSize: '22px', fontWeight: '850', color: '#0f172a' }}>
                  October 2026 Summary
                </div>
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: '750',
                  background: '#e6f4f1',
                  color: '#035F4F',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cce8e2',
                }}
              >
                ● Live Audited
              </span>
            </div>

            <div className={s.ringRow}>
              <div className={s.ringDonut}>
                <div className={s.ringCenter}>86%</div>
              </div>
              <div className={s.ringStats}>
                <span className={s.ringBig}>₹12,45,080</span>
                <span className={s.ringSub}>Collected of ₹14,42,000 Total Dues</span>
              </div>
            </div>

            <div className={s.ledgerList}>
              <div className={s.ledgerRow}>
                <span className={s.ledgerLabel}>Maintenance Collections</span>
                <span style={{ fontWeight: '800', color: '#035F4F' }}>₹12,45,080</span>
              </div>
              <div className={s.ledgerRow}>
                <span className={s.ledgerLabel}>Pending Arrears (42 Flats)</span>
                <span style={{ fontWeight: '800', color: '#f59e0b' }}>₹1,96,920</span>
              </div>
              <div className={s.ledgerRow}>
                <span className={s.ledgerLabel}>Monthly Society Expenses</span>
                <span style={{ fontWeight: '800', color: '#ef4444' }}>₹7,12,000</span>
              </div>
              <div className={s.ledgerRow} style={{ borderBottom: 'none' }}>
                <span className={s.ledgerLabel}>Sinking Reserve Fund</span>
                <span style={{ fontWeight: '800', color: '#16A085' }}>₹54,20,000</span>
              </div>
            </div>
          </div>

          {/* Right Copy */}
          <div className={s.copySide}>
            <div className={s.badge}>
              <span>📊</span> Transparent & Simple
            </div>
            <h2 className={s.title}>
              Easy Accounting & <br />
              <span className={s.highlight}>Financial Management</span>
            </h2>
            <p className={s.desc}>
              Eliminate paper receipts and manual spreadsheets. Track maintenance collections,
              vendor payments, and society reserves in one clear audit dashboard.
            </p>

            <div className={s.pointsList}>
              {ACCOUNTING_POINTS.map((pt) => (
                <div key={pt.title} className={s.pointItem}>
                  <div className={s.pointIcon}>{pt.icon}</div>
                  <div>
                    <h4 className={s.pointTitle}>{pt.title}</h4>
                    <p className={s.pointDesc}>{pt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
