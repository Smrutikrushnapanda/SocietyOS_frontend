'use client';

import React from 'react';
import { Visitor } from '../../types';
import { Badge } from '../common/Badge';
import { useVisitorStore, useToastStore, useModalStore } from '../../store';
import { IconCar, IconClock, IconCheck, IconShare } from '../common/Icons';

interface VisitorCardProps {
  visitor: Visitor;
}

export const VisitorCard: React.FC<VisitorCardProps> = ({ visitor }) => {
  const { approveVisitor, denyVisitor, getPassByCodeOrName } = useVisitorStore();
  const { showToast } = useToastStore();
  const { openModal } = useModalStore();

  const handleApprove = () => {
    approveVisitor(visitor.id);
    showToast(`Visitor ${visitor.name} approved! Gate security alerted.`);
  };

  const handleDeny = () => {
    denyVisitor(visitor.id);
    showToast(`Visitor ${visitor.name} entry denied.`);
  };

  const handleSharePass = () => {
    let pass = getPassByCodeOrName(visitor.name);
    if (!pass) {
      pass = {
        id: visitor.passCode || 'GP-' + Math.floor(1000 + Math.random() * 9000),
        passCode: visitor.passCode || 'GP-' + Math.floor(1000 + Math.random() * 9000),
        guestName: visitor.name,
        phone: visitor.phone || '+91 98765 43210',
        purpose: visitor.purpose || 'Family / Friend',
        flat: visitor.flat,
        resident: 'Aarav Sharma',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        validityDisplay: 'Today (Valid for Next 6 Hours)',
        gate: 'All Gates (Gate 01 & 02)',
        vehicleNo: visitor.vehicleNo || null,
        status: 'Active',
        createdAt: 'Today',
        qrToken: `SOC-PASS-${visitor.id}-A101-SEC99`
      };
    }
    openModal('qrPassCard', pass);
  };

  return (
    <div className="mobile-visitor-card">
      <div className="mobile-visitor-top">
        <div>
          <strong style={{ fontSize: '0.875rem' }}>{visitor.name}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
            {visitor.purpose} • Flat {visitor.flat}
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

      <div className="mobile-visitor-actions">
        {visitor.status === 'requested' ? (
          <>
            <button
              className="btn btn-sm btn-primary"
              style={{ flex: 1 }}
              onClick={handleApprove}
            >
              Approve
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={handleDeny}
            >
              Deny
            </button>
          </>
        ) : (
          <button
            className="btn btn-sm btn-ghost"
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleSharePass}
          >
            <IconShare size={14} />
            <span>Share QR Pass</span>
          </button>
        )}
      </div>
    </div>
  );
};
