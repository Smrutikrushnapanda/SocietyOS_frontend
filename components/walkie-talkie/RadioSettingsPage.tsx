'use client';

import React from 'react';
import clsx from 'clsx';
import { IconArrowLeft, IconBell, IconClock, IconRadioTower, IconVolume } from '../common/Icons';
import { GuardMobileSelect } from '../guard/GuardMobileSelect';
import type {
  AudioOutputPreference,
  RadioSettingsState,
  SnoozeDurationOption,
} from '../../types/walkie-talkie';

interface RadioSettingsPageProps {
  settings: RadioSettingsState;
  onUpdateSettings: (patch: Partial<Omit<RadioSettingsState, 'backgroundRadioSupported'>>) => void;
  onBack: () => void;
}

export const RadioSettingsPage: React.FC<RadioSettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onBack,
}) => {
  const renderToggleRow = (
    id: string,
    title: string,
    subtitle: string,
    checked: boolean,
    onToggle: (next: boolean) => void,
  ) => (
    <div className="wt-setting-row">
      <div className="wt-setting-copy">
        <strong id={`${id}-label`}>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        className={clsx('wt-switch', checked && 'is-on')}
        onClick={() => onToggle(!checked)}
      >
        <span className="wt-switch-thumb" />
        <span className="wt-switch-label">{checked ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );

  return (
    <div className="wt-settings-view">
      <header className="wt-settings-header">
        <button
          type="button"
          className="wt-direct-back-btn"
          onClick={onBack}
          aria-label="Back to Walkie Talkie"
        >
          <IconArrowLeft size={16} />
          <span>Back</span>
        </button>
        <h2>Radio Settings</h2>
        <span className="wt-settings-local-tag">Local UI</span>
      </header>

      <div className="wt-settings-body">
        <section className="wt-settings-card">
          <h3>Startup &amp; Channel Connection</h3>

          <div className="wt-setting-field">
            <label className="wt-setting-field-label">Default Radio State</label>
            <GuardMobileSelect
              id="wt-default-radio-state"
              sheetTitle="Select Default Radio State"
              placeholder="Choose default state"
              value={settings.defaultRadioState}
              searchable={false}
              leadingIcon={<IconRadioTower size={15} />}
              options={[
                {
                  value: 'ON',
                  label: 'Radio ON',
                  subtitle: 'Start gate terminal ready to receive radio',
                },
                {
                  value: 'OFF',
                  label: 'Radio OFF',
                  subtitle: 'Start muted until manually enabled',
                },
              ]}
              onChange={(val) =>
                onUpdateSettings({ defaultRadioState: val === 'OFF' ? 'OFF' : 'ON' })
              }
            />
          </div>

          {renderToggleRow(
            'wt-auto-connect',
            'Auto-connect on launch',
            'Automatically join Society Security Net when terminal opens',
            settings.autoConnectOnLaunch,
            (autoConnectOnLaunch) => onUpdateSettings({ autoConnectOnLaunch }),
          )}

          <div className="wt-setting-field">
            <label className="wt-setting-field-label">Default Snooze Duration</label>
            <GuardMobileSelect
              id="wt-default-snooze"
              sheetTitle="Select Default Snooze Duration"
              placeholder="Choose duration"
              value={String(settings.defaultSnoozeDuration)}
              searchable={false}
              leadingIcon={<IconClock size={15} />}
              options={[
                { value: '5', label: '5 minutes', subtitle: 'Quick pause' },
                { value: '15', label: '15 minutes', subtitle: 'Standard break' },
                { value: '30', label: '30 minutes', subtitle: 'Extended break' },
                {
                  value: 'manual',
                  label: 'Until manually enabled',
                  subtitle: 'Requires manual Resume Radio',
                },
              ]}
              onChange={(val) => {
                const next: SnoozeDurationOption =
                  val === 'manual' ? 'manual' : (Number(val) as 5 | 15 | 30);
                onUpdateSettings({ defaultSnoozeDuration: next });
              }}
            />
          </div>
        </section>

        <section className="wt-settings-card">
          <h3>Alerts, Tactile &amp; Audio Routing</h3>

          {renderToggleRow(
            'wt-sound-effects',
            'PTT Sound Effects',
            'Simulate roger beep and transmission tone cues',
            settings.soundEffects,
            (soundEffects) => onUpdateSettings({ soundEffects }),
          )}

          {renderToggleRow(
            'wt-vibration',
            'Tactile Vibration',
            'Vibrate on Push-to-Talk press and priority radio alerts',
            settings.vibration,
            (vibration) => onUpdateSettings({ vibration }),
          )}

          {renderToggleRow(
            'wt-notifications',
            'Radio Notifications',
            'Show non-blocking alerts for snooze expiry and channel events',
            settings.radioNotifications,
            (radioNotifications) => onUpdateSettings({ radioNotifications }),
          )}

          <div className="wt-setting-field">
            <label className="wt-setting-field-label">Audio Output Preference (UI Only)</label>
            <GuardMobileSelect
              id="wt-audio-output"
              sheetTitle="Audio Output Route (UI Preview)"
              placeholder="Select audio route"
              value={settings.audioOutput}
              searchable={false}
              leadingIcon={<IconVolume size={15} />}
              options={[
                {
                  value: 'speaker',
                  label: 'Loudspeaker (Gate Terminal)',
                  subtitle: 'Recommended for gate booth monitoring',
                },
                {
                  value: 'earpiece',
                  label: 'Handheld Earpiece',
                  subtitle: 'Low-volume private listening',
                },
                {
                  value: 'bluetooth',
                  label: 'Bluetooth Security Earpiece',
                  subtitle: 'Hands-free wireless headset preference',
                },
              ]}
              onChange={(val) =>
                onUpdateSettings({ audioOutput: val as AudioOutputPreference })
              }
            />
          </div>
        </section>

        <section className="wt-settings-card">
          <h3>Background Radio Support</h3>
          <div className="wt-planned-row">
            <div className="wt-setting-copy">
              <strong>Background Audio Service</strong>
              <span>Keep listening when screen locks or switching apps</span>
            </div>
            <span className="wt-planned-pill">Planned · Not Connected</span>
          </div>
          <p className="wt-planned-note">
            <IconBell size={13} /> Real-time audio streaming, microphone capture, and native foreground service will connect when LiveKit/audio server integration is enabled.
          </p>
        </section>
      </div>
    </div>
  );
};
