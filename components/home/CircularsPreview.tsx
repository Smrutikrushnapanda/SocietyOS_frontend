'use client';

import React from 'react';
import { useNoticeStore } from '../../store';
import { Badge } from '../common/Badge';

interface CircularsPreviewProps {
  onViewAll?: () => void;
}

export const CircularsPreview: React.FC<CircularsPreviewProps> = ({ onViewAll }) => {
  const { notices } = useNoticeStore();
  const previewNotices = notices.slice(0, 2);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}
      >
        <h4 style={{ fontSize: '0.9rem' }}>Society Circulars</h4>
        <button
          onClick={onViewAll}
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            color: 'var(--pine)',
            cursor: 'pointer',
            padding: 0
          }}
        >
          View All →
        </button>
      </div>

      {previewNotices.map((n) => (
        <div key={n.id} className="card" style={{ padding: '10px 14px', marginBottom: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2px'
            }}
          >
            <Badge
              variant={n.priority === 'high' ? 'danger' : 'pine'}
              style={{ fontSize: '0.65rem' }}
            >
              {n.type}
            </Badge>
            <span style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
              {n.displayDate}
            </span>
          </div>
          <strong style={{ fontSize: '0.8125rem', color: 'var(--ink)' }}>
            {n.title}
          </strong>
        </div>
      ))}
    </div>
  );
};
