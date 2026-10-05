'use client';

import React from 'react';
import { useVisitorStore } from '../../store';
import { VisitorCard } from './VisitorCard';
import { EmptyState } from '../common/EmptyState';

export const VisitorsList: React.FC = () => {
  const { visitors, filter } = useVisitorStore();

  const filtered = visitors.filter((v) => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="No visitor records"
        description={`No visitors found in the '${filter}' status.`}
      />
    );
  }

  return (
    <div id="visitors-list-screen">
      {filtered.map((v) => (
        <VisitorCard key={v.id} visitor={v} />
      ))}
    </div>
  );
};
