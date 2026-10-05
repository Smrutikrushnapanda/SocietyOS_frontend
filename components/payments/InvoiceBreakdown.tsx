'use client';

import React from 'react';
import { usePaymentStore } from '../../store';

export const InvoiceBreakdown: React.FC = () => {
  const { invoiceBreakdown } = usePaymentStore();

  return (
    <>
      <h4 style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
        Itemized Invoice Breakdown
      </h4>
      <div className="card" style={{ padding: '10px 14px', marginBottom: '14px' }}>
        {invoiceBreakdown.map((item, index) => (
          <div
            key={item.title}
            className="payment-item"
            style={{ borderBottom: index === invoiceBreakdown.length - 1 ? 'none' : undefined }}
          >
            <span>{item.title}</span>
            <strong>₹{item.amount.toLocaleString('en-IN')}</strong>
          </div>
        ))}
      </div>
    </>
  );
};
