import type { BackendNotice } from '../../types/notice';
export function activeEmergencyNotices(notices: BackendNotice[], organizationId: string | null, now: number): BackendNotice[] {
  return notices.filter(notice => notice.priority === 'EMERGENCY' && notice.status === 'PUBLISHED' && notice.organization_id === organizationId && !!notice.published_at && Date.parse(notice.published_at) <= now && (!notice.expires_at || Date.parse(notice.expires_at) > now));
}
export function noticeScheduleISO(value: string, expiresAt?: string, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time) || time <= now || (expiresAt && time >= Date.parse(expiresAt))) throw new Error('Choose a future publication time before expiration.');
  return new Date(time).toISOString();
}
export function validateNoticeSelection(files: ReadonlyArray<Pick<File, 'name' | 'size' | 'type'>>, existing: number): void {
  if (files.length + existing > 5) throw new Error('A notice can have up to five attachments.');
  const formats: Record<string, string[]> = { 'application/pdf': ['pdf'], 'image/jpeg': ['jpg','jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] };
  for (const file of files) if (file.size <= 0 || file.size > 2 * 1024 * 1024 || !formats[file.type]?.includes(file.name.split('.').at(-1)?.toLowerCase() ?? '')) throw new Error('Choose nonempty PDF, JPG, PNG or WebP files, up to 2 MB each.');
}
