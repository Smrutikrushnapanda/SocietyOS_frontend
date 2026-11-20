import React from 'react';
import { Switch } from '../common/Switch';
import type { NotificationCategory, NotificationPreference } from '../../lib/api/notification-preferences.api';

const LABELS: Record<NotificationCategory, string> = {
  SECURITY: 'Security', EMERGENCY: 'Emergencies', VISITOR_ARRIVAL: 'Visitor arrivals',
  VISITOR_APPROVAL: 'Visitor approvals', NOTICE: 'Notice circulars', COMPLAINT: 'Helpdesk updates',
  DOCUMENT: 'Documents', POLL: 'Polls', AMENITY: 'Amenity updates', GENERAL: 'General updates',
};

interface Props {
  preferences: NotificationPreference[];
  disabled: boolean;
  onToggle: (category: NotificationCategory) => void;
}

export function NotificationPreferenceFields({ preferences, disabled, onToggle }: Props) {
  return <div className="card" style={{ padding: '8px 12px', marginBottom: '16px' }}>
    {preferences.map((preference) => <div key={preference.category}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
      <div>
        <strong style={{ fontSize: '0.8125rem' }}>{LABELS[preference.category]}</strong>
        {preference.mandatory && <p style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>Always enabled by SocietyOS policy</p>}
      </div>
      <Switch aria-label={LABELS[preference.category]} checked={preference.mandatory || preference.enabled}
        disabled={disabled || preference.mandatory} onChange={() => onToggle(preference.category)} />
    </div>)}
  </div>;
}

interface FormProps {
  draft: NotificationPreference[] | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;
  onToggle: Props['onToggle'];
  onRetry: () => void;
  onSave: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function NotificationPreferenceForm({ draft, loading, saving, error, dirty, onToggle, onRetry, onSave, onCancel, children }: FormProps) {
  return <>
    <h4 style={{ fontSize: '0.875rem', marginBottom: '8px', color: 'var(--pine)' }}>Push notification preferences</h4>
    <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '12px' }}>
      Mandatory preferences stay enabled. Device permission and provider availability still affect delivery.
    </p>
    {loading && <div className="card notification-preference-skeleton" role="status" aria-label="Loading notification preferences" aria-busy="true"
      style={{ padding: '8px 12px', marginBottom: '16px' }}>
      <div aria-hidden="true">
        {Object.keys(LABELS).map((category, index) => <div key={category} className="notification-preference-skeleton-row">
          <div style={{ flex: 1 }}>
            <span className="notification-preference-skeleton-placeholder" style={{ width: `${45 + (index % 3) * 10}%`, height: '13px' }} />
            {index < 4 && <span className="notification-preference-skeleton-placeholder" style={{ width: '80%', height: '10px', marginTop: '5px' }} />}
          </div>
          <span className="notification-preference-skeleton-placeholder" style={{ width: '40px', height: '24px', borderRadius: '999px', flexShrink: 0 }} />
        </div>)}
      </div>
    </div>}
    {error && <p role="alert">{error} Changes are not confirmed saved.</p>}
    {!loading && !draft && <button className="btn" onClick={onRetry}>Retry loading</button>}
    {!loading && draft && <NotificationPreferenceFields preferences={draft} disabled={saving} onToggle={onToggle} />}
    {saving && <p role="status">Saving preferences…</p>}
    <div style={{ display: 'flex', gap: '8px' }}>
      <button className="btn btn-primary" style={{ flex: 1 }} disabled={!dirty || loading || saving} onClick={onSave}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button className="btn" disabled={saving} onClick={onCancel}>Cancel</button>
      {children}
    </div>
  </>;
}
