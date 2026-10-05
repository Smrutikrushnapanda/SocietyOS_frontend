'use client';

import React from 'react';
import clsx from 'clsx';

export type GuardTabType = 'queue' | 'visitor-entry' | 'vehicle-entry';

interface GuardBottomNavProps {
  currentTab: GuardTabType;
  onTabChange: (tab: GuardTabType) => void;
}

export const GuardBottomNav: React.FC<GuardBottomNavProps> = ({
  currentTab,
  onTabChange
}) => {
  return (
    <nav className="phone-bottom-nav">
      {/* 1. Gate Queue Tab */}
      <button
        type="button"
        className={clsx('nav-item', currentTab === 'queue' && 'active')}
        onClick={() => onTabChange('queue')}
        data-tab="queue"
      >
        <svg viewBox="0 0 24 24">
          <line x1="8" x2="21" y1="6" y2="6" />
          <line x1="8" x2="21" y1="12" y2="12" />
          <line x1="8" x2="21" y1="18" y2="18" />
          <line x1="3" x2="3.01" y1="6" y2="6" />
          <line x1="3" x2="3.01" y1="12" y2="12" />
          <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>
        <span>Gate Queue</span>
      </button>

      {/* 2. New Visitor Entry Tab */}
      <button
        type="button"
        className={clsx('nav-item', currentTab === 'visitor-entry' && 'active')}
        onClick={() => onTabChange('visitor-entry')}
        data-tab="visitor-entry"
      >
        <svg viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
        <span>New Visitor</span>
      </button>

      {/* 3. Vehicle Bay Tab */}
      <button
        type="button"
        className={clsx('nav-item', currentTab === 'vehicle-entry' && 'active')}
        onClick={() => onTabChange('vehicle-entry')}
        data-tab="vehicle-entry"
      >
        <svg viewBox="0 0 24 24">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
        </svg>
        <span>Vehicle Bay</span>
      </button>
    </nav>
  );
};

