import type {
  GuardMember,
  GuardStatusFilter,
  GroupRosterBreakdown,
  RadioChannel,
  RadioHistoryEntry,
  RadioHistoryFilter,
  RadioStatus,
  SnoozeDurationOption,
  TransmissionContext,
} from '../../types/walkie-talkie';

/**
 * Placeholder service boundary for future real-time voice transport
 * (e.g., LiveKit SFU or self-hosted audio server).
 * UI components and state must remain decoupled from transport internals.
 */
export interface RadioCommunicationService {
  connect(channelId: string): Promise<void>;
  disconnect(): Promise<void>;
  switchChannel(channel: RadioChannel): Promise<void>;
  startTransmit(context: TransmissionContext, targetGuardId?: string): Promise<void>;
  stopTransmit(): Promise<void>;
  snooze(duration: SnoozeDurationOption): Promise<void>;
  resume(): Promise<void>;
  startEmergencyPreview(): Promise<void>;
  stopEmergencyPreview(): Promise<void>;
  dispose(): void;
}

/**
 * No-op UI simulation adapter implementing RadioCommunicationService.
 * Performs no microphone capture, WebRTC negotiation, WebSocket, or audio streaming.
 */
export class MockRadioCommunicationService implements RadioCommunicationService {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async switchChannel(): Promise<void> {}
  async startTransmit(): Promise<void> {}
  async stopTransmit(): Promise<void> {}
  async snooze(): Promise<void> {}
  async resume(): Promise<void> {}
  async startEmergencyPreview(): Promise<void> {}
  async stopEmergencyPreview(): Promise<void> {}
  dispose(): void {}
}

export const defaultRadioCommunicationService: RadioCommunicationService =
  new MockRadioCommunicationService();

export function canReceiveRadio(radioStatus: RadioStatus): boolean {
  return radioStatus === 'ON';
}

export function canTransmitRadio(radioStatus: RadioStatus): boolean {
  return radioStatus === 'ON';
}

export function getRadioStatusLabel(radioStatus: RadioStatus): string {
  switch (radioStatus) {
    case 'ON':
      return 'Radio ON';
    case 'OFF':
      return 'Radio OFF';
    case 'SNOOZED':
      return 'Snoozed';
    case 'RECONNECTING':
      return 'Reconnecting';
    case 'OFFLINE':
      return 'Offline';
  }
}

export function getRadioReceptionMessage(radioStatus: RadioStatus): string {
  switch (radioStatus) {
    case 'ON':
      return 'Receiving group & direct radio transmissions.';
    case 'OFF':
      return 'Radio is OFF. Cannot hear group or direct transmissions.';
    case 'SNOOZED':
      return 'Radio is Snoozed. Receiving & transmitting paused.';
    case 'RECONNECTING':
      return 'Reconnecting to society radio channel…';
    case 'OFFLINE':
      return 'Network offline. Radio transport unavailable.';
  }
}

export function evaluateDirectTransmitState(
  senderRadioStatus: RadioStatus,
  recipient: GuardMember | null,
): { allowed: boolean; reason: string | null } {
  if (!recipient) {
    return { allowed: false, reason: 'Select a guard to open Private Radio.' };
  }
  if (senderRadioStatus === 'OFF') {
    return {
      allowed: false,
      reason: 'Your radio is OFF. Enable Radio ON to transmit.',
    };
  }
  if (senderRadioStatus === 'SNOOZED') {
    return {
      allowed: false,
      reason: 'Your radio is Snoozed. Resume Radio to transmit.',
    };
  }
  if (senderRadioStatus === 'RECONNECTING') {
    return {
      allowed: false,
      reason: 'Reconnecting to radio network. Wait a moment before transmitting.',
    };
  }
  if (senderRadioStatus === 'OFFLINE') {
    return {
      allowed: false,
      reason: 'Terminal is offline. Direct radio unavailable.',
    };
  }

  switch (recipient.radioStatus) {
    case 'ON':
      return { allowed: true, reason: null };
    case 'SNOOZED':
      return {
        allowed: false,
        reason: `${recipient.name} has snoozed radio${recipient.snoozeRemainingLabel ? ` (${recipient.snoozeRemainingLabel})` : ''} and cannot receive transmissions.`,
      };
    case 'OFF':
      return {
        allowed: false,
        reason: `${recipient.name} has Radio OFF (${recipient.workStatus}) and cannot receive messages.`,
      };
    case 'OFFLINE':
      return {
        allowed: false,
        reason: `${recipient.name} is Offline and cannot receive transmissions.`,
      };
    case 'RECONNECTING':
      return {
        allowed: false,
        reason: `${recipient.name} is reconnecting to the radio network.`,
      };
  }
}

