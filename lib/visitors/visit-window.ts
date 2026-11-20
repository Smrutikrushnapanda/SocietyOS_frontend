import type { Visitor } from '../../types/visitor';

export function localDateValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localDayWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() };
}

export function isCurrentGateApproval(visitor: Visitor, now = new Date()): boolean {
  if (visitor.status !== 'requested' && visitor.status !== 'approved') return false;
  const { dayStart, dayEnd } = localDayWindow(now);
  if (visitor.passStatus && visitor.passStatus !== 'ACTIVE') return false;
  if (visitor.validityStart || visitor.validityEnd) {
    const start = Date.parse(visitor.validityStart || '');
    const end = Date.parse(visitor.validityEnd || '');
    return Number.isFinite(start) && Number.isFinite(end) && start < Date.parse(dayEnd) && end > now.getTime() && end > start;
  }
  if (!visitor.visitDate) return false;
  const date = Date.parse(visitor.visitDate);
  return Number.isFinite(date) && date >= Date.parse(dayStart) && date < Date.parse(dayEnd);
}
