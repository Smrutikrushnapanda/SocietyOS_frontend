'use client';

import React from 'react';
import clsx from 'clsx';
import { IconVolume, IconVolumeOff } from '../common/Icons';
import { RadioWaveform } from './RadioWaveform';
import type { ActiveSpeakerInfo, RadioStatus } from '../../types/walkie-talkie';

interface ActiveSpeakerIndicatorProps {
  activeSpeaker: ActiveSpeakerInfo | null;
  radioStatus: RadioStatus;
}

export const ActiveSpeakerIndicator: React.FC<ActiveSpeakerIndicatorProps> = ({
  activeSpeaker,
  radioStatus,
}) => {
  const isEmergency = activeSpeaker?.context === 'emergency';

  if (radioStatus !== 'ON') {
    return (
      <div className="wt-speaker-banner is-muted">
        <IconVolumeOff size={15} />
        <span>
          {radioStatus === 'SNOOZED'
            ? 'Reception muted while Snoozed'
            : radioStatus === 'RECONNECTING'
              ? 'Connecting radio preview…'
              : radioStatus === 'OFFLINE'
                ? 'Offline · Radio unavailable'
                : 'Radio off · Reception paused'}
        </span>
      </div>
    );
  }

  if (!activeSpeaker) {
    return (
      <div className="wt-speaker-banner is-idle">
        <span className="wt-speaker-led" aria-hidden="true" />
        <span>Channel clear</span>
      </div>
    );
  }

  return (
    <div className={clsx('wt-speaker-banner is-live', isEmergency && 'is-emergency')}>
      <div className="wt-speaker-meta">
        <IconVolume size={15} />
        <div className="wt-speaker-text">
          <strong>{activeSpeaker.guardName}</strong>
          <span>
            {activeSpeaker.gateLocation} · {activeSpeaker.startedAt}
          </span>
        </div>
      </div>
      <RadioWaveform
        active
        tone={isEmergency ? 'red' : 'orange'}
        label="Active speaker"
      />
    </div>
  );
};