/**
 * Enforces radio visibility rules:
 * - Only guards with Radio ON appear in connected/listening lists.
 * - Guards with Radio OFF, Snoozed, or Offline never appear as listening.
 * - Work-busy guards remain clearly distinguished from Snoozed or Radio OFF.
 */
export function categorizeGroupRoster(guards: GuardMember[]): GroupRosterBreakdown {
  const connected: GuardMember[] = [];
  const listening: GuardMember[] = [];
  const busy: GuardMember[] = [];
  const disconnected: GuardMember[] = [];

  for (const guard of guards) {
    if (guard.workStatus === 'Busy') {
      busy.push(guard);
    }
    if (guard.radioStatus === 'ON') {
      connected.push(guard);
      if (guard.isListening && guard.workStatus !== 'Busy') {
        listening.push(guard);
      }
    } else if (
      guard.radioStatus === 'OFF' ||
      guard.radioStatus === 'OFFLINE' ||
      guard.radioStatus === 'SNOOZED'
    ) {
      disconnected.push(guard);
    }
  }

  return { connected, listening, busy, disconnected };
}

export function filterGuardStatusList(
  guards: GuardMember[],
  filter: GuardStatusFilter,
  searchQuery: string,
): GuardMember[] {
  const normalized = searchQuery.trim().toLowerCase();

  return guards.filter((guard) => {
    if (normalized) {
      const hay = `${guard.name} ${guard.badgeCode} ${guard.gateLocation} ${guard.workStatus}`.toLowerCase();
      if (!hay.includes(normalized)) return false;
    }

    switch (filter) {
      case 'all':
        return true;
      case 'available':
        return guard.workStatus === 'On Duty' && guard.radioStatus === 'ON';
      case 'busy':
        return guard.workStatus === 'Busy';
      case 'snoozed':
        return guard.radioStatus === 'SNOOZED';
      case 'offline':
        return guard.radioStatus === 'OFFLINE' || guard.radioStatus === 'OFF';
      case 'connected':
        return guard.radioStatus === 'ON';
    }
  });
}

export function filterRadioHistory(
  entries: RadioHistoryEntry[],
  filter: RadioHistoryFilter,
): RadioHistoryEntry[] {
  if (filter === 'all') return entries;
  if (filter === 'group') {
    return entries.filter((item) => item.category === 'group' || item.category === 'emergency');
  }
  return entries.filter((item) => item.category === filter);
}

export function formatSnoozeDurationLabel(duration: SnoozeDurationOption | null): string {
  if (duration === 'manual') return 'Until manually enabled';
  if (typeof duration === 'number') return `${duration} minutes`;
  return '15 minutes';
}

export function formatSnoozeRemaining(
  snoozeUntil: number | null,
  duration: SnoozeDurationOption | null,
  nowMs: number = Date.now(),
): string {
  if (duration === 'manual' || snoozeUntil === null) {
    return 'Manual resume required';
  }
  const diffSeconds = Math.max(0, Math.ceil((snoozeUntil - nowMs) / 1000));
  const mins = Math.floor(diffSeconds / 60);
  const secs = diffSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} remaining`;
}

export function formatLocalTimeLabel(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
