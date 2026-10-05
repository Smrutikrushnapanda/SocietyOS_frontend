'use client';

import React from 'react';
import clsx from 'clsx';
import { useVisitorStore } from '../../store';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'requested', label: 'Requested' },
  { id: 'approved', label: 'Approved' },
  { id: 'checked-in', label: 'Inside' },
  { id: 'checked-out', label: 'Exited' }
];

export const PipelineFilter: React.FC = () => {
  const { filter, setFilter } = useVisitorStore();

  return (
    <div className="mobile-pipeline-strip">
      {filters.map((f) => (
        <button
          key={f.id}
          className={clsx('pipeline-chip', filter === f.id && 'active')}
          onClick={() => setFilter(f.id)}
          data-pipeline-filter={f.id}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
};
