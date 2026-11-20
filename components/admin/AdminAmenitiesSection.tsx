'use client';

import { useAdminLoading } from '../common/AdminLoading';
import React, { useState, useEffect } from 'react';
import { useAmenityStore, useAuthStore, useToastStore } from '../../store';
import { Amenity, AmenityBooking } from '../../types';
import { societyDateKey } from '../../lib/calendar';
import { uploadFile } from '../../lib/api/files.api';
import { usePrivateImage } from '../../hooks/usePrivateImage';

const isAllowedAmenityImage = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return (file.type === 'image/jpeg' && ['jpg', 'jpeg'].includes(extension || ''))
    || (file.type === 'image/png' && extension === 'png')
    || (file.type === 'image/webp' && extension === 'webp');
};

export const AdminAmenitiesSection: React.FC = () => {
  const {
    amenities,
    bookings,
    isLoading,
    isLoadingBookings,
    error,
    loadAmenities,
    loadBookings,
    hasLoadedAmenities,
    hasLoadedBookings,
    createAmenity,
    updateAmenity,
    deleteAmenity,
    updateBookingStatus,
  } = useAmenityStore();
  const { organizationId, permissions } = useAuthStore();
  const canManage = permissions.includes('amenity:manage');
  const { showToast } = useToastStore();

  useAdminLoading(isLoading || isLoadingBookings, 'Loading amenities and bookings…');

  const [activeTab, setActiveTab] = useState<'catalog' | 'bookings'>('catalog');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'revoked' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amenityImage, setAmenityImage] = useState<File | null>(null);
  const [amenityImageError, setAmenityImageError] = useState('');
  const [amenityImagePreview, setAmenityImagePreview] = useState<string>();
  const existingAmenityImage = usePrivateImage(editingAmenity?.imageFileId);

  useEffect(() => {
    if (!amenityImage) { setAmenityImagePreview(undefined); return; }
    const url = URL.createObjectURL(amenityImage);
    setAmenityImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [amenityImage]);

  const [amenityForm, setAmenityForm] = useState({
    name: '',
    code: '',
    icon: 'pool',
    category: 'Sports & Aquatics',
    location: 'Clubhouse Ground Floor',
    capacity: 20,
    openTime: '06:00',
    closeTime: '22:00',
    slotDuration: '60 mins',
    price: 0,
    guestFee: 100,
    statusText: 'Open',
    status: 'Active' as 'Active' | 'Closed (Maintenance)',
  });

  useEffect(() => {
    if (organizationId) {
      void loadAmenities();
      void loadBookings();
    }
  }, [organizationId, loadAmenities, loadBookings]);

  const [processingBooking, setProcessingBooking] = useState<string | null>(null);
  const handleBookingAction = async (id: string, status: 'Approved' | 'Rejected' | 'Cancelled' | 'Revoked') => {
    if (processingBooking || !canManage) return;
    if (['Cancelled', 'Revoked'].includes(status) && !window.confirm(`${status === 'Revoked' ? 'Revoke' : 'Cancel'} this booking? Resident access will end.`)) return;
    setProcessingBooking(id);
    try {
      await updateBookingStatus(id, status);
      showToast(`Booking ${status.toLowerCase()}.`);
    } catch (err: any) {
      showToast(err.message || 'Booking action failed');
    } finally { setProcessingBooking(null); }
  };

  const handleSaveAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amenityImage && !isAllowedAmenityImage(amenityImage)) {
      setAmenityImageError('Use a JPG, JPEG, PNG, or WebP image.');
      return;
    }
    if (!amenityForm.name.trim() || !amenityForm.code.trim()) {
      alert('Please enter amenity name and code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: amenityForm.name.trim(),
        code: amenityForm.code.trim().toUpperCase(),
        icon: amenityForm.icon,
        category: amenityForm.category,
        location: amenityForm.location,
        capacity: Number(amenityForm.capacity),
        open_time: amenityForm.openTime,
        close_time: amenityForm.closeTime,
        slot_duration: amenityForm.slotDuration,
        price: Number(amenityForm.price),
        guest_fee: Number(amenityForm.guestFee),
        status_text: amenityForm.statusText,
        status: amenityForm.status,
        image_file_id: editingAmenity?.imageFileId,
      };

      if (amenityImage) {
        const uploaded = await uploadFile(amenityImage, {
          purpose: 'ATTACHMENT',
          documentScope: 'SOCIETY',
          category: 'Society Amenity Photo',
          description: `Photo for ${amenityForm.name.trim()}`,
        });
        payload.image_file_id = uploaded.id;
      }

      if (editingAmenity) {
        await updateAmenity(editingAmenity.id, payload);
        showToast(`Amenity '${amenityForm.name}' updated.`);
      } else {
        await createAmenity(payload);
        showToast(`Amenity '${amenityForm.name}' created.`);
      }
      setShowAddModal(false);
      setEditingAmenity(null);
      setAmenityImage(null);
      setAmenityImageError('');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save amenity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAmenity = async (id: string, name: string) => {
    if (!confirm(`Delete amenity '${name}'?`)) return;
    try {
      await deleteAmenity(id);
      showToast(`Amenity '${name}' deleted.`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete amenity');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    return bookingFilter === 'all' || b.status.toLowerCase() === bookingFilter;
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
          <button
            className="btn btn-primary btn-sm"
            disabled={!canManage}
            onClick={() => {
              setEditingAmenity(null);
              setAmenityImage(null);
              setAmenityImageError('');
              setAmenityForm({
                name: '',
                code: '',
                icon: 'pool',
                category: 'Sports & Aquatics',
                location: 'Clubhouse Ground Floor',
                capacity: 20,
                openTime: '06:00',
                closeTime: '22:00',
                slotDuration: '60 mins',
                price: 0,
                guestFee: 100,
                statusText: 'Open',
                status: 'Active',
              });
              setShowAddModal(true);
            }}
          >
            + Add Amenity
          </button>
        </div>
      </div>

      {error && <div role="alert" className="card">{error}<button className="btn btn-sm btn-ghost" onClick={() => { void loadAmenities(); void loadBookings(); }}>Retry</button></div>}
      {/* Subnav Bar */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Amenities Catalog ({amenities.length})
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Booking Approvals ({bookings.length})
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

          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
              
            </div>
          ) : amenities.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
              {hasLoadedAmenities ? 'No amenities configured. Click "+ Add Amenity" to create one.' : 'Amenities not loaded yet.'}
            </div>
          ) : (
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
                        Code: {a.code} • Capacity: {a.capacity} persons
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
                    {a.guestFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--neutral)' }}>Guest Fee:</span>
                        <strong>₹{a.guestFee}/guest</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      className="btn btn-xs btn-ghost"
                      disabled={!canManage}
                      style={{ flex: 1 }}
                      onClick={() => {
                        setEditingAmenity(a);
                        setAmenityImage(null);
                        setAmenityImageError('');
                        setAmenityForm({
                          name: a.name,
                          code: a.code,
                          icon: a.icon || 'pool',
                          category: a.category || 'Sports & Aquatics',
                          location: a.location || 'Clubhouse',
                          capacity: a.capacity,
                          openTime: a.openTime,
                          closeTime: a.closeTime,
                          slotDuration: a.slotDuration,
                          price: a.price,
                          guestFee: a.guestFee || 0,
                          statusText: a.statusText,
                          status: a.status as any,
                        });
                        setShowAddModal(true);
                      }}
                    >
                      Edit Rules
                    </button>
                    <button
                      className="btn btn-xs btn-ghost"
                      style={{ color: 'var(--danger, #dc2626)' }}
                      disabled={!canManage}
                      onClick={() => handleDeleteAmenity(a.id, a.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Bookings */}
      {activeTab === 'bookings' && (
        <div className="config-panel active" id="amentab-bookings">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'pending', 'approved', 'rejected', 'cancelled', 'revoked', 'completed'] as const).map((filter) => (
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
                  <th>Guests</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--neutral)' }}>
                      {hasLoadedBookings ? 'No booking records found for selected filter.' : 'Bookings not loaded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <code>{b.id.slice(0, 8)}</code>
                      </td>
                      <td>
                        <strong>{b.resident}</strong>
                      </td>
                      <td>Flat {b.flat}</td>
                      <td>{b.amenity}</td>
                      <td>
                        {b.date} • {b.slot}
                      </td>
                      <td>{b.guests} Pax</td>
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
                        {canManage && b.status === 'Pending' ? (
                          <div className="table-action-btns">
                            <button
                              className="btn btn-xs btn-primary"
                              disabled={Boolean(processingBooking)}
                              onClick={() => handleBookingAction(b.id, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-xs btn-danger"
                              disabled={Boolean(processingBooking)}
                              onClick={() => handleBookingAction(b.id, 'Rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        ) : canManage && b.status === 'Approved' && b.date >= societyDateKey(new Date())! ? (
                          <button className="btn btn-xs btn-danger" disabled={Boolean(processingBooking)} onClick={() => handleBookingAction(b.id, 'Revoked')}>Revoke</button>
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

      {/* Modal: Add/Edit Amenity */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog amenity-rules-dialog">
            <div className="modal-header">
              <h3>{editingAmenity ? 'Edit Amenity Rules' : '+ Configure New Society Amenity'}</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAmenity}>
              <div className="modal-body amenity-rules-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amenity Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Squash Court #1"
                      value={amenityForm.name}
                      onChange={(e) => setAmenityForm({ ...amenityForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amenity Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. SQ-01"
                      value={amenityForm.code}
                      onChange={(e) => setAmenityForm({ ...amenityForm, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Amenity Photo</label>
                  {(amenityImagePreview || existingAmenityImage) && (
                    <img
                      src={amenityImagePreview || existingAmenityImage}
                      alt="Amenity preview"
                      style={{ display: 'block', width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }}
                    />
                  )}
                  <input
                    type="file"
                    className="form-control"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && !isAllowedAmenityImage(file)) {
                        setAmenityImage(null);
                        setAmenityImageError('Use a JPG, JPEG, PNG, or WebP image.');
                        e.currentTarget.value = '';
                        return;
                      }
                      setAmenityImageError('');
                      setAmenityImage(file);
                    }}
                  />
                  <small>JPG, JPEG, PNG, or WebP only. Leave empty to keep current photo.</small>
                  {amenityImageError && <small role="alert" style={{ display: 'block', color: 'var(--danger, #dc2626)' }}>{amenityImageError}</small>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    {(() => {
                      const standardCategories = [
                        'Sports & Aquatics',
                        'Fitness & Wellness',
                        'Clubhouse & Recreation',
                        'Events & Banquet',
                        'Kids & Play Area',
                        'Community & Workspace',
                        'Outdoor Courts',
                      ];
                      const isStandard = standardCategories.includes(amenityForm.category);
                      const selectValue = isStandard ? amenityForm.category : 'Other';

                      return (
                        <>
                          <select
                            className="form-select"
                            value={selectValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'Other') {
                                setAmenityForm({ ...amenityForm, category: '' });
                              } else {
                                setAmenityForm({ ...amenityForm, category: val });
                              }
                            }}
                          >
                            {standardCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="Other">Other (Custom Category)</option>
                          </select>
                          {selectValue === 'Other' && (
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Type custom amenity category..."
                              value={amenityForm.category}
                              onChange={(e) => setAmenityForm({ ...amenityForm, category: e.target.value })}
                              style={{ marginTop: '8px' }}
                              autoFocus
                              required
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Clubhouse 2nd Floor"
                      value={amenityForm.location}
                      onChange={(e) => setAmenityForm({ ...amenityForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Max Capacity (Persons)</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={amenityForm.capacity}
                      onChange={(e) => setAmenityForm({ ...amenityForm, capacity: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Slot Duration</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 60 mins, 2 Hours"
                      value={amenityForm.slotDuration}
                      onChange={(e) => setAmenityForm({ ...amenityForm, slotDuration: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Open Time</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="06:00"
                      value={amenityForm.openTime}
                      onChange={(e) => setAmenityForm({ ...amenityForm, openTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Close Time</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="22:00"
                      value={amenityForm.closeTime}
                      onChange={(e) => setAmenityForm({ ...amenityForm, closeTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Resident Hourly Tariff (₹ 0 for free)</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={amenityForm.price}
                      onChange={(e) => setAmenityForm({ ...amenityForm, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Guest Fee (₹ / person)</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={amenityForm.guestFee}
                      onChange={(e) => setAmenityForm({ ...amenityForm, guestFee: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Operational Status</label>
                  <select
                    className="form-select"
                    value={amenityForm.status}
                    onChange={(e) => setAmenityForm({ ...amenityForm, status: e.target.value as any })}
                  >
                    <option value="Active">Active (Open for Bookings)</option>
                    <option value="Closed (Maintenance)">Closed (Under Maintenance)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Amenity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
