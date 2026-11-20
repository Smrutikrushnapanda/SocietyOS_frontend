'use client';

import React from 'react';
import { categorizeGroupRoster } from '../../lib/walkie-talkie/radio-service';
import type {
  ActiveSpeakerInfo,
  GuardMember,
  RadioChannel,
  RadioStatus,
  TransmissionContext,
  TransmissionStatus,
} from '../../types/walkie-talkie';
import { ActiveSpeakerIndicator } from './ActiveSpeakerIndicator';
import { GuardRadioCard } from './GuardRadioCard';
import { PushToTalkButton } from './PushToTalkButton';

interface GroupRadioTabProps {
  channel: RadioChannel;
  guards: GuardMember[];
  currentGuardName: string;
  radioStatus: RadioStatus;
  transmissionStatus: TransmissionStatus;
  transmissionContext: TransmissionContext;
  activeSpeaker: ActiveSpeakerInfo | null;
  onStartTransmit: () => void;
  onStopTransmit: () => void;
  onSelectDirectGuard: (guard: GuardMember) => void;
  onSimulateIncomingSpeaker: (guard: GuardMember | null) => void;
}

export const GroupRadioTab: React.FC<GroupRadioTabProps> = ({
  channel,
  guards,
  currentGuardName,
  radioStatus,
  transmissionStatus,
  transmissionContext,
  activeSpeaker,
  onStartTransmit,
  onStopTransmit,
  onSelectDirectGuard,
  onSimulateIncomingSpeaker,
}) => {
  const roster = React.useMemo(() => categorizeGroupRoster(guards), [guards]);
  const isSelfGroupTransmitting =
    transmissionStatus === 'transmitting' && transmissionContext === 'group';
  const isPttDisabled = radioStatus !== 'ON';

  const disabledReason =
    radioStatus === 'SNOOZED'
      ? 'Snoozed · Resume radio above to transmit'
      : radioStatus === 'OFF'
        ? 'Radio is OFF · Enable Radio ON to transmit'
        : radioStatus === 'RECONNECTING'
          ? 'Reconnecting to group channel…'
          : radioStatus === 'OFFLINE'
            ? 'Terminal offline · Cannot transmit'
            : null;

  const firstListeningPeer = roster.listening[0] ?? roster.connected[0] ?? null;

  return (
    <div className="wt-tab-panel">
      <section className="wt-radio-console" aria-label="Group radio console">
        <div className="wt-channel-banner">
          <div className="wt-channel-info">
            <span className="wt-channel-code">{channel.code}</span>
            <div>
              <strong className="wt-channel-name">{channel.name}</strong>
              <span className="wt-channel-desc">{roster.connected.length} connected · {roster.listening.length} available</span>
            </div>
          </div>
          <div className="wt-signal-bars" aria-hidden="true" data-active={radioStatus === 'ON'}>
            <i /><i /><i /><i />
          </div>
        </div>

        <div className="wt-speaker-section">
          <ActiveSpeakerIndicator activeSpeaker={activeSpeaker} radioStatus={radioStatus} />
        </div>

        <PushToTalkButton
          isTransmitting={isSelfGroupTransmitting}
          disabled={isPttDisabled}
          disabledReason={disabledReason}
          speakerName={currentGuardName}
          variant="group"
          onTransmitStart={onStartTransmit}
          onTransmitStop={onStopTransmit}
        />
        <div className="wt-console-footer">
          <span className="wt-speaker-grille" aria-hidden="true" />
          <span>Demo mode · No audio sent</span>
        </div>
      </section>

      <details className="wt-team-details">
        <summary>
          <div className="wt-team-heading">
            <strong>Team on channel</strong>
            <span>{roster.listening.length} listening · {roster.busy.length} busy · {roster.disconnected.length} unavailable</span>
          </div>
          <div className="wt-team-avatars" aria-hidden="true">
            {roster.connected.slice(0, 3).map((guard) => (
              <span key={guard.id} style={{ background: guard.avatarColor }}>{guard.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</span>
            ))}
          </div>
        </summary>
        <div className="wt-roster-sections">
          <div className="wt-roster-group">
            <div className="wt-roster-title-row">
              <h3>Connected Guards</h3>
              <span>{roster.connected.length}</span>
            </div>
            {roster.connected.length === 0 ? (
              <p className="wt-empty-note">No guards currently connected.</p>
            ) : (
              <div className="wt-card-stack">
                {roster.connected.map((guard) => (
                  <GuardRadioCard
                    key={`conn-${guard.id}`}
                    guard={guard}
                    actionLabel="Direct"
                    onAction={onSelectDirectGuard}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="wt-roster-group">
            <div className="wt-roster-title-row">
              <h3>Disconnected / Paused Guards</h3>
              <span>{roster.disconnected.length}</span>
            </div>
            {roster.disconnected.length === 0 ? (
              <p className="wt-empty-note">All guards are online with Radio ON.</p>
            ) : (
              <div className="wt-card-stack">
                {roster.disconnected.map((guard) => (
                  <GuardRadioCard
                    key={`disc-${guard.id}`}
                    guard={guard}
                    actionLabel="Status"
                    onAction={onSelectDirectGuard}
                  />
                ))}
              </div>
            )}
          </div>
          {radioStatus === 'ON' && !isSelfGroupTransmitting && firstListeningPeer && (
            <button
              type="button"
              className="wt-sim-speaker-btn"
              onClick={() => onSimulateIncomingSpeaker(activeSpeaker ? null : firstListeningPeer)}
            >
              {activeSpeaker ? 'Stop speaker preview' : 'Preview incoming transmission'}
            </button>
          )}
        </div>
      </details>
    </div>
  );
};
