'use client';

import React from 'react';
import { useVisitorStore, useToastStore } from '../../store';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

interface GateApprovalsPreviewProps {
  onViewAll?: () => void;
}

export const GateApprovalsPreview: React.FC<GateApprovalsPreviewProps> = ({ onViewAll }) => {
  const { visitors, approveVisitor, denyVisitor } = useVisitorStore();
  const { showToast } = useToastStore();

  const previewVisitors = visitors.slice(0, 2);

  const handleApprove = (id: string, name: string) => {
    approveVisitor(id);
    showToast(`Visitor ${name} approved! Gate security alerted.`);
  };

  const handleDeny = (id: string, name: string) => {
    denyVisitor(id);
    showToast(`Visitor ${name} entry denied.`);
  };

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}
      >
        <h4 style={{ fontSize: '0.9rem' }}>Gate Approvals</h4>
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

      {previewVisitors.length === 0 ? (
        <EmptyState
          title="No active visitors"
          description="Your gate queue is currently empty."
          style={{ padding: '16px' }}
        />
      ) : (
        previewVisitors.map((v) => (
          <div key={v.id} className="mobile-visitor-card">
            <div className="mobile-visitor-top">
              <div>
                <strong style={{ fontSize: '0.875rem' }}>{v.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                  {v.purpose} • {v.requestedAt}
                </div>
              </div>
              <Badge
                variant={
                  v.status === 'approved'
                    ? 'pine'
                    : v.status === 'checked-in'
                    ? 'success'
                    : 'warning'
                }
              >
                {v.status}
              </Badge>
            </div>

            {v.status === 'requested' ? (
              <div className="mobile-visitor-actions">
                <button
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => handleApprove(v.id, v.name)}
                >
                  Approve Entry
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeny(v.id, v.name)}
                >
                  Deny
                </button>
              </div>
            ) : (
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                Resident approved • Gate notified
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
