'use client';

import React from 'react';
import { usePaymentStore, useModalStore, useSocietyStore } from '../../store';
import {
  IconCreditCard,
  IconClose,
  IconLock,
} from '../common/Icons';

export const UpiPaymentModal: React.FC = () => {
  const { maintenanceDue } = usePaymentStore();
  const { society } = useSocietyStore();
  const { closeModal } = useModalStore();

  const dueAmount = maintenanceDue ? maintenanceDue.due - maintenanceDue.paid : 0;
  const payAmount = dueAmount > 0 ? dueAmount : 0;

  return (
    <div
      className="mobile-modal-overlay"
      id="upi-payment-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet">
        <div className="sheet-handle"></div>

        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon saffron">
              <IconCreditCard size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Maintenance Payment</h3>
              <p>Payment details & bank transfer options</p>
            </div>
          </div>
          <button
            className="drawer-close-btn"
            onClick={closeModal}
            aria-label="Close"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Bill Breakdown Mini Summary */}
        <div
          style={{
            background: 'linear-gradient(180deg, var(--surface-sunken), #ffffff)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--neutral)', fontWeight: 600 }}>
            OUTSTANDING AMOUNT {maintenanceDue ? `(${maintenanceDue.period})` : ''}
          </span>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--pine-dark)', margin: '4px 0' }}>
            ₹{payAmount.toLocaleString('en-IN')}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
            Payable to: {society.name || 'Society'} Account
          </span>
        </div>

        {/* Honest Status: Payment Gateway Limitation */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <IconLock size={18} style={{ color: 'var(--pine)', flexShrink: 0 }} />
            <strong style={{ fontSize: '0.875rem', color: 'var(--pine-dark)' }}>
              Online Gateway Coming Soon
            </strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)', lineHeight: 1.5, margin: 0 }}>
            Direct online gateway checkout (UPI 1-Click / Net Banking / Cards) is not yet enabled for this society.
          </p>
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              background: '#ffffff',
              borderRadius: '6px',
              border: '1px dashed #cbd5e1',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--neutral-dark)', marginBottom: '4px' }}>
              Offline / Bank Transfer Payment:
            </div>
            <div>Please deposit or transfer to the society office and request the Society Admin to record your payment receipt against your flat.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={closeModal}
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
