'use client';

import React from 'react';
import clsx from 'clsx';
import { IconBellOff, IconClock, IconClose } from '../common/Icons';
import { formatSnoozeDurationLabel, formatSnoozeRemaining } from '../../lib/walkie-talkie/radio-service';
import type { RadioStatus, SnoozeDurationOption } from '../../types/walkie-talkie';

interface RadioSnoozeSheetProps {
  open: boolean;
  radioStatus: RadioStatus;
  snoozeUntil: number | null;
  snoozeDuration: SnoozeDurationOption | null;
  nowMs: number;
  onSelectDuration: (duration: SnoozeDurationOption) => void;
  onResumeRadio: () => void;
  onClose: () => void;
}

const SNOOZE_OPTIONS: Array<{ value: SnoozeDurationOption; label: string; hint: string }> = [
  { value: 5, label: '5 minutes', hint: 'Short break or gate inspection' },
  { value: 15, label: '15 minutes', hint: 'Visitor escalation or verification' },
  { value: 30, label: '30 minutes', hint: 'Extended break pause' },
  {
    value: 'manual',
    label: 'Until manually enabled',
    hint: 'Remains paused until you tap Resume Radio',
  },
];

export const RadioSnoozeSheet: React.FC<RadioSnoozeSheetProps> = ({
  open,
  radioStatus,
  snoozeUntil,
  snoozeDuration,
  nowMs,
  onSelectDuration,
  onResumeRadio,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="wt-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Snooze Radio Controls"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="wt-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="wt-sheet-handle" aria-hidden="true" />

        <div className="wt-sheet-header">
          <div className="wt-sheet-title-wrap">
            <span className="wt-sheet-icon is-amber" aria-hidden="true">
              <IconBellOff size={18} />
            </span>
            <div>
              <h3>Snooze Radio</h3>
              <p>Work duty stays active; only radio audio pauses.</p>
            </div>
          </div>
          <button
            type="button"
            className="wt-sheet-close"
            onClick={onClose}
            aria-label="Close Snooze Sheet"
          >
            <IconClose size={17} />
          </button>
        </div>

        {radioStatus === 'SNOOZED' && (
          <div className="wt-snooze-active-banner">
            <div>
              <strong>
                Snoozed · {formatSnoozeDurationLabel(snoozeDuration)}
              </strong>
              <span>
                <IconClock size={12} />{' '}
                {formatSnoozeRemaining(snoozeUntil, snoozeDuration, nowMs)}
              </span>
            </div>
            <button
              type="button"
              className="wt-resume-solid-btn"
              onClick={onResumeRadio}
            >
              Resume Radio
            </button>
          </div>
        )}

        <div className="wt-snooze-option-list">
          {SNOOZE_OPTIONS.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className={clsx(
                'wt-snooze-option',
                radioStatus === 'SNOOZED' &&
                  snoozeDuration === option.value &&
                  'is-selected',
              )}
              onClick={() => onSelectDuration(option.value)}
            >
              <div>
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </div>
              <span className="wt-snooze-choose-pill">Snooze</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
