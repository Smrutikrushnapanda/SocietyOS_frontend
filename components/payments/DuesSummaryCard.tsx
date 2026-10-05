'use client';

import React from 'react';
import { usePaymentStore, useModalStore } from '../../store';
import { Badge } from '../common/Badge';
import { IconCheck } from '../common/Icons';

export const DuesSummaryCard: React.FC = () => {
  const { maintenanceDue, receipts } = usePaymentStore();
  const { openModal } = useModalStore();

  const dueAmount = maintenanceDue.due - maintenanceDue.paid;
  const isPaid = maintenanceDue.status === 'paid';

  const handlePayOrReceipt = () => {
    if (isPaid) {
      const lastReceipt = receipts[0] || {
        receiptNo: 'RCPT-2026-0901',
        flat: maintenanceDue.flat,
        residentName: 'Aarav Sharma',
        amount: maintenanceDue.due,
        date: '2026-09-05',
        method: 'UPI / PhonePe',
        period: maintenanceDue.period,
        refNo: 'TXN-UPI-99481'
      };
      openModal('receipt', lastReceipt);
    } else {
      openModal('upiPayment');
    }
  };

  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '18px 14px',
        marginBottom: '14px',
        background: 'linear-gradient(180deg, var(--surface-sunken), #ffffff)'
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          color: 'var(--neutral)',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}
      >
        Current Maintenance Dues
      </span>
      <h2
        style={{
          fontSize: '2rem',
          color: 'var(--pine-dark)',
          margin: '6px 0'
        }}
        id="pay-amount-val"
      >
        {isPaid ? '₹0' : `₹${dueAmount.toLocaleString('en-IN')}`}
      </h2>
      <Badge
        variant={isPaid ? 'success' : 'warning'}
        id="pay-due-badge"
        style={{ marginBottom: '14px' }}
      >
        {isPaid ? 'All Clear (Paid)' : `Due by ${maintenanceDue.dueDate}`}
      </Badge>

      <button
        className={isPaid ? 'btn btn-success' : 'btn btn-accent'}
        id="pay-now-btn"
        style={{ width: '100%', fontSize: '0.9375rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        onClick={handlePayOrReceipt}
      >
        {isPaid ? (
          <>
            <IconCheck size={16} />
            <span>Dues Paid • View e-Receipt</span>
          </>
        ) : (
          `Pay Now via UPI (₹${dueAmount.toLocaleString('en-IN')})`
        )}
      </button>
    </div>
  );
};
