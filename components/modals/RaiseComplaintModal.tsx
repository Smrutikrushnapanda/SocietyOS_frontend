'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useComplaintStore, useModalStore, useToastStore, useResidentStore } from '../../store';
import { ComplaintPriority } from '../../types';
import {
  IconWrench,
  IconLightning,
  IconBuilding,
  IconShield,
  IconCar,
  IconPool,
  IconClose,
  IconSend
} from '../common/Icons';

const categories = [
  { id: 'Plumbing', icon: IconWrench, label: 'Plumbing', sub: 'Leakage / Tap' },
  { id: 'Electrical', icon: IconLightning, label: 'Electrical', sub: 'Lights / MCB' },
  { id: 'Lift/Elevator', icon: IconBuilding, label: 'Elevator', sub: 'OTIS AMC' },
  { id: 'Security', icon: IconShield, label: 'Security', sub: 'Gate / Intercom' },
  { id: 'Parking', icon: IconCar, label: 'Parking', sub: 'Slot / EV Bay' },
  { id: 'Common Area', icon: IconPool, label: 'Common Area', sub: 'Gym / Garden' }
];

export const RaiseComplaintModal: React.FC = () => {
  const { addComplaint } = useComplaintStore();
  const { resident } = useResidentStore();
  const { closeModal } = useModalStore();
  const { showToast } = useToastStore();

  const [category, setCategory] = useState('Plumbing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a short title or summary for the issue.');
      return;
    }

    const newTicket = addComplaint({
      title: title.trim(),
      category,
      description: description.trim(),
      priority,
      flat: resident.flat,
      raisedBy: resident.name
    });

    closeModal();
    showToast(
      `Ticket #${newTicket.id} raised! Assigned to ${newTicket.assignedStaff}.`
    );
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="complaint-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
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
          <button className="drawer-close-btn" onClick={closeModal} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

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
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        {/* Description */}
        <div className="form-field-wrapper">
          <div className="form-field-label">
            <span>Problem Details & Location</span>
          </div>
          <textarea
            className="form-control-luxury"
            id="complaint-desc-input"
            rows={2}
            placeholder="Describe the problem, location in flat, or preferred inspection time..."
            style={{ paddingLeft: '12px', resize: 'none', fontSize: '0.8125rem' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px'
            }}
          >
            <button
              type="button"
              className={clsx(
                'priority-pill low',
                priority === 'low' && 'active'
              )}
              onClick={() => setPriority('low')}
            >
              Normal (24h)
            </button>
            <button
              type="button"
              className={clsx(
                'priority-pill medium',
                priority === 'medium' && 'active'
              )}
              onClick={() => setPriority('medium')}
            >
              High (6h)
            </button>
            <button
              type="button"
              className={clsx(
                'priority-pill high',
                priority === 'high' && 'active'
              )}
              onClick={() => setPriority('high')}
            >
              Emergency (1h)
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleSubmit}
          >
            <IconSend size={16} />
            <span>Submit Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
