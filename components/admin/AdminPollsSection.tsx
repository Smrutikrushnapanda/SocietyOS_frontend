'use client';

import React, { useState, useEffect } from 'react';
import { usePollStore, useToastStore } from '../../store';
import { useCollectionPage } from '../../hooks/useCollectionPage';
import { createPoll, editPoll, getPollResults, startPoll, endPoll } from '../../lib/api/polls.api';
import { Pagination } from '../common/Pagination';
import { BackendPoll, PollType } from '../../types/poll';

export const AdminPollsSection: React.FC = () => {
  const {
    pollResults,
    loadPollResults,
  } = usePollStore();
  const { items: polls, isLoading, error, load: loadPolls, page, setPage, total, totalPages, limit } = useCollectionPage<BackendPoll>('polls');
  const { showToast } = useToastStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('SINGLE');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [options, setOptions] = useState<string[]>(['Yes', 'No']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPoll, setEditingPoll] = useState<BackendPoll | null>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [hasVotes, setHasVotes] = useState(false);

  const openCreate = () => {
    setEditingPoll(null); setHasVotes(false); setTitle(''); setDescription('');
    setPollType('SINGLE'); setStartsAt(''); setEndsAt(''); setOptions(['Yes', 'No']); setOptionIds([]);
    setShowCreateModal(true);
  };

  const openEdit = async (poll: BackendPoll) => {
    try {
      const choices = pollResults[poll.id] ?? (await getPollResults(poll.id));
      setEditingPoll(poll); setHasVotes(choices.some(option => option.vote_count > 0));
      setTitle(poll.title); setDescription(poll.description || ''); setPollType(poll.poll_type || 'SINGLE');
      setStartsAt(poll.starts_at.slice(0, 10)); setEndsAt(poll.ends_at.slice(0, 10));
      setOptions(choices.map(option => option.option_text)); setOptionIds(choices.map(option => option.id));
      setShowCreateModal(true);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to load poll for editing', 'error'); }
  };

  // Load results for polls (reuse cached results where available)
  useEffect(() => {
    polls.forEach((p) => {
      if (!pollResults[p.id]) {
        void loadPollResults(p.id);
      }
    });
  }, [polls, pollResults, loadPollResults]);

  const handleAddOption = () => {
    setOptions((prev) => [...prev, '']);
    setOptionIds(prev => [...prev, '']);
  };

  const handleOptionChange = (idx: number, val: string) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    setOptionIds(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim()) return;

    const filteredOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      showToast('A poll must have at least 2 non-empty options.');
      return;
    }

    if (!startsAt || !endsAt) {
      showToast('Start and end dates are required.');
      return;
    }
    const startValue = editingPoll && startsAt === editingPoll.starts_at.slice(0, 10) ? editingPoll.starts_at : new Date(startsAt).toISOString();
    const endValue = editingPoll && endsAt === editingPoll.ends_at.slice(0, 10) ? editingPoll.ends_at : new Date(endsAt).toISOString();
    if (new Date(endValue) <= new Date(startValue)) {
      showToast('End date must be after start date.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPoll) {
        await editPoll(editingPoll.id, {
          description: description.trim(),
          ...(endValue !== editingPoll.ends_at ? { ends_at: endValue } : {}),
          ...(!hasVotes ? {
            title: title.trim(), poll_type: pollType, starts_at: startValue,
            options: options.map((text, index) => ({ id: optionIds[index] || undefined, option_text: text.trim(), display_order: index + 1 })).filter(option => option.option_text),
          } : {}),
        });
        await loadPollResults(editingPoll.id);
      } else await createPoll({
        title: title.trim(),
        description: description.trim() || undefined,
        poll_type: pollType,
        starts_at: startValue,
        ends_at: endValue,
        options: filteredOptions.map((optText, i) => ({
          option_text: optText,
          display_order: i + 1,
        })),
      });

      await loadPolls();
      showToast(editingPoll ? 'Poll updated successfully.' : `Poll draft '${title}' created successfully!`);
      setTitle('');
      setDescription('');
      setPollType('SINGLE');
      setStartsAt('');
      setEndsAt('');
      setOptions(['Yes', 'No']);
      setShowCreateModal(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await startPoll(id);
      await loadPolls();
      showToast('Poll published and started.');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to start poll');
    }
  };

  const handleEnd = async (id: string) => {
    try {
      await endPoll(id);
      await loadPolls();
      showToast('Poll ended and closed to further voting.');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to close poll');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Community Polls & RWA Ballots</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: '2px 0 0 0' }}>
            Democratic community decisions. Aggregate vote tallies only (zero voter identity exposure).
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          + Create Poll
        </button>
      </div>

      {isLoading && polls.length === 0 && (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--neutral)' }}>
          <div style={{ fontSize: '0.875rem' }}>Loading society polls...</div>
        </div>
      )}

      {error && polls.length === 0 && (
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginBottom: '8px' }}>{error}</p>
          <button className="btn btn-xs btn-ghost" onClick={() => void loadPolls()}>
            Retry
          </button>
        </div>
      )}

      {polls.length === 0 && !isLoading && !error && (
        <div className="card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--neutral)' }}>
          No polls registered in this society. Click Create Poll to start a resident ballot.
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} disabled={isLoading} label="Polls" />
      {polls.map((poll) => {
        const results = pollResults[poll.id] || [];
        const totalVotes = results.reduce((acc, curr) => acc + (curr.vote_count || 0), 0);

        return (
          <div
            key={poll.id}
            className="card"
            style={{
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              borderLeft:
                poll.status === 'PUBLISHED'
                  ? '4px solid var(--pine)'
                  : poll.status === 'CLOSED'
                  ? '4px solid var(--neutral)'
                  : '4px solid var(--saffron)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className={`badge ${
                    poll.status === 'PUBLISHED'
                      ? 'badge-pine'
                      : poll.status === 'CLOSED'
                      ? 'badge-neutral'
                      : 'badge-warning'
                  }`}
                >
                  {poll.status}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                  Active: {new Date(poll.starts_at).toLocaleDateString()} – {new Date(poll.ends_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-xs btn-outline" onClick={() => void openEdit(poll)}>Edit Poll</button>
                {poll.status === 'DRAFT' && (
                  <button className="btn btn-xs btn-primary" onClick={() => handleStart(poll.id)}>
                    Publish & Start Poll →
                  </button>
                )}
                {poll.status === 'PUBLISHED' && (
                  <button className="btn btn-xs btn-danger" onClick={() => handleEnd(poll.id)}>
                    Close Poll
                  </button>
                )}
              </div>
            </div>

            <h4 style={{ fontSize: '1rem', color: 'var(--ink)', marginBottom: '4px' }}>{poll.title}</h4>
            {poll.description && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-dark)', marginBottom: '12px', lineHeight: 1.4 }}>
                {poll.description}
              </p>
            )}

            {/* Aggregate Results List (Strictly anonymous, aggregate counts only) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              <strong style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Aggregate Ballots (Total {poll.poll_type === 'MULTIPLE' ? 'Selections' : 'Votes'}: {totalVotes})
              </strong>
              {results.length > 0 ? (
                results.map((opt) => {
                  const percentage = totalVotes > 0 ? Math.round(((opt.vote_count || 0) / totalVotes) * 100) : 0;
                  return (
                    <div
                      key={opt.id}
                      style={{
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '3px' }}>
                        <span>{opt.option_text}</span>
                        <span style={{ color: 'var(--neutral)' }}>
                          {opt.vote_count || 0} votes ({percentage}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '5px',
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
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral)', fontStyle: 'italic' }}>
                  No options recorded.
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal: Create Poll */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog poll-create-dialog" role="dialog" aria-modal="true" aria-labelledby="poll-create-title">
            <div className="modal-header">
              <h3 id="poll-create-title">{editingPoll ? 'Edit Society Poll' : '+ Create New Society Poll'}</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreatePoll}>
              <div className="modal-body">
                {editingPoll && hasVotes && <p className="settings-note">Votes have been recorded. Description and closing date remain editable; question and choices are locked.</p>}
                <div className="form-group">
                  <label className="form-label">Poll Question / Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Approve Swimming Pool Renovation Budget for Q3?"
                    value={title}
                    maxLength={200}
                    readOnly={hasVotes}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Background / Details (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Details about proposed costs, benefits, and schedule..."
                    value={description}
                    maxLength={2000}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <fieldset className="poll-type-picker">
                  <legend className="form-label">Voting Type</legend>
                  <p className="poll-type-picker__hint">Choose how residents can respond to this poll.</p>
                  <div className="poll-type-picker__options">
                    <label className={`poll-type-card ${pollType === 'SINGLE' ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="poll-type"
                        value="SINGLE"
                        checked={pollType === 'SINGLE'}
                        disabled={hasVotes}
                        onChange={() => setPollType('SINGLE')}
                      />
                      <span className="poll-type-card__icon" aria-hidden="true">
                        <span className="poll-type-card__radio" />
                      </span>
                      <span>
                        <strong>Single choice</strong>
                        <small>Residents select one option.</small>
                      </span>
                    </label>
                    <label className={`poll-type-card ${pollType === 'MULTIPLE' ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="poll-type"
                        value="MULTIPLE"
                        checked={pollType === 'MULTIPLE'}
                        disabled={hasVotes}
                        onChange={() => setPollType('MULTIPLE')}
                      />
                      <span className="poll-type-card__icon" aria-hidden="true">
                        <span className="poll-type-card__checkbox">✓</span>
                      </span>
                      <span>
                        <strong>Multiple choice</strong>
                        <small>Residents can select multiple options.</small>
                      </span>
                    </label>
                  </div>
                </fieldset>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={startsAt}
                      disabled={hasVotes}
                      onChange={(e) => setStartsAt(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Poll Options (Min. 2)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {options.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          maxLength={200}
                          readOnly={hasVotes}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          required
                        />
                        {!hasVotes && options.length > 2 && (
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost"
                            onClick={() => handleRemoveOption(idx)}
                            style={{ color: 'var(--danger)' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={handleAddOption}
                    disabled={hasVotes || options.length >= 100}
                    style={{ marginTop: '8px' }}
                  >
                    + Add Option
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingPoll ? 'Save Poll Changes' : 'Create Draft Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
