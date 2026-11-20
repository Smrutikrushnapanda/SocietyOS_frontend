'use client';

import React, { useState } from 'react';
import { useModalStore, useToastStore, useSocietyStore, useResidentStore } from '../../store';
import {
  IconTicket,
  IconClose,
  IconCalendar,
  IconCopy,
  IconCheck,
  IconWhatsApp,
  IconDownload,
} from '../common/Icons';
import { sendVisitPassWhatsApp } from '../../lib/api/visitors.api';

export const QrPassCardModal: React.FC = () => {
  const { qrPassData, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const { society } = useSocietyStore();
  const { resident } = useResidentStore();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isSendingSocietyWa, setIsSendingSocietyWa] = useState(false);

  if (!qrPassData) return null;

  const hostName = resident?.name || qrPassData.resident || 'Resident';
  const passCode = qrPassData.passCode || qrPassData.id;
  const guestName = qrPassData.guestName;
  const phone = qrPassData.phone;
  const rawFlat = qrPassData.flat && qrPassData.flat !== '—' ? qrPassData.flat : (resident?.flat && resident.flat !== '—' ? resident.flat : 'Registered Unit');
  const flatDisplay = rawFlat.toLowerCase().startsWith('flat') ? rawFlat : `Flat ${rawFlat}`;
  const validRange = qrPassData.validityDisplay;
  const gate = qrPassData.gate || 'All Society Gates';
  const vehicle = qrPassData.vehicleNo || 'To be logged at Gate';
  const societyName = society?.name || 'Our Community';

  // Normalize phone number to direct WhatsApp chat ID (+91 for 10-digit Indian numbers)
  const cleanPhoneDigits = (phone || '').replace(/\D/g, '');
  const guest10Digit = cleanPhoneDigits.length > 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;
  const targetNumber = guest10Digit.length === 10 ? `91${guest10Digit}` : cleanPhoneDigits;

  const qrImageUrl = qrPassData.qrImageData || '';

  const waWelcomeMessage =
    `✨ *WELCOME TO ${societyName}!* ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎫 *DIGITAL VISITOR FASTPASS TICKET*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👋 Dear *${guestName}*,\n` +
    `You have been pre-approved for entry at *${societyName}* by *${hostName}* (${flatDisplay}).\n\n` +
    `🔑 *FastPass Code:* \`${passCode}\`\n` +
    `📅 *Validity Window:* ${validRange}\n` +
    `🚪 *Authorized Entry Gate:* ${gate}\n` +
    `🚗 *Vehicle Plate:* ${vehicle}\n\n` +
    `QR token: ${qrPassData.qrToken || passCode}\n\n` +
    `📌 *Gate Entry Instructions:*\n` +
    `1. Show this QR code image or FastPass code *${passCode}* to the security officer at the gate scanner.\n` +
    `2. Security will verify the pass and record entry.\n\n` +
    `Have a wonderful and safe visit at ${societyName}! 🌟\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Powered by SocietyOS Gate Security_`;

  const waUrl = targetNumber
    ? `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encodeURIComponent(waWelcomeMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(waWelcomeMessage)}`;

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(passCode);
      showToast(`FastPass code ${passCode} copied!`);
    }
  };

  const handleCopyWelcomeMsg = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(waWelcomeMessage);
      showToast('Welcome invitation message copied to clipboard!');
    }
  };

  const handleDownloadQr = async () => {
    try {
      showToast('Downloading QR pass image...');
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `FastPass-${guestName ? guestName.replace(/\s+/g, '_') : 'Guest'}-${passCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      showToast('QR code downloaded successfully!');
    } catch {
      showToast('Could not download QR image. Try sharing or copying the full pass code.', 'error');
    }
  };

  const handleManualShare = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      const blob = await fetch(qrImageUrl).then(response => response.blob());
      const file = new File([blob], 'SocietyOS-guest-pass.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'SocietyOS guest pass', text: waWelcomeMessage });
      } else {
        await handleDownloadQr();
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        showToast('Attach the downloaded QR image in WhatsApp.');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) showToast('Could not share image. Download the QR or copy the pass code.', 'error');
    }
  };

  const handleSendSocietyWhatsApp = async () => {
    if (isSendingSocietyWa) return;
    setIsSendingSocietyWa(true);
    try {
      showToast(`Sending QR pass image to ${guestName} via SocietyOS WhatsApp...`);
      const visitId = qrPassData.visitId || qrPassData.id;
      const result = await sendVisitPassWhatsApp(visitId);
      if (result.success) {
        showToast(`WhatsApp accepted the pass for +${result.recipient}.`);
      } else {
        showToast(result.error || 'WhatsApp service busy. Opening direct WhatsApp...');
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not send via SocietyOS. Opening direct WhatsApp...');
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsSendingSocietyWa(false);
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
      <div
        className="mobile-bottom-sheet"
        style={{
          maxHeight: '92vh',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
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

        {/* Digital Pass Hologram Ticket Card */}
        <div className="qr-digital-pass-card" style={{ overflow: 'hidden' }}>
          <div className="qr-pass-header">
            <div>
              <strong style={{ fontSize: '0.875rem', letterSpacing: '0.5px', color: '#ffffff' }}>
                SocietyOS FASTPASS
              </strong>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                {societyName} • Gate Clearance
              </div>
            </div>
            <span className="qr-pass-badge">
              <span className="sync-dot" style={{ background: '#4ade80' }}></span>
              PRE-APPROVED
            </span>
          </div>

          {/* High-Contrast Beautiful Dynamic QR Code */}
          <div className="qr-code-box" style={{ padding: '12px', background: '#ffffff', borderRadius: '12px' }}>
            <div
              style={{
                width: '140px',
                height: '140px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              {/* Real Scannable High-Definition QR Code Image */}
              <img
                src={qrImageUrl}
                alt={`QR Pass for ${guestName}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: imgLoaded ? 'block' : 'none'
                }}
                onLoad={() => setImgLoaded(true)}
              />

              {!imgLoaded && <span role="status">Loading QR image…</span>}
            </div>
            <div className="qr-pass-code-pill" style={{ letterSpacing: '1px', overflowWrap: 'anywhere', fontSize: '0.75rem' }}>
              {passCode}
            </div>
          </div>

          {/* Guest & Pass Details Dossier */}
          <div className="qr-pass-details-grid">
            <div className="qr-detail-item">
              <label>Guest Name</label>
              <span style={{ fontWeight: 700 }}>{guestName}</span>
            </div>
            <div className="qr-detail-item">
              <label>Mobile Number</label>
              <span>{phone}</span>
            </div>
            <div className="qr-detail-item">
              <label>Visiting Flat</label>
              <span>
                {flatDisplay} • {hostName}
              </span>
            </div>
            <div className="qr-detail-item">
              <label>Vehicle Plate</label>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{vehicle}</span>
            </div>
            <div className="qr-detail-item">
              <label>Authorized Entry Gate</label>
              <span>{gate}</span>
            </div>
            <div className="qr-detail-item">
              <label>Visiting Window & Date Range</label>
              <span style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <IconCalendar size={13} />
                <span>{validRange}</span>
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp & Quick Action Share Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Option 1: Automated SocietyOS Bot Dispatch */}
            <button
              type="button"
              className="btn whatsapp-share-btn"
              style={{
                padding: '12px',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                cursor: isSendingSocietyWa ? 'wait' : 'pointer',
              }}
              disabled={isSendingSocietyWa}
              onClick={handleSendSocietyWhatsApp}
            >
              <IconWhatsApp size={18} />
              <span>
                {isSendingSocietyWa
                  ? 'Sending via SocietyOS WhatsApp...'
                  : `Send via SocietyOS WhatsApp (${targetNumber ? `+${targetNumber}` : 'Guest'})`}
              </span>
            </button>

            {/* Option 2: Send from Resident's Own WhatsApp */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{
                padding: '10px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                borderRadius: 'var(--radius-md)',
                color: '#25D366',
                borderColor: 'rgba(37, 211, 102, 0.35)',
                background: 'rgba(37, 211, 102, 0.05)',
              }}
              onClick={handleManualShare}
            >
              <IconWhatsApp size={16} />
              <span>Send from My Own WhatsApp App</span>
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px'
              }}
              onClick={handleCopyWelcomeMsg}
            >
              <IconCopy size={14} />
              <span>Copy Invitation</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              style={{
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px'
              }}
              onClick={handleCopyCode}
            >
              <IconTicket size={14} />
              <span>Copy Pass Code</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{
                flex: 1,
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={handleDownloadQr}
            >
              <IconDownload size={14} />
              <span>Download QR</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{
                flex: 1.2,
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
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
