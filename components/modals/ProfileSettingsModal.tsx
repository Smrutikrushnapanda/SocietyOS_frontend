import React from 'react';
import { useResidentStore, useSocietyStore, useModalStore, useToastStore, useAuthStore } from '../../store';
import { Switch } from '../common/Switch';
import { useRouter } from 'next/navigation';


export const ProfileSettingsModal: React.FC = () => {
  const { resident, toggleNotification } = useResidentStore();
  const { society } = useSocietyStore();
  const { closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    closeModal();
    logout();
    showToast('Logged out successfully');
    router.push('/resident/login');
  };

  const handleToggle = (key: keyof typeof resident.whatsappNotifications) => {
    toggleNotification(key);
    showToast('Preference saved.');
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="profile-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet">
        <div className="sheet-handle"></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            className="resident-avatar"
            style={{ width: '44px', height: '44px', fontSize: '1.1rem' }}
          >
            {resident.avatarInitials}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>{resident.name}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
              Flat {resident.flat} • {society.name} ({resident.buildingName})
            </p>
          </div>
        </div>

        <h4 style={{ fontSize: '0.875rem', marginBottom: '8px', color: 'var(--pine)' }}>
          WhatsApp Notification Channels
        </h4>

        <div
          className="card"
          style={{
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '0.8125rem' }}>Visitor Approvals</strong>
              <p style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
                Instant gate approval prompt
              </p>
            </div>
            <Switch
              checked={resident.whatsappNotifications.visitorApprovals}
              onChange={() => handleToggle('visitorApprovals')}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '8px'
            }}
          >
            <div>
              <strong style={{ fontSize: '0.8125rem' }}>Maintenance Invoices</strong>
              <p style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
                Monthly bills & receipts
              </p>
            </div>
            <Switch
              checked={resident.whatsappNotifications.paymentReminders}
              onChange={() => handleToggle('paymentReminders')}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '8px'
            }}
          >
            <div>
              <strong style={{ fontSize: '0.8125rem' }}>Notice Circulars</strong>
              <p style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
                Urgent society broadcasts
              </p>
            </div>
            <Switch
              checked={resident.whatsappNotifications.noticeBroadcasts}
              onChange={() => handleToggle('noticeBroadcasts')}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '8px'
            }}
          >
            <div>
              <strong style={{ fontSize: '0.8125rem' }}>Helpdesk Updates</strong>
              <p style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
                Technician assignment & status
              </p>
            </div>
            <Switch
              checked={resident.whatsappNotifications.complaintUpdates}
              onChange={() => handleToggle('complaintUpdates')}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={closeModal}>
            Save
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: '8px 14px' }}
            onClick={handleLogout}
            title="Log out and switch account"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

