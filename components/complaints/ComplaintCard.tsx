'use client';

import React from 'react';
import { Complaint } from '../../types';
import { Badge } from '../common/Badge';

interface ComplaintCardProps {
  complaint: Complaint;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint }) => {
  const borderLeftColor =
    complaint.status === 'open'
      ? 'var(--danger)'
      : complaint.status === 'in-progress'
      ? 'var(--warning)'
      : 'var(--success)';

  const badgeVariant =
    complaint.status === 'open'
      ? 'danger'
      : complaint.status === 'in-progress'
      ? 'warning'
      : 'success';

  return (
    <div
      className="card"
      style={{
        padding: '12px',
        marginBottom: '10px',
        borderLeft: `3px solid ${borderLeftColor}`
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '4px'
        }}
      >
        <strong style={{ fontSize: '0.8125rem' }}>{complaint.title}</strong>
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
          color: 'var(--neutral)'
        }}
      >
        <span>
          Assigned: <strong>{complaint.assignedStaff || 'Queue'}</strong>
        </span>
        <span>{complaint.raisedAt}</span>
      </div>
    </div>
  );
};
