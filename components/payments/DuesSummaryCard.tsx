'use client';

import React from 'react';
import { usePaymentStore, useModalStore } from '../../store';
import { Badge } from '../common/Badge';
import { IconCheck, IconReceipt } from '../common/Icons';

export const DuesSummaryCard: React.FC = () => {
  const {
    maintenanceDue,
    receipts,
    isLoadingResidentDues,
    residentError,
    loadResidentDues,
  } = usePaymentStore();
  const { openModal } = useModalStore();

  if (isLoadingResidentDues) {
    return (
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '24px 14px',
          marginBottom: '14px',
          background: 'linear-gradient(180deg, var(--surface-sunken), #ffffff)',
        }}
      >
        <div style={{ fontSize: '0.875rem', color: 'var(--neutral)' }}>
          Loading maintenance details...
        </div>
      </div>
    );
  }

  if (residentError) {
    return (
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '18px 14px',
          marginBottom: '14px',
          background: '#fff1f2',
          border: '1px solid #fecdd3',
        }}
      >
        <span style={{ fontSize: '0.875rem', color: '#be123c', fontWeight: 600 }}>
          {residentError}
        </span>
        <div style={{ marginTop: '8px' }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => loadResidentDues()}
            style={{ fontSize: '0.75rem' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!maintenanceDue) {
    return (
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '24px 14px',
          marginBottom: '14px',
          background: 'linear-gradient(180deg, var(--surface-sunken), #ffffff)',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--neutral)',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Maintenance Dues
        </span>
        <h3 style={{ fontSize: '1.25rem', color: 'var(--pine-dark)', margin: '8px 0' }}>
          No Maintenance Dues Found
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
          All dues are cleared or no billing cycle is active for your flat.
        </p>
      </div>
    );
  }

  const dueAmount = maintenanceDue.due - maintenanceDue.paid;
  const isPaid = maintenanceDue.status === 'paid' || maintenanceDue.backendStatus === 'PAID';

  const handlePayOrReceipt = () => {
    if (isPaid) {
      const lastReceipt = receipts[0];
      if (lastReceipt) {
        openModal('receipt', lastReceipt);
      }
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
        background: 'linear-gradient(180deg, var(--surface-sunken), #ffffff)',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          color: 'var(--neutral)',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        Current Maintenance Dues ({maintenanceDue.period})
      </span>
      <h2
        style={{
          fontSize: '2rem',
          color: 'var(--pine-dark)',
          margin: '6px 0',
        }}
        id="pay-amount-val"
      >
        {isPaid ? '₹0' : `₹${dueAmount.toLocaleString('en-IN')}`}
      </h2>

      {Number(maintenanceDue.lateCharge) > 0 && !isPaid && (
        <div style={{ fontSize: '0.75rem', color: '#be123c', marginBottom: '6px', fontWeight: 600 }}>
          Includes ₹{Number(maintenanceDue.lateCharge).toLocaleString('en-IN')} late charge
        </div>
      )}

      <Badge
        variant={isPaid ? 'success' : maintenanceDue.backendStatus === 'OVERDUE' ? 'danger' : 'warning'}
        id="pay-due-badge"
        style={{ marginBottom: '14px' }}
      >
        {isPaid
          ? 'All Clear (Paid)'
          : maintenanceDue.backendStatus === 'OVERDUE'
          ? `Overdue • Due Date: ${maintenanceDue.dueDate}`
          : `Due by ${maintenanceDue.dueDate}`}
      </Badge>

      <button
        className={isPaid ? 'btn btn-success' : 'btn btn-accent'}
        id="pay-now-btn"
        style={{
          width: '100%',
          fontSize: '0.9375rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
        onClick={handlePayOrReceipt}
      >
        {isPaid ? (
          <>
            <IconCheck size={16} />
            <span>Dues Paid • View e-Receipt</span>
          </>
        ) : (
          <>
            <IconReceipt size={16} />
            <span>Pay Dues (₹{dueAmount.toLocaleString('en-IN')})</span>
          </>
        )}
      </button>
    </div>
  );
};
