'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useResidentStore, useVisitorStore, useModalStore, useToastStore } from '../../store';
import { Switch } from '../common/Switch';
import {
  IconUser,
  IconPackage,
  IconTaxi,
  IconWrench,
  IconShield,
  IconClose,
  IconPhone,
  IconCar,
  IconCalendar,
  IconClock,
  IconDoor,
  IconQrCode
} from '../common/Icons';

const guestTypes = [
  { id: 'Family / Friend', icon: IconUser, title: 'Guest & Family', sub: 'Social visit' },
  { id: 'Home Delivery', icon: IconPackage, title: 'Delivery', sub: 'Swiggy / Amazon' },
  { id: 'Cab / Driver', icon: IconTaxi, title: 'Cab / Ride', sub: 'Uber / Ola / Driver' },
  { id: 'Home Repair', icon: IconWrench, title: 'Home Service', sub: 'Technician / Maid' }
];

const durationOptions = [
  { id: 'Next 4 Hours', label: '4 Hours' },
  { id: 'Today Full Day', label: 'Today' },
  { id: '2 Days Pass', label: '2 Days' },
  { id: 'Weekly Pass', label: '7 Days' }
];

export const PreApproveGuestModal: React.FC = () => {
  const { resident } = useResidentStore();
  const { createPreApprovedPass } = useVisitorStore();
  const { closeModal, openModal } = useModalStore();
  const { showToast } = useToastStore();

  const [purpose, setPurpose] = useState('Family / Friend');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [duration, setDuration] = useState('Today Full Day');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [gate, setGate] = useState('All Gates (Gate 01 & 02)');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  const handleDurationSelect = (dur: string) => {
    setDuration(dur);
    const now = new Date();
    setStartDate(now.toISOString().split('T')[0]);
    if (dur === 'Next 4 Hours' || dur === 'Today Full Day') {
      setEndDate(now.toISOString().split('T')[0]);
    } else if (dur === '2 Days Pass') {
      setEndDate(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);
    } else if (dur === 'Weekly Pass') {
      setEndDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter the guest full name.');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter guest mobile phone number.');
      return;
    }

    const createdPass = createPreApprovedPass({
      guestName: name.trim(),
      phone: phone.trim(),
      purpose,
      flat: resident.flat,
      resident: resident.name,
      startDate,
      endDate,
      validityDisplay: `${startDate} to ${endDate} (${duration})`,
      gate,
      vehicleNo: vehicle.trim() || null
    });

    showToast(`Pre-approved FastPass ${createdPass.passCode} generated for ${name}!`);
    openModal('qrPassCard', createdPass);
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="preapprove-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet">
        <div className="sheet-handle"></div>

        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon saffron">
              <IconShield size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Pre-approve Guest Pass</h3>
              <p>Instant gate clearance with WhatsApp sync</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {/* Guest Category Selector */}
        <div>
          <div className="drawer-section-title">
            <span>Visitor Category</span>
            <span style={{ color: 'var(--pine)', fontSize: '0.6875rem' }}>1-tap approval</span>
          </div>
          <div className="drawer-visual-grid">
            {guestTypes.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  className={clsx(
                    'drawer-visual-card saffron',
                    purpose === item.id && 'active'
                  )}
                  onClick={() => setPurpose(item.id)}
                >
                  <div className="drawer-visual-icon">
                    <IconComp size={22} />
                  </div>
                  <div className="drawer-visual-label">
                    <strong>{item.title}</strong>
                    <span>{item.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guest Details Input Cards */}
        <div className="form-field-wrapper">
          <div className="form-field-label">
            <span>
              Guest Full Name <span className="required-dot">*</span>
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--neutral)', fontWeight: 400 }}>
              As per ID card
            </span>
          </div>
          <div className="input-icon-group">
            <span className="input-leading-icon">
              <IconUser size={16} />
            </span>
            <input
              className="form-control-luxury"
              id="guest-name-input"
              placeholder="e.g. Sameer Kapoor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div className="form-field-wrapper" style={{ marginBottom: 0 }}>
            <div className="form-field-label">
              <span>
                Guest Phone <span className="required-dot">*</span>
              </span>
            </div>
            <div className="input-icon-group">
              <span className="input-leading-icon">
                <IconPhone size={16} />
              </span>
              <input
                className="form-control-luxury"
                id="guest-phone-input"
                placeholder="+91 98765-43210"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-field-wrapper" style={{ marginBottom: 0 }}>
            <div className="form-field-label">
              <span>Vehicle Plate</span>
            </div>
            <div className="input-icon-group">
              <span className="input-leading-icon">
                <IconCar size={16} />
              </span>
              <input
                className="form-control-luxury plate-input"
                id="guest-vehicle-input"
                placeholder="MH-02-AB-1234"
                style={{ textTransform: 'uppercase' }}
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Visiting Dates & Validity Window */}
        <div className="form-field-wrapper" style={{ marginBottom: '8px' }}>
          <div className="drawer-section-title">
            <span>Visiting Window & Date Range</span>
            <span style={{ color: 'var(--pine)', fontSize: '0.6875rem' }}>FastPass</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              marginBottom: '8px'
            }}
          >
            {durationOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={clsx(
                  'priority-pill',
                  duration === opt.id && 'active low'
                )}
                onClick={() => handleDurationSelect(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="input-icon-group">
              <span className="input-leading-icon">
                <IconCalendar size={16} />
              </span>
              <input
                type="date"
                className="form-control-luxury"
                id="guest-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
            </div>
            <div className="input-icon-group">
              <span className="input-leading-icon">
                <IconClock size={16} />
              </span>
              <input
                type="date"
                className="form-control-luxury"
                id="guest-end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
            </div>
          </div>
        </div>

        {/* Entry Gate Restriction */}
        <div className="form-field-wrapper" style={{ marginBottom: '8px' }}>
          <div className="form-field-label">
            <span>Authorized Entry Gate</span>
          </div>
          <div className="input-icon-group">
            <span className="input-leading-icon">
              <IconDoor size={16} />
            </span>
            <select
              className="form-control-luxury"
              id="guest-gate-select"
              style={{ fontSize: '0.8125rem', paddingLeft: '36px' }}
              value={gate}
              onChange={(e) => setGate(e.target.value)}
            >
              <option value="All Gates (Gate 01 & 02)">All Gates (Gate 01 • Main & Gate 02 • Back)</option>
              <option value="Gate 01 • North Booth">Gate 01 • North Booth (Main Gate)</option>
              <option value="Gate 02 • Back Gate">Gate 02 • Back Gate</option>
              <option value="Service & Delivery Gate #3">Service & Delivery Gate #3</option>
            </select>
          </div>
        </div>

        {/* WhatsApp Pass Auto-Send Option */}
        <div className="whatsapp-optin-box" style={{ marginBottom: '8px', padding: '8px 12px' }}>
          <div className="whatsapp-optin-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.554z" />
            </svg>
            <div className="whatsapp-optin-text">
              <h5 style={{ fontSize: '0.75rem' }}>WhatsApp Digital QR Pass</h5>
              <p style={{ fontSize: '0.65rem' }}>Generate shareable link & invitation card</p>
            </div>
          </div>
          <Switch
            id="guest-whatsapp-toggle"
            checked={sendWhatsApp}
            onChange={(e) => setSendWhatsApp(e.target.checked)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeModal}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleSubmit}
          >
            <IconQrCode size={18} />
            <span>Generate QR Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
