'use client';

import React from 'react';
import { useResidentStore, useSocietyStore, useModalStore, useToastStore } from '../../store';
import {
  IconQrCode,
  IconClose,
  IconDownload
} from '../common/Icons';

export const MyQrGatePassModal: React.FC = () => {
  const { resident } = useResidentStore();
  const { society } = useSocietyStore();
  const { closeModal } = useModalStore();
  const { showToast } = useToastStore();

  const handleSaveToWallet = () => {
    showToast('Pass saved to Apple/Google Wallet');
    closeModal();
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="qr-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet">
        <div className="sheet-handle"></div>
        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon saffron">
              <IconQrCode size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Resident FastGate Pass</h3>
              <p>NFC & QR barrier sync</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        <div className="digital-qr-card">
          <div className="qr-mock-code">
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect width="7" height="7" x="3" y="3" />
              <rect width="7" height="7" x="14" y="3" />
              <rect width="7" height="7" x="3" y="14" />
              <rect width="3" height="3" x="14" y="14" />
              <rect width="3" height="3" x="18" y="18" />
            </svg>
            <span style={{ marginTop: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>
              {society.name.toUpperCase().replace(/\s+/g, '')}-{resident.flat.replace('-', '')}
            </span>
          </div>
          <strong
            style={{
              fontSize: '1.05rem',
              color: 'var(--pine-dark)',
              display: 'block',
              marginTop: '6px'
            }}
          >
            {resident.name}
          </strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
            {resident.towerLabel.split('• ')[1] || 'Tower A #101'} • FastTag {resident.vehicleNo}
          </div>
          <div
            style={{
              fontSize: '0.6875rem',
              color: 'var(--success)',
              fontWeight: 700,
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#dcfce7',
              padding: '3px 10px',
              borderRadius: '99px'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#16a34a'
              }}
            ></span>
            PASS ACTIVE & VALID AT ALL GATES
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal}>
            Close
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleSaveToWallet}
          >
            <IconDownload size={16} />
            <span>Save to Wallet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
