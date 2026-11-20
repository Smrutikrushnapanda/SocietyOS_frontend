'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { IconClose, IconSearch } from '../common/Icons';
import { filterGuardStatusList } from '../../lib/walkie-talkie/radio-service';
import type { GuardMember, GuardStatusFilter } from '../../types/walkie-talkie';
import { GuardRadioCard } from './GuardRadioCard';

interface GuardStatusTabProps {
  guards: GuardMember[];
  filter: GuardStatusFilter;
  onFilterChange: (filter: GuardStatusFilter) => void;
  onSelectGuardForDirect: (guard: GuardMember) => void;
}

const FILTER_OPTIONS: Array<{ id: GuardStatusFilter; label: string }> = [
  { id: 'all', label: 'All Guards' },
  { id: 'available', label: 'Available' },
  { id: 'busy', label: 'Busy' },
  { id: 'snoozed', label: 'Snoozed' },
  { id: 'offline', label: 'Offline' },
  { id: 'connected', label: 'Connected to Radio' },
];

export const GuardStatusTab: React.FC<GuardStatusTabProps> = ({
  guards,
  filter,
  onFilterChange,
  onSelectGuardForDirect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGuards = React.useMemo(
    () => filterGuardStatusList(guards, filter, searchQuery),
    [guards, filter, searchQuery],
  );

  return (
    <div className="wt-tab-panel">
      <div className="wt-search-box">
        <span className="wt-search-icon" aria-hidden="true">
          <IconSearch size={15} />
        </span>
        <input
          type="text"
          className="wt-search-input"
          placeholder="Search guard name or gate location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search guard status directory"
        />
        {searchQuery && (
          <button
            type="button"
            className="wt-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <IconClose size={13} />
          </button>
        )}
      </div>

      <div className="wt-chip-scroll" role="tablist" aria-label="Filter guards by status">
        {FILTER_OPTIONS.map((opt) => (
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

      <div className="wt-legend-note">
        Duty status and radio reception are tracked independently (e.g., an On Duty guard may have Radio OFF).
      </div>

      {filteredGuards.length === 0 ? (
        <div className="wt-empty-box">No guards match the selected filter.</div>
      ) : (
        <div className="wt-card-stack">
          {filteredGuards.map((guard) => (
            <GuardRadioCard
              key={guard.id}
              guard={guard}
              showLastSeen
              actionLabel="Direct"
              onAction={onSelectGuardForDirect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
