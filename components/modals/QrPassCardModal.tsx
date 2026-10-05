'use client';

import React from 'react';
import { useModalStore, useToastStore, useSocietyStore } from '../../store';
import {
  IconTicket,
  IconClose,
  IconCalendar,
  IconCopy,
  IconCheck,
  IconWhatsApp
} from '../common/Icons';

export const QrPassCardModal: React.FC = () => {
  const { qrPassData, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const { society } = useSocietyStore();

  if (!qrPassData) return null;

  const passCode = qrPassData.passCode || qrPassData.id;
  const guestName = qrPassData.guestName;
  const phone = qrPassData.phone;
  const flat = qrPassData.flat;
  const validRange = qrPassData.validityDisplay;
  const gate = qrPassData.gate;
  const vehicle = qrPassData.vehicleNo || 'To be logged by Guard at Gate';

  const waText = encodeURIComponent(
    `*${society.name} Digital Guest FastPass*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Guest:* ${guestName} (${phone})\n` +
      `*Visiting:* Flat ${flat} • Aarav Sharma\n` +
      `*Validity:* ${validRange}\n` +
      `*Allowed Gate:* ${gate}\n` +
      `*FastPass Code:* ${passCode}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Gate Entry Instructions:*\n` +
      `Show this QR Code to security guard at the gate terminal. Boom barrier will open instantly with 1-tap scan!\n` +
      `Digital Pass: https://societyos.app/pass/${passCode}`
  );

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(passCode);
      showToast(`Pass code ${passCode} copied!`);
    }
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="qr-pass-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet" style={{ maxHeight: '92vh' }}>
        <div className="sheet-handle"></div>

        {/* Header */}
        <div className="drawer-header" style={{ marginBottom: '8px' }}>
          <div className="drawer-header-left">
            <div className="drawer-header-icon saffron">
              <IconTicket size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Digital QR Guest Pass</h3>
              <p>Pre-approved by Resident • FastGate Entry</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {/* Digital Pass Hologram Card */}
        <div className="qr-digital-pass-card">
          <div className="qr-pass-header">
            <div>
              <strong style={{ fontSize: '0.875rem', letterSpacing: '0.5px', color: '#ffffff' }}>
                SocietyOS FASTPASS
              </strong>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                {society.name} • Gate Terminal
              </div>
            </div>
            <span className="qr-pass-badge">
              <span className="sync-dot" style={{ background: '#4ade80' }}></span>
              PRE-APPROVED
            </span>
          </div>

          {/* High-Contrast Vector QR Box */}
          <div className="qr-code-box">
            <svg viewBox="0 0 100 100" fill="#143f35">
              <rect x="0" y="0" width="30" height="30" fill="#143f35" />
              <rect x="5" y="5" width="20" height="20" fill="#ffffff" />
              <rect x="9" y="9" width="12" height="12" fill="#143f35" />

              <rect x="70" y="0" width="30" height="30" fill="#143f35" />
              <rect x="75" y="5" width="20" height="20" fill="#ffffff" />
              <rect x="79" y="9" width="12" height="12" fill="#143f35" />

              <rect x="0" y="70" width="30" height="30" fill="#143f35" />
              <rect x="5" y="75" width="20" height="20" fill="#ffffff" />
              <rect x="9" y="79" width="12" height="12" fill="#143f35" />

              {/* Micro QR Matrix Blocks */}
              <rect x="36" y="6" width="6" height="6" />
              <rect x="46" y="6" width="6" height="6" />
              <rect x="56" y="6" width="6" height="6" />
              <rect x="36" y="16" width="16" height="6" />
              <rect x="36" y="26" width="6" height="6" />
              <rect x="46" y="26" width="16" height="6" />
              <rect x="6" y="36" width="16" height="6" />
              <rect x="26" y="36" width="6" height="6" />
              <rect x="36" y="36" width="16" height="16" />
              <rect x="56" y="36" width="16" height="6" />
              <rect x="76" y="36" width="18" height="6" />
              <rect x="6" y="46" width="6" height="6" />
              <rect x="16" y="46" width="16" height="6" />
              <rect x="56" y="46" width="16" height="16" />
              <rect x="76" y="46" width="6" height="16" />
              <rect x="6" y="56" width="16" height="6" />
              <rect x="26" y="56" width="6" height="6" />
              <rect x="86" y="56" width="8" height="6" />
              <rect x="36" y="56" width="6" height="6" />
              <rect x="46" y="66" width="16" height="6" />
              <rect x="66" y="66" width="28" height="6" />
              <rect x="36" y="76" width="16" height="6" />
              <rect x="56" y="76" width="6" height="18" />
              <rect x="66" y="76" width="16" height="6" />
              <rect x="36" y="86" width="6" height="8" />
              <rect x="46" y="86" width="6" height="8" />
              <rect x="76" y="86" width="18" height="8" />
            </svg>
            <div className="qr-pass-code-pill">{passCode}</div>
          </div>

          {/* Guest & Pass Details Dossier */}
          <div className="qr-pass-details-grid">
            <div className="qr-detail-item">
              <label>Guest Name</label>
              <span>{guestName}</span>
            </div>
            <div className="qr-detail-item">
              <label>Mobile Number</label>
              <span>{phone}</span>
            </div>
            <div className="qr-detail-item">
              <label>Visiting Flat</label>
              <span>Flat {flat} • Host Aarav</span>
            </div>
            <div className="qr-detail-item">
              <label>Vehicle Plate</label>
              <span>{vehicle}</span>
            </div>
            <div className="qr-detail-item" style={{ gridColumn: 'span 2' }}>
              <label>Valid Window & Date Range</label>
              <span style={{ color: '#e08a2c', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <IconCalendar size={13} />
                <span>{validRange}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a
            href={`https://api.whatsapp.com/send?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn whatsapp-share-btn"
            style={{ padding: '12px', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => showToast('Opening WhatsApp to share pass...')}
          >
            <IconWhatsApp size={18} />
            <span>Share Pass via WhatsApp</span>
          </a>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={handleCopy}
            >
              <IconCopy size={14} />
              <span>Copy Pass Code</span>
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1.2, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => {
                closeModal();
                showToast('Pass ready for Gate Scan!');
              }}
            >
              <IconCheck size={14} />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
