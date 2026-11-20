export const VISITOR_LIVE_CHANNEL = 'visitor.live.v1';
export type LiveState = 'connecting' | 'connected' | 'recovering' | 'stopped';
export interface LiveSession { userId: string; organizationId: string; accessToken: string; sessionToken?: string }
export interface VisitorInvalidation { version: 1; eventId: string; type: VisitorLiveType; organizationId: string; visitId: string; occurredAt: string }
export interface VisitorSocket {
  connected: boolean;
  on(event: string, listener: (data?: unknown) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
  removeAllListeners(): unknown;
}
export interface VisitorLiveOptions {
  session: LiveSession;
  current: () => boolean;
  socket: VisitorSocket;
  refresh: () => Promise<void>;
  state: (state: LiveState) => void;
  active: () => boolean;
}
export const VISITOR_LIVE_TYPES = ['visit.created', 'visit.arrived', 'visit.approved', 'visit.rejected', 'visit.checked_out', 'visit.status_changed', 'visit.approval_changed', 'visit.pass_changed'] as const;
export type VisitorLiveType = typeof VISITOR_LIVE_TYPES[number];
const types = new Set<string>(VISITOR_LIVE_TYPES);
function isLiveType(value: unknown): value is VisitorLiveType { return typeof value === 'string' && types.has(value); }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function parseVisitorInvalidation(input: unknown): VisitorInvalidation | null {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !('version' in input) || input.version !== 1 ||
    !('eventId' in input) || typeof input.eventId !== 'string' || !/^[a-f0-9]{64}$/.test(input.eventId) ||
    !('type' in input) || !isLiveType(input.type) ||
    !('organizationId' in input) || typeof input.organizationId !== 'string' || !uuid.test(input.organizationId) ||
    !('visitId' in input) || typeof input.visitId !== 'string' || !uuid.test(input.visitId) ||
    !('occurredAt' in input) || typeof input.occurredAt !== 'string' || !Number.isFinite(Date.parse(input.occurredAt))) return null;
  return { version: 1, eventId: input.eventId, type: input.type, organizationId: input.organizationId, visitId: input.visitId, occurredAt: input.occurredAt };
}

// Events invalidate authorized snapshots; they never append visitors or increment counters.
export class VisitorLiveClient {
  private stopped = false;
  private inFlight = false;
  private pending = false;
  private initialConnectHandled = false;
  private readonly seen = new Set<string>();
  private debounce?: ReturnType<typeof setTimeout>;
  constructor(private readonly options: VisitorLiveOptions) {}

  start(): void {
    const { socket, state } = this.options;
    state('connecting');
    this.initialConnectHandled = false;
    socket.on('connect', () => {
      if (!this.valid()) return;
      state('connected');
      if (!this.initialConnectHandled) {
        this.initialConnectHandled = true;
        if (this.inFlight || this.debounce) return;
      }
      this.recover();
    });
    socket.on('disconnect', () => {
      this.initialConnectHandled = true;
      if (this.valid()) state('recovering');
    });
    socket.on('connect_error', () => {
      this.initialConnectHandled = true;
      if (!this.valid()) return;
      state('recovering');
    });
    socket.on(VISITOR_LIVE_CHANNEL, input => this.receive(input));
    socket.connect();
    this.recover();
  }

  receive(input: unknown): void {
    if (!this.valid()) return;
    const event = parseVisitorInvalidation(input);
    if (!event || event.organizationId !== this.options.session.organizationId || this.seen.has(event.eventId)) return;
    const age = Date.now() - Date.parse(event.occurredAt);
    if (age > 300000 || age < -60000) return;
    this.seen.add(event.eventId);
    if (this.seen.size > 500) {
      const first = this.seen.values().next().value;
      if (first) this.seen.delete(first);
    }
    this.recover();
  }

  recover(): void {
    if (!this.valid() || !this.options.active()) return;
    this.pending = true;
    if (this.inFlight || this.debounce) return;
    this.debounce = setTimeout(() => { this.debounce = undefined; void this.refetch(); }, 100);
  }

  private valid(): boolean { return !this.stopped && this.options.current(); }
  private async refetch(): Promise<void> {
    if (!this.valid() || !this.options.active()) return;
    this.pending = false; this.inFlight = true;
    try { await this.options.refresh(); }
    catch { if (this.valid()) this.options.state('recovering'); }
    finally { this.inFlight = false; if (this.pending && this.valid()) this.recover(); }
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    clearTimeout(this.debounce);
    this.options.socket.removeAllListeners(); this.options.socket.disconnect();
    this.seen.clear(); this.pending = false; this.options.state('stopped');
  }
}
