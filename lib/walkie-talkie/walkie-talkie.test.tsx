import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuardBottomNav } from '../../components/guard/GuardBottomNav';
import { DirectRadioTab } from '../../components/walkie-talkie/DirectRadioTab';
import { EmergencyRadioSheet } from '../../components/walkie-talkie/EmergencyRadioSheet';
import { RadioSettingsPage } from '../../components/walkie-talkie/RadioSettingsPage';
import { RadioSnoozeSheet } from '../../components/walkie-talkie/RadioSnoozeSheet';
import { WalkieTalkiePage } from '../../components/walkie-talkie/WalkieTalkiePage';
import { INITIAL_MOCK_GUARDS } from '../walkie-talkie/mock-data';
import {
  categorizeGroupRoster,
  evaluateDirectTransmitState,
  filterGuardStatusList,
  filterRadioHistory,
  formatSnoozeRemaining,
} from '../walkie-talkie/radio-service';
import { useWalkieTalkieStore } from '../../store/useWalkieTalkieStore';
import { authenticatedGuardName } from '../display';

test('SocietyOS Guard Walkie Talkie UI & State Rules', async (suite) => {
  await suite.test('GuardBottomNav includes separate Walkie Talkie tab alongside existing tabs', () => {
    const html = renderToStaticMarkup(<GuardBottomNav currentTab="walkie-talkie" />);
    assert.ok(html.includes('Gate Queue'));
    assert.ok(html.includes('New Visitor'));
    assert.ok(html.includes('Vehicle Bay'));
    assert.ok(html.includes('Walkie Talkie'));
    assert.ok(html.includes('data-tab="walkie-talkie"'));
  });

  await suite.test('Categorization excludes Radio OFF, Snoozed, and Offline guards from listening list', () => {
    const roster = categorizeGroupRoster(INITIAL_MOCK_GUARDS);
    assert.ok(roster.connected.every((g) => g.radioStatus === 'ON'));
    assert.ok(
      roster.listening.every(
        (g) => g.radioStatus === 'ON' && g.workStatus !== 'Busy' && g.isListening,
      ),
    );
    assert.ok(roster.busy.some((g) => g.workStatus === 'Busy'));
    assert.ok(
      roster.disconnected.some((g) => g.workStatus === 'On Duty' && g.radioStatus === 'OFF'),
      'Must clearly distinguish On Duty guard with Radio OFF from Off Duty',
    );
    assert.ok(roster.disconnected.some((g) => g.radioStatus === 'SNOOZED'));
    assert.ok(roster.disconnected.some((g) => g.radioStatus === 'OFFLINE'));
  });

  await suite.test('Direct Radio blocks transmission cleanly when recipient or sender is Snoozed, OFF, or Offline', () => {
    const snoozedGuard = INITIAL_MOCK_GUARDS.find((g) => g.radioStatus === 'SNOOZED')!;
    const radioOffGuard = INITIAL_MOCK_GUARDS.find((g) => g.radioStatus === 'OFF')!;
    const activeGuard = INITIAL_MOCK_GUARDS.find((g) => g.radioStatus === 'ON')!;

    assert.equal(evaluateDirectTransmitState('OFF', activeGuard).allowed, false);
    assert.equal(evaluateDirectTransmitState('SNOOZED', activeGuard).allowed, false);
    assert.equal(evaluateDirectTransmitState('ON', snoozedGuard).allowed, false);
    assert.equal(evaluateDirectTransmitState('ON', radioOffGuard).allowed, false);
    assert.equal(evaluateDirectTransmitState('ON', activeGuard).allowed, true);
  });

  await suite.test('Snooze sets Snoozed status, disables transmit, counts down, and auto-restores to ON on expiry', () => {
    useWalkieTalkieStore.getState().reset();
    const store = useWalkieTalkieStore.getState();

    store.startSnooze(15, 'Rajesh');
    assert.equal(useWalkieTalkieStore.getState().radioStatus, 'SNOOZED');
    assert.equal(useWalkieTalkieStore.getState().snoozeDuration, 15);
    assert.ok(useWalkieTalkieStore.getState().snoozeUntil !== null);

    // Attempting transmission while snoozed must not transmit
    store.startTransmission('Rajesh', 'group');
    assert.equal(useWalkieTalkieStore.getState().transmissionStatus, 'idle');
    assert.equal(useWalkieTalkieStore.getState().activeSpeaker, null);

    const remainingText = formatSnoozeRemaining(
      useWalkieTalkieStore.getState().snoozeUntil,
      15,
      (useWalkieTalkieStore.getState().snoozeUntil ?? 0) - 65_000,
    );
    assert.equal(remainingText, '01:05 remaining');

    // Expire snooze
    useWalkieTalkieStore.getState().tickSnooze((useWalkieTalkieStore.getState().snoozeUntil ?? 0) + 1000, 'Rajesh');
    assert.equal(useWalkieTalkieStore.getState().radioStatus, 'ON');
    assert.equal(useWalkieTalkieStore.getState().snoozeUntil, null);
  });

  await suite.test('Push-to-Talk enforces single speaker and logs mock history on release', () => {
    useWalkieTalkieStore.getState().reset();
    const peer = INITIAL_MOCK_GUARDS[0];
    useWalkieTalkieStore.getState().simulateIncomingSpeaker(peer);
    assert.equal(useWalkieTalkieStore.getState().activeSpeaker?.guardName, peer.name);

    useWalkieTalkieStore.getState().startTransmission('Self Guard', 'group');
    assert.equal(useWalkieTalkieStore.getState().transmissionStatus, 'transmitting');
    assert.equal(useWalkieTalkieStore.getState().activeSpeaker?.guardName, 'Self Guard');

    const beforeHistoryCount = useWalkieTalkieStore.getState().mockRadioHistory.length;
    useWalkieTalkieStore.getState().stopTransmission('Self Guard');
    assert.equal(useWalkieTalkieStore.getState().transmissionStatus, 'idle');
    assert.equal(useWalkieTalkieStore.getState().activeSpeaker, null);
    assert.equal(useWalkieTalkieStore.getState().mockRadioHistory.length, beforeHistoryCount + 1);
  });

  await suite.test('Guard Status filters, search, and Radio History filters work cleanly', () => {
    assert.ok(filterGuardStatusList(INITIAL_MOCK_GUARDS, 'snoozed', '').every((g) => g.radioStatus === 'SNOOZED'));
    assert.ok(filterGuardStatusList(INITIAL_MOCK_GUARDS, 'connected', '').every((g) => g.radioStatus === 'ON'));
    assert.equal(filterGuardStatusList(INITIAL_MOCK_GUARDS, 'all', 'North Back Gate').length, 1);

    const history = useWalkieTalkieStore.getState().mockRadioHistory;
    assert.ok(filterRadioHistory(history, 'direct').every((h) => h.category === 'direct'));
    assert.ok(filterRadioHistory(history, 'connection').every((h) => h.category === 'connection'));
  });

  await suite.test('Radio transmission uses authenticated full name instead of phone number', () => {
    assert.equal(authenticatedGuardName({ fullName: '  Pramita Kumari Panda  ' }, '9000000000'), 'Pramita Kumari Panda');
    assert.equal(authenticatedGuardName(null, '+91 90000 00000'), 'On-Duty Guard');
    assert.equal(authenticatedGuardName(null, 'Officer 123'), 'On-Duty Guard');
    assert.equal(authenticatedGuardName(null, 'Vikram Singh'), 'Vikram Singh');
    const html = renderToStaticMarkup(<WalkieTalkiePage />);
    const tabs = html.match(/class="wt-tab-btn/g) || [];
    assert.equal(tabs.length, 3);
    assert.ok(!html.includes('aria-label="Guard Status"'));
  });

  await suite.test('Direct Radio Private view and Walkie Talkie screens render cleanly without conventional phone-call UI', () => {
    useWalkieTalkieStore.getState().reset();
    const pageHtml = renderToStaticMarkup(<WalkieTalkiePage />);
    assert.ok(pageHtml.includes('Walkie Talkie'));
    assert.ok(pageHtml.includes('HOLD TO TALK'));
    assert.ok(pageHtml.includes('Group Radio'));
    assert.ok(pageHtml.includes('Direct Radio'));
    assert.ok(!pageHtml.includes('Guard Status'));
    assert.ok(pageHtml.includes('Radio History'));

    const directHtml = renderToStaticMarkup(
      <DirectRadioTab
        guards={INITIAL_MOCK_GUARDS}
        selectedGuard={INITIAL_MOCK_GUARDS[0]}
        currentGuardName="You"
        radioStatus="ON"
        transmissionStatus="idle"
        transmissionContext="direct"
        activeSpeaker={null}
        onSelectGuard={() => undefined}
        onStartDirectTransmit={() => undefined}
        onStopDirectTransmit={() => undefined}
      />,
    );
    assert.ok(directHtml.includes('Private Radio'));
    assert.ok(!/accept call|decline call|ringing/i.test(directHtml), 'Must not include conventional phone call controls');

    const snoozeHtml = renderToStaticMarkup(
      <RadioSnoozeSheet
        open
        radioStatus="ON"
        snoozeUntil={null}
        snoozeDuration={null}
        nowMs={0}
        onSelectDuration={() => undefined}
        onResumeRadio={() => undefined}
        onClose={() => undefined}
      />,
    );
    assert.ok(snoozeHtml.includes('5 minutes'));
    assert.ok(snoozeHtml.includes('15 minutes'));
    assert.ok(snoozeHtml.includes('30 minutes'));
    assert.ok(snoozeHtml.includes('Until manually enabled'));

    const emergencyHtml = renderToStaticMarkup(
      <EmergencyRadioSheet
        open
        armed={false}
        isTransmitting={false}
        radioStatus="ON"
        guardName="You"
        onArmToggle={() => undefined}
        onStartEmergencyTransmit={() => undefined}
        onStopEmergencyTransmit={() => undefined}
        onClose={() => undefined}
      />,
    );
    assert.ok(emergencyHtml.includes('Warning Before Activating'));
    assert.ok(emergencyHtml.includes('PRIORITY STATUS'));

    const settingsHtml = renderToStaticMarkup(
      <RadioSettingsPage
        settings={useWalkieTalkieStore.getState().settings}
        onUpdateSettings={() => undefined}
        onBack={() => undefined}
      />,
    );
    assert.ok(settingsHtml.includes('Default Radio State'));
    assert.ok(settingsHtml.includes('Planned'));

    // Verify no browser audio/mic APIs or native <select> dropdowns were introduced in walkie-talkie UI
    const pttSource = readFileSync(join(process.cwd(), 'components/walkie-talkie/PushToTalkButton.tsx'), 'utf8');
    assert.ok(!pttSource.includes('getUserMedia'), 'Must not access microphone in UI-only implementation');
    const settingsSource = readFileSync(join(process.cwd(), 'components/walkie-talkie/RadioSettingsPage.tsx'), 'utf8');
    assert.ok(!/<select[\s>]/i.test(settingsSource), 'Must use GuardMobileSelect instead of native <select>');
  });
});
