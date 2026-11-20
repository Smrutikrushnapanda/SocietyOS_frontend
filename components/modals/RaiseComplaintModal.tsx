'use client';

import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useComplaintStore, useModalStore, useToastStore, useAuthStore } from '../../store';
import { ComplaintPriority } from '../../types';
import { getPriorityConfigs, PriorityConfig } from '../../lib/api/complaints.api';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import { RESIDENT_COMPLAINT_CREATED } from '../../lib/resident-refresh';
import {
  IconWrench,
  IconLightning,
  IconBuilding,
  IconShield,
  IconCar,
  IconPool,
  IconClose,
  IconSend,
  IconSparkles,
} from '../common/Icons';

const categories = [
  { id: 'Plumbing', icon: IconWrench, label: 'Plumbing', sub: 'Leakage / Tap' },
  { id: 'Electrical', icon: IconLightning, label: 'Electrical', sub: 'Lights / MCB' },
  { id: 'Lift/Elevator', icon: IconBuilding, label: 'Elevator', sub: 'OTIS AMC' },
  { id: 'Security', icon: IconShield, label: 'Security', sub: 'Gate / Intercom' },
  { id: 'Parking', icon: IconCar, label: 'Parking', sub: 'Slot / EV Bay' },
  { id: 'Common Area', icon: IconPool, label: 'Common Area', sub: 'Gym / Garden' },
  { id: 'Other', icon: IconSparkles, label: 'Other', sub: 'Custom Issue' },
];

