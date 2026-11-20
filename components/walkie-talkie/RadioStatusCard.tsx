'use client';

import React from 'react';
import clsx from 'clsx';
import {
  IconAlertTriangle,
  IconBellOff,
  IconClock,
  IconVolume,
  IconVolumeOff,
} from '../common/Icons';
import {
  formatSnoozeRemaining,
  getRadioStatusLabel,
} from '../../lib/walkie-talkie/radio-service';
import type { RadioStatus, SnoozeDurationOption } from '../../types/walkie-talkie';

interface RadioStatusCardProps {
  radioStatus: RadioStatus;
  snoozeUntil: number | null;
  snoozeDuration: SnoozeDurationOption | null;
  nowMs: number;
  onToggleRadio: (enabled: boolean) => void;
  onResumeRadio: () => void;
  onOpenSnooze: () => void;
  onOpenEmergency: () => void;
}

export const RadioStatusCard: React.FC<RadioStatusCardProps> = ({
  radioStatus,
  snoozeUntil,
  snoozeDuration,
  nowMs,
  onToggleRadio,
  onResumeRadio,
  onOpenSnooze,
  onOpenEmergency,
}) => {
  const isReceiving = radioStatus === 'ON';
  const statusTone =
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
    <section className={clsx('wt-status-card', statusTone)} aria-label="Radio Status">
      <div className="wt-status-card-main">
        <div className="wt-status-icon-box" aria-hidden="true">
          {radioStatus === 'SNOOZED' ? (
            <IconBellOff size={18} />
          ) : isReceiving ? (
            <IconVolume size={18} />
          ) : (
            <IconVolumeOff size={18} />
          )}
        </div>

        <div className="wt-status-copy">
          <div className="wt-status-heading-row">
            <span className="wt-status-heading">{getRadioStatusLabel(radioStatus)}</span>
            {radioStatus === 'SNOOZED' && (
              <span className="wt-snooze-countdown">
                <IconClock size={12} />
                {formatSnoozeRemaining(snoozeUntil, snoozeDuration, nowMs)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="wt-status-actions">
        <button
          type="button"
          role="switch"
          aria-checked={isReceiving || radioStatus === 'RECONNECTING'}
          aria-label={isReceiving || radioStatus === 'RECONNECTING' ? 'Turn Radio OFF' : 'Turn Radio ON'}
          className={clsx('wt-switch', (isReceiving || radioStatus === 'RECONNECTING') && 'is-on')}
          disabled={radioStatus === 'OFFLINE'}
          onClick={() => radioStatus === 'SNOOZED' ? onResumeRadio() : onToggleRadio(!(isReceiving || radioStatus === 'RECONNECTING'))}
        >
          <span className="wt-switch-thumb" />
          <span className="wt-switch-label">{isReceiving || radioStatus === 'RECONNECTING' ? 'ON' : 'OFF'}</span>
        </button>
        {radioStatus === 'SNOOZED' ? (
          <button
            type="button"
            className="wt-action-chip is-resume"
            onClick={onResumeRadio}
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            className="wt-action-chip"
            onClick={onOpenSnooze}
            disabled={radioStatus !== 'ON'}
            aria-label="Snooze radio"
            title="Snooze radio"
          >
            <IconBellOff size={13} />
          </button>
        )}

        <button
          type="button"
          className="wt-action-chip is-emergency"
          onClick={onOpenEmergency}
          aria-label="Open emergency radio"
          title="Emergency radio"
        >
          <IconAlertTriangle size={13} />
        </button>
      </div>
    </section>
  );
};
