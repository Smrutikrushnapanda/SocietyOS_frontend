import type { BackendComplaint } from '../../types/complaint';
import type { NotificationItem } from '../api/notifications.api';
import type { BackendVisitorVisit } from '../api/visitors.api';

export interface IslandEvent {
  id: string;
  title: string;
  body: string;
  date: string;
  category: string;
  icon: string;
  priority: number;
  critical?: boolean;
  unread: boolean;
  notificationId?: string;
  complaintId?: string;
  visitId?: string;
  noticeId?: string;
  reference?: string;
  target: 'request' | 'visitors' | 'notices' | 'notifications';
  expiresAt?: number;
}
export function eligibleEvents(events: IslandEvent[], now = Date.now()): IslandEvent[] {
  const unique = new Map<string, IslandEvent>();
  for (const event of events) {
    if (event.expiresAt !== undefined && (!Number.isFinite(event.expiresAt) || event.expiresAt <= now)) continue;
    const previous = unique.get(event.id);
    if (!previous || event.date > previous.date) unique.set(event.id, event);
  }
  return [...unique.values()].sort((a, b) => a.priority - b.priority || Number(b.unread) - Number(a.unread) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function nextEventId(events: readonly { id: string }[], current: string | null): string | null {
  if (!events.length) return null;
  const index = events.findIndex(event => event.id === current);
  return events[(index + 1) % events.length].id;
}
export function reconcileEventId(events: readonly { id: string }[], current: string | null, previous: readonly { id: string }[] = []): string | null {
  if (events.some(event => event.id === current)) return current;
  const oldIndex = previous.findIndex(event => event.id === current);
  for (let offset = 1; offset <= previous.length; offset++) {
    const candidate = previous[(Math.max(0, oldIndex) + offset) % previous.length];
    if (events.some(event => event.id === candidate.id)) return candidate.id;
  }
  return events[0]?.id ?? null;
}
export function buildIslandEvents(requests: BackendComplaint[], notifications: NotificationItem[], visits: BackendVisitorVisit[], includeReadNotifications = false): IslandEvent[] {
  const active = new Map(requests.filter(request => ['OPEN', 'IN_PROGRESS'].includes(request.status)).map(request => [request.id, request]));
  const result: IslandEvent[] = notifications.filter(notification => includeReadNotifications || !notification.is_read).flatMap(notification => {
    const type = notification.type.toUpperCase();
    const complaintId = typeof notification.data?.complaintId === 'string' ? notification.data.complaintId : undefined;
    const noticeId = typeof notification.data?.noticeId === 'string' ? notification.data.noticeId : undefined;
    if (complaintId && !active.has(complaintId)) return [];
    if (complaintId && typeof notification.data?.status === 'string' && notification.data.status !== active.get(complaintId)?.status) return [];
    const importance = typeof notification.data?.priority === 'string' ? notification.data.priority.toUpperCase() : '';
    const critical = type === 'EMERGENCY' || (type === 'SECURITY' && importance === 'CRITICAL');
    const important = ['HIGH', 'IMPORTANT', 'CRITICAL'].includes(importance) || type === 'IMPORTANT';
    return [{ id: `notification:${notification.id}`, notificationId: notification.id, complaintId,
      title: notification.title, body: notification.body, date: notification.created_at, category: type,
      icon: type === 'EMERGENCY' || type === 'SECURITY' ? 'alert' : type.includes('VISITOR') ? 'visitor' : complaintId || type === 'MAINTENANCE' ? 'maintenance' : type.includes('PARCEL') ? 'parcel' : 'notice',
      priority: critical || (type === 'SECURITY' && important) ? 0 : type.includes('VISITOR') ? 1 : complaintId || type === 'MAINTENANCE' ? 2 : important ? 3 : 4, critical,
      unread: !notification.is_read,
      noticeId,
      reference: complaintId,
      target: complaintId ? 'request' as const : type.includes('VISITOR') ? 'visitors' as const : noticeId ? 'notices' as const : 'notifications' as const,
      expiresAt: typeof notification.data?.expiresAt === 'string' ? Date.parse(notification.data.expiresAt) : undefined }];
  });
  for (const request of active.values()) {
    if (!result.some(event => event.complaintId === request.id)) {
      const status = request.status === 'OPEN'
        ? 'Request submitted'
        : request.assignedStaff
          ? `Technician: ${request.assignedStaff} · Work in progress`
          : request.assigned_to
            ? 'Technician assigned · Work in progress'
            : 'Work in progress';
      result.push({ id: `request:${request.id}`, complaintId: request.id, reference: request.id, title: request.subject, body: status, date: request.updated_at, category: 'MAINTENANCE', icon: 'maintenance', priority: request.priority === 'HIGH' ? 2 : 4, unread: false, target: 'request' });
    }
  }
  for (const visit of visits.filter(visit => visit.visit_status === 'PENDING')) result.push({ id: `visit:${visit.id}`, visitId: visit.id, reference: visit.id, title: visit.visitor?.name ? `Visitor approval: ${visit.visitor.name}` : 'Visitor approval requested', body: visit.visit_purpose || 'Review pending visitor request', date: visit.updatedAt || visit.createdAt || '', category: 'VISITOR', icon: 'visitor', priority: 1, unread: true, target: 'visitors' });
  return eligibleEvents(result);
}
