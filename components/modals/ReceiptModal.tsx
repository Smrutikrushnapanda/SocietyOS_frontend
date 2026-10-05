'use client';

import React from 'react';
import { useModalStore, useToastStore, useSocietyStore } from '../../store';
import {
  IconReceipt,
  IconClose,
  IconCheck,
  IconDownload,
  IconWhatsApp
} from '../common/Icons';

export const ReceiptModal: React.FC = () => {
  const { receiptData, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const { society } = useSocietyStore();

  if (!receiptData) return null;

  return (
    <div
      className="mobile-modal-overlay"
      id="receipt-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet" style={{ maxHeight: '92vh' }}>
        <div className="sheet-handle"></div>

        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon teal">
              <IconReceipt size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Maintenance e-Receipt</h3>
              <p>Official Society Tax & Maintenance Voucher</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {/* Receipt Voucher Box */}
        <div
          style={{
            background: '#ffffff',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            position: 'relative'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '10px',
              marginBottom: '12px'
            }}
          >
            <div>
              <strong style={{ fontSize: '0.9375rem', color: 'var(--pine-dark)' }}>
                {society.name}
              </strong>
              <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
                Reg: {society.regNo}
              </div>
            </div>
            <span
              style={{
                background: '#dcfce7',
                color: '#15803d',
                padding: '3px 8px',
                borderRadius: '99px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <IconCheck size={12} />
              <span>PAID</span>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '0.75rem',
              marginBottom: '12px'
            }}
          >
            <div>
              <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.65rem' }}>
                RECEIPT NO
              </span>
              <strong>{receiptData.receiptNo}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.65rem' }}>
                DATE
              </span>
              <strong>{receiptData.date}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.65rem' }}>
                PAID BY / FLAT
              </span>
              <strong>
                {receiptData.residentName} ({receiptData.flat})
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.65rem' }}>
                PAYMENT METHOD
              </span>
              <strong>{receiptData.method}</strong>
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface-sunken)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}
          >
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              Total Amount Paid:
            </span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--pine-dark)' }}>
              ₹{receiptData.amount.toLocaleString('en-IN')}
            </strong>
          </div>

          <div style={{ fontSize: '0.65rem', color: 'var(--neutral)', textAlign: 'center' }}>
            Reference: {receiptData.refNo} • Computer generated receipt. No physical signature required.
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={() => showToast('Receipt PDF downloaded to device.')}
          >
            <IconDownload size={15} />
            <span>Download PDF</span>
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={() => {
              showToast('Receipt sent to WhatsApp.');
              closeModal();
            }}
          >
            <IconWhatsApp size={16} />
            <span>Share to WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
