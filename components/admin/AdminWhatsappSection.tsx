'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToastStore, useSocietyStore, useAuthStore } from '../../store';
import {
  getWhatsAppStatus,
  sendWhatsAppTestMessage,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  WhatsAppStatusData,
  WhatsAppNotificationSettings,
} from '../../lib/api/whatsapp.api';

export const AdminWhatsappSection: React.FC = () => {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id ?? state.user?.id);
  return <AdminWhatsappControls key={`${userId}:${organizationId}`} />;
};

const AdminWhatsappControls: React.FC = () => {
  const { showToast } = useToastStore();
  const { society } = useSocietyStore();
  const { organizationId } = useAuthStore();

  const [statusData, setStatusData] = useState<WhatsAppStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [settings, setSettings] = useState<WhatsAppNotificationSettings>({
    isEnabled: true,
    notifyVisitor: true,
    notifyMaintenance: true,
    notifyPayment: true,
    notifyComplaint: true,
    notifyNotice: true,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const active = useRef(true);
  const saving = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  // Test Message State
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testOutcome, setTestOutcome] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const data = await getWhatsAppStatus();
      if (!active.current) return;
      setStatusData(data);
    } catch (err: any) {
      if (active.current) setStatusError(err?.message || 'Failed to check WhatsApp status');
    } finally {
      if (active.current) setIsLoadingStatus(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!organizationId) {
      setSettingsError('Select a society to manage WhatsApp preferences.');
      setIsLoadingSettings(false);
      return;
    }
    setIsLoadingSettings(true);
    setSettingsError(null);
    try {
      const data = await getWhatsAppSettings();
      if (!active.current) return;
      if (data) setSettings(data);
    } catch (error: unknown) {
      if (active.current) setSettingsError(error instanceof Error ? error.message : 'Failed to load notification settings.');
    } finally {
      if (active.current) setIsLoadingSettings(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchStatus();
    void fetchSettings();
  }, [fetchStatus, fetchSettings]);

  const handleToggleCategory = async (key: keyof WhatsAppNotificationSettings, value: boolean) => {
    if (saving.current || isLoadingSettings || settingsError || !organizationId) return;
    saving.current = true;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setIsSavingSettings(true);
    try {
      const saved = await updateWhatsAppSettings({ [key]: value });
      if (!active.current) return;
      setSettings(saved);
      showToast('Notification settings saved.');
    } catch {
      if (!active.current) return;
      showToast('Failed to save settings.');
      // Revert on failure
      setSettings(settings);
    } finally {
      saving.current = false;
      if (active.current) setIsSavingSettings(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) return;
    setIsSendingTest(true);
    setTestOutcome(null);

    try {
      const res = await sendWhatsAppTestMessage(testRecipient);
      if (!active.current) return;
      if (res.success) {
        setTestOutcome({
          success: true,
          message: `Gateway accepted test message.${res.messageId ? ` Message ID: ${res.messageId}` : ''} Check recipient WhatsApp for delivery.`,
        });
        showToast('WhatsApp test message dispatched.');
      } else {
        setTestOutcome({
          success: false,
          message: res.error || 'Failed to deliver test message.',
        });
      }
    } catch (err: any) {
      if (!active.current) return;
      setTestOutcome({
        success: false,
        message: err?.message || 'Connection error dispatching test message.',
      });
    } finally {
      if (active.current) {
        setIsSendingTest(false);
        void fetchStatus();
      }
    }
  };

  const isConnected = statusData?.status === 'WORKING' || statusData?.status === 'CONNECTED';

  return (
    <div className="admin-section active" id="section-whatsapp">
      <div className="section-header">
        <div>
          <h2>WhatsApp Integration & Messaging Gateway</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Real-time notifications, visitor approvals, and OTP verification via WAHA service.
          </p>
        </div>
      </div>

      <div className="whatsapp-grid">
        {/* Left: Status Card */}
        <div className="wa-status-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              className={`badge ${isConnected ? 'badge-success' : 'badge-danger'}`}
              style={{ padding: '4px 10px' }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  background: isConnected ? 'var(--success)' : '#ef4444',
                  borderRadius: '50%',
                  display: 'inline-block',
                  marginRight: '6px',
                }}
              />
              {statusData?.status || (isLoadingStatus ? 'Checking...' : 'Disconnected')}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
              {statusData?.lastChecked
                ? new Date(statusData.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </span>
          </div>

          <div style={{ marginTop: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>
              {society.societyHandle || society.name || 'Society Portal'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--pine)', fontWeight: 600 }}>
              {statusData?.accountInfo?.id || 'Account unavailable'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '4px' }}>
              Provider: <strong style={{ textTransform: 'uppercase' }}>{statusData?.provider || 'WAHA'}</strong> |
              Session: <code>{statusData?.sessionName || 'default'}</code>
            </p>
            {statusData?.accountInfo?.pushName && (
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '2px' }}>
                Sender Name: <strong>{statusData.accountInfo.pushName}</strong>
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '14px' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%' }}
              onClick={() => void fetchStatus()}
              disabled={isLoadingStatus}
            >
              {isLoadingStatus ? 'Pinging Gateway...' : '🔄 Refresh Connection Status'}
            </button>
          </div>

          {statusError && (
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              marginTop: '12px',
            }}>
              {statusError}
            </div>
          )}

          {!isConnected && !isLoadingStatus && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: '#92400e',
                marginTop: '12px',
              }}
            >
              <strong>Connection status:</strong> {statusData?.error || statusError ||
                (statusData?.status === 'STARTING' ? 'WhatsApp session is starting. Refresh shortly.' :
                  statusData?.status === 'SCAN_QR_CODE' ? 'Pair WhatsApp by scanning session QR code in WAHA.' :
                    'WhatsApp session is unavailable. Check gateway session and refresh status.')}
            </div>
          )}

          <div
            style={{
              backgroundColor: 'var(--surface-sunken)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              color: 'var(--neutral)',
              marginTop: '12px',
            }}
          >
            WhatsApp messages are delivered via encrypted local service. Sensitive authentication OTPs bypass ordinary filters.
          </div>
        </div>

        {/* Right: Operational Controls, Test Message, & Category Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Send Test Message Box */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Send Test WhatsApp Message</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
              Verify gateway connectivity by dispatching a test message to a verified 10-digit phone number.
            </p>

            <form onSubmit={(e) => void handleSendTestMessage(e)} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                className="input"
                style={{ flex: 1, fontSize: '0.8125rem' }}
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value.replace(/\D/g, '').slice(0, 10))}
                disabled={isSendingTest}
                required
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSendingTest || testRecipient.length < 10}
              >
                {isSendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </form>

            {testOutcome && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                background: testOutcome.success ? '#f0fdf4' : '#fef2f2',
                color: testOutcome.success ? '#166534' : '#b91c1c',
                border: `1px solid ${testOutcome.success ? '#bbf7d0' : '#fca5a5'}`,
              }}>
                {testOutcome.message}
              </div>
            )}
          </div>

          {/* Configurable Notification Categories */}
          <h3 style={{ fontSize: '1.05rem', marginTop: '4px' }}>Notification Category Preferences</h3>
          {isLoadingSettings && <p role="status">Loading saved preferences...</p>}
          {settingsError && <div role="alert">{settingsError} <button className="btn btn-ghost btn-sm" onClick={() => void fetchSettings()}>Retry</button></div>}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Master WhatsApp Notifications</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
                  Enable or disable all automated WhatsApp notifications for this society.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Master WhatsApp Notifications"
                  checked={settings.isEnabled}
                  onChange={(e) => void handleToggleCategory('isEnabled', e.target.checked)}
                  disabled={isLoadingSettings || !!settingsError || isSavingSettings}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Visitor Arrival & Entry Alerts</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
                  Notify residents on WhatsApp when visitors check in or arrive at the security gate.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Visitor Arrival & Entry Alerts"
                  checked={settings.notifyVisitor && settings.isEnabled}
                  onChange={(e) => void handleToggleCategory('notifyVisitor', e.target.checked)}
                  disabled={isLoadingSettings || !!settingsError || !settings.isEnabled || isSavingSettings}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Maintenance Due & Overdue Reminders</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
                  Notify residents when maintenance dues are generated or marked overdue.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Maintenance Due & Overdue Reminders"
                  checked={settings.notifyMaintenance && settings.isEnabled}
                  onChange={(e) => void handleToggleCategory('notifyMaintenance', e.target.checked)}
                  disabled={isLoadingSettings || !!settingsError || !settings.isEnabled || isSavingSettings}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Payment Confirmations</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
                  Instant WhatsApp receipt confirmation when resident payments are recorded.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Payment Confirmations"
                  checked={settings.notifyPayment && settings.isEnabled}
                  onChange={(e) => void handleToggleCategory('notifyPayment', e.target.checked)}
                  disabled={isLoadingSettings || !!settingsError || !settings.isEnabled || isSavingSettings}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Complaint Updates</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
                  Status change alerts when maintenance staff resolves or updates a complaint.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Complaint Updates"
                  checked={settings.notifyComplaint && settings.isEnabled}
                  onChange={(e) => void handleToggleCategory('notifyComplaint', e.target.checked)}
                  disabled={isLoadingSettings || !!settingsError || !settings.isEnabled || isSavingSettings}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Society Notices & Circulars</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
                  Broadcast circulars and urgent announcements to all registered residents.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Society Notices & Circulars"
                  checked={settings.notifyNotice && settings.isEnabled}
                  onChange={(e) => void handleToggleCategory('notifyNotice', e.target.checked)}
                  disabled={isLoadingSettings || !!settingsError || !settings.isEnabled || isSavingSettings}
                />
                <span className="switch-slider" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
