'use client';

import { create } from 'zustand';
import {
  DEFAULT_RADIO_CHANNEL,
  DEFAULT_RADIO_SETTINGS,
  INITIAL_MOCK_GUARDS,
  INITIAL_MOCK_HISTORY,
} from '../lib/walkie-talkie/mock-data';
import {
  defaultRadioCommunicationService,
  formatLocalTimeLabel,
  formatSnoozeDurationLabel,
} from '../lib/walkie-talkie/radio-service';
import type {
  ActiveSpeakerInfo,
  GuardMember,
  GuardStatusFilter,
  RadioChannel,
  RadioHistoryCategory,
  RadioHistoryEntry,
  RadioHistoryFilter,
  RadioSettingsState,
  RadioStatus,
  SnoozeDurationOption,
  TransmissionContext,
  TransmissionStatus,
  WalkieTalkieInternalTab,
  WorkStatus,
} from '../types/walkie-talkie';

const SETTINGS_STORAGE_KEY = 'societyos:walkie-talkie:settings';
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function readPersistedSettings(): RadioSettingsState {
  if (typeof window === 'undefined') return DEFAULT_RADIO_SETTINGS;
  try {
    const raw = window.localStorage?.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_RADIO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<RadioSettingsState>;
    return {
      ...DEFAULT_RADIO_SETTINGS,
      ...parsed,
      backgroundRadioSupported: false,
    };
  } catch {
    return DEFAULT_RADIO_SETTINGS;
  }
}

function persistSettings(next: RadioSettingsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...next, backgroundRadioSupported: false }),
    );
  } catch {
    // Ignore storage quota or restricted-mode errors cleanly
  }
}

