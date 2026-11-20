'use client';

import React, { useEffect, useState } from 'react';
import { getNoticeAttachments, downloadNoticeAttachment } from '../../lib/api/notices.api';
import type { NoticeAttachment } from '../../types/notice';
import { Notice } from '../../types';
import { Badge } from '../common/Badge';
import { IconShare } from '../common/Icons';

interface NoticeCardProps {
  notice: Notice;
  highlighted?: boolean;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({ notice, highlighted = false }) => {
  const [attachments, setAttachments] = useState<NoticeAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const emergency = notice.priority === 'EMERGENCY';
  useEffect(() => {
    let active = true;
    if (notice.attachment_ids?.length) void getNoticeAttachments(notice.id).then(value => { if (active) setAttachments(value); }).catch(() => { if (active) setAttachmentError('Attachments could not be loaded. Refresh to retry.'); });
    return () => { active = false; };
  }, [notice.id, notice.attachment_ids]);
  const shareNotice = () => {
    const message = `${notice.title}\n\n${notice.description}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div id={`notice-${notice.id}`} tabIndex={-1} className="card" style={{ padding: '14px', marginBottom: '12px', outline: highlighted ? '2px solid var(--pine)' : undefined, borderLeft: emergency ? '4px solid #b91c1c' : undefined, background: emergency ? '#fff1f2' : undefined }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}
      >
        <Badge variant={emergency || notice.priority === 'high' ? 'danger' : 'pine'}>
          {emergency ? 'EMERGENCY' : notice.type}
        </Badge>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--neutral)',
            fontWeight: 500
          }}
        >
          {notice.displayDate}
        </span>
      </div>
      <h4 style={{ fontSize: '0.9375rem', marginBottom: '4px', color: emergency ? '#b91c1c' : undefined }}>
        {notice.title}
      </h4>
      <p style={{ fontSize: '0.8125rem', color: emergency ? '#b91c1c' : 'var(--neutral)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
        {notice.description}
      </p>
      {attachmentError && <p role="alert">{attachmentError}</p>}
      {attachments.map(file => <div key={file.id}><button className="btn btn-sm btn-ghost" disabled={downloading !== null} onClick={async () => { setDownloading(file.id); setAttachmentError(''); try { await downloadNoticeAttachment(notice.id, file); } catch { setAttachmentError('Download failed. Please retry.'); } finally { setDownloading(null); } }}>{downloading === file.id ? 'Downloading…' : `Download ${file.original_filename}`} ({Math.ceil(file.size_bytes / 1024)} KB)</button></div>)}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button
          className="btn btn-sm btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={shareNotice}
        >
          <IconShare size={14} />
          <span>Share Circular</span>
        </button>
      </div>
    </div>
  );
};
