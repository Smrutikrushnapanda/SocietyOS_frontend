'use client';

import React, { useEffect, useState } from 'react';
import { usePollStore, useAuthStore, useToastStore } from '../../store';
import { BackendPoll, BackendPollOptionResult } from '../../types/poll';
import { useInfiniteFeed } from '../../hooks/useInfiniteFeed';
import { FeedTabs, InfiniteFeedBoundary } from '../common/InfiniteFeed';

export const PollsList: React.FC = () => {
  const { pollResults, votedPollIds, loadPollResults, vote } =
    usePollStore();
  const [status, setStatus] = useState('PUBLISHED');
  const feed = useInfiniteFeed<BackendPoll>('/polls/page', { status });
  const { items: polls } = feed;
  const { organizationId } = useAuthStore();
  const { showToast } = useToastStore();

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [submittingPollId, setSubmittingPollId] = useState<string | null>(null);

  // When polls load, fetch results for published/active polls
  useEffect(() => {
    polls.forEach((p) => {
      if (p.status === 'PUBLISHED' || p.status === 'CLOSED') {
        void loadPollResults(p.id);
      }
    });
  }, [polls, loadPollResults]);

  const handleSelectOption = (poll: BackendPoll, optionId: string) => {
    setSelectedOptions((prev) => {
      const selected = prev[poll.id] ?? [];
      return { ...prev, [poll.id]: poll.poll_type === 'MULTIPLE'
        ? selected.includes(optionId) ? selected.filter(id => id !== optionId) : [...selected, optionId]
        : [optionId] };
    });
  };

  const handleVote = async (pollId: string) => {
    const optionIds = selectedOptions[pollId] ?? [];
    if (!optionIds.length) {
      showToast('Please select an option before voting.');
      return;
    }

    setSubmittingPollId(pollId);
    try {
      const poll = polls.find(item => item.id === pollId);
      await vote(poll?.poll_type === 'MULTIPLE'
        ? { poll_id: pollId, option_ids: optionIds }
        : { poll_id: pollId, option_id: optionIds[0] });
      showToast('Your vote has been recorded anonymously.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit vote';
      showToast(msg);
    } finally {
      setSubmittingPollId(null);
    }
  };

  const visiblePolls = polls;

  return (
    <div id="resident-polls-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <FeedTabs label="Poll filters" value={status} onChange={setStatus} tabs={[{ value: 'PUBLISHED', label: 'Active polls' }, { value: 'CLOSED', label: 'Closed polls' }, { value: 'all', label: 'All polls' }]} />
      {visiblePolls.map((poll) => {
        const results = pollResults[poll.id] || [];
        const hasVoted = poll.has_voted || votedPollIds.includes(poll.id);
        const isClosed = poll.status === 'CLOSED';
        const isEnded = new Date() > new Date(poll.ends_at) || isClosed;
        const totalVotes = results.reduce((acc, curr) => acc + (curr.vote_count || 0), 0);

        return (
          <div
            key={poll.id}
            className="card"
            style={{
              padding: '16px',
              border: isEnded ? '1px solid var(--border-subtle)' : '1.5px solid var(--pine)',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span
                className={`badge ${
                  isEnded ? 'badge-neutral' : 'badge-pine'
                }`}
                style={{ fontSize: '0.6875rem' }}
              >
                {isEnded ? 'CLOSED' : 'ACTIVE POLL'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
                Ends: {new Date(poll.ends_at).toLocaleDateString()}
              </span>
            </div>

            <h4 style={{ fontSize: '0.9375rem', color: 'var(--ink)', marginBottom: '4px' }}>
              {poll.title}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginBottom: '8px' }}>
              {poll.poll_type === 'MULTIPLE' ? 'Select one or more options. Submit all choices together.' : 'Select one option.'}
            </p>
            {poll.description && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)', marginBottom: '12px', lineHeight: 1.4 }}>
                {poll.description}
              </p>
            )}

            {/* Results or Voting Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {results.length > 0 ? (
                results.map((opt) => {
                  const percentage = totalVotes > 0 ? Math.round(((opt.vote_count || 0) / totalVotes) * 100) : 0;
                  const isSelected = (selectedOptions[poll.id] ?? []).includes(opt.id);

                  if (hasVoted || isEnded) {
                    // Render Aggregate Results (Strictly aggregate counts only; no voter identity)
                    return (
                      <div
                        key={opt.id}
                        style={{
                          background: 'var(--surface)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{opt.option_text}</span>
                          <span style={{ color: 'var(--neutral)', fontWeight: 500 }}>
                            {opt.vote_count || 0} votes ({percentage}%)
                          </span>
                        </div>
                        <div
                          style={{
                            height: '6px',
                            borderRadius: '3px',
                            background: 'rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: 'var(--pine)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Render Interactive Voting Options
                  return (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '1.5px solid var(--pine)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(46, 117, 89, 0.05)' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input
                        type={poll.poll_type === 'MULTIPLE' ? 'checkbox' : 'radio'}
                        name={`poll-${poll.id}`}
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => handleSelectOption(poll, opt.id)}
                        disabled={submittingPollId === poll.id}
                        style={{ accentColor: 'var(--pine)', width: '18px', height: '18px', flexShrink: 0 }}
                      />
                      <span style={{ color: 'var(--ink)', fontWeight: isSelected ? 600 : 400 }}>
                        {opt.option_text}
                      </span>
                      <span style={{ marginLeft: 'auto', color: 'var(--neutral)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{opt.vote_count || 0} votes ({percentage}%)</span></div>
                      <div role="progressbar" aria-label={`${opt.option_text} vote share`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} style={{ height: '5px', borderRadius: '3px', background: 'rgba(0,0,0,.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${percentage}%`, background: 'var(--pine)', transition: 'width .3s ease' }} />
                      </div>
                    </label>
                  );
                })
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', fontStyle: 'italic' }}>
                  No options configured for this poll.
                </div>
              )}
            </div>

            {/* Voting Actions */}
            {!hasVoted && !isEnded && results.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => void handleVote(poll.id)}
                  disabled={submittingPollId === poll.id || !selectedOptions[poll.id]?.length}
                  style={{ minWidth: '100px' }}
                >
                  {submittingPollId === poll.id ? 'Voting...' : 'Cast Vote'}
                </button>
              </div>
            )}

            {hasVoted && (
              <div
                style={{
                  marginTop: '10px',
                  fontSize: '0.75rem',
                  color: 'var(--pine-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✓</span>
                <span>You have cast your vote in this poll. Aggregate results are displayed above.</span>
              </div>
            )}
          </div>
        );
      })}
      <InfiniteFeedBoundary feed={feed} label="Polls" />
    </div>
  );
};
