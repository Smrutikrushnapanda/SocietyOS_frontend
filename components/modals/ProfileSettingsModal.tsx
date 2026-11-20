import React, { useEffect } from 'react';
import { useResidentStore, useSocietyStore, useModalStore, useToastStore, useAuthStore } from '../../store';
import { NotificationPreferenceForm } from './NotificationPreferenceFields';
import { notificationPreferencesScope, useNotificationPreferencesStore } from '../../store/useNotificationPreferencesStore';
import { useRouter } from 'next/navigation';


import { logoutCurrentSession } from '../../lib/auth/logout-session';

export const ProfileSettingsModal: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { resident } = useResidentStore();
  const { society } = useSocietyStore();
  const { closeModal } = useModalStore();
  const { showToast } = useToastStore();
  
  const router = useRouter();
  const preferences = useNotificationPreferencesStore();
  const userId = useAuthStore((state) => state.backendUser?.id ?? state.user?.id);
  const organizationId = useAuthStore((state) => state.organizationId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { acquire } = preferences;
  useEffect(() => acquire(), [acquire, userId, organizationId, isAuthenticated]);
  const current = preferences.scope === notificationPreferencesScope();
  const dirty = current && preferences.draft?.some((item) =>
    preferences.saved?.find((saved) => saved.category === item.category)?.enabled !== item.enabled);
  const handleClose = () => {
    if (preferences.saving) return;
    preferences.close();
    closeModal();
  };
  const handleSave = async () => {
    if (await preferences.save()) {
      showToast('Notification preferences saved.');
      preferences.close();
      closeModal();
    }
  };

  const avatarInitials = resident?.avatarInitials || 'RES';
  const displayName = resident?.name || 'Resident';
  const flatDisplay = resident?.flat && resident.flat !== 'No flat'
    ? `Flat ${resident.flat}`
    : 'No flat assigned';
  const societyBuildingDisplay = [
    society?.name || null,
    resident?.buildingName && resident.buildingName !== '—' ? resident.buildingName : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const handleLogout = async () => {
    handleClose();
    const confirmed = await logoutCurrentSession();
    if (confirmed) showToast('Logged out successfully');
    if (!useAuthStore.getState().isAuthenticated) router.push('/resident/login');
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="profile-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="mobile-bottom-sheet">
        <div className="sheet-handle"></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            className="resident-avatar"
            style={{ width: '44px', height: '44px', fontSize: '1.1rem' }}
          >
            {avatarInitials}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>{displayName}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
              {flatDisplay} {societyBuildingDisplay ? `• ${societyBuildingDisplay}` : ''}
            </p>
          </div>
        </div>

        {children}

        <NotificationPreferenceForm draft={current ? preferences.draft : null}
          loading={!current || preferences.loading} saving={preferences.saving}
          error={current ? preferences.error : null} dirty={!!dirty} onToggle={preferences.toggle}
          onRetry={() => void preferences.load()} onSave={() => void handleSave()} onCancel={handleClose}>
          <button
            disabled={preferences.saving}
            type="button"
            className="btn btn-danger"
            style={{ padding: '8px 14px' }}
            onClick={handleLogout}
            title="Log out and switch account"
          >
            Log Out
          </button>
        </NotificationPreferenceForm>
      </div>
    </div>
  );
};

