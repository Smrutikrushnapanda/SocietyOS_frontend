'use client';

import React, { useState } from 'react';
import { usePaymentStore, useModalStore, useToastStore, useSocietyStore } from '../../store';
import {
  IconCreditCard,
  IconClose,
  IconLock,
  IconLightning
} from '../common/Icons';

const upiApps = [
  { id: 'Google Pay', short: 'GPay', color: '#4285f4', name: 'Google Pay' },
  { id: 'PhonePe', short: 'Pe', color: '#5f259f', name: 'PhonePe' },
  { id: 'Paytm', short: 'Paytm', color: '#00baf2', name: 'Paytm' },
  { id: 'Cred UPI', short: 'CRED', color: '#000000', name: 'Cred UPI' },
  { id: 'BHIM UPI', short: 'BHIM', color: '#00796b', name: 'BHIM UPI' },
  { id: 'Amazon Pay', short: 'Amzn', color: '#ff9900', name: 'Amazon Pay' }
];

export const UpiPaymentModal: React.FC = () => {
  const { maintenanceDue, payWithUpi } = usePaymentStore();
  const { society } = useSocietyStore();
  const { closeModal, openModal } = useModalStore();
  const { showToast } = useToastStore();

  const [selectedApp, setSelectedApp] = useState('Google Pay');
  const [isProcessing, setIsProcessing] = useState(false);

  const dueAmount = maintenanceDue.due - maintenanceDue.paid;
  const payAmount = dueAmount > 0 ? dueAmount : 4500;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const receipt = payWithUpi(selectedApp);
      setIsProcessing(false);
      showToast(`₹${payAmount.toLocaleString('en-IN')} paid successfully via ${selectedApp}!`);
      openModal('receipt', receipt);
    }, 900);
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="upi-payment-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) closeModal();
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
              <h3>UPI 1-Click Payment</h3>
              <p>Instant verified payment & automated receipt</p>
            </div>
          </div>
          <button
            className="drawer-close-btn"
            onClick={closeModal}
            disabled={isProcessing}
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
            padding: '12px 14px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--neutral)', fontWeight: 600 }}>
            PAYABLE AMOUNT ({maintenanceDue.period})
          </span>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--pine-dark)', margin: '4px 0' }}>
            ₹{payAmount.toLocaleString('en-IN')}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
            To: {society.name} Society Account
          </span>
        </div>

        {/* UPI Apps Grid */}
        <div>
          <div className="drawer-section-title">Select UPI App / Wallet</div>
          <div className="upi-app-grid">
            {upiApps.map((app) => (
              <button
                key={app.id}
                type="button"
                className="upi-app-btn"
                style={{
                  borderColor: selectedApp === app.id ? 'var(--pine)' : undefined,
                  background: selectedApp === app.id ? 'var(--pine-tint)' : undefined
                }}
                onClick={() => setSelectedApp(app.id)}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: app.color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    marginBottom: '4px'
                  }}
                >
                  {app.short}
                </div>
                <span>{app.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Security / NPCI Trust Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f0fdf4',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #bbf7d0',
            fontSize: '0.75rem',
            color: '#166534'
          }}
        >
          <IconLock size={15} style={{ flexShrink: 0 }} />
          <span>NPCI 256-bit Encrypted • Zero Transaction Fee for Residents</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={closeModal}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="btn btn-accent"
            style={{ flex: 1.6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handlePay}
            disabled={isProcessing}
          >
            <IconLightning size={16} />
            <span>{isProcessing ? 'Processing UPI...' : `Pay ₹${payAmount.toLocaleString('en-IN')}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
