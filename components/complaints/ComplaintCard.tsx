'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '../../lib/api/client';
import { BackendComplaint } from '../../types';
import { Badge } from '../common/Badge';

interface ComplaintCardProps {
  complaint: BackendComplaint;
  initiallyExpanded?: boolean;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, initiallyExpanded }) => {
  const [details, setDetails] = useState(Boolean(initiallyExpanded));
  const [previousExpanded, setPreviousExpanded] = useState(initiallyExpanded);
  if (previousExpanded !== initiallyExpanded) {
    setPreviousExpanded(initiallyExpanded);
    if (initiallyExpanded) setDetails(true);
  }
  type HistoryEntry = { id: string; previous_status: string; new_status: string; changed_at: string };
  const [retry, setRetry] = useState(0);
  const queryKey = `${complaint.id}:${complaint.updated_at}:${retry}`;
  const [result, setResult] = useState<{ key: string; history: HistoryEntry[]; error: boolean } | null>(null);
  const history = result?.key === queryKey ? result.history : [];
  const error = result?.key === queryKey && result.error;
  const loading = result?.key !== queryKey;
  useEffect(() => {
    if (!details) return;
    let active = true;
    void apiClient.get<{ history: HistoryEntry[] }>(`/complaints/my/${complaint.id}/history`)
      .then(response => { if (active) setResult({ key: queryKey, history: response.data.history, error: false }); })
      .catch(() => { if (active) setResult({ key: queryKey, history: [], error: true }); });
    return () => { active = false; };
  }, [details, complaint.id, queryKey]);
  const isResolved = complaint.status === 'RESOLVED' || complaint.status === 'CLOSED';
  const isInProgress = complaint.status === 'IN_PROGRESS';
  const isRejected = complaint.status === 'REJECTED';

  const borderLeftColor = isResolved
    ? 'var(--success)'
    : isInProgress
    ? 'var(--warning)'
    : isRejected
    ? 'var(--neutral)'
    : 'var(--danger)';

  const badgeVariant = isResolved
    ? 'success'
    : isInProgress
    ? 'warning'
    : isRejected
    ? 'neutral'
    : 'danger';

  return (
    <div
      className="card"
      style={{
        padding: '12px',
        marginBottom: '10px',
        borderLeft: `3px solid ${borderLeftColor}`,
      }}
    >
      <button type="button" className="btn btn-xs btn-ghost" aria-expanded={details} onClick={() => setDetails(!details)}>Request details & history</button>
      {details && <div>
        <small>Reference: {complaint.id}</small>
        <p>Updated {new Date(complaint.updated_at).toLocaleString()}</p>
        {loading ? <p role="status">Loading history…</p> : error ? <div role="alert">Could not load history.<button onClick={() => setRetry(value => value + 1)}>Retry</button></div> : <ol>{history.map(item => <li key={item.id}>{item.previous_status} → {item.new_status} · {new Date(item.changed_at).toLocaleString()}</li>)}</ol>}
      </div>}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '4px',
        }}
      >
        <strong style={{ fontSize: '0.8125rem' }}>{complaint.subject || complaint.title}</strong>
        <Badge variant={badgeVariant} style={{ fontSize: '0.65rem' }}>
          {complaint.status}
        </Badge>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '6px' }}>
        {complaint.description}
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.6875rem',
          color: 'var(--neutral)',
        }}
      >
        <span>
          Category: <strong>{complaint.category}</strong>
        </span>
        <span>
          Priority: <strong>{complaint.priority}</strong>
        </span>
        <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};
