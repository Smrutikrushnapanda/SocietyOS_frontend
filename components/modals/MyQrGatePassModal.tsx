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
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <IconQrCode size={28} />
            </div>
            <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--pine-dark)' }}>
              Gate Barrier QR Pass
            </strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral)', marginTop: '4px', lineHeight: 1.4 }}>
              Digital QR Gate Pass synchronization is currently being developed on the backend. Please use your registered vehicle RFID tag or coordinate with the security guard at Gate 1.
            </p>
          </div>
          <strong
            style={{
              fontSize: '1.05rem',
              color: 'var(--pine-dark)',
              display: 'block',
              marginTop: '6px'
            }}
          >
            {resident?.name || 'Resident'}
          </strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
            {resident?.towerLabel || 'Resident Portal'} {resident?.vehicleNo && resident.vehicleNo !== '—' ? `• Vehicle ${resident.vehicleNo}` : ''}
          </div>
          <div
            style={{
              fontSize: '0.6875rem',
              color: 'var(--pine-dark)',
              fontWeight: 700,
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#e0f2fe',
              padding: '3px 10px',
              borderRadius: '99px'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#0284c7'
              }}
            ></span>
            RFID / PHYSICAL ACCESS ACTIVE
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
