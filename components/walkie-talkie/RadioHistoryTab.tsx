'use client';

import React from 'react';
import clsx from 'clsx';
import { filterRadioHistory } from '../../lib/walkie-talkie/radio-service';
import type { RadioHistoryEntry, RadioHistoryFilter } from '../../types/walkie-talkie';

interface RadioHistoryTabProps {
  entries: RadioHistoryEntry[];
  filter: RadioHistoryFilter;
  onFilterChange: (filter: RadioHistoryFilter) => void;
}

const HISTORY_FILTERS: Array<{ id: RadioHistoryFilter; label: string }> = [
  { id: 'all', label: 'All activity' },
  { id: 'group', label: 'Group' },
  { id: 'direct', label: 'Direct' },
  { id: 'connection', label: 'Connection events' },
];

export const RadioHistoryTab: React.FC<RadioHistoryTabProps> = ({
  entries,
  filter,
  onFilterChange,
}) => {
  const filteredEntries = React.useMemo(
    () => filterRadioHistory(entries, filter),
    [entries, filter],
  );

  return (
    <div className="wt-tab-panel">
      <div className="wt-chip-scroll" role="tablist" aria-label="Filter radio history">
        {HISTORY_FILTERS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={filter === opt.id}
            className={clsx('wt-filter-chip', filter === opt.id && 'is-active')}
            onClick={() => onFilterChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="wt-empty-box">No radio activity in this category.</div>
      ) : (
        <div className="wt-history-list">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className={clsx('wt-history-item', `cat-${entry.category}`)}
            >
              <div className="wt-history-dot" aria-hidden="true" />
              <div className="wt-history-body">
                <div className="wt-history-top">
                  <strong className="wt-history-headline">
                    {entry.actor} – {entry.summary}
                  </strong>
                  <span className="wt-history-time">{entry.timestamp}</span>
                </div>
                {entry.contextLabel && (
                  <span className="wt-history-sub">{entry.contextLabel}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
