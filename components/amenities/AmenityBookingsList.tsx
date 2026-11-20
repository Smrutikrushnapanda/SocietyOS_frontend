'use client';

import { useEffect, useState } from 'react';
import { useAmenityStore, useModalStore } from '../../store';
import { Badge } from '../common/Badge';
import { FeedTabs } from '../common/InfiniteFeed';
import { formatAmenitySlot } from '../../types/amenity';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import { RESIDENT_FEED_REFRESH, type ResidentFeedRefresh } from '../../lib/resident-refresh';

export function AmenityBookingsList({ onBack }: { onBack: () => void }) {
  const { bookings, loadBookings, cancelBooking, isLoadingBookings, error } = useAmenityStore();
  const openModal = useModalStore(state => state.openModal);
  const [filter, setFilter] = useState('upcoming');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    void loadBookings();
    const refresh = (event: Event) => (event as ResidentFeedRefresh).detail.jobs.push(loadBookings());
    window.addEventListener(RESIDENT_FEED_REFRESH, refresh);
    return () => window.removeEventListener(RESIDENT_FEED_REFRESH, refresh);
  }, [loadBookings]);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const shown = bookings.filter(booking => filter === 'all' || (filter === 'upcoming'
    ? booking.date >= today && ['Pending', 'Approved'].includes(booking.status)
    : booking.date < today || !['Pending', 'Approved'].includes(booking.status)))
    .sort((a, b) => filter === 'upcoming' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  return <section className="society-screen" id="my-amenity-bookings" aria-label="My amenity bookings">
    <div className="amenity-bookings-toolbar">
      <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>← Home</button>
      <button type="button" className="btn btn-sm btn-primary" onClick={() => openModal('amenitiesBooking')}>Book an amenity</button>
    </div>
    <h3>My bookings</h3>
    <p className="amenity-availability-note">View approval status and manage your clubhouse and fitness bookings.</p>
    <FeedTabs label="Booking filters" value={filter} onChange={setFilter} tabs={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past & cancelled' }, { value: 'all', label: 'All bookings' }]} />
    {(error || actionError) && <div role="alert" className="amenity-booking-error">{actionError || error}
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setActionError(null); void loadBookings(); }}>Retry</button>
    </div>}
    {isLoadingBookings && <p role="status">Loading bookings…</p>}
    {!isLoadingBookings && !error && shown.length === 0 && <p>No bookings in this view.</p>}
    {shown.map(booking => <article key={booking.id} className="card amenity-history-card">
      <div className="amenity-bookings-toolbar"><strong>{booking.amenity}</strong><Badge variant={booking.status === 'Approved' ? 'pine' : booking.status === 'Pending' ? 'warning' : 'neutral'}>{booking.status}</Badge></div>
      <p><time dateTime={booking.date}>{new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time></p>
      <p>{formatAmenitySlot(booking.slot)}</p>
      <small>{booking.guests} {booking.guests === 1 ? 'attendee' : 'attendees'} · ₹{booking.amount.toLocaleString('en-IN')} · Flat {booking.flat}</small>
      {booking.date >= today && ['Pending', 'Approved'].includes(booking.status) && <button type="button" className="btn btn-sm btn-ghost" disabled={cancelling !== null} onClick={async () => {
        if (!window.confirm('Cancel this booking?')) return;
        setCancelling(booking.id); setActionError(null);
        try { await cancelBooking(booking.id); }
        catch (reason) { setActionError(getUserFriendlyErrorMessage(reason, 'Could not cancel booking.')); }
        finally { setCancelling(null); }
      }}>{cancelling === booking.id ? 'Cancelling…' : 'Cancel booking'}</button>}
    </article>)}
  </section>;
}
