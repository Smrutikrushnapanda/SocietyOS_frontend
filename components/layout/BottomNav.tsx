'use client';

import React from 'react';
import clsx from 'clsx';

export type TabType = 'home' | 'visitors' | 'complaints' | 'payments' | 'notices' | 'amenity-bookings';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasNewPoll?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, hasNewPoll = false }) => {
  return (
    <nav className="phone-bottom-nav">
      <button
        className={clsx('nav-item', currentTab === 'home' && 'active')}
        onClick={() => onTabChange('home')}
        data-tab="home"
      >
        <svg viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Home</span>
      </button>

      <button
        className={clsx('nav-item', currentTab === 'visitors' && 'active')}
        onClick={() => onTabChange('visitors')}
        data-tab="visitors"
      >
        <svg viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>Visitors</span>
      </button>

      <button
        className={clsx('nav-item', currentTab === 'complaints' && 'active')}
        onClick={() => onTabChange('complaints')}
        data-tab="complaints"
      >
        <svg viewBox="0 0 24 24">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <line x1="12" y1="12.01" x2="12" y2="18" />
        </svg>
        <span>Helpdesk</span>
      </button>

      <button
        className={clsx('nav-item', currentTab === 'payments' && 'active')}
        onClick={() => onTabChange('payments')}
        data-tab="payments"
      >
        <svg viewBox="0 0 24 24">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        <span>Payments</span>
      </button>

      <button
        className={clsx('nav-item', currentTab === 'notices' && 'active')}
        onClick={() => onTabChange('notices')}
        data-tab="notices"
        aria-label={hasNewPoll ? 'Notices, new community poll' : 'Notices'}
      >
        {hasNewPoll && (
          <span className="nav-poll-indicator" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></svg>
            <span>New poll</span>
            <i />
          </span>
        )}
        <svg viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>Notices</span>
      </button>
    </nav>
  );
};
