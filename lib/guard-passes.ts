import type { PreApprovedPass, Visitor } from '../types';

export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Keep only active pre-approved guest passes that have not passed their valid date.
 */
export function filterValidGuestPasses(
  passes: PreApprovedPass[],
  now: Date = new Date(),
): PreApprovedPass[] {
  return passes.filter(pass => pass.status === 'Active' && !!pass.visitId &&
    Number.isFinite(Date.parse(pass.startDate)) && Number.isFinite(Date.parse(pass.endDate)) &&
    Date.parse(pass.startDate) <= now.getTime() && now.getTime() < Date.parse(pass.endDate));
}

export function isGuardQueueVisitor(visitor: Visitor, now: number): boolean {
  if (visitor.status !== 'requested' && visitor.status !== 'approved') return false;
  if (!visitor.isPreApproved && !visitor.passStatus && !visitor.validityStart && !visitor.validityEnd) return true;
  const start = Date.parse(visitor.validityStart || '');
  const end = Date.parse(visitor.validityEnd || '');
  return visitor.passStatus === 'ACTIVE' && Number.isFinite(start) && Number.isFinite(end) && start <= now && now < end;
}
