'use client';

import React from 'react';
import { Notice } from '../../types';
import { Badge } from '../common/Badge';
import { useToastStore } from '../../store';
import { IconShare } from '../common/Icons';

interface NoticeCardProps {
  notice: Notice;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({ notice }) => {
  const { showToast } = useToastStore();

  return (
    <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}
      >
        <Badge variant={notice.priority === 'high' ? 'danger' : 'pine'}>
          {notice.type}
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
      <h4 style={{ fontSize: '0.9375rem', marginBottom: '4px' }}>
        {notice.title}
      </h4>
      <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)', lineHeight: 1.4 }}>
        {notice.description}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button
          className="btn btn-sm btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={() => showToast('Notice shared to WhatsApp group.')}
        >
          <IconShare size={14} />
          <span>Share Circular</span>
        </button>
      </div>
    </div>
  );
};
