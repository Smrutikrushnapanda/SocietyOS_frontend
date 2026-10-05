'use client';

import React from 'react';
import { usePaymentStore, useToastStore } from '../../store';
import { Switch } from '../common/Switch';

export const WhatsAppBillingToggle: React.FC = () => {
  const { whatsappBillingOptIn, toggleWhatsAppBilling } = usePaymentStore();
  const { showToast } = useToastStore();

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleWhatsAppBilling();
    showToast(
      !whatsappBillingOptIn
        ? 'WhatsApp payment reminders enabled.'
        : 'WhatsApp payment reminders paused.'
    );
  };

  return (
    <div className="whatsapp-optin-box">
      <div className="whatsapp-optin-info">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.554z" />
        </svg>
        <div className="whatsapp-optin-text">
          <h5>WhatsApp Bill Invoices</h5>
          <p>Receive monthly PDF bill & 1-click UPI link.</p>
        </div>
      </div>
      <Switch checked={whatsappBillingOptIn} onChange={handleToggle} />
    </div>
  );
};
