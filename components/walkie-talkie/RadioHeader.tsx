'use client';

import React from 'react';
import clsx from 'clsx';
import { IconRadioTower, IconSettings } from '../common/Icons';
import { getRadioStatusLabel } from '../../lib/walkie-talkie/radio-service';
import type { RadioStatus, WorkStatus } from '../../types/walkie-talkie';

interface RadioHeaderProps {
  societyName: string;
  guardName: string;
  workStatus: WorkStatus;
  radioStatus: RadioStatus;
  onOpenSettings: () => void;
}

export const RadioHeader: React.FC<RadioHeaderProps> = ({
  societyName,
  guardName,
  workStatus,
  radioStatus,
  onOpenSettings,
}) => {
  const statusClass =
    radioStatus === 'ON'
      ? 'is-on'
      : radioStatus === 'SNOOZED'
        ? 'is-snoozed'
        : radioStatus === 'RECONNECTING'
          ? 'is-reconnecting'
          : radioStatus === 'OFFLINE'
            ? 'is-offline'
            : 'is-off';

  return (
    <header className="guard-header wt-header">
      <div className="wt-header-top">
        <div className="wt-header-brand">
          <div className="wt-header-badge-icon" aria-hidden="true">
            <IconRadioTower size={18} />
          </div>
          <div className="wt-header-titles">
            <div className="wt-header-title-row">
              <h1 className="wt-header-title">Walkie Talkie</h1>
              <span className={clsx('wt-status-pill', statusClass)} aria-label={`${guardName} · ${workStatus} · ${getRadioStatusLabel(radioStatus)}`}>
                <span className="wt-status-dot" aria-hidden="true" />
                {getRadioStatusLabel(radioStatus)}
              </span>
            </div>
            <p className="wt-header-society">{societyName}</p>
          </div>
        </div>

        <button
          type="button"
          className="wt-settings-icon-btn"
          onClick={onOpenSettings}
          aria-label="Open Radio Settings"
          title="Radio Settings"
        >
          <IconSettings size={18} />
        </button>
      </div>

    </header>
  );
};
