'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { SocietySettingsBootstrap } from '../common/SocietySettings';
import { GuardBottomNav } from '../guard/GuardBottomNav';
import {
  useAuthStore,
  useSocietyStore,
  useToastStore,
} from '../../store';
import { useSocietySettingsStore } from '../../store/useSocietySettingsStore';
import { useWalkieTalkieStore } from '../../store/useWalkieTalkieStore';
import type { WalkieTalkieInternalTab } from '../../types/walkie-talkie';
import { authenticatedGuardName } from '../../lib/display';
import { RadioHeader } from './RadioHeader';
import { RadioStatusCard } from './RadioStatusCard';
import { RadioConnectionToggle } from './RadioConnectionToggle';
import { GroupRadioTab } from './GroupRadioTab';
import { DirectRadioTab } from './DirectRadioTab';
import { RadioHistoryTab } from './RadioHistoryTab';
import { RadioSnoozeSheet } from './RadioSnoozeSheet';
import { EmergencyRadioSheet } from './EmergencyRadioSheet';
import { RadioSettingsPage } from './RadioSettingsPage';

const INTERNAL_TABS: Array<{ id: WalkieTalkieInternalTab; label: string; shortLabel: string }> = [
  { id: 'group', label: 'Group Radio', shortLabel: 'Group' },
  { id: 'direct', label: 'Direct Radio', shortLabel: 'Direct' },
  { id: 'history', label: 'Radio History', shortLabel: 'History' },
];

