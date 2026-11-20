'use client';

import React from 'react';
import { IconAlertTriangle, IconCheck, IconClose, IconShield } from '../common/Icons';
import type { RadioStatus } from '../../types/walkie-talkie';
import { ActiveSpeakerIndicator } from './ActiveSpeakerIndicator';
import { PushToTalkButton } from './PushToTalkButton';

interface EmergencyRadioSheetProps {
  open: boolean;
  armed: boolean;
  isTransmitting: boolean;
  radioStatus: RadioStatus;
  guardName: string;
  onArmToggle: (armed: boolean) => void;
  onStartEmergencyTransmit: () => void;
  onStopEmergencyTransmit: () => void;
  onClose: () => void;
}

export const EmergencyRadioSheet: React.FC<EmergencyRadioSheetProps> = ({
  open,
  armed,
  isTransmitting,
  radioStatus,
  guardName,
  onArmToggle,
  onStartEmergencyTransmit,
  onStopEmergencyTransmit,
  onClose,
}) => {
  if (!open) return null;

  const isDisabled = radioStatus !== 'ON' || !armed;
  const disabledReason =
    radioStatus !== 'ON'
      ? `Radio is ${radioStatus}. Enable Radio ON to preview priority PTT.`
      : !armed
        ? 'Review notice and tap Unlock Priority Preview first.'
        : null;

  return (
    <div
      className="wt-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Emergency Priority Radio Interface"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isTransmitting) onClose();
      }}
    >
      <div className="wt-sheet wt-emergency-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="wt-sheet-handle" aria-hidden="true" />

        <div className="wt-sheet-header">
          <div className="wt-sheet-title-wrap">
            <span className="wt-sheet-icon is-red" aria-hidden="true">
              <IconAlertTriangle size={18} />
            </span>
            <div>
              <h3>Emergency Priority Radio</h3>
              <p>High-priority gate security channel (UI Preview)</p>
            </div>
          </div>
          <button
            type="button"
            className="wt-sheet-close"
            onClick={onClose}
            aria-label="Close Emergency Radio"
          >
            <IconClose size={17} />
          </button>
        </div>

        <div className="wt-emergency-status-bar">
          <span className="wt-priority-badge">
            <IconShield size={12} />
            <span>PRIORITY STATUS: {isTransmitting ? 'TRANSMITTING ALERT' : armed ? 'ARMED (UI PREVIEW)' : 'STANDBY'}</span>
          </span>
          <span className="wt-emergency-tx-indicator">
            <span className={isTransmitting ? 'wt-red-led is-live' : 'wt-red-led'} />
            {isTransmitting ? 'TX ACTIVE' : 'TX IDLE'}
          </span>
        </div>

        <div className="wt-emergency-warning" role="alert">
          <IconAlertTriangle size={18} />
          <div>
            <strong>Warning Before Activating</strong>
            <p>
              This is a visual emergency radio interface preview only. Holding PTT here does not transmit live audio or contact police, fire, or medical services.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={armed ? 'wt-emergency-arm-btn is-armed' : 'wt-emergency-arm-btn'}
          onClick={() => onArmToggle(!armed)}
        >
          <span className="wt-arm-check" aria-hidden="true">
            {armed && <IconCheck size={14} />}
          </span>
          <span>
            {armed
              ? 'Priority Preview Armed (Tap to Lock)'
              : 'Acknowledge Warning & Unlock Priority PTT'}
          </span>
        </button>

        {isTransmitting && (
          <ActiveSpeakerIndicator
            activeSpeaker={{
              guardId: 'self',
              guardName: `${guardName} (PRIORITY PREVIEW)`,
              gateLocation: 'All Society Channels',
              context: 'emergency',
              startedAt: 'Live',
            }}
            radioStatus={radioStatus}
          />
        )}

        <PushToTalkButton
          isTransmitting={isTransmitting}
          disabled={isDisabled}
          disabledReason={disabledReason}
          speakerName={`${guardName} (Emergency Preview)`}
          variant="emergency"
          onTransmitStart={onStartEmergencyTransmit}
          onTransmitStop={onStopEmergencyTransmit}
        />
      </div>
    </div>
  );
};
