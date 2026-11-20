export type WorkStatus = 'On Duty' | 'Busy' | 'On Break' | 'Off Duty';

export type RadioStatus = 'ON' | 'OFF' | 'SNOOZED' | 'RECONNECTING' | 'OFFLINE';

export type TransmissionStatus = 'idle' | 'transmitting';

export type TransmissionContext = 'group' | 'direct' | 'emergency';

export type WalkieTalkieInternalTab = 'group' | 'direct' | 'history';

export type GuardStatusFilter =
  | 'all'
  | 'available'
  | 'busy'
  | 'snoozed'
  | 'offline'
  | 'connected';

export type RadioHistoryCategory = 'group' | 'direct' | 'connection' | 'emergency';

export type RadioHistoryFilter = 'all' | 'group' | 'direct' | 'connection';

export type SnoozeDurationOption = 5 | 15 | 30 | 'manual';

export type AudioOutputPreference = 'speaker' | 'earpiece' | 'bluetooth';

export interface RadioChannel {
  id: string;
  name: string;
  code: string;
  description: string;
}

export interface ActiveSpeakerInfo {
  guardId: string;
  guardName: string;
  gateLocation: string;
  context: TransmissionContext;
  startedAt: string;
}

export interface GuardMember {
  id: string;
  badgeCode: string;
  name: string;
  gateLocation: string;
  workStatus: WorkStatus;
  radioStatus: RadioStatus;
  isListening: boolean;
  snoozeRemainingLabel?: string;
  lastSeen: string;
  avatarColor?: string;
}

export interface RadioHistoryEntry {
  id: string;
  actor: string;
  category: RadioHistoryCategory;
  summary: string;
  timestamp: string;
  contextLabel?: string;
}

export interface RadioSettingsState {
  defaultRadioState: 'ON' | 'OFF';
  autoConnectOnLaunch: boolean;
  defaultSnoozeDuration: SnoozeDurationOption;
  soundEffects: boolean;
  vibration: boolean;
  audioOutput: AudioOutputPreference;
  radioNotifications: boolean;
  backgroundRadioSupported: false;
}

export interface GroupRosterBreakdown {
  connected: GuardMember[];
  listening: GuardMember[];
  busy: GuardMember[];
  disconnected: GuardMember[];
}