export const WalkieTalkiePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const backendUser = useAuthStore((state) => state.backendUser);
  const settingsData = useSocietySettingsStore((state) => state.data);
  const societyInfo = useSocietyStore((state) => state.society);
  const societyAccent = settingsData?.branding.accent;
  const guardAccent = societyAccent === 'plum' ? 'plum' : 'blue';
  const showToast = useToastStore((state) => state.showToast);

  const {
    workStatus,
    radioStatus,
    snoozeUntil,
    snoozeDuration,
    activeChannel,
    activeSpeaker,
    selectedGuard,
    transmissionStatus,
    transmissionContext,
    connectedGuards,
    mockRadioHistory,
    activeTab,
    historyFilter,
    isSnoozeSheetOpen,
    isEmergencySheetOpen,
    isEmergencyArmed,
    isSettingsOpen,
    settings,
    hydrateSettings,
    setActiveTab,
    setHistoryFilter,
    setWorkStatus,
    setSnoozeSheetOpen,
    setEmergencySheetOpen,
    setEmergencyArmed,
    setSettingsOpen,
    selectGuard,
    toggleRadio,
    setNetworkOnline,
    startSnooze,
    resumeRadio,
    tickSnooze,
    startTransmission,
    stopTransmission,
    simulateIncomingSpeaker,
    updateSettings,
  } = useWalkieTalkieStore();

  const [nowMs, setNowMs] = useState<number>(0);

  const societyName =
    settingsData?.name || societyInfo.name || 'Society Security Net';

  const guardName = authenticatedGuardName(backendUser, user?.name);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => hydrateSettings());
    return () => window.cancelAnimationFrame(id);
  }, [hydrateSettings]);

  useEffect(() => {
    const onOnline = () => setNetworkOnline(true, guardName);
    const onOffline = () => setNetworkOnline(false, guardName);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setNetworkOnline, guardName]);

  useEffect(() => {
    if (radioStatus !== 'SNOOZED') return;
    const syncTick = () => {
      const ts = Date.now();
      setNowMs(ts);
      tickSnooze(ts, guardName);
    };
    const initTimer = window.setTimeout(syncTick, 0);
    const interval = window.setInterval(syncTick, 1000);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(interval);
    };
  }, [radioStatus, tickSnooze, guardName]);

  const effectiveNowMs =
    nowMs > 0
      ? nowMs
      : snoozeUntil && typeof snoozeDuration === 'number'
        ? snoozeUntil - snoozeDuration * 60 * 1000
        : 0;

  return (
    <div
      className="guard-portal-scope wt-scope"
      data-guard-accent={guardAccent}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <SocietySettingsBootstrap />

      {isSettingsOpen ? (
        <RadioSettingsPage
          settings={settings}
          onUpdateSettings={(patch) => {
            updateSettings(patch);
            showToast('Radio preferences updated locally.', 'info');
          }}
          onBack={() => setSettingsOpen(false)}
        />
      ) : (
        <>
          <RadioHeader
            societyName={societyName}
            guardName={guardName}
            workStatus={workStatus}
            radioStatus={radioStatus}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <main className="phone-body wt-body">
            <nav className="wt-tabs" aria-label="Walkie Talkie Sections">
              {INTERNAL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={clsx('wt-tab-btn', activeTab === tab.id && 'is-active')}
                  aria-label={tab.label}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.shortLabel}
                </button>
              ))}
            </nav>

            <RadioStatusCard
              radioStatus={radioStatus}
              snoozeUntil={snoozeUntil}
              snoozeDuration={snoozeDuration}
              nowMs={effectiveNowMs}
              onToggleRadio={(enabled) => {
                toggleRadio(enabled, guardName);
                if (settings.radioNotifications) {
                  showToast(enabled ? 'Radio preview enabled.' : 'Radio turned off.', 'info');
                }
              }}
              onResumeRadio={() => {
                resumeRadio(guardName);
                if (settings.radioNotifications) {
                  showToast('Radio resumed and ready.');
                }
              }}
              onOpenSnooze={() => setSnoozeSheetOpen(true)}
              onOpenEmergency={() => setEmergencySheetOpen(true)}
            />

            {activeTab === 'group' && (
              <GroupRadioTab
                channel={activeChannel}
                guards={connectedGuards}
                currentGuardName={guardName}
                radioStatus={radioStatus}
                transmissionStatus={transmissionStatus}
                transmissionContext={transmissionContext}
                activeSpeaker={activeSpeaker}
                onStartTransmit={() => startTransmission(guardName, 'group')}
                onStopTransmit={() => stopTransmission(guardName)}
                onSelectDirectGuard={(guard) => selectGuard(guard)}
                onSimulateIncomingSpeaker={simulateIncomingSpeaker}
              />
            )}

            {activeTab === 'direct' && (
              <DirectRadioTab
                guards={connectedGuards}
                selectedGuard={selectedGuard}
                currentGuardName={guardName}
                radioStatus={radioStatus}
                transmissionStatus={transmissionStatus}
                transmissionContext={transmissionContext}
                activeSpeaker={activeSpeaker}
                onSelectGuard={selectGuard}
                onStartDirectTransmit={(recipient) =>
                  startTransmission(guardName, 'direct', recipient.name)
                }
                onStopDirectTransmit={(recipient) =>
                  stopTransmission(guardName, recipient.name)
                }
              />
            )}

            {activeTab === 'history' && (
              <RadioHistoryTab
                entries={mockRadioHistory}
                filter={historyFilter}
                onFilterChange={setHistoryFilter}
              />
            )}

            <details className="wt-controls-details">
              <summary>My availability <span>{workStatus}</span></summary>
              <RadioConnectionToggle workStatus={workStatus} onChangeWorkStatus={setWorkStatus} />
            </details>
          </main>

          <GuardBottomNav currentTab="walkie-talkie" />
        </>
      )}

      <RadioSnoozeSheet
        open={isSnoozeSheetOpen}
        radioStatus={radioStatus}
        snoozeUntil={snoozeUntil}
        snoozeDuration={snoozeDuration}
        nowMs={effectiveNowMs}
        onSelectDuration={(duration) => {
          setNowMs(Date.now());
          startSnooze(duration, guardName);
          if (settings.radioNotifications) {
            showToast(
              duration === 'manual'
                ? 'Radio snoozed until manually enabled.'
                : `Radio snoozed for ${duration} minutes.`,
              'info',
            );
          }
        }}
        onResumeRadio={() => {
          resumeRadio(guardName);
          if (settings.radioNotifications) {
            showToast('Radio resumed and receiving transmissions.');
          }
        }}
        onClose={() => setSnoozeSheetOpen(false)}
      />

      <EmergencyRadioSheet
        open={isEmergencySheetOpen}
        armed={isEmergencyArmed}
        isTransmitting={
          transmissionStatus === 'transmitting' &&
          transmissionContext === 'emergency'
        }
        radioStatus={radioStatus}
        guardName={guardName}
        onArmToggle={setEmergencyArmed}
        onStartEmergencyTransmit={() => startTransmission(guardName, 'emergency')}
        onStopEmergencyTransmit={() => stopTransmission(guardName)}
        onClose={() => setEmergencySheetOpen(false)}
      />
    </div>
  );
};
