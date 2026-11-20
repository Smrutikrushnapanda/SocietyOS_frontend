'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { IconRadioTower } from '../common/Icons';
import { useWalkieTalkieStore } from '../../store/useWalkieTalkieStore';

export type GuardTabType = 'queue' | 'visitor-entry' | 'vehicle-entry' | 'walkie-talkie';

interface GuardBottomNavProps {
  currentTab: GuardTabType;
  onTabChange?: (tab: GuardTabType) => void;
}

export const GuardBottomNav: React.FC<GuardBottomNavProps> = ({
  currentTab,
  onTabChange,
}) => {
  const radioStatus = useWalkieTalkieStore((state) => state.radioStatus);
  const transmissionStatus = useWalkieTalkieStore((state) => state.transmissionStatus);

  const renderGuardTabButton = (
    tab: 'queue' | 'visitor-entry' | 'vehicle-entry',
    label: string,
    icon: React.ReactNode,
  ) => {
    const isActive = currentTab === tab;
    if (onTabChange) {
      return (
        <button
          key={tab}
          type="button"
          className={clsx('nav-item', isActive && 'active')}
          onClick={() => onTabChange(tab)}
          data-tab={tab}
        >
          {icon}
          <span>{label}</span>
        </button>
      );
    }

    const href = tab === 'queue' ? '/guard' : `/guard?tab=${tab}`;
    return (
      <Link
        key={tab}
        href={href}
        className={clsx('nav-item', isActive && 'active')}
        data-tab={tab}
      >
        {icon}
        <span>{label}</span>
      </Link>
    );
  };

  const radioDotClass =
    transmissionStatus === 'transmitting'
      ? 'is-transmitting'
      : radioStatus === 'ON'
        ? 'is-on'
        : radioStatus === 'SNOOZED' || radioStatus === 'RECONNECTING'
          ? 'is-attention'
          : 'is-off';

  return (
    <nav className="phone-bottom-nav guard-bottom-nav" aria-label="Guard Terminal Navigation">
      {renderGuardTabButton(
        'queue',
        'Gate Queue',
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <line x1="8" x2="21" y1="6" y2="6" />
          <line x1="8" x2="21" y1="12" y2="12" />
          <line x1="8" x2="21" y1="18" y2="18" />
          <line x1="3" x2="3.01" y1="6" y2="6" />
          <line x1="3" x2="3.01" y1="12" y2="12" />
          <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>,
      )}

      {renderGuardTabButton(
        'visitor-entry',
        'New Visitor',
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>,
      )}

      {renderGuardTabButton(
        'vehicle-entry',
        'Vehicle Bay',
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
        </svg>,
      )}

      {currentTab === 'walkie-talkie' ? (
        <button
          type="button"
          className="nav-item guard-nav-walkie active"
          data-tab="walkie-talkie"
          aria-current="page"
        >
          <span className="guard-nav-walkie-icon-wrap" aria-hidden="true">
            <IconRadioTower size={19} />
            <span className={clsx('guard-nav-radio-dot', radioDotClass)} />
          </span>
          <span>Walkie Talkie</span>
        </button>
      ) : (
        <Link
          href="/walkie-talkie"
          className="nav-item guard-nav-walkie"
          data-tab="walkie-talkie"
        >
          <span className="guard-nav-walkie-icon-wrap" aria-hidden="true">
            <IconRadioTower size={19} />
            <span className={clsx('guard-nav-radio-dot', radioDotClass)} />
          </span>
          <span>Walkie Talkie</span>
        </Link>
      )}
    </nav>
  );
};
