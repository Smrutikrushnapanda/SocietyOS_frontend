'use client';

import React from 'react';
import { useModalStore } from '../../store';

interface QuickActionsGridProps {
  onNavigateTab?: (tab: 'visitors' | 'complaints' | 'payments' | 'notices') => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ onNavigateTab }) => {
  const { openModal } = useModalStore();

  return (
    <div className="quick-actions-grid">
      <button
        className="quick-action-btn"
        id="qa-preapprove"
        onClick={() => openModal('preApproveGuest')}
      >
        <div className="quick-action-icon saffron">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <span className="quick-action-label">Guest Pass</span>
      </button>

      <button
        className="quick-action-btn"
        id="qa-amenities"
        onClick={() => openModal('amenitiesBooking')}
      >
        <div className="quick-action-icon teal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M2 12h20" />
            <path d="M20 12v8H4v-8" />
            <path d="M4 12V4h16v8" />
          </svg>
        </div>
        <span className="quick-action-label">Clubhouse</span>
      </button>

      <button
        className="quick-action-btn"
        id="qa-pay"
        onClick={() => {
          if (onNavigateTab) onNavigateTab('payments');
          else openModal('upiPayment');
        }}
      >
        <div className="quick-action-icon emerald">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <span className="quick-action-label">Pay Dues</span>
      </button>

      <button
        className="quick-action-btn"
        id="qa-complaint"
        onClick={() => openModal('raiseComplaint')}
      >
        <div className="quick-action-icon indigo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <line x1="12" y1="12" x2="12" y2="16" />
            <line x1="12" y1="12.01" x2="12" y2="18" />
          </svg>
        </div>
        <span className="quick-action-label">Helpdesk</span>
      </button>
    </div>
  );
};
