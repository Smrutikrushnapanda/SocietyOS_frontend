'use client';

import React from 'react';
import { usePaymentStore, useModalStore } from '../../store';
import { Badge } from '../common/Badge';

export const DuesDonutCard: React.FC = () => {
  const { maintenanceDue } = usePaymentStore();
  const { openModal } = useModalStore();

  const dueAmount = maintenanceDue.due - maintenanceDue.paid;
  const percentPaid = Math.round(
    (maintenanceDue.paid / (maintenanceDue.due || 1)) * 100
  );

  const circumference = 150.8;
  const strokeOffset = circumference - (percentPaid / 100) * circumference;

  return (
    <div className="dues-ring-card" id="home-dues-widget">
      <div className="dues-ring-info">
        <h3>
          ₹{dueAmount > 0 ? dueAmount.toLocaleString('en-IN') : '0'} Due
        </h3>
        <p>{maintenanceDue.period} Billing</p>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
          <Badge variant={maintenanceDue.status === 'paid' ? 'success' : 'warning'}>
            {maintenanceDue.status === 'paid' ? 'Paid in Full' : 'Due by 10 Sep'}
          </Badge>
          {maintenanceDue.status !== 'paid' && (
            <button
              className="btn btn-sm btn-accent"
              style={{ padding: '2px 8px', fontSize: '0.6875rem' }}
              onClick={() => openModal('upiPayment')}
            >
              Pay UPI →
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
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
            color: '#fff'
          }}
        >
          {percentPaid}%
        </span>
      </div>
    </div>
  );
};
