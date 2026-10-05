'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useToastStore } from '../../store';

interface ParkingSlotData {
  id: string;
  zone: 'A' | 'B';
  status: 'occupied' | 'free' | 'reserved';
  assignedFlat?: string | null;
  vehicle?: string | null;
  type: string;
}

export const AdminParkingSection: React.FC = () => {
  const { showToast } = useToastStore();
  const [selectedZone, setSelectedZone] = useState<'A' | 'B'>('A');
  const [inspectedSlot, setInspectedSlot] = useState<ParkingSlotData | null>(null);

  const [slots, setSlots] = useState<ParkingSlotData[]>([
    { id: 'A-01', zone: 'A', status: 'occupied', assignedFlat: 'A-101', vehicle: 'MH-02-CB-4491', type: '4W' },
    { id: 'A-02', zone: 'A', status: 'occupied', assignedFlat: 'A-102', vehicle: 'MH-02-AK-9920', type: '4W' },
    { id: 'A-03', zone: 'A', status: 'reserved', assignedFlat: 'A-103', vehicle: 'Reserved (EV)', type: '4W' },
    { id: 'A-04', zone: 'A', status: 'free', assignedFlat: null, vehicle: null, type: '4W' },
    { id: 'A-05', zone: 'A', status: 'occupied', assignedFlat: 'A-201', vehicle: 'MH-02-EF-1029', type: '4W' },
    { id: 'A-06', zone: 'A', status: 'occupied', assignedFlat: 'A-202', vehicle: 'MH-02-ZA-5512', type: '4W' },
    { id: 'A-07', zone: 'A', status: 'free', assignedFlat: null, vehicle: null, type: '4W' },
    { id: 'A-08', zone: 'A', status: 'occupied', assignedFlat: 'A-301', vehicle: 'MH-02-QW-8819', type: '4W' },
    { id: 'A-09', zone: 'A', status: 'reserved', assignedFlat: 'A-501', vehicle: 'MH-02-AA-0001', type: '4W' },
    { id: 'A-10', zone: 'A', status: 'occupied', assignedFlat: 'A-304', vehicle: 'MH-02-BN-3341', type: '4W' },
    { id: 'A-11', zone: 'A', status: 'occupied', assignedFlat: 'A-401', vehicle: 'MH-02-PL-7712', type: '4W' },
    { id: 'A-12', zone: 'A', status: 'free', assignedFlat: null, vehicle: null, type: '4W' },
    { id: 'A-13', zone: 'A', status: 'occupied', assignedFlat: 'A-403', vehicle: 'MH-02-KL-4091', type: '4W' },
    { id: 'A-14', zone: 'A', status: 'occupied', assignedFlat: 'A-504', vehicle: 'MH-02-GH-1290', type: '4W' },
    { id: 'A-15', zone: 'A', status: 'free', assignedFlat: null, vehicle: null, type: '4W' },
    { id: 'A-16', zone: 'A', status: 'occupied', assignedFlat: 'A-203', vehicle: 'MH-02-TY-6623', type: '2W' },
    { id: 'B-01', zone: 'B', status: 'occupied', assignedFlat: 'B-101', vehicle: 'MH-02-DR-9011', type: '4W' },
    { id: 'B-02', zone: 'B', status: 'occupied', assignedFlat: 'B-102', vehicle: 'MH-02-WE-3412', type: '4W' },
    { id: 'B-03', zone: 'B', status: 'free', assignedFlat: null, vehicle: null, type: '4W' },
    { id: 'B-04', zone: 'B', status: 'occupied', assignedFlat: 'B-201', vehicle: 'MH-02-CV-7819', type: '4W' },
    { id: 'B-05', zone: 'B', status: 'reserved', assignedFlat: 'B-501', vehicle: 'MH-02-VIP-9', type: '4W' },
    { id: 'B-06', zone: 'B', status: 'occupied', assignedFlat: 'B-301', vehicle: 'MH-02-PO-1188', type: '4W' },
    { id: 'B-07', zone: 'B', status: 'occupied', assignedFlat: 'B-303', vehicle: 'MH-02-LK-9022', type: '4W' },
    { id: 'B-08', zone: 'B', status: 'free', assignedFlat: null, vehicle: null, type: '4W' }
  ]);

  const currentSlots = slots.filter((s) => s.zone === selectedZone);
  const freeCount = currentSlots.filter((s) => s.status === 'free').length;
  const occupiedCount = currentSlots.filter((s) => s.status === 'occupied').length;

  return (
    <div className="admin-section active" id="section-parking">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3>Vehicles & Parking Grid</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Zone-by-zone slot allocations, RFID FastTags & EV Charging Bays
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-sm btn-ghost" onClick={() => showToast('Parking log exported.')}>
            Export Slots
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => showToast('Add Parking Bay wizard opened.')}>
            + Add Bay
          </button>
        </div>
      </div>

      {/* Zone Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={clsx('pipeline-chip', selectedZone === 'A' && 'active')}
          style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
          onClick={() => setSelectedZone('A')}
        >
          Zone A • Basement ({freeCount} Free)
        </button>
        <button
          className={clsx('pipeline-chip', selectedZone === 'B' && 'active')}
          style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
          onClick={() => setSelectedZone('B')}
        >
          Zone B • Stilt
        </button>
      </div>

      {/* Tactile Slot Map Grid */}
      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '12px',
          padding: '16px'
        }}
      >
        {currentSlots.map((slot) => (
          <div
            key={slot.id}
            onClick={() => setInspectedSlot(slot)}
            style={{
              background:
                slot.status === 'free'
                  ? '#eaf5f0'
                  : slot.status === 'reserved'
                  ? '#fdf3e7'
                  : 'var(--surface)',
              border: `1.5px solid ${
                slot.status === 'free'
                  ? 'rgba(46, 125, 91, 0.4)'
                  : slot.status === 'reserved'
                  ? 'rgba(224, 138, 44, 0.4)'
                  : 'var(--border)'
              }`,
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
              transition: 'transform 0.15s ease'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--pine-dark)' }}>
              {slot.id}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)', margin: '2px 0' }}>
              {slot.status === 'free' ? 'FREE' : slot.status === 'reserved' ? 'RESERVED' : slot.assignedFlat}
            </div>
            {slot.vehicle && (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  background: 'var(--surface-sunken)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  marginTop: '4px'
                }}
              >
                {slot.vehicle}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Slot Inspection Modal */}
      {inspectedSlot && (
        <div
          className="mobile-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedSlot(null);
          }}
        >
          <div
            className="mobile-bottom-sheet"
            style={{ maxWidth: '480px', margin: 'auto', borderRadius: '16px', padding: '20px' }}
          >
            <div className="drawer-header">
              <div className="drawer-header-left">
                <div className="drawer-header-icon saffron"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg></div>
                <div className="drawer-header-text">
                  <h3>Parking Bay #{inspectedSlot.id}</h3>
                  <p>Zone {inspectedSlot.zone} • {inspectedSlot.type} Bay</p>
                </div>
              </div>
              <button className="drawer-close-btn" onClick={() => setInspectedSlot(null)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>

            <div style={{ margin: '14px 0', fontSize: '0.8125rem' }}>
              <p style={{ marginBottom: '8px' }}>
                Status: <strong>{inspectedSlot.status.toUpperCase()}</strong>
              </p>
              <p style={{ marginBottom: '8px' }}>
                Assigned Flat: <strong>{inspectedSlot.assignedFlat || 'Unassigned / Visitor'}</strong>
              </p>
              <p style={{ marginBottom: '8px' }}>
                Vehicle Tag: <strong>{inspectedSlot.vehicle || 'None'}</strong>
              </p>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setInspectedSlot(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
