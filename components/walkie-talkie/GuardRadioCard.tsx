'use client';

import React from 'react';
import clsx from 'clsx';
import type { GuardMember } from '../../types/walkie-talkie';

interface GuardRadioCardProps {
  guard: GuardMember;
  actionLabel?: string;
  onAction?: (guard: GuardMember) => void;
  showLastSeen?: boolean;
  highlightSelected?: boolean;
}

export const GuardRadioCard: React.FC<GuardRadioCardProps> = ({
  guard,
  actionLabel,
  onAction,
  showLastSeen = false,
  highlightSelected = false,
}) => {
  const initials = guard.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const radioTone =
    guard.radioStatus === 'ON'
      ? 'is-on'
      : guard.radioStatus === 'SNOOZED'
        ? 'is-snoozed'
        : 'is-off';

  const workTone =
    guard.workStatus === 'On Duty'
      ? 'work-duty'
      : guard.workStatus === 'Busy'
        ? 'work-busy'
        : 'work-away';

  const receptionText =
    guard.radioStatus === 'ON'
      ? guard.isListening
        ? 'Listening'
        : 'Radio ON · Not Listening'
      : guard.radioStatus === 'SNOOZED'
        ? `Snoozed${guard.snoozeRemainingLabel ? ` · ${guard.snoozeRemainingLabel}` : ''}`
        : guard.radioStatus === 'OFF'
          ? 'Radio off'
          : guard.radioStatus === 'RECONNECTING'
            ? 'Reconnecting'
            : 'Offline';

  return (
    <div className={clsx('wt-guard-card', highlightSelected && 'is-selected')}>
      <div className="wt-guard-card-left">
        <div
          className="wt-guard-avatar"
          style={{ background: guard.avatarColor || '#0f4c81' }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="wt-guard-info">
          <div className="wt-guard-name-row">
            <strong className="wt-guard-name">{guard.name}</strong>
            <span className="wt-guard-code">{guard.badgeCode}</span>
          </div>
          <span className="wt-guard-gate">{guard.gateLocation}</span>

          <div className="wt-guard-badges">
            <span className={clsx('wt-badge', workTone)}>{guard.workStatus}</span>
            <span className={clsx('wt-badge', radioTone)}>
              {receptionText}
            </span>
          </div>

          {showLastSeen && (
            <span className="wt-guard-last-seen">Last seen: {guard.lastSeen}</span>
          )}
        </div>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          className={clsx(
            'wt-guard-action-btn',
            guard.radioStatus !== 'ON' && 'is-muted',
          )}
          onClick={() => onAction(guard)}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
