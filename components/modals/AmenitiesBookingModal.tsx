'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useAmenityStore, useModalStore, useToastStore, useResidentStore } from '../../store';
import {
  IconPool,
  IconClose,
  IconCheck,
  IconSparkles,
  IconTicket
} from '../common/Icons';

const timeSlots = [
  { id: '06:00 AM - 08:00 AM', status: 'Available' },
  { id: '08:00 AM - 10:00 AM', status: 'Available' },
  { id: '05:00 PM - 07:00 PM', status: '2 slots left' },
  { id: '07:00 PM - 09:00 PM', status: 'Available' }
];

export const AmenitiesBookingModal: React.FC = () => {
  const { amenities, bookAmenity } = useAmenityStore();
  const { resident } = useResidentStore();
  const { closeModal } = useModalStore();
  const { showToast } = useToastStore();

  const [selectedAmenity, setSelectedAmenity] = useState(
    amenities[0]?.name || 'Infinity Swimming Pool'
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState('06:00 AM - 08:00 AM');
  const [guests, setGuests] = useState(2);

  const handleDateShortcut = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleGuestsChange = (delta: number) => {
    setGuests((prev) => Math.max(1, Math.min(25, prev + delta)));
  };

  const handleConfirm = () => {
    bookAmenity({
      resident: resident.name,
      flat: resident.flat,
      amenity: selectedAmenity,
      date,
      slot,
      guests,
      amount: 0
    });

    closeModal();
    showToast(
      `Booking confirmed for ${selectedAmenity} (${slot}) on ${date} for ${guests} guests! Access pass added.`
    );
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="amenities-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet">
        <div className="sheet-handle"></div>

        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon teal">
              <IconPool size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Clubhouse Amenities Booking</h3>
              <p>Instant facility slot reservation & access badge</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {/* Amenities Carousel Selection */}
        <div>
          <div className="drawer-section-title">
            <span>Choose Facility</span>
            <span style={{ color: 'var(--pine)', fontSize: '0.6875rem' }}>
              Slide to select
            </span>
          </div>
          <div className="amenity-carousel-row">
            {amenities.map((a) => (
              <div
                key={a.id}
                className={clsx(
                  'amenity-pick-card',
                  selectedAmenity === a.name && 'active'
                )}
                onClick={() => setSelectedAmenity(a.name)}
              >
                <span className="amenity-pick-icon">
                  <IconPool size={20} />
                </span>
                <span className="amenity-pick-name">{a.name}</span>
                <span className="amenity-pick-badge">{a.statusText}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Date & Quick Pills */}
        <div>
          <div className="drawer-section-title">
            <span>Booking Date</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="quick-chip"
                onClick={() => handleDateShortcut(0)}
              >
                Today
              </button>
              <button
                type="button"
                className="quick-chip"
                onClick={() => handleDateShortcut(1)}
              >
                Tomorrow
              </button>
            </div>
          </div>
          <input
            type="date"
            className="input"
            id="amenity-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Time Slot Selection Grid */}
        <div>
          <div className="drawer-section-title">Available Time Slots</div>
          <div className="slot-pills-wrap">
            {timeSlots.map((s) => (
              <div
                key={s.id}
                className={clsx('slot-pill', slot === s.id && 'active')}
                onClick={() => setSlot(s.id)}
              >
                <span className="time">{s.id}</span>
                <span className="status" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: s.status.includes('slots') ? '#f59e0b' : '#10b981'
                    }}
                  />
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Number of Guests Stepper */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface-sunken)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}
        >
          <div>
            <strong style={{ fontSize: '0.8125rem', color: 'var(--ink)' }}>
              Number of Attendees
            </strong>
            <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
              Complimentary resident access
            </div>
          </div>
          <div className="stepper-widget" style={{ padding: '2px 6px', background: '#ffffff' }}>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => handleGuestsChange(-1)}
            >
              −
            </button>
            <span className="stepper-val" id="guest-count-val">
              {guests} Guest{guests > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => handleGuestsChange(1)}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleConfirm}
          >
            <IconTicket size={16} />
            <span>Confirm Slot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
