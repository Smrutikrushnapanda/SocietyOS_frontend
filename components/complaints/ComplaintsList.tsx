'use client';

import React from 'react';
import { useComplaintStore } from '../../store';
import { ComplaintCard } from './ComplaintCard';
import { EmptyState } from '../common/EmptyState';

export const ComplaintsList: React.FC = () => {
  const { complaints } = useComplaintStore();

  if (complaints.length === 0) {
    return (
      <EmptyState
        title="No complaints found"
        description="You have not raised any facility helpdesk tickets."
      />
    );
  }

  return (
    <div id="my-complaints-list">
      {complaints.map((c) => (
        <ComplaintCard key={c.id} complaint={c} />
      ))}
    </div>
  );
};
