'use client';

import React from 'react';
import { useNoticeStore } from '../../store';
import { NoticeCard } from './NoticeCard';
import { EmptyState } from '../common/EmptyState';

export const NoticesList: React.FC = () => {
  const { notices } = useNoticeStore();

  if (notices.length === 0) {
    return (
      <EmptyState
        title="No notices found"
        description="There are currently no active society notices or circulars."
      />
    );
  }

  return (
    <div id="resident-notices-list">
      {notices.map((n) => (
        <NoticeCard key={n.id} notice={n} />
      ))}
    </div>
  );
};
