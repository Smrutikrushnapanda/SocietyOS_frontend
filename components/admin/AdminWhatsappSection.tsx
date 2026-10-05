'use client';

import React, { useState } from 'react';
import { useToastStore } from '../../store';

export const AdminWhatsappSection: React.FC = () => {
  const { showToast } = useToastStore();

  const [smsFallback, setSmsFallback] = useState(true);
  const [emailFallback, setEmailFallback] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const templates = [
    {
      name: 'visitor_gate_approval_v2',
      category: 'AUTHENTICATION & SECURITY',
      preview: 'Namaste {{1}}, a visitor {{2}} has arrived at {{3}} for Flat {{4}}. Reply YES to approve entry or NO to deny.',
      status: 'APPROVED BY META'
    },
    {
      name: 'maintenance_due_reminder_v1',
      category: 'UTILITY & PAYMENTS',
      preview: 'Dear {{1}}, your maintenance bill of ₹{{2}} for {{3}} is due. Click to pay instantly via UPI: {{4}}',
      status: 'APPROVED BY META'
    },
    {
      name: 'society_circular_broadcast',
      category: 'MARKETING / GENERAL NOTICE',
      preview: 'GREENWOOD NOTICE: {{1}}. For full circular & details, tap here: {{2}}',
      status: 'APPROVED BY META'
    }
  ];

  const testHandshake = () => {
    setIsPinging(true);
    setTimeout(() => {
      setIsPinging(false);
      showToast('Meta Cloud API Ping 200 OK — Round-trip latency: 84ms');
    }, 900);
  };

  return (
    <div className="admin-section active" id="section-whatsapp">
      <div className="section-header">
        <div>
          <h2>WhatsApp Cloud API Integration</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Official Meta Cloud API connection, notification templates and fallbacks.
          </p>
        </div>
      </div>

      <div className="whatsapp-grid">
        {/* Left: Status Card */}
        <div className="wa-status-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="badge badge-success" style={{ padding: '4px 10px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  background: 'var(--success)',
                  borderRadius: '50%',
                  display: 'inline-block',
                  marginRight: '6px'
                }}
              ></span>
              Connected
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>Today, 03:45 PM</span>
          </div>

          <div style={{ marginTop: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>Greenwood Heights RWA</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--pine)', fontWeight: 600 }}>+91 98200 88990</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '4px' }}>
              Tier: Meta Verified Business Account
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '14px' }}>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={testHandshake} disabled={isPinging}>
              {isPinging ? 'Pinging Meta API...' : 'Test Meta Handshake Ping'}
            </button>
          </div>

          <div
            style={{
              backgroundColor: 'var(--surface-sunken)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              color: 'var(--neutral)',
              marginTop: '12px'
            }}
          >
            Inbound responses from residents (e.g. &quot;YES&quot; to approve visitor) are processed in under 400ms.
          </div>
        </div>

        {/* Right: Templates & Fallbacks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1.05rem' }}>Configured Message Templates</h3>
          <div className="wa-template-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {templates.map((tpl, i) => (
              <div
                key={i}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--border-subtle)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ fontWeight: 700, color: 'var(--pine)' }}>{tpl.name}</code>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                    {tpl.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>{tpl.category}</div>
                <div
                  style={{
                    background: 'var(--surface-sunken)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontStyle: 'italic',
                    color: 'var(--ink)'
                  }}
                >
                  &quot;{tpl.preview}&quot;
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: '1.05rem', marginTop: '12px' }}>Fallback Notification Channels</h3>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>SMS Fallback</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                  Sends SMS if WhatsApp delivery fails or user is offline for &gt;5 mins.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={smsFallback}
                  onChange={(e) => {
                    setSmsFallback(e.target.checked);
                    showToast(`SMS fallback ${e.target.checked ? 'enabled' : 'disabled'}`);
                  }}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Email Digest Fallback</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                  Sends notice PDF circulars and monthly ledger statements to registered emails.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={emailFallback}
                  onChange={(e) => {
                    setEmailFallback(e.target.checked);
                    showToast(`Email fallback ${e.target.checked ? 'enabled' : 'disabled'}`);
                  }}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
