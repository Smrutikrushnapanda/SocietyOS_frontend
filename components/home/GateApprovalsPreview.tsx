'use client';

import React, { useEffect, useState } from 'react';
import { useVisitorStore, useToastStore } from '../../store';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { isCurrentGateApproval, localDayWindow } from '../../lib/visitors/visit-window';

interface GateApprovalsPreviewProps {
  onViewAll?: () => void;
}

export const GateApprovalsPreview: React.FC<GateApprovalsPreviewProps> = ({ onViewAll }) => {
  const { visitors, approveMyVisitor, rejectMyVisitor } = useVisitorStore();
  const { showToast } = useToastStore();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const expiresAt = visitors.map(visitor => Date.parse(visitor.validityEnd || '')).filter(time => time > now.getTime());
    const nextChange = Math.min(Date.parse(localDayWindow(now).dayEnd), ...expiresAt);
    const timer = window.setTimeout(refresh, Math.max(1, nextChange - Date.now()));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [now, visitors]);
  const previewVisitors = visitors.filter(visitor => isCurrentGateApproval(visitor, now)).slice(0, 2);

  const handleApprove = async (id: string, name: string) => {
    try {
      await approveMyVisitor(id);
      showToast(`Visitor ${name} approved.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not approve visitor.', 'error');
    }
  };

  const handleDeny = async (id: string, name: string) => {
    try {
      await rejectMyVisitor(id);
      showToast(`Visitor ${name} entry rejected.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not reject visitor.', 'error');
    }
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
          title="No gate approvals for today"
          description="Today's pending and approved visitors will appear here."
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
                  onClick={() => void handleApprove(v.id, v.name)}
                >
                  Approve Entry
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => void handleDeny(v.id, v.name)}
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
