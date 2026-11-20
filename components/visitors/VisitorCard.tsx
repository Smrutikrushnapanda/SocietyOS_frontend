import React, { useState } from 'react';
import { Visitor } from '../../types';
import { Badge } from '../common/Badge';
import { useVisitorStore, useToastStore, useModalStore, useResidentStore, useSocietyStore } from '../../store';
import { IconCar, IconClock, IconCalendar, IconCheck, IconShare, IconWhatsApp, IconCopy, IconDownload } from '../common/Icons';
import { getVisitPass, sendVisitPassWhatsApp } from '../../lib/api/visitors.api';

interface VisitorCardProps {
  visitor: Visitor;
  highlighted?: boolean;
}

export const VisitorCard: React.FC<VisitorCardProps> = ({ visitor, highlighted = false }) => {
  const visitDate = visitor.visitDate ? new Date(visitor.visitDate) : null;
  const hasVisitDate = visitDate && Number.isFinite(visitDate.getTime());
  const { approveMyVisitor, rejectMyVisitor } = useVisitorStore();
  const { showToast } = useToastStore();
  const { openModal } = useModalStore();
  const { resident } = useResidentStore();
  const { society } = useSocietyStore();

  const [isSharing, setIsSharing] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);

  const handleApprove = async () => {
    if (isDeciding) return;
    setIsDeciding(true);
    try {
      await approveMyVisitor(visitor.id);
      showToast(`Visitor ${visitor.name} approved.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not approve visitor.', 'error');
    } finally {
      setIsDeciding(false);
    }
  };

  const handleDeny = async () => {
    if (isDeciding) return;
    setIsDeciding(true);
    try {
      await rejectMyVisitor(visitor.id);
      showToast(`Visitor ${visitor.name} entry rejected.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not reject visitor.', 'error');
    } finally {
      setIsDeciding(false);
    }
  };

  /**
   * Helper to resolve or fetch the authoritative digital pass
   */
  const resolveDigitalPass = async () => {
    const passDetails = await getVisitPass(visitor.id);
    return {
      passCode: passDetails.passCode,
      id: passDetails.passId,
      guestName: passDetails.visitorName || visitor.name,
      phone: passDetails.visitorPhone || visitor.phone,
      flat: passDetails.flat || resident?.flat || visitor.flat || '—',
      vehicleNo: visitor.vehicleNo,
      validityDisplay: passDetails.validityEnd ? `Valid till ${new Date(passDetails.validityEnd).toLocaleString('en-IN')}` : 'Validity unavailable',
      validityStart: passDetails.validityStart,
      validityEnd: passDetails.validityEnd,
      qrToken: passDetails.qrToken,
      qrImageData: passDetails.qrImageData,
      status: passDetails.passStatus,
    };
  };

  /**
   * Share QR Pass: Directly opens the detailed QR Pass sheet modal
   */
  const handleSharePass = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await handleOpenPassModal();
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Objective 3 (Mode B): SocietyOS WhatsApp dispatch via backend WAHA integration
   */
  const handleSendViaWhatsApp = async () => {
    if (isSendingWhatsApp) return;
    setIsSendingWhatsApp(true);

    try {
      showToast(`Dispatching pass to ${visitor.name} via SocietyOS WhatsApp...`);
      const result = await sendVisitPassWhatsApp(visitor.id);

      if (result.success) {
        showToast(`Pass sent to +${result.recipient} via WhatsApp!`);
      } else {
        const errorMsg = result.error || 'WhatsApp session not connected. Opening direct WhatsApp...';
        showToast(errorMsg);
        // Fall back to direct Mode A sharing with WhatsApp prefilled
        const pass = await resolveDigitalPass();
        const cleanDigits = (pass.phone || visitor.phone || '').replace(/\D/g, '');
        const guest10 = cleanDigits.slice(-10);
        const targetNumber = guest10.length === 10 ? `91${guest10}` : cleanDigits;
        const waMsg =
          `✨ *WELCOME TO ${society?.name || 'SOCIETY'}!* ✨\n` +
          `🎫 *DIGITAL VISITOR FASTPASS TICKET*\n` +
          `👋 Guest: *${pass.guestName}*\n` +
          `🔑 FastPass Code: *${pass.passCode}*\n` +
          `QR token: ${pass.qrToken}. Ask your host to share the QR image, or show this full code to security.`;
        const directWaUrl = targetNumber
          ? `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encodeURIComponent(waMsg)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;
        window.open(directWaUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      const msg = err?.message || 'Could not send via SocietyOS WhatsApp. Opening direct WhatsApp...';
      showToast(msg);
      // Open modal fallback
      handleSharePass();
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleOpenPassModal = async () => {
    try {
      const pass = await resolveDigitalPass();
      const hostName = resident?.name || 'Resident';
      openModal('qrPassCard', {
        id: pass.id,
        visitId: visitor.id,
        qrImageData: pass.qrImageData,
        passCode: pass.passCode,
        guestName: pass.guestName,
        phone: pass.phone || '',
        purpose: visitor.purpose || 'Visit',
        flat: pass.flat || '—',
        resident: hostName,
        startDate: pass.validityStart?.slice(0, 10) || '',
        endDate: pass.validityEnd?.slice(0, 10) || '',
        validityDisplay: pass.validityDisplay,
        gate: 'Main Gate Terminal',
        vehicleNo: pass.vehicleNo || null,
        status: pass.status,
        createdAt: '',
        qrToken: pass.qrToken,
      });
    } catch (err: any) {
      const msg = err?.message || 'Digital pass code is not available for this visit.';
      showToast(msg);
    }
  };

  return (
    <div
      id={`visitor-${visitor.id}`}
      tabIndex={-1}
      className="mobile-visitor-card"
      style={{ cursor: 'pointer', outline: highlighted ? '2px solid var(--pine)' : undefined }}
      onClick={handleOpenPassModal}
    >
      <div className="mobile-visitor-top">
        <div>
          <strong style={{ fontSize: '0.875rem' }}>{visitor.name}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
            {visitor.purpose} • Flat {visitor.flat}
          </div>
          <div className="visitor-card-date" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: '0.75rem', color: 'var(--neutral)' }}>
            <IconCalendar size={13} aria-hidden="true" />
            {hasVisitDate ? <time dateTime={visitor.visitDate}>{visitDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</time> : <span>Date unavailable</span>}
          </div>
          {visitor.vehicleNo && (
            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--neutral)',
                fontFamily: 'monospace',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '2px'
              }}
            >
              <IconCar size={12} />
              <span>{visitor.vehicleNo}</span>
            </div>
          )}
        </div>
        <Badge
          variant={
            visitor.status === 'approved'
              ? 'pine'
              : visitor.status === 'checked-in'
              ? 'success'
              : visitor.status === 'checked-out'
              ? 'neutral'
              : 'warning'
          }
        >
          {visitor.status}
        </Badge>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.7rem',
          color: 'var(--neutral)',
          marginTop: '6px'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <IconClock size={12} />
          <span>{visitor.requestedAt}</span>
        </span>
        {visitor.notifiedViaWhatsApp && (
          <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <IconCheck size={12} />
            <span>WhatsApp synced</span>
          </span>
        )}
      </div>

      <div
        className="mobile-visitor-actions"
        style={{ display: 'flex', gap: '6px', marginTop: '10px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {visitor.status === 'requested' ? (
          <>
            <button
              className="btn btn-sm btn-primary"
              disabled={isDeciding}
              style={{ flex: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                void handleApprove();
              }}
            >
              Approve
            </button>
            <button
              className="btn btn-sm btn-danger"
              disabled={isDeciding}
              onClick={(e) => {
                e.stopPropagation();
                void handleDeny();
              }}
            >
              Deny
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-sm btn-ghost"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                fontSize: '0.75rem',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSharePass();
              }}
              disabled={isSharing}
            >
              <IconShare size={13} />
              <span>{isSharing ? 'Loading...' : 'Share QR Pass'}</span>
            </button>

            <button
              className="btn btn-sm btn-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '0.75rem',
                color: '#25D366',
                borderColor: 'rgba(37, 211, 102, 0.3)',
              }}
              title="Send pass via SocietyOS WhatsApp"
              onClick={(e) => {
                e.stopPropagation();
                handleSendViaWhatsApp();
              }}
              disabled={isSendingWhatsApp}
            >
              <IconWhatsApp size={14} />
              <span>{isSendingWhatsApp ? 'Sending...' : 'WhatsApp'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
