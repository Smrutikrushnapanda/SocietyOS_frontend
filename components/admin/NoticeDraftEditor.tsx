'use client';

import { useEffect, useRef, useState } from 'react';
import type { BackendNotice, NoticeAttachment, NoticePriority } from '../../types/notice';
import { createNotice, getNoticeAttachments, getNoticeCapabilities, removeNoticeAttachment, scheduleNotice, updateNotice, uploadNoticeAttachment } from '../../lib/api/notices.api';
import { noticeScheduleISO, validateNoticeSelection } from '../../lib/notices/policy';
import { useAuthStore } from '../../store/useAuthStore';

const KOLKATA_OFFSET = '+05:30';
const MAX_ATTACHMENTS = 5;

export function NoticeDraftEditor({ notice, onSaved, onClose }: { notice: BackendNotice | null; onSaved: () => void; onClose: () => void }) {
  const [id, setId] = useState(notice?.id ?? null);
  const [title, setTitle] = useState(notice?.title ?? '');
  const [content, setContent] = useState(notice?.content ?? '');
  const [priority, setPriority] = useState<NoticePriority>(notice?.priority === 'EMERGENCY' ? 'EMERGENCY' : notice?.priority === 'IMPORTANT' ? 'IMPORTANT' : 'NORMAL');
  const [expiry, setExpiry] = useState(() => notice?.expires_at ? kolkataDateTime(notice.expires_at) : kolkataDateTime(new Date(new Date().getTime() + 30 * 86400000)));
  const [publishAt, setPublishAt] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<NoticeAttachment[]>([]);
  const [scheduledAvailable, setScheduledAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const now = kolkataDateTime(new Date());

  useEffect(() => {
    let active = true;
    void getNoticeCapabilities().then(value => { if (active) setScheduledAvailable(value.scheduledPublication); }).catch(() => { if (active) setScheduledAvailable(false); });
    if (notice) void getNoticeAttachments(notice.id).then(value => { if (active) setAttachments(value); }).catch(() => { if (active) setError('Attachments could not be loaded. Reopen this draft to retry.'); });
    return () => { active = false; };
  }, [notice]);

  function chooseFiles(selected: File[]) {
    try {
      const next = [...files, ...selected];
      validateNoticeSelection(next, attachments.length);
      setFiles(next);
      setError('');
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Invalid attachments');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const initial = useAuthStore.getState();
    const current = () => {
      const next = useAuthStore.getState();
      return next.isAuthenticated && !next.logoutInProgress && initial.backendUser?.id === next.backendUser?.id && initial.organizationId === next.organizationId;
    };
    setBusy(true);
    setError('');
    try {
      const expiryISO = kolkataInputToISO(expiry);
      const publicationISO = schedule ? noticeScheduleISO(kolkataInputToISO(publishAt), expiryISO) : undefined;
      if (attachments.length + files.length > MAX_ATTACHMENTS) throw new Error('A notice can have up to five attachments.');
      const input = { title: title.trim(), content: content.trim(), priority, expires_at: expiryISO };
      const saved = id ? await updateNotice(id, input) : await createNotice(input);
      if (!current()) return;
      setId(saved.id);
      for (const file of files) {
        const attachment = await uploadNoticeAttachment(saved.id, file);
        if (!current()) return;
        setAttachments(previous => [...previous, attachment]);
        setFiles(previous => previous.filter(value => value !== file));
      }
      if (publicationISO) { await scheduleNotice(saved.id, publicationISO, confirmed); if (!current()) return; }
      onSaved();
    } catch (failure: unknown) {
      if (current()) setError(failure instanceof Error ? failure.message : 'Notice could not be saved.');
    } finally {
      if (current()) setBusy(false);
    }
  }

  return <div className="modal-overlay notice-draft-overlay"><div className="modal-dialog notice-draft-dialog" role="dialog" aria-modal="true" aria-labelledby="notice-editor-title">
    <div className="modal-header notice-draft-header"><div><p className="notice-draft-eyebrow">NOTICE BOARD</p><h3 id="notice-editor-title">{id ? 'Edit notice draft' : 'Create notice draft'}</h3></div><button type="button" className="modal-close-btn" onClick={onClose} disabled={busy} aria-label="Close">×</button></div>
    <form onSubmit={save}><div className="modal-body notice-draft-body">
      {error && <p className="notice-draft-error" role="alert">{error}</p>}
      <div className="notice-draft-intro"><strong>Write once, publish with confidence.</strong><span>Save draft now or schedule it in Asia/Kolkata time.</span></div>
      <label className="form-group"><span className="form-label">Subject</span><input className="form-control" required maxLength={200} placeholder="Example: Water supply maintenance" value={title} onChange={event => setTitle(event.target.value)} disabled={busy} /></label>
      <label className="form-group"><span className="form-label">Notice content</span><textarea className="form-textarea" required maxLength={5000} rows={6} placeholder="Share essential details, dates and resident actions." value={content} onChange={event => setContent(event.target.value)} disabled={busy} /><span className="notice-draft-helper">{content.length}/5000 characters</span></label>
      <div className="form-group"><span className="form-label">Priority</span><div className="notice-priority-options">{(['NORMAL', 'IMPORTANT', 'EMERGENCY'] as const).map(value => <button type="button" key={value} className={`notice-priority-option ${priority === value ? 'is-selected' : ''} ${value.toLowerCase()}`} onClick={() => { setPriority(value); setConfirmed(false); }} disabled={busy}><strong>{value[0] + value.slice(1).toLowerCase()}</strong><span>{value === 'EMERGENCY' ? 'Mandatory resident alert' : value === 'IMPORTANT' ? 'Highlighted update' : 'Routine circular'}</span></button>)}</div></div>
      {priority === 'EMERGENCY' && <p className="notice-emergency-note">For urgent water, electricity or safety disruptions. Residents see a red alert; optional notice preferences are bypassed.</p>}
      <div className="form-row"><label className="form-group"><span className="form-label">Expires at</span><input className="form-control" type="datetime-local" min={now} value={expiry} onChange={event => setExpiry(event.target.value)} disabled={busy} /></label><div className="notice-timezone-card"><strong>Asia/Kolkata</strong><span>All dates and times use IST (UTC+05:30).</span></div></div>
      <div className="notice-attachments"><div className="notice-attachments-heading"><div><span className="form-label">Attachments</span><p>PDF, JPG, PNG or WebP · 2 MB each · up to 5 files</p></div><span className="notice-attachment-count">{attachments.length + files.length}/{MAX_ATTACHMENTS}</span></div><input ref={fileInput} id="notice-files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={busy || attachments.length + files.length >= MAX_ATTACHMENTS} onChange={event => chooseFiles(Array.from(event.target.files ?? []))} /><label htmlFor="notice-files" className="notice-file-picker"><span aria-hidden="true">＋</span><span><strong>Choose files</strong><small>Review and remove files before saving</small></span></label>
        {(files.length > 0 || attachments.length > 0) && <div className="notice-attachment-list" aria-live="polite">{files.map((file, index) => <AttachmentRow key={`${file.name}:${file.lastModified}:${index}`} name={file.name} detail={`${formatBytes(file.size)} · Ready to upload`} pending disabled={busy} onRemove={() => setFiles(value => value.filter(item => item !== file))} />)}{attachments.map(file => <AttachmentRow key={file.id} name={file.original_filename} detail={`${formatBytes(file.size_bytes)} · Attached`} disabled={busy} onRemove={async () => { if (!id) return; setBusy(true); try { await removeNoticeAttachment(id, file.id); setAttachments(value => value.filter(item => item.id !== file.id)); } catch { setError('Attachment could not be removed.'); } finally { setBusy(false); } }} />)}</div>}
      </div>
      <div className="notice-schedule-card"><label className="notice-schedule-toggle"><input type="checkbox" checked={schedule} disabled={busy || !scheduledAvailable} onChange={event => setSchedule(event.target.checked)} /><span><strong>Schedule publication</strong><small>Keep as draft until chosen date and time.</small></span></label>{!scheduledAvailable && <p className="notice-schedule-unavailable">Scheduling is disabled on this backend. It uses <code>NOTICE_SCHEDULER_ENABLED=true</code>, separately from notice delivery, and requires a backend restart.</p>}{schedule && <label className="form-group notice-schedule-field"><span className="form-label">Publish date and time (IST)</span><input type="datetime-local" className="form-control" required min={now} value={publishAt} onChange={event => setPublishAt(event.target.value)} disabled={busy} /></label>}{schedule && priority === 'EMERGENCY' && <label className="notice-emergency-confirmation"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy} />I confirm this mandatory emergency broadcast to organization residents.</label>}</div>
    </div><div className="modal-footer"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-primary btn-sm" type="submit" disabled={busy || !title.trim() || !content.trim()}>{busy ? 'Saving…' : schedule ? 'Save and schedule' : 'Save draft'}</button></div></form>
  </div></div>;
}

function AttachmentRow({ name, detail, pending = false, disabled, onRemove }: { name: string; detail: string; pending?: boolean; disabled: boolean; onRemove: () => void | Promise<void> }) {
  return <div className="notice-attachment-row"><span className={`notice-attachment-icon ${pending ? 'is-pending' : ''}`}>{pending ? '↑' : '✓'}</span><span className="notice-attachment-copy"><strong title={name}>{name}</strong><small>{detail}</small></span><button type="button" onClick={() => void onRemove()} disabled={disabled}>Remove</button></div>;
}

function formatBytes(value: number): string { return value < 1024 * 1024 ? `${Math.max(1, Math.ceil(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`; }

function kolkataDateTime(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)).reduce<Record<string, string>>((result, part) => { if (part.type !== 'literal') result[part.type] = part.value; return result; }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function kolkataInputToISO(value: string): string {
  if (!value) throw new Error('Choose a date and time.');
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalized}${KOLKATA_OFFSET}`);
  if (!Number.isFinite(date.getTime())) throw new Error('Choose a valid date and time.');
  return date.toISOString();
}
