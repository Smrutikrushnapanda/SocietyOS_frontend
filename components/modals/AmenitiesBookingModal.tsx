'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { amenityAllowsCustomTime, amenityCustomSlot, amenityBookingDates, amenityBookingSlotOptions, availableAmenityRangeSlots, formatAmenitySlot, isAmenitySlotBooked } from '../../types/amenity';
import { parseDate } from '@internationalized/date';
import clsx from 'clsx';
import { useAmenityStore, useModalStore, useToastStore } from '../../store';
import { useAuthStore } from '../../store/useAuthStore';
import { AmenityAvailabilityDay, getAmenityAvailability } from '../../lib/api/amenities.api';
import { GuestPassDatePicker } from './GuestPassControls';
import dateStyles from './PreApproveGuestModal.module.css';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import {
  IconBuilding,
  IconClose,
  IconTicket
} from '../common/Icons';

const EMPTY_SLOTS: string[] = [];
const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
export const AmenitiesBookingModal: React.FC = () => {
  const { amenities, bookAmenityRange, loadAmenities, error, isLoading } = useAmenityStore();
  const { closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const organizationId = useAuthStore(state => state.organizationId);

  const [selectedAmenity, setSelectedAmenity] = useState(
    amenities[0]?.name || ''
  );
  const [date, setDate] = useState(dateKey(new Date()));
  const [endDate, setEndDate] = useState(dateKey(new Date()));
  const [availabilityResult, setAvailabilityResult] = useState<{ key: string; days: AmenityAvailabilityDay[]; error: string | null } | null>(null);
  const [availabilityReload, setAvailabilityReload] = useState(0);
  const [slot, setSlot] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customTimeOpen, setCustomTimeOpen] = useState(false);
  const [guests, setGuests] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    void loadAmenities();
  }, [loadAmenities]);

  const activeAmenity = amenities.find(amenity => amenity.name === selectedAmenity) ?? amenities[0];
  const activeAmenityId = activeAmenity?.id;
  const selectedAmenityName = activeAmenity?.name ?? '';
  const selectedDates = useMemo(() => amenityBookingDates(date, endDate), [date, endDate]);
  const rangeError = date < dateKey(new Date()) ? 'Start date must be today or later.'
    : !selectedDates.length ? 'Choose an end date on or after the start, within 62 days.' : null;
  const availabilityRequestKey = `${organizationId ?? ''}:${activeAmenityId ?? ''}:${date}:${endDate}:${availabilityReload}`;
  const availability = useMemo(
    () => availabilityResult?.key === availabilityRequestKey ? availabilityResult.days : [],
    [availabilityRequestKey, availabilityResult],
  );
  const availabilityError = rangeError || (availabilityResult?.key === availabilityRequestKey ? availabilityResult.error : null);
  const availabilityLoading = !rangeError && !!activeAmenityId && !!organizationId && availabilityResult?.key !== availabilityRequestKey;
  const flexibleTime = amenityAllowsCustomTime(activeAmenity);
  const customSlot = amenityCustomSlot(activeAmenity, customStart, customEnd);
  const requestedSlot = customTimeOpen ? customSlot || '' : slot;
  const timeSlots = useMemo(() => [...new Set([...amenityBookingSlotOptions(activeAmenity), ...(customSlot && (customTimeOpen || slot === customSlot) ? [customSlot] : [])])], [activeAmenity, customTimeOpen, customSlot, slot]);
  const bookedSlotsByDate = useMemo(() => new Map(availability.map(day => [day.date, day.slots])), [availability]);
  const availableSlots = useMemo(
    () => availableAmenityRangeSlots(timeSlots, selectedDates, bookedSlotsByDate),
    [timeSlots, selectedDates, bookedSlotsByDate],
  );

  useEffect(() => {
    if (submissionError) {
      errorRef.current?.focus({ preventScroll: true });
      errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [submissionError]);

  useEffect(() => {
    if (!activeAmenityId || !organizationId || rangeError) {
      return;
    }
    let active = true;
    void getAmenityAvailability(activeAmenityId, date, endDate)
      .then(days => { if (active) setAvailabilityResult({ key: availabilityRequestKey, days, error: null }); })
      .catch(err => { if (active) setAvailabilityResult({ key: availabilityRequestKey, days: [], error: err?.message || 'Could not load date availability.' }); });
    return () => { active = false; };
  }, [activeAmenityId, organizationId, date, endDate, rangeError, availabilityReload, availabilityRequestKey]);

  const handleDateShortcut = (days: number) => {
    setSubmissionError(null);
    const d = new Date();
    d.setDate(d.getDate() + days);
    const nextDate = dateKey(d);
    setDate(nextDate);
    setEndDate(nextDate);
    setSlot('');
  };

  const selectStartDate = (nextDate: string) => {
    setSubmissionError(null);
    setDate(nextDate);
    if (!amenityBookingDates(nextDate, endDate).length) setEndDate(nextDate);
    setSlot('');
  };

  const selectRangeShortcut = (days: number | 'month') => {
    setSubmissionError(null);
    const start = parseDate(date);
    setEndDate((days === 'month' ? start.add({ months: 1 }).subtract({ days: 1 }) : start.add({ days: days - 1 })).toString());
    setSlot('');
  };

  const handleGuestsChange = (delta: number) => {
    setGuests((prev) => Math.max(1, Math.min(activeAmenity?.capacity || 1, prev + delta)));
  };

  const handleConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const validation = isLoading ? 'Facilities are still loading. Please wait and try again.'
      : !activeAmenity ? 'Choose a facility before requesting a booking.'
      : activeAmenity.status !== 'Active' ? 'This facility is closed for maintenance.'
      : rangeError ? rangeError
      : customTimeOpen && (!customStart || !customEnd) ? 'Choose a daily start time and end time.'
      : customTimeOpen && !customSlot ? `Choose an end time after the start, within ${activeAmenity.openTime}–${activeAmenity.closeTime}.`
      : !requestedSlot ? 'Choose a time slot before requesting a booking.'
      : guests < 1 || guests > activeAmenity.capacity ? `Choose between 1 and ${activeAmenity.capacity} attendees.`
      : !event.currentTarget.checkValidity() ? 'Complete both booking dates and enter a valid time and attendee count.'
      : availabilityLoading ? 'Availability is still being checked. Please wait and try again.'
      : availabilityError ? availabilityError
      : !availableSlots.includes(requestedSlot) ? 'This time is already booked on one or more selected dates. Choose another time or date range.' : null;
    if (validation) {
      setSubmissionError(validation);
      return;
    }
    inFlight.current = true;
    setSubmissionError(null);
    setIsSubmitting(true);
    try {
      const activeObj = activeAmenity;
      const created = await bookAmenityRange({
        amenity_id: activeObj?.id,
        amenity: selectedAmenityName,
        date_from: date,
        date_to: endDate,
        slot: requestedSlot,
        guests,
        amount: activeObj?.price ?? 0,
      });
      if (created.length !== selectedDates.length) throw new Error('Could not confirm every booking. Check My bookings before trying again.');

      closeModal();
      showToast(
        `Booking requested for ${selectedAmenityName}, ${date} to ${endDate} (${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'}). Awaiting admin approval.`
      );
    } catch (err: unknown) {
      setSubmissionError(err instanceof Error && /timeout|timed out/i.test(err.message)
        ? 'Booking confirmation timed out. Check My bookings before trying again.'
        : getUserFriendlyErrorMessage(err, 'Failed to complete booking. Please try again.'));
      setAvailabilityReload(value => value + 1);
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="amenities-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !inFlight.current) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet">
        <div className="sheet-handle"></div>

        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon teal">
              <IconBuilding size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Clubhouse Amenities Booking</h3>
              <p>Request facility slots and track approval</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} disabled={isSubmitting} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {error && <p role="alert">{error}</p>}
        {!isLoading && amenities.length === 0 && <p>No amenities configured.</p>}
        <form className="amenity-booking-form" noValidate onSubmit={handleConfirm} aria-busy={isSubmitting}>
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
              <button
                key={a.id}
                type="button"
                aria-pressed={selectedAmenityName === a.name}
                disabled={isSubmitting}
                className={clsx(
                  'amenity-pick-card',
                  selectedAmenityName === a.name && 'active'
                )}
                onClick={() => { setSelectedAmenity(a.name); setSlot(''); setCustomStart(''); setCustomEnd(''); setCustomTimeOpen(false); setSubmissionError(null); }}
              >
                <span className="amenity-pick-icon">
                  <IconBuilding size={20} aria-hidden="true" />
                </span>
                <span className="amenity-pick-name">{a.name}</span>
                <span className="amenity-pick-badge">{a.statusText}</span>
              </button>
            ))}
          </div>
        </div>

        <section className={dateStyles.section} aria-labelledby="amenity-booking-dates">
          <h4 id="amenity-booking-dates" style={{ fontSize: '0.8125rem', margin: 0 }}>Booking Date Range</h4>
          <div className={dateStyles.durations} aria-label="Quick booking duration">
            {[
              { label: 'Today', selected: date === dateKey(new Date()) && date === endDate, select: () => handleDateShortcut(0) },
              { label: 'Tomorrow', selected: date === parseDate(dateKey(new Date())).add({ days: 1 }).toString() && date === endDate, select: () => handleDateShortcut(1) },
              { label: '7 days', selected: selectedDates.length === 7, select: () => selectRangeShortcut(7) },
              { label: '1 month', selected: endDate === parseDate(date).add({ months: 1 }).subtract({ days: 1 }).toString(), select: () => selectRangeShortcut('month') },
            ].map(option => <button key={option.label} type="button" disabled={isSubmitting}
              className={clsx(dateStyles.preset, option.selected && dateStyles.presetActive)} aria-pressed={option.selected}
              onClick={option.select}>{option.label}</button>)}
          </div>
          <div className={dateStyles.grid}>
            <GuestPassDatePicker id="amenity-date" label="Valid from" value={date} min={dateKey(new Date())}
              disabled={isSubmitting} onChange={selectStartDate} />
            <GuestPassDatePicker id="amenity-end-date" label="Valid until" value={endDate} min={date}
              max={parseDate(date).add({ days: 61 }).toString()} disabled={isSubmitting}
              onChange={nextDate => { setEndDate(nextDate); setSlot(''); setSubmissionError(null); }} />
          </div>
          {rangeError && <p className="amenity-availability-error" role="alert">{rangeError}</p>}
          {!availabilityLoading && !availabilityError && availability.length > 0 && <details>
            <summary className="amenity-availability-note">Booked hours in selected date range</summary>
            {availability.map(day => <p key={day.date} className="amenity-availability-note">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}: {day.slots.map(formatAmenitySlot).join(', ')}
            </p>)}
          </details>}
        </section>

        {/* Time Slot Selection Grid */}
        <div>
          <div className="drawer-section-title">Time slot for each day</div>
          {flexibleTime && <button type="button" className="btn btn-sm btn-ghost" aria-expanded={customTimeOpen} disabled={isSubmitting}
            onClick={() => { setCustomTimeOpen(open => !open); setSubmissionError(null); }}>Custom time</button>}
          {flexibleTime && customTimeOpen && <>
            <p className="amenity-availability-note">{activeAmenity?.slotDuration} · Choose your daily visit time within {activeAmenity?.openTime}–{activeAmenity?.closeTime}.</p>
            <div className={dateStyles.grid}>
              <label><span className={dateStyles.label}>Daily start time</span>
                <input className="input" id="amenity-start-time" type="time" required disabled={isSubmitting}
                  min={activeAmenity?.openTime.slice(0, 5)} max={activeAmenity?.closeTime.slice(0, 5)} value={customStart}
                  onChange={event => { setCustomStart(event.target.value); setSubmissionError(null); }} />
              </label>
              <label><span className={dateStyles.label}>Daily end time</span>
                <input className="input" id="amenity-end-time" type="time" required disabled={isSubmitting}
                  min={customStart || activeAmenity?.openTime.slice(0, 5)} max={activeAmenity?.closeTime.slice(0, 5)} value={customEnd}
                  onChange={event => { setCustomEnd(event.target.value); setSubmissionError(null); }} />
              </label>
            </div>
            <button type="button" className="btn btn-sm btn-ghost" disabled={isSubmitting} onClick={() => {
              setCustomStart(activeAmenity?.openTime.slice(0, 5) || ''); setCustomEnd(activeAmenity?.closeTime.slice(0, 5) || ''); setSubmissionError(null);
            }}>Use full operating hours</button>
          </>}
          {timeSlots.length === 0 && <p>No valid slots configured. Contact society administration.</p>}
          {availabilityLoading && <p className="amenity-availability-note" role="status">Checking time slots…</p>}
          {!availabilityLoading && !availabilityError && timeSlots.length > 0 && availableSlots.length === 0 && <p className="amenity-availability-error" role="alert">No time slot is free across all selected dates. Change the date range or facility.</p>}
          {availabilityError && !rangeError && <p className="amenity-availability-error" role="alert">{availabilityError}</p>}
          {availabilityError && !rangeError && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAvailabilityReload(value => value + 1)}>Retry availability</button>}
          <div className="slot-pills-wrap">
            {timeSlots.map((time) => {
              const isAvailable = !availabilityLoading && !availabilityError && availableSlots.includes(time);
              const bookedDays = selectedDates.filter(day => isAmenitySlotBooked(time, bookedSlotsByDate.get(day) ?? EMPTY_SLOTS)).length;
              return <button
                key={time}
                type="button"
                className={clsx('slot-pill', requestedSlot === time && 'active', !isAvailable && 'is-booked')}
                disabled={!isAvailable || isSubmitting}
                aria-pressed={requestedSlot === time}
                onClick={() => { setSlot(time); setCustomTimeOpen(false); setSubmissionError(null); }}
              >
                <span className="time">{formatAmenitySlot(time)}</span>
                <span className="status" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isAvailable ? '#10b981' : '#ef4444'
                    }}
                  />
                  {availabilityLoading ? 'Checking' : availabilityError ? 'Unavailable' : isAvailable ? `Available${selectedDates.length > 1 ? ` all ${selectedDates.length} days` : ''}` : `Booked on ${bookedDays} ${bookedDays === 1 ? 'day' : 'days'}`}
                </span>
              </button>;
            })}
          </div>
        </div>

        <div className="amenity-range-summary" aria-label="Booking range summary">
          <strong>{selectedDates.length} daily {selectedDates.length === 1 ? 'booking' : 'bookings'}</strong>
          <span>Estimated total: ₹{((activeAmenity?.price ?? 0) * selectedDates.length).toLocaleString('en-IN')}</span>
          <small>₹{(activeAmenity?.price ?? 0).toLocaleString('en-IN')} per day · Each day requires admin approval.</small>
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
              Requests require admin approval
            </div>
          </div>
          <div className="stepper-widget" style={{ padding: '2px 6px', background: '#ffffff' }}>
            <button
              type="button"
              className="stepper-btn"
              disabled={isSubmitting}
              onClick={() => handleGuestsChange(-1)}
            >
              −
            </button>
            <input
              className="amenity-attendee-input"
              id="guest-count-val"
              type="number"
              inputMode="numeric"
              min={1}
              max={activeAmenity?.capacity || 1}
              aria-label="Number of attendees"
              disabled={isSubmitting}
              value={guests}
              onChange={event => {
                const next = Number(event.target.value);
                if (Number.isInteger(next) && next >= 1) setGuests(Math.min(activeAmenity?.capacity || 1, next));
              }}
            />
            <button
              type="button"
              className="stepper-btn"
              disabled={isSubmitting}
              onClick={() => handleGuestsChange(1)}
            >
              +
            </button>
          </div>
        </div>

        {submissionError && <p ref={errorRef} id="amenity-booking-error" className="amenity-booking-error" role="alert" tabIndex={-1}>{submissionError}</p>}
        {isSubmitting && <p role="status" className="amenity-availability-note">Submitting your booking request…</p>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            id="amenity-booking-submit"
            className="btn btn-primary"
            style={{ flex: 1.4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            disabled={isSubmitting}
            aria-describedby={submissionError ? 'amenity-booking-error' : undefined}
          >
            <IconTicket size={16} />
            <span>{isSubmitting ? 'Requesting…' : selectedDates.length > 1 ? `Request ${selectedDates.length} days` : 'Request Slot'}</span>
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};
