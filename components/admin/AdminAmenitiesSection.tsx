'use client';

import React, { useState } from 'react';
import { useAmenityStore, useToastStore } from '../../store';
import { Amenity, AmenityBooking } from '../../types';

export const AdminAmenitiesSection: React.FC = () => {
  const { amenities, bookings } = useAmenityStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'catalog' | 'bookings'>('catalog');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Local state for bookings for immediate approval toggling
  const [localBookings, setLocalBookings] = useState<AmenityBooking[]>(bookings);

  const [newAmenity, setNewAmenity] = useState({
    name: '',
    code: '',
    capacity: 20,
    slotDuration: '60 mins',
    openTime: '06:00 AM',
    closeTime: '10:00 PM',
    price: 0
  });

  const handleApproveBooking = (id: string) => {
    setLocalBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Approved' } : b))
    );
    showToast(`Booking ${id} approved! WhatsApp confirmation sent.`);
  };

  const handleRejectBooking = (id: string) => {
    setLocalBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Cancelled' } : b))
    );
    showToast(`Booking ${id} rejected.`);
  };

  const filteredBookings = localBookings.filter((b) => {
    if (bookingFilter === 'all') return true;
    if (bookingFilter === 'pending') return b.status === 'Pending';
    if (bookingFilter === 'approved') return b.status === 'Approved';
    if (bookingFilter === 'rejected') return b.status === 'Cancelled';
    if (bookingFilter === 'completed') return b.status === 'Completed';
    return true;
  });

  return (
    <div className="admin-section active" id="section-amenities">
      <div className="section-header">
        <div>
          <h2>Clubhouse & Society Amenities</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Facility catalog, operational timings, slot fees, and resident booking approvals.
          </p>
        </div>
        <div className="section-actions" id="amenities-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            + Add Amenity
          </button>
        </div>
      </div>

      {/* Subnav Bar */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Amenities Catalog
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Booking Approvals
        </button>
      </div>

      {/* TAB 1: Catalog */}
      {activeTab === 'catalog' && (
        <div className="config-panel active" id="amentab-catalog">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Configured Society Amenities</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Manage capacities, slot durations, operating hours, and pricing tariffs.
              </p>
            </div>
          </div>

          <div className="amenities-admin-grid">
            {amenities.map((a) => (
              <div
                key={a.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1px solid var(--border-subtle)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', color: 'var(--ink)' }}>{a.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                      Capacity: {a.capacity} persons
                    </span>
                  </div>
                  <span className={`badge ${a.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                    ● {a.status}
                  </span>
                </div>

                <div
                  style={{
                    background: 'var(--surface-sunken)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neutral)' }}>Slot Duration:</span>
                    <strong>{a.slotDuration}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neutral)' }}>Timings:</span>
                    <strong>{a.openTime} - {a.closeTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neutral)' }}>Tariff:</span>
                    <strong style={{ color: a.price > 0 ? 'var(--pine)' : 'var(--success)' }}>
                      {a.price > 0 ? `₹${a.price}/hr` : 'Complimentary'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    className="btn btn-xs btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => {
                      showToast(`Config for ${a.name} saved.`);
                    }}
                  >
                    Edit Rules
                  </button>
                  <button
                    className="btn btn-xs btn-primary"
                    onClick={() => {
                      showToast(`Availability for ${a.name} refreshed.`);
                    }}
                  >
                    Slots Calendar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Bookings */}
      {activeTab === 'bookings' && (
        <div className="config-panel active" id="amentab-bookings">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'pending', 'approved', 'rejected', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  className={`btn btn-sm btn-ghost ${bookingFilter === filter ? 'active' : ''}`}
                  onClick={() => setBookingFilter(filter)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Resident</th>
                  <th>Flat</th>
                  <th>Amenity</th>
                  <th>Date & Slot</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--neutral)' }}>
                      No booking records found for selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <code>{b.id}</code>
                      </td>
                      <td>
                        <strong>{b.resident}</strong>
                      </td>
                      <td>Flat {b.flat}</td>
                      <td>{b.amenity}</td>
                      <td>
                        {b.date} • {b.slot}
                      </td>
                      <td>
                        <strong>{b.amount > 0 ? `₹${b.amount}` : 'Free'}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            b.status === 'Approved'
                              ? 'badge-success'
                              : b.status === 'Pending'
                              ? 'badge-warning'
                              : b.status === 'Completed'
                              ? 'badge-pine'
                              : 'badge-neutral'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td>
                        {b.status === 'Pending' ? (
                          <div className="table-action-btns">
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => handleApproveBooking(b.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-xs btn-danger"
                              onClick={() => handleRejectBooking(b.id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Amenity */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Configure New Society Amenity</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Amenity Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Squash Court #2"
                  value={newAmenity.name}
                  onChange={(e) => setNewAmenity({ ...newAmenity, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Max Capacity (Persons)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newAmenity.capacity}
                    onChange={(e) => setNewAmenity({ ...newAmenity, capacity: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate Per Hour (₹ 0 for free)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newAmenity.price}
                    onChange={(e) => setNewAmenity({ ...newAmenity, price: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast(`Amenity ${newAmenity.name || 'Facility'} configured.`);
                  setShowAddModal(false);
                }}
              >
                Create Amenity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