export const RaiseComplaintModal: React.FC = () => {
  const { createResidentComplaint } = useComplaintStore();
  const { organizationId } = useAuthStore();
  const { closeModal } = useModalStore();
  const { showToast } = useToastStore();

  const [category, setCategory] = useState('Plumbing');
  const [customCategory, setCustomCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [prioritiesList, setPrioritiesList] = useState<PriorityConfig[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) { errorRef.current?.focus({ preventScroll: true }); errorRef.current?.scrollIntoView({ block: 'nearest' }); }
  }, [error]);

  useEffect(() => {
    let active = true;
    if (organizationId) {
      getPriorityConfigs()
        .then((data) => {
          if (!active) return;
          const allowed = data.filter(item => item.status === 'Active' && ['LOW', 'MEDIUM', 'HIGH'].includes(item.priority));
          setPrioritiesList(allowed);
          setPriority(current => allowed.length && !allowed.some(item => item.priority === current) ? allowed[0].priority as ComplaintPriority : current);
        })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    if (!title.trim()) {
      setError('Please enter a short title or summary for the issue.');
      return;
    }

    if (category === 'Other' && !customCategory.trim()) {
      setError('Please specify the custom category name.');
      return;
    }
    if (!description.trim()) { setError('Please describe the problem and its location.'); return; }

    const categoryMap: Record<string, string> = {
      Plumbing: 'MAINTENANCE',
      Electrical: 'MAINTENANCE',
      'Lift/Elevator': 'FACILITY',
      Security: 'SAFETY',
      Parking: 'FACILITY',
      'Common Area': 'AMENITY',
      Other: 'OTHER',
    };

    const formattedSubject = category === 'Other' && customCategory.trim()
      ? `[${customCategory.trim()}] ${title.trim()}`
      : title.trim();

    if (formattedSubject.length > 200) { setError('Keep the issue summary, including custom category, within 200 characters.'); return; }
    const scope = useAuthStore.getState();
    inFlight.current = true;
    setError(null);
    setIsSubmitting(true);
    try {
      const newTicket = await createResidentComplaint({
        category: categoryMap[category] || 'OTHER',
        subject: formattedSubject,
        description: description.trim(),
        priority,
      });
      if (useAuthStore.getState().organizationId !== scope.organizationId || useAuthStore.getState().backendUser?.id !== scope.backendUser?.id) return;
      closeModal();
      window.dispatchEvent(new CustomEvent(RESIDENT_COMPLAINT_CREATED, { detail: { id: newTicket.id, organizationId: scope.organizationId, userId: scope.backendUser?.id } }));
      showToast(`Ticket #${newTicket.id.slice(0, 8)} submitted successfully.`, 'success');
    } catch (err: unknown) {
      setError(getUserFriendlyErrorMessage(err, 'Failed to submit ticket. Please try again.'));
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="complaint-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !inFlight.current) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet" style={{ maxHeight: '90vh' }}>
        <div className="sheet-handle"></div>

        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon emerald">
              <IconWrench size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Raise Facility Ticket</h3>
              <p>Instant AMC dispatch & automated SLA tracking</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} disabled={isSubmitting} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        <form className="resident-ticket-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting} style={{ display: 'contents', border: 0 }}>
        {/* Category Visual Selector */}
        <div style={{ marginBottom: '10px' }}>
          <div className="drawer-section-title">
            <span>Issue Category</span>
            <span style={{ color: 'var(--pine)', fontSize: '0.6875rem' }}>Select one</span>
          </div>
          <div
            className="drawer-visual-grid"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}
          >
            {categories.map((c) => {
              const IconComp = c.icon;
              return (
                <div
                  key={c.id}
                  className={clsx(
                    'drawer-visual-card emerald',
                    category === c.id && 'active'
                  )}
                  onClick={() => setCategory(c.id)}
                >
                  <div className="drawer-visual-icon">
                    <IconComp size={20} />
                  </div>
                  <div className="drawer-visual-label">
                    <strong style={{ fontSize: '0.75rem' }}>{c.label}</strong>
                    <span style={{ fontSize: '0.6rem' }}>{c.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Category Input Box when Other is selected */}
        {category === 'Other' && (
          <div className="form-field-wrapper" style={{ marginTop: '-4px', marginBottom: '10px' }}>
            <div className="form-field-label">
              <span>
                Specify Custom Category / Issue Type <span className="required-dot">*</span>
              </span>
            </div>
            <div className="input-icon-group">
              <span className="input-leading-icon">
                <IconSparkles size={16} />
              </span>
              <input
                className="form-control-luxury"
                id="complaint-custom-category-input"
                placeholder="e.g. Pest Control, Solar Panel, Internet Cable"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {/* Ticket Title */}
        <div className="form-field-wrapper">
          <div className="form-field-label">
            <span>
              Issue Summary / Title <span className="required-dot">*</span>
            </span>
          </div>
          <div className="input-icon-group">
            <span className="input-leading-icon">
              <IconWrench size={16} />
            </span>
            <input
              className="form-control-luxury"
              id="complaint-title-input"
              placeholder="e.g. Master bathroom tap dripping constantly"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null); }}
              required
              maxLength={200}
              autoFocus
            />
          </div>
        </div>

        {/* Description */}
        <div className="form-field-wrapper">
          <div className="form-field-label">
            <span>Problem Details & Location <span className="required-dot">*</span></span>
          </div>
          <textarea
            className="form-control-luxury"
            id="complaint-desc-input"
            rows={2}
            required
            maxLength={2000}
            placeholder="Describe the problem, location in flat, or preferred inspection time..."
            style={{ paddingLeft: '12px', resize: 'none', fontSize: '0.8125rem' }}
            value={description}
            onChange={(e) => { setDescription(e.target.value); setError(null); }}
          ></textarea>
        </div>

        {/* Priority Selector */}
        <div className="form-field-wrapper" style={{ marginBottom: '12px' }}>
          <div className="drawer-section-title">
            <span>Urgency Level</span>
            <span style={{ color: 'var(--neutral)', fontSize: '0.6875rem' }}>
              SLA Response
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${prioritiesList.length > 0 ? Math.min(prioritiesList.length, 4) : 3}, 1fr)`,
              gap: '6px'
            }}
          >
            {prioritiesList.length > 0 ? (
              prioritiesList.map((p) => {
                const hrs = Math.round(p.response_deadline_minutes / 60);
                const timeLabel = hrs > 0 ? `${hrs}h` : `${p.response_deadline_minutes}m`;
                const pillClass = p.priority === 'URGENT' ? 'high' : p.priority === 'HIGH' ? 'medium' : 'low';
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={clsx(
                      `priority-pill ${pillClass}`,
                      priority === p.priority && 'active'
                    )}
                    onClick={() => setPriority(p.priority as ComplaintPriority)}
                  >
                    {p.name.split(' ')[0]} ({timeLabel})
                  </button>
                );
              })
            ) : (
              <>
                <button
                  type="button"
                  className={clsx('priority-pill low', priority === 'LOW' && 'active')}
                  onClick={() => setPriority('LOW')}
                >
                  Normal (24h)
                </button>
                <button
                  type="button"
                  className={clsx('priority-pill medium', priority === 'MEDIUM' && 'active')}
                  onClick={() => setPriority('MEDIUM')}
                >
                  High (6h)
                </button>
                <button
                  type="button"
                  className={clsx('priority-pill high', priority === 'HIGH' && 'active')}
                  onClick={() => setPriority('HIGH')}
                >
                  Emergency (1h)
                </button>
              </>
            )}
          </div>
        </div>

        </fieldset>
        {error && <p ref={errorRef} role="alert" className="amenity-booking-error" tabIndex={-1}>{error}</p>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            disabled={isSubmitting}
          >
            <IconSend size={16} />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};
