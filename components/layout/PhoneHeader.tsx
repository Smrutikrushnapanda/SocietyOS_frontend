'use client';

import React, { useEffect } from 'react';
import { useResidentStore, useSocietyStore, useModalStore, useAuthStore } from '../../store';
import { useNotificationStore } from '../../store/useNotificationStore';
import { greetingFor } from '../../lib/display';

interface PhoneHeaderProps {
  title?: string;
  subtitle?: string;
  managedUpdates?: boolean;
}

export const PhoneHeader: React.FC<PhoneHeaderProps> = ({ title, subtitle, managedUpdates = false }) => {
  const { resident } = useResidentStore();
  const { society } = useSocietyStore();
  const { openModal } = useModalStore();
  const { organizationId, isAuthenticated } = useAuthStore();
  const { unreadCount, fetchNotifications, fetchUnreadCount, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    if (!managedUpdates && isAuthenticated && organizationId) {
      void fetchUnreadCount();
      const refresh = () => { void fetchUnreadCount(); };
      const timer = window.setInterval(refresh, 30000);
      window.addEventListener('societyos:notifications-changed', refresh);
      window.addEventListener('focus', refresh);
      return () => {
        window.clearInterval(timer);
        window.removeEventListener('societyos:notifications-changed', refresh);
        window.removeEventListener('focus', refresh);
      };
    }
  }, [isAuthenticated, organizationId, fetchNotifications, fetchUnreadCount, managedUpdates]);

  const fallbackGreeting = resident?.name
    ? greetingFor(resident.name)
    : 'Resident Portal';
  const displayTitle = title || fallbackGreeting;

  const societyName = society?.id === organizationId ? society.name.trim() : '';
  const defaultSubtitle = resident?.flat && resident.flat !== 'No flat'
    ? `${resident.buildingName && resident.buildingName !== '—' ? `${resident.buildingName} • ` : ''}#${resident.flat}`
    : '';

  const displaySubtitle = subtitle || defaultSubtitle;
  const handleNotificationsClick = async () => {
    await markAllAsRead();
    openModal('notifications');
  };

  return (
    <header className="phone-header">
      <div className="phone-header-copy">
        <div className="phone-header-title" id="phoneHeaderTitle">
          {displayTitle}
        </div>
        <div className="phone-header-subtitle">
          {societyName && <span className="phone-header-society" title={societyName}>{societyName}</span>}
          {displaySubtitle && <span className="phone-header-unit">{displaySubtitle}</span>}
        </div>
      </div>
      <div className="phone-header-right">
        <button
          className="notif-bell-btn"
          onClick={() => { void handleNotificationsClick(); }}
          title="Notifications"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && <span className="notif-dot"></span>}
        </button>
        <div
          className="resident-profile-badge"
          onClick={() => openModal('profileSettings')}
          title="Resident Profile"
          style={{ padding: resident?.photoUrl ? '2px' : '3px 6px' }}
        >
          {resident?.photoUrl ? (
            <img
              src={resident.photoUrl}
              alt={resident.name || 'Resident'}
              className="resident-avatar"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="resident-avatar">
              {resident?.name && !resident.name.startsWith('+') && !/^\d+$/.test(resident.name)
                ? resident.name.trim().charAt(0).toUpperCase()
                : (resident?.avatarInitials && !resident.avatarInitials.startsWith('#')
                    ? resident.avatarInitials
                    : (resident?.name?.trim().charAt(0).toUpperCase() || 'R'))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