function createHistoryEntry(
  actor: string,
  category: RadioHistoryCategory,
  summary: string,
  contextLabel?: string,
): RadioHistoryEntry {
  return {
    id: `wt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actor,
    category,
    summary,
    contextLabel,
    timestamp: formatLocalTimeLabel(),
  };
}

export interface WalkieTalkieState {
  workStatus: WorkStatus;
  radioStatus: RadioStatus;
  snoozeUntil: number | null;
  snoozeDuration: SnoozeDurationOption | null;
  activeChannel: RadioChannel;
  activeSpeaker: ActiveSpeakerInfo | null;
  selectedGuard: GuardMember | null;
  transmissionStatus: TransmissionStatus;
  transmissionContext: TransmissionContext;
  connectedGuards: GuardMember[];
  mockRadioHistory: RadioHistoryEntry[];

  activeTab: WalkieTalkieInternalTab;
  guardStatusFilter: GuardStatusFilter;
  historyFilter: RadioHistoryFilter;
  isSnoozeSheetOpen: boolean;
  isEmergencySheetOpen: boolean;
  isEmergencyArmed: boolean;
  isSettingsOpen: boolean;
  settingsHydrated: boolean;
  settings: RadioSettingsState;

  hydrateSettings: () => void;
  setActiveTab: (tab: WalkieTalkieInternalTab) => void;
  setGuardStatusFilter: (filter: GuardStatusFilter) => void;
  setHistoryFilter: (filter: RadioHistoryFilter) => void;
  setWorkStatus: (status: WorkStatus) => void;
  setSnoozeSheetOpen: (open: boolean) => void;
  setEmergencySheetOpen: (open: boolean) => void;
  setEmergencyArmed: (armed: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  selectGuard: (guard: GuardMember | null) => void;
  toggleRadio: (enabled: boolean, actorName?: string) => void;
  setNetworkOnline: (online: boolean, actorName?: string) => void;
  startSnooze: (duration: SnoozeDurationOption, actorName?: string) => void;
  resumeRadio: (actorName?: string, expired?: boolean) => void;
  tickSnooze: (nowMs?: number, actorName?: string) => void;
  startTransmission: (
    actorName: string,
    context: TransmissionContext,
    targetGuardName?: string,
  ) => void;
  stopTransmission: (actorName: string, targetGuardName?: string) => void;
  simulateIncomingSpeaker: (guard: GuardMember | null) => void;
  updateSettings: (patch: Partial<Omit<RadioSettingsState, 'backgroundRadioSupported'>>) => void;
  reset: () => void;
}

export const useWalkieTalkieStore = create<WalkieTalkieState>((set, get) => ({
  workStatus: 'On Duty',
  radioStatus: 'ON',
  snoozeUntil: null,
  snoozeDuration: null,
  activeChannel: DEFAULT_RADIO_CHANNEL,
  activeSpeaker: null,
  selectedGuard: null,
  transmissionStatus: 'idle',
  transmissionContext: 'group',
  connectedGuards: INITIAL_MOCK_GUARDS,
  mockRadioHistory: INITIAL_MOCK_HISTORY,

  activeTab: 'group',
  guardStatusFilter: 'all',
  historyFilter: 'all',
  isSnoozeSheetOpen: false,
  isEmergencySheetOpen: false,
  isEmergencyArmed: false,
  isSettingsOpen: false,
  settingsHydrated: false,
  settings: DEFAULT_RADIO_SETTINGS,

  hydrateSettings: () => {
    if (get().settingsHydrated) return;
    const loaded = readPersistedSettings();
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    set({
      settings: loaded,
      settingsHydrated: true,
      radioStatus: isOffline
        ? 'OFFLINE'
        : loaded.autoConnectOnLaunch && loaded.defaultRadioState === 'ON'
          ? 'ON'
          : 'OFF',
    });
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setGuardStatusFilter: (guardStatusFilter) => set({ guardStatusFilter }),
  setHistoryFilter: (historyFilter) => set({ historyFilter }),
  setWorkStatus: (workStatus) => set({ workStatus }),
  setSnoozeSheetOpen: (isSnoozeSheetOpen) => set({ isSnoozeSheetOpen }),
  setEmergencySheetOpen: (isEmergencySheetOpen) =>
    set({
      isEmergencySheetOpen,
      isEmergencyArmed: isEmergencySheetOpen ? get().isEmergencyArmed : false,
    }),
  setEmergencyArmed: (isEmergencyArmed) => set({ isEmergencyArmed }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

  selectGuard: (selectedGuard) =>
    set({
      selectedGuard,
      activeTab: selectedGuard ? 'direct' : get().activeTab,
    }),

  toggleRadio: (enabled, actorName = 'You') => {
    clearReconnectTimer();
    const state = get();
    if (!enabled) {
      void defaultRadioCommunicationService.disconnect();
      set({
        radioStatus: 'OFF',
        snoozeUntil: null,
        snoozeDuration: null,
        transmissionStatus: 'idle',
        activeSpeaker: null,
        isSnoozeSheetOpen: false,
        mockRadioHistory: [
          createHistoryEntry(actorName, 'connection', 'Turned Radio OFF'),
          ...state.mockRadioHistory,
        ],
      });
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      set({
        radioStatus: 'OFFLINE',
        transmissionStatus: 'idle',
        activeSpeaker: null,
      });
      return;
    }

    set({
      radioStatus: 'RECONNECTING',
      snoozeUntil: null,
      snoozeDuration: null,
      transmissionStatus: 'idle',
      isSnoozeSheetOpen: false,
    });

    void defaultRadioCommunicationService.connect(state.activeChannel.id);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      const latest = get();
      if (latest.radioStatus !== 'RECONNECTING') return;
      set({
        radioStatus: 'ON',
        mockRadioHistory: [
          createHistoryEntry(actorName, 'connection', 'Connected to Radio'),
          ...latest.mockRadioHistory,
        ],
      });
    }, 450);
  },

  setNetworkOnline: (online, actorName = 'You') => {
    clearReconnectTimer();
    const state = get();
    if (!online) {
      set({
        radioStatus: 'OFFLINE',
        transmissionStatus: 'idle',
        activeSpeaker: null,
      });
      return;
    }
    if (state.radioStatus === 'OFFLINE') {
      if (state.snoozeDuration) {
        set({ radioStatus: 'SNOOZED' });
      } else {
        set({
          radioStatus: 'ON',
          mockRadioHistory: [
            createHistoryEntry(actorName, 'connection', 'Radio back online'),
            ...state.mockRadioHistory,
          ],
        });
      }
    }
  },

  startSnooze: (duration, actorName = 'You') => {
    clearReconnectTimer();
    void defaultRadioCommunicationService.snooze(duration);
    const state = get();
    const until =
      duration === 'manual' ? null : Date.now() + duration * 60 * 1000;
    const durationText = formatSnoozeDurationLabel(duration);

    set({
      radioStatus: 'SNOOZED',
      snoozeUntil: until,
      snoozeDuration: duration,
      transmissionStatus: 'idle',
      activeSpeaker: null,
      isSnoozeSheetOpen: false,
      mockRadioHistory: [
        createHistoryEntry(
          actorName,
          'connection',
          duration === 'manual'
            ? 'Snoozed Radio until manually enabled'
            : `Snoozed Radio for ${durationText}`,
        ),
        ...state.mockRadioHistory,
      ],
    });
  },

  resumeRadio: (actorName = 'You', expired = false) => {
    clearReconnectTimer();
    void defaultRadioCommunicationService.resume();
    const state = get();
    if (state.radioStatus !== 'SNOOZED' && state.radioStatus !== 'OFF') return;
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    set({
      radioStatus: isOffline ? 'OFFLINE' : 'ON',
      snoozeUntil: null,
      snoozeDuration: null,
      isSnoozeSheetOpen: false,
      mockRadioHistory: [
        createHistoryEntry(
          actorName,
          'connection',
          expired ? 'Snooze ended · Radio ON' : 'Resumed Radio ON',
        ),
        ...state.mockRadioHistory,
      ],
    });
  },

  tickSnooze: (nowMs = Date.now(), actorName = 'You') => {
    const state = get();
    if (
      state.radioStatus === 'SNOOZED' &&
      state.snoozeUntil !== null &&
      nowMs >= state.snoozeUntil
    ) {
      get().resumeRadio(actorName, true);
    }
  },

  startTransmission: (actorName, context, targetGuardName) => {
    const state = get();
    if (state.radioStatus !== 'ON') return;
    void defaultRadioCommunicationService.startTransmit(
      context,
      state.selectedGuard?.id,
    );
    set({
      transmissionStatus: 'transmitting',
      transmissionContext: context,
      activeSpeaker: {
        guardId: 'self',
        guardName: targetGuardName
          ? `${actorName} → ${targetGuardName}`
          : actorName,
        gateLocation:
          context === 'emergency'
            ? 'PRIORITY EMERGENCY PREVIEW'
            : context === 'direct'
              ? 'Private Radio'
              : state.activeChannel.name,
        context,
        startedAt: formatLocalTimeLabel(),
      },
    });
  },

  stopTransmission: (actorName, targetGuardName) => {
    const state = get();
    if (state.transmissionStatus !== 'transmitting') return;
    void defaultRadioCommunicationService.stopTransmit();

    const category: RadioHistoryCategory =
      state.transmissionContext === 'emergency'
        ? 'emergency'
        : state.transmissionContext === 'direct'
          ? 'direct'
          : 'group';

    const summary =
      state.transmissionContext === 'emergency'
        ? 'Emergency Radio Preview (Visual UI)'
        : state.transmissionContext === 'direct' && targetGuardName
          ? `Direct Radio to ${targetGuardName}`
          : 'Group Radio';

    set({
      transmissionStatus: 'idle',
      activeSpeaker: null,
      mockRadioHistory: [
        createHistoryEntry(
          actorName,
          category,
          summary,
          state.transmissionContext === 'direct' && targetGuardName
            ? `${actorName} → ${targetGuardName}`
            : state.activeChannel.name,
        ),
        ...state.mockRadioHistory,
      ],
    });
  },

  simulateIncomingSpeaker: (guard) => {
    const state = get();
    if (state.radioStatus !== 'ON' || state.transmissionStatus === 'transmitting') {
      return;
    }
    if (!guard || guard.radioStatus !== 'ON') {
      set({ activeSpeaker: null });
      return;
    }
    set({
      activeSpeaker: {
        guardId: guard.id,
        guardName: guard.name,
        gateLocation: guard.gateLocation,
        context: 'group',
        startedAt: formatLocalTimeLabel(),
      },
    });
  },

  updateSettings: (patch) => {
    const next: RadioSettingsState = {
      ...get().settings,
      ...patch,
      backgroundRadioSupported: false,
    };
    persistSettings(next);
    set({ settings: next });
  },

  reset: () => {
    clearReconnectTimer();
    set({
      workStatus: 'On Duty',
      radioStatus: 'ON',
      snoozeUntil: null,
      snoozeDuration: null,
      activeChannel: DEFAULT_RADIO_CHANNEL,
      activeSpeaker: null,
      selectedGuard: null,
      transmissionStatus: 'idle',
      transmissionContext: 'group',
      connectedGuards: INITIAL_MOCK_GUARDS,
      mockRadioHistory: INITIAL_MOCK_HISTORY,
      activeTab: 'group',
      guardStatusFilter: 'all',
      historyFilter: 'all',
      isSnoozeSheetOpen: false,
      isEmergencySheetOpen: false,
      isEmergencyArmed: false,
      isSettingsOpen: false,
    });
  },
}));
