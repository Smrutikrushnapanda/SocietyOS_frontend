'use client';

import React from 'react';
import { usePaymentStore, useModalStore } from '../../store';
import { Badge } from '../common/Badge';

export const DuesDonutCard: React.FC = () => {
  const { maintenanceDue, isLoadingResidentDues } = usePaymentStore();
  const { openModal } = useModalStore();

  if (isLoadingResidentDues) {
    return (
      <div className="dues-ring-card" id="home-dues-widget" style={{ opacity: 0.7 }}>
        <div className="dues-ring-info">
          <h3 style={{ fontSize: '1rem' }}>Loading Dues...</h3>
          <p>Fetching maintenance details</p>
        </div>
      </div>
    );
  }

  if (!maintenanceDue) {
    return (
      <div className="dues-ring-card" id="home-dues-widget">
        <div className="dues-ring-info">
          <h3>₹0 Due</h3>
          <p>No Active Billing Cycle</p>
          <div style={{ marginTop: '6px' }}>
            <Badge variant="success">All Clear</Badge>
          </div>
        </div>
      </div>
    );
  }

  const dueAmount = maintenanceDue.due - maintenanceDue.paid;
  const isPaid = maintenanceDue.status === 'paid' || maintenanceDue.backendStatus === 'PAID';
  const percentPaid = isPaid ? 100 : Math.round(
    (maintenanceDue.paid / (maintenanceDue.due || 1)) * 100
  );

  const circumference = 150.8;
  const strokeOffset = circumference - (percentPaid / 100) * circumference;

  return (
    <div className="dues-ring-card" id="home-dues-widget">
      <div className="dues-ring-info">
        <h3>
          ₹{dueAmount > 0 && !isPaid ? dueAmount.toLocaleString('en-IN') : '0'} Due
        </h3>
        <p>{maintenanceDue.period} Billing</p>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
          <Badge variant={isPaid ? 'success' : maintenanceDue.backendStatus === 'OVERDUE' ? 'danger' : 'warning'}>
            {isPaid
              ? 'Paid in Full'
              : maintenanceDue.backendStatus === 'OVERDUE'
              ? 'Overdue'
              : `Due by ${maintenanceDue.dueDate}`}
          </Badge>
          {!isPaid && (
            <button
              className="btn btn-sm btn-accent"
              style={{ padding: '2px 8px', fontSize: '0.6875rem' }}
              onClick={() => openModal('upiPayment')}
            >
              Pay Dues →
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg className="donut-chart-svg" viewBox="0 0 60 60">
          <circle className="donut-bg" cx="30" cy="30" r="24"></circle>
          <circle
            className="donut-progress"
            cx="30"
            cy="30"
            r="24"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
          ></circle>
        </svg>
        <span
          style={{
            position: 'absolute',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {percentPaid}%
        </span>
      </div>
    </div>
  );
};
