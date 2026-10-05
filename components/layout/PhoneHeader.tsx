'use client';

import React from 'react';
import { useResidentStore, useSocietyStore, useModalStore } from '../../store';

interface PhoneHeaderProps {
  title?: string;
  subtitle?: string;
}

export const PhoneHeader: React.FC<PhoneHeaderProps> = ({ title, subtitle }) => {
  const { resident } = useResidentStore();
  const { society } = useSocietyStore();
  const { openModal } = useModalStore();

  const displayTitle = title || `Namaste, ${resident.name.split(' ')[0]} `;
  const displaySubtitle = subtitle || `${society.name} • ${resident.towerLabel.split('• ')[1] || 'Tower A #101'}`;

  return (
    <header className="phone-header">
      <div>
        <div className="phone-header-title" id="phoneHeaderTitle">
          {displayTitle}
        </div>
        <div className="phone-header-subtitle">
          {displaySubtitle}
        </div>
      </div>
      <div className="phone-header-right">
        <button
          className="notif-bell-btn"
          onClick={() => openModal('notifications')}
          title="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="notif-dot"></span>
        </button>
        <div
          className="resident-profile-badge"
          onClick={() => openModal('profileSettings')}
          title="Resident Profile"
        >
          <div className="resident-avatar">{resident.avatarInitials}</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {resident.flat}
          </span>
        </div>
      </div>
    </header>
  );
};
