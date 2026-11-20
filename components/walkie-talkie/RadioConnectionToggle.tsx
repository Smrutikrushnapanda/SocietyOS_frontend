'use client';

import React from 'react';
import clsx from 'clsx';
import type { WorkStatus } from '../../types/walkie-talkie';

interface RadioConnectionToggleProps {
  workStatus: WorkStatus;
  onChangeWorkStatus: (status: WorkStatus) => void;
}

const DUTY_OPTIONS: WorkStatus[] = ['On Duty', 'Busy', 'On Break'];

export const RadioConnectionToggle: React.FC<RadioConnectionToggleProps> = ({
  workStatus,
  onChangeWorkStatus,
}) => {
  return (
    <div className="wt-control-strip">
      <div className="wt-duty-row" role="group" aria-label="Guard Work Availability">
        <span className="wt-duty-caption">Availability</span>
        <div className="wt-duty-chips">
          {DUTY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={clsx('wt-duty-chip', workStatus === option && 'is-active')}
              aria-pressed={workStatus === option}
              onClick={() => onChangeWorkStatus(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
