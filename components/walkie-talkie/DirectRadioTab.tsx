'use client';

import React, { useState } from 'react';
import { IconAlertTriangle, IconArrowLeft, IconClose, IconLock, IconSearch } from '../common/Icons';
import { evaluateDirectTransmitState, filterGuardStatusList, getRadioStatusLabel } from '../../lib/walkie-talkie/radio-service';
import type {
  ActiveSpeakerInfo,
  GuardMember,
  RadioStatus,
  TransmissionContext,
  TransmissionStatus,
} from '../../types/walkie-talkie';
import { ActiveSpeakerIndicator } from './ActiveSpeakerIndicator';
import { GuardRadioCard } from './GuardRadioCard';
import { PushToTalkButton } from './PushToTalkButton';

interface DirectRadioTabProps {
  guards: GuardMember[];
  selectedGuard: GuardMember | null;
  currentGuardName: string;
  radioStatus: RadioStatus;
  transmissionStatus: TransmissionStatus;
  transmissionContext: TransmissionContext;
  activeSpeaker: ActiveSpeakerInfo | null;
  onSelectGuard: (guard: GuardMember | null) => void;
  onStartDirectTransmit: (recipient: GuardMember) => void;
  onStopDirectTransmit: (recipient: GuardMember) => void;
}

export const DirectRadioTab: React.FC<DirectRadioTabProps> = ({
  guards,
  selectedGuard,
  currentGuardName,
  radioStatus,
  transmissionStatus,
  transmissionContext,
  activeSpeaker,
  onSelectGuard,
  onStartDirectTransmit,
  onStopDirectTransmit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const directory = React.useMemo(
    () => filterGuardStatusList(guards, 'all', searchQuery),
    [guards, searchQuery],
  );

  if (selectedGuard) {
    const directCheck = evaluateDirectTransmitState(radioStatus, selectedGuard);
    const isDirectTransmitting =
      transmissionStatus === 'transmitting' && transmissionContext === 'direct';

    return (
      <div className="wt-tab-panel">
        <div className="wt-direct-topbar">
          <button
            type="button"
            className="wt-direct-back-btn"
            onClick={() => onSelectGuard(null)}
          >
            <IconArrowLeft size={16} />
            <span>All Guards</span>
          </button>

          <span className="wt-private-badge">
            <IconLock size={12} />
            <span>Private Radio</span>
          </span>
        </div>

        <section className="wt-radio-console" aria-label={`Direct radio to ${selectedGuard.name}`}>
          <div className="wt-direct-recipient-banner">
            <span className="wt-direct-eyebrow">DIRECT RADIO CHANNEL</span>
            <h2>{selectedGuard.name}</h2>
            <span className="wt-direct-sub">
              {selectedGuard.badgeCode} · {selectedGuard.gateLocation}
            </span>
            <span className="wt-direct-sub">
              {selectedGuard.workStatus} · {getRadioStatusLabel(selectedGuard.radioStatus)}
            </span>
          </div>

          <ActiveSpeakerIndicator activeSpeaker={activeSpeaker?.context === 'direct' ? activeSpeaker : null} radioStatus={radioStatus} />

          {!directCheck.allowed && directCheck.reason && (
            <div className="wt-direct-blocked-alert" role="status">
              <IconAlertTriangle size={16} />
              <span>{directCheck.reason}</span>
            </div>
          )}

          <PushToTalkButton
            isTransmitting={isDirectTransmitting}
            disabled={!directCheck.allowed}
            disabledReason={directCheck.reason}
            speakerName={`${currentGuardName} → ${selectedGuard.name}`}
            variant="direct"
            onTransmitStart={() => onStartDirectTransmit(selectedGuard)}
            onTransmitStop={() => onStopDirectTransmit(selectedGuard)}
          />
          <div className="wt-console-footer"><span>Demo mode · No audio sent</span></div>
        </section>
      </div>
    );
  }

  return (
    <div className="wt-tab-panel">
      <div className="wt-panel-intro">
        <strong>Talk to a guard</strong>
        <span>Choose someone for a private radio preview.</span>
      </div>

      <div className="wt-search-box">
        <span className="wt-search-icon" aria-hidden="true">
          <IconSearch size={15} />
        </span>
        <input
          type="text"
          className="wt-search-input"
          placeholder="Search guard by name, ID, or gate..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search guards for direct radio"
        />
        {searchQuery && (
          <button
            type="button"
            className="wt-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <IconClose size={13} />
          </button>
        )}
      </div>

      {directory.length === 0 ? (
        <div className="wt-empty-box">No guards match &ldquo;{searchQuery}&rdquo;.</div>
      ) : (
        <div className="wt-card-stack">
          {directory.map((guard) => (
            <GuardRadioCard
              key={guard.id}
              guard={guard}
              actionLabel={guard.radioStatus === 'ON' ? 'Talk' : 'Inspect'}
              onAction={onSelectGuard}
            />
          ))}
        </div>
      )}
    </div>
  );
};
