'use client';

import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useParkingStore, useToastStore, useAuthStore } from '../../store';
import { hasPermission } from '../../lib/auth/rbac';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import { getFlats, BackendFlat } from '../../lib/api/flats.api';
import { getResidents, BackendResident } from '../../lib/api/residents.api';
import { ParkingSlot } from '../../lib/api/parking.api';
import { Vehicle } from '../../lib/api/vehicles.api';
import { LoadingAnimation } from '../common/LoadingAnimation';

export const AdminParkingSection: React.FC = () => {
  const { showToast } = useToastStore();
  const { organizationId } = useAuthStore();
  const {
    slots,
    vehicles,
    isLoading,
    error,
    loadParkingData,
    createSlot,
    updateSlot,
    deleteSlot,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  } = useParkingStore();

  // Permission gating
  const canManageParking = hasPermission('parking:manage');
  const canReadParking = hasPermission('parking:read');
  const canManageVehicles = hasPermission('vehicle:manage');
  const canReadVehicles = hasPermission('vehicle:read');

  // Subnav Tab
  const [activeTab, setActiveTab] = useState<'grid' | 'vehicles'>('grid');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  // Modal states
  const [inspectedSlot, setInspectedSlot] = useState<ParkingSlot | null>(null);
  const [inspectedVehicle, setInspectedVehicle] = useState<Vehicle | null>(null);
  const [showAddBayModal, setShowAddBayModal] = useState(false);
  const [showEditBayModal, setShowEditBayModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);

  // Form states: Add/Edit Slot
  const [slotNumber, setSlotNumber] = useState('');
  const [slotZone, setSlotZone] = useState('A');
  const [slotType, setSlotType] = useState<'4W' | '2W' | 'EV'>('4W');
  const [slotStatus, setSlotStatus] = useState<'AVAILABLE' | 'OCCUPIED' | 'RESERVED'>('AVAILABLE');
  const [slotFlatId, setSlotFlatId] = useState('');
  const [slotResidentId, setSlotResidentId] = useState('');
  const [editingSlotId, setEditingSlotId] = useState('');

  // Form states: Add/Edit Vehicle
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleType, setVehicleType] = useState<'TWO_WHEELER' | 'FOUR_WHEELER' | 'OTHER'>('FOUR_WHEELER');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleFlatId, setVehicleFlatId] = useState('');
  const [vehicleResidentId, setVehicleResidentId] = useState('');
  const [vehicleSlotId, setVehicleSlotId] = useState('');
  const [vehicleNotes, setVehicleNotes] = useState('');
  const [editingVehicleId, setEditingVehicleId] = useState('');

  // Supporting metadata
  const [flats, setFlats] = useState<BackendFlat[]>([]);
  const [residents, setResidents] = useState<BackendResident[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportingDataLoading, setSupportingDataLoading] = useState(false);
  const [supportingDataError, setSupportingDataError] = useState<string | null>(null);

  // Auto-loaded vehicles state for modal
  const [selectedEntityVehicles, setSelectedEntityVehicles] = useState<
    Array<{
      registration?: string;
      type?: string;
      make_model?: string;
      color?: string;
    }>
  >([]);
  const [selectedLoadedVehicleIndex, setSelectedLoadedVehicleIndex] = useState<number>(0);

  const loadSingleVehicle = useCallback(
    (veh: { registration?: string; type?: string; make_model?: string; color?: string }) => {
      if (!veh) return;
      if (veh.registration) setVehicleReg(String(veh.registration).toUpperCase().trim());
      if (veh.type) {
        const vt = String(veh.type).toUpperCase().trim();
        if (vt === '4W' || vt === 'FOUR_WHEELER' || vt.includes('CAR')) {
          setVehicleType('FOUR_WHEELER');
        } else if (vt === '2W' || vt === 'TWO_WHEELER' || vt.includes('BIKE')) {
          setVehicleType('TWO_WHEELER');
        } else {
          setVehicleType('OTHER');
        }
      }
      if (veh.make_model !== undefined) setVehicleMakeModel(veh.make_model ? String(veh.make_model) : '');
      if (veh.color !== undefined) setVehicleColor(veh.color ? String(veh.color) : '');
    },
    [],
  );

  const applyResidentVehicles = useCallback(
    (targetResidentId?: string, targetFlatId?: string) => {
      const candidates: Array<{
        registration?: string;
        type?: string;
        make_model?: string;
        color?: string;
      }> = [];

      // 1. Check resident profile's registered vehicle details
      if (targetResidentId) {
        const res = residents.find((r) => r.id === targetResidentId);
        if (res && Array.isArray(res.vehicle_details)) {
          for (const v of res.vehicle_details) {
            if (v && typeof v === 'object' && (v.registration || v.make || v.model)) {
              const mm = [v.make, v.model].filter(Boolean).join(' ').trim();
              candidates.push({
                registration: v.registration ? String(v.registration).trim() : undefined,
                type: v.type ? String(v.type).trim() : undefined,
                make_model: mm || undefined,
                color: v.color ? String(v.color).trim() : undefined,
              });
            }
          }
        }
      }

      // 2. Check society's existing vehicles assigned to this resident or flat
      if (Array.isArray(vehicles)) {
        for (const veh of vehicles) {
          if (!veh) continue;
          const matchesResident = Boolean(targetResidentId && veh.resident_id === targetResidentId);
          const matchesFlat = Boolean(targetFlatId && veh.flat_id === targetFlatId);
          if (matchesResident || matchesFlat) {
            const reg = veh.registration_number ? String(veh.registration_number).trim() : '';
            if (reg && !candidates.some((c) => (c.registration || '').toUpperCase() === reg.toUpperCase())) {
              candidates.push({
                registration: reg,
                type: veh.vehicle_type ? String(veh.vehicle_type).trim() : undefined,
                make_model: veh.make_model ? String(veh.make_model).trim() : undefined,
                color: veh.color ? String(veh.color).trim() : undefined,
              });
            }
          }
        }
      }

      setSelectedEntityVehicles(candidates);
      setSelectedLoadedVehicleIndex(0);

      // If exactly 1 vehicle exists, automatically populate the fields!
      if (candidates.length === 1 && candidates[0]) {
        loadSingleVehicle(candidates[0]);
      }
    },
    [residents, vehicles, loadSingleVehicle],
  );

  // Initial load
  const loadSupportingData = useCallback(async () => {
    if (!organizationId) return;
    setSupportingDataLoading(true);
    setSupportingDataError(null);
    try {
      const [flts, resList] = await Promise.all([
        getFlats(),
        getResidents(),
      ]);
      setFlats(Array.isArray(flts) ? flts : []);
      setResidents(Array.isArray(resList) ? resList : []);
    } catch (err: unknown) {
      setSupportingDataError('Failed to load flats and residents data.');
    } finally {
      setSupportingDataLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      loadParkingData();
      loadSupportingData();
    }
  }, [organizationId, loadParkingData, loadSupportingData]);

  // Derived Zones
  const allZones = Array.from(new Set(slots.map((s) => s.zone || 'General'))).sort();
  const filteredSlots = selectedZone === 'ALL'
    ? slots
    : slots.filter((s) => (s.zone || 'General') === selectedZone);

  const availableCount = filteredSlots.filter((s) => s.status === 'AVAILABLE').length;
  const occupiedCount = filteredSlots.filter((s) => s.status === 'OCCUPIED').length;
  const reservedCount = filteredSlots.filter((s) => s.status === 'RESERVED').length;

  // Handlers: Slot CRUD
  const handleCreateSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotNumber.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createSlot({
        slot_number: slotNumber.trim(),
        zone: slotZone.trim() || undefined,
        slot_type: slotType,
        status: slotStatus,
        flat_id: slotFlatId || undefined,
        resident_id: slotResidentId || undefined,
      });
      showToast(`Parking Bay ${slotNumber} created successfully.`);
      setShowAddBayModal(false);
      setSlotNumber('');
      setSlotFlatId('');
      setSlotResidentId('');
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to create parking bay.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotNumber.trim() || !editingSlotId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateSlot(editingSlotId, {
        slot_number: slotNumber.trim(),
        zone: slotZone.trim() || null,
        slot_type: slotType,
        status: slotStatus,
        flat_id: slotFlatId || null,
        resident_id: slotResidentId || null,
      });
      showToast(`Parking Bay ${slotNumber} updated successfully.`);
      setShowEditBayModal(false);
      setInspectedSlot(null);
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to update parking bay.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!canManageParking) {
      showToast('Permission denied: parking:manage required.');
      return;
    }
    if (!confirm('Are you sure you want to delete this parking slot?')) return;

    try {
      await deleteSlot(slotId);
      showToast('Parking bay deleted.');
      setInspectedSlot(null);
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to delete parking bay.'));
    }
  };

  // Handlers: Vehicle CRUD
  const handleCreateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleReg.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createVehicle({
        registration_number: vehicleReg.trim().toUpperCase(),
        vehicle_type: vehicleType,
        make_model: vehicleMakeModel.trim() || undefined,
        color: vehicleColor.trim() || undefined,
        flat_id: vehicleFlatId || undefined,
        resident_id: vehicleResidentId || undefined,
        parking_slot_id: vehicleSlotId || undefined,
        notes: vehicleNotes.trim() || undefined,
      });
      showToast(`Vehicle ${vehicleReg.toUpperCase()} registered successfully.`);
      setShowAddVehicleModal(false);
      setVehicleReg('');
      setVehicleMakeModel('');
      setVehicleColor('');
      setVehicleFlatId('');
      setVehicleResidentId('');
      setVehicleSlotId('');
      setVehicleNotes('');
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to register vehicle.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleReg.trim() || !editingVehicleId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateVehicle(editingVehicleId, {
        registration_number: vehicleReg.trim().toUpperCase(),
        vehicle_type: vehicleType,
        make_model: vehicleMakeModel.trim() || null,
        color: vehicleColor.trim() || null,
        flat_id: vehicleFlatId || null,
        resident_id: vehicleResidentId || null,
        parking_slot_id: vehicleSlotId || null,
        notes: vehicleNotes.trim() || null,
      });
      showToast(`Vehicle ${vehicleReg.toUpperCase()} updated successfully.`);
      setShowEditVehicleModal(false);
      setInspectedVehicle(null);
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to update vehicle.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehId: string) => {
    if (!canManageVehicles) {
      showToast('Permission denied: vehicle:manage required.');
      return;
    }
    if (!confirm('Are you sure you want to remove this vehicle?')) return;

    try {
      await deleteVehicle(vehId);
      showToast('Vehicle deleted.');
      setInspectedVehicle(null);
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to remove vehicle.'));
    }
  };

  // Helper to open Edit Slot Modal
  const openEditSlot = (slot: ParkingSlot) => {
    setEditingSlotId(slot.id);
    setSlotNumber(slot.slot_number);
    setSlotZone(slot.zone || 'A');
    const normalizedSlotType =
      slot.slot_type === '2W' || slot.slot_type === 'EV' ? slot.slot_type : '4W';
    setSlotType(normalizedSlotType as '4W' | '2W' | 'EV');
    const normalizedStatus =
      slot.status === 'OCCUPIED' || slot.status === 'RESERVED' ? slot.status : 'AVAILABLE';
    setSlotStatus(normalizedStatus as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED');
    setSlotFlatId(slot.flat_id || '');
    setSlotResidentId(slot.resident_id || '');
    setShowEditBayModal(true);
  };

  // Helper to open Edit Vehicle Modal
  const openEditVehicle = (veh: Vehicle) => {
    setEditingVehicleId(veh.id);
    setVehicleReg(veh.registration_number);
    setVehicleType(veh.vehicle_type);
    setVehicleMakeModel(veh.make_model || '');
    setVehicleColor(veh.color || '');
    setVehicleFlatId(veh.flat_id || '');
    setVehicleResidentId(veh.resident_id || '');
    setVehicleSlotId(veh.parking_slot_id || '');
    setVehicleNotes(veh.notes || '');
    setShowEditVehicleModal(true);
  };

  if (!organizationId) {
    return (
      <div className="admin-section active" id="section-parking">
        <div className="section-header">
          <div>
            <h3>Vehicles & Parking Grid</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
              Zone-by-zone slot allocations, RFID FastTags & EV Charging Bays
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🚗</div>
          <h4 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>Organization Context Required</h4>
          <p style={{ color: 'var(--neutral)', maxWidth: '420px', margin: '0 auto', fontSize: '0.875rem' }}>
            Please select an organization from the top navigation bar to manage vehicle and parking allocations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section active" id="section-parking">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3>Vehicles & Parking Grid</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Zone-by-zone slot allocations, RFID FastTags & EV Charging Bays
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>

          {canManageParking && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setSlotNumber('');
                setSlotZone('A');
                setSlotType('4W');
                setSlotStatus('AVAILABLE');
                setSlotFlatId('');
                setSlotResidentId('');
                setShowAddBayModal(true);
              }}
            >
              + Add Bay
            </button>
          )}
          {canManageVehicles && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                setVehicleReg('');
                setVehicleType('FOUR_WHEELER');
                setVehicleMakeModel('');
                setVehicleColor('');
                setVehicleFlatId('');
                setVehicleResidentId('');
                setVehicleSlotId('');
                setVehicleNotes('');
                setShowAddVehicleModal(true);
              }}
            >
              + Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Subnav */}
      <div className="module-subnav" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={clsx('module-tab-btn', activeTab === 'grid' && 'active')}
          onClick={() => setActiveTab('grid')}
        >
          Parking Bays Grid ({slots.length})
        </button>
        <button
          type="button"
          className={clsx('module-tab-btn', activeTab === 'vehicles' && 'active')}
          onClick={() => setActiveTab('vehicles')}
        >
          Registered Vehicles ({vehicles.length})
        </button>
      </div>

      {/* Loading & Error Indicators */}
      {isLoading && (
        <LoadingAnimation
          message="Loading parking bays and vehicle records..."
          size={140}
          centered={true}
        />
      )}
      {error && !isLoading && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button className="btn btn-xs btn-ghost" onClick={() => loadParkingData()}>
            Retry
          </button>
        </div>
      )}

      {/* TAB 1: Parking Grid */}
      {activeTab === 'grid' && (
        <>
          {/* Zone & Status Filters */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={clsx('pipeline-chip', selectedZone === 'ALL' && 'active')}
              style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
              onClick={() => setSelectedZone('ALL')}
            >
              All Zones ({slots.length})
            </button>
            {allZones.map((z) => (
              <button
                key={z}
                className={clsx('pipeline-chip', selectedZone === z && 'active')}
                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
                onClick={() => setSelectedZone(z)}
              >
                Zone {z}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
              <span className="badge badge-success">Available: {availableCount}</span>
              <span className="badge badge-pine">Occupied: {occupiedCount}</span>
              {reservedCount > 0 && <span className="badge badge-warning">Reserved: {reservedCount}</span>}
            </div>
          </div>

          {filteredSlots.length === 0 && !isLoading ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>No Parking Bays Found</h4>
              <p style={{ color: 'var(--neutral)', maxWidth: '420px', margin: '0 auto 16px', fontSize: '0.875rem' }}>
                There are currently no parking bays in this zone. Click "+ Add Bay" above to allocate slots.
              </p>
              {canManageParking && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSlotNumber('');
                    setSlotZone(selectedZone !== 'ALL' ? selectedZone : 'A');
                    setSlotType('4W');
                    setSlotStatus('AVAILABLE');
                    setSlotFlatId('');
                    setSlotResidentId('');
                    setShowAddBayModal(true);
                  }}
                >
                  + Add First Bay
                </button>
              )}
            </div>
          ) : (
            <div
              className="card"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '12px',
                padding: '16px',
              }}
            >
              {filteredSlots.map((slot) => {
                const assignedVehicle = vehicles.find((v) => v.parking_slot_id === slot.id);
                const isAvailable = slot.status === 'AVAILABLE';
                const isReserved = slot.status === 'RESERVED';
                const isEv = slot.slot_type === 'EV';

                let cardBg = isAvailable
                  ? '#eaf5f0'
                  : isReserved
                  ? '#fdf3e7'
                  : 'var(--surface)';
                let cardBorder = `1.5px solid ${
                  isAvailable
                    ? 'rgba(46, 125, 91, 0.4)'
                    : isReserved
                    ? 'rgba(224, 138, 44, 0.4)'
                    : 'var(--border)'
                }`;
                let titleColor = 'var(--pine-dark)';

                if (isEv) {
                  if (isAvailable) {
                    cardBg = 'linear-gradient(135deg, #e0f2fe 0%, #ecfdf5 100%)';
                    cardBorder = '1.5px solid #0284c7';
                    titleColor = '#0369a1';
                  } else if (isReserved) {
                    cardBg = 'linear-gradient(135deg, #e0f2fe 0%, #fff7ed 100%)';
                    cardBorder = '1.5px solid #ea580c';
                    titleColor = '#0f4c81';
                  } else {
                    cardBg = '#f0f9ff';
                    cardBorder = '1.5px solid #38bdf8';
                    titleColor = '#0f4c81';
                  }
                }

                return (
                  <div
                    key={slot.id}
                    onClick={() => setInspectedSlot(slot)}
                    style={{
                      background: cardBg,
                      border: cardBorder,
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-card)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: titleColor }}>
                      {slot.slot_number}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)', margin: '2px 0' }}>
                      {isAvailable
                        ? 'FREE'
                        : isReserved
                        ? 'RESERVED'
                        : slot.flat?.flat_identifier
                        ? `Flat ${slot.flat.flat_identifier}`
                        : slot.flat?.flat_number
                        ? `Flat ${slot.flat.flat_number}`
                        : slot.flat_id
                        ? `Flat ${flats.find((f) => f.id === slot.flat_id)?.flat_identifier || slot.flat_id}`
                        : 'OCCUPIED'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        color: isEv ? (isAvailable ? '#0284c7' : isReserved ? '#c2410c' : '#0284c7') : 'var(--neutral)',
                        textTransform: 'uppercase',
                        fontWeight: isEv ? 700 : 500,
                      }}
                    >
                      {isEv ? '⚡ EV Charging' : slot.slot_type}
                    </div>
                    {assignedVehicle && (
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: 'var(--ink)',
                          background: 'var(--surface-sunken)',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          marginTop: '4px',
                        }}
                      >
                        {assignedVehicle.registration_number}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: Vehicles List */}
      {activeTab === 'vehicles' && (
        <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-sunken)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Reg Number</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Make / Model</th>
                <th style={{ padding: '12px 16px' }}>Flat Unit</th>
                <th style={{ padding: '12px 16px' }}>Resident Owner</th>
                <th style={{ padding: '12px 16px' }}>Allocated Bay</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral)' }}>
                    No registered vehicles found. Click "+ Add Vehicle" to register one.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  const bay = slots.find((s) => s.id === v.parking_slot_id);
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ fontWeight: 700, color: 'var(--pine-dark)' }}>{v.registration_number}</code>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge badge-neutral">{v.vehicle_type}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {v.make_model || '—'} {v.color ? `(${v.color})` : ''}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {v.flat?.flat_identifier
                          ? `Flat ${v.flat.flat_identifier}`
                          : v.flat?.flat_number
                          ? `Flat ${v.flat.flat_number}`
                          : v.flat_id
                          ? `Flat ${flats.find((f) => f.id === v.flat_id)?.flat_identifier || v.flat_id}`
                          : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {v.resident?.name
                          ? v.resident.name
                          : (v.resident?.first_name || v.resident?.last_name)
                          ? `${v.resident.first_name || ''} ${v.resident.last_name || ''}`.trim()
                          : v.resident?.user?.mobileNumber
                          ? v.resident.user.mobileNumber
                          : v.resident?.phone_number
                          ? v.resident.phone_number
                          : v.resident_id
                          ? residents.find((r) => r.id === v.resident_id)?.name ||
                            residents.find((r) => r.id === v.resident_id)?.user?.mobileNumber ||
                            'Resident'
                          : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {bay ? (
                          <span className="badge badge-pine">{bay.slot_number} ({bay.zone || 'A'})</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => openEditVehicle(v)}
                          >
                            Edit
                          </button>
                          {canManageVehicles && (
                            <button
                              className="btn btn-xs btn-ghost"
                              style={{ color: '#ef4444' }}
                              onClick={() => handleDeleteVehicle(v.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Bay */}
      {showAddBayModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Parking Bay</h3>
              <button className="modal-close-btn" onClick={() => setShowAddBayModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateSlotSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Slot Identifier *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. A-101 or B-04"
                      value={slotNumber}
                      onChange={(e) => setSlotNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Zone</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. A or Basement"
                      value={slotZone}
                      onChange={(e) => setSlotZone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Slot Type</label>
                    <select
                      className="form-select"
                      value={slotType}
                      onChange={(e) => setSlotType(e.target.value as '4W' | '2W' | 'EV')}
                    >
                      <option value="4W">Car Bay (4W)</option>
                      <option value="2W">Two-Wheeler Bay (2W)</option>
                      <option value="EV">EV Charging Bay</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Status</label>
                    <select
                      className="form-select"
                      value={slotStatus}
                      onChange={(e) => setSlotStatus(e.target.value as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED')}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="RESERVED">Reserved</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assign Flat (Optional)</label>
                    <select
                      className="form-select"
                      value={slotFlatId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlotFlatId(val);
                        if (!val) setSlotResidentId('');
                      }}
                    >
                      <option value="">-- None (Visitor/Common) --</option>
                      {flats.map((fl) => (
                        <option key={fl.id} value={fl.id}>
                          Flat {fl.flat_identifier}
                        </option>
                      ))}
                    </select>
                  </div>
                  {slotFlatId && (
                    <div className="form-group">
                      <label className="form-label">Assign Resident (Optional)</label>
                      <select
                        className="form-select"
                        value={slotResidentId}
                        onChange={(e) => setSlotResidentId(e.target.value)}
                      >
                        <option value="">-- None --</option>
                        {residents
                          .filter((r) => r.flat_id === slotFlatId)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name || 'Resident'}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddBayModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !slotNumber.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Bay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Bay */}
      {showEditBayModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Edit Parking Bay #{slotNumber}</h3>
              <button className="modal-close-btn" onClick={() => setShowEditBayModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditSlotSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Slot Identifier *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={slotNumber}
                      onChange={(e) => setSlotNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Zone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={slotZone}
                      onChange={(e) => setSlotZone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Slot Type</label>
                    <select
                      className="form-select"
                      value={slotType}
                      onChange={(e) => setSlotType(e.target.value as '4W' | '2W' | 'EV')}
                    >
                      <option value="4W">Car Bay (4W)</option>
                      <option value="2W">Two-Wheeler Bay (2W)</option>
                      <option value="EV">EV Charging Bay</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={slotStatus}
                      onChange={(e) => setSlotStatus(e.target.value as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED')}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="RESERVED">Reserved</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assign Flat (Optional)</label>
                    <select
                      className="form-select"
                      value={slotFlatId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlotFlatId(val);
                        if (!val) setSlotResidentId('');
                      }}
                    >
                      <option value="">-- None (Visitor/Common) --</option>
                      {flats.map((fl) => (
                        <option key={fl.id} value={fl.id}>
                          Flat {fl.flat_identifier}
                        </option>
                      ))}
                    </select>
                  </div>
                  {slotFlatId && (
                    <div className="form-group">
                      <label className="form-label">Assign Resident (Optional)</label>
                      <select
                        className="form-select"
                        value={slotResidentId}
                        onChange={(e) => setSlotResidentId(e.target.value)}
                      >
                        <option value="">-- None --</option>
                        {residents
                          .filter((r) => r.flat_id === slotFlatId || r.id === slotResidentId)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name || 'Resident'}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEditBayModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !slotNumber.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Vehicle */}
      {showAddVehicleModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Register Vehicle</h3>
              <button className="modal-close-btn" onClick={() => setShowAddVehicleModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateVehicleSubmit}>
              <div className="modal-body">
                {/* 1. Flat & Resident / Owner Selection (Primary) */}
                <div className="form-row">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Resident Flat</label>
                      {supportingDataLoading && (
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Loading flats…</span>
                      )}
                    </div>
                    <select
                      className="form-select"
                      value={vehicleFlatId}
                      disabled={supportingDataLoading}
                      onChange={(e) => {
                        const newFlatId = e.target.value;
                        setVehicleFlatId(newFlatId);
                        if (!newFlatId) {
                          if (vehicleResidentId) {
                            const res = residents.find((r) => r.id === vehicleResidentId);
                            if (res?.flat_id) setVehicleResidentId('');
                          }
                        } else {
                          const flatResidents = residents.filter((r) => r.flat_id === newFlatId);
                          if (flatResidents.length === 1) {
                            const res = flatResidents[0];
                            setVehicleResidentId(res.id);
                            applyResidentVehicles(res.id, newFlatId);
                          } else if (flatResidents.length > 1) {
                            if (!flatResidents.some((r) => r.id === vehicleResidentId)) {
                              setVehicleResidentId('');
                            } else {
                              applyResidentVehicles(vehicleResidentId, newFlatId);
                            }
                          } else {
                            setVehicleResidentId('');
                            applyResidentVehicles(undefined, newFlatId);
                          }
                        }
                      }}
                    >
                      <option value="">-- None / Select Flat --</option>
                      {flats.map((fl) => (
                        <option key={fl.id} value={fl.id}>
                          Flat {fl.flat_identifier} {fl.flat_type ? `(${fl.flat_type})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Resident / Owner *</label>
                      {supportingDataLoading && (
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Loading residents…</span>
                      )}
                    </div>
                    <select
                      className="form-select"
                      value={vehicleResidentId}
                      disabled={supportingDataLoading}
                      onChange={(e) => {
                        const newResidentId = e.target.value;
                        setVehicleResidentId(newResidentId);
                        let targetFlatId = vehicleFlatId;
                        if (newResidentId) {
                          const selRes = residents.find((r) => r.id === newResidentId);
                          if (selRes?.flat_id) {
                            targetFlatId = selRes.flat_id;
                            setVehicleFlatId(selRes.flat_id);
                          }
                        }
                        applyResidentVehicles(newResidentId || undefined, targetFlatId || undefined);
                      }}
                    >
                      <option value="">-- Select Resident / Owner --</option>
                      {(vehicleFlatId
                        ? residents.filter((r) => !r.flat_id || r.flat_id === vehicleFlatId)
                        : residents
                      ).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name || 'Resident'}
                          {r.resident_type ? ` · ${r.resident_type}` : ''}
                          {r.user?.mobileNumber ? ` · ${r.user.mobileNumber}` : ''}
                          {r.flat_id
                            ? ` (Flat ${flats.find((f) => f.id === r.flat_id)?.flat_identifier || 'Unit'})`
                            : ''}
                        </option>
                      ))}
                    </select>
                    {vehicleFlatId &&
                      residents.filter((r) => r.flat_id === vehicleFlatId).length === 0 && (
                        <small style={{ color: '#6b7280', display: 'block', marginTop: 4 }}>
                          No resident profile is linked to this flat yet.
                        </small>
                      )}
                  </div>
                </div>

                {/* 2. Registered Vehicles Selector if multiple are found */}
                {selectedEntityVehicles.length > 1 && (
                  <div
                    style={{
                      background: 'var(--surface-sunken)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '16px',
                    }}
                  >
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--pine-dark)' }}>
                      Auto-load from Registered Vehicles ({selectedEntityVehicles.length})
                    </label>
                    <select
                      className="form-select"
                      value={selectedLoadedVehicleIndex}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        setSelectedLoadedVehicleIndex(idx);
                        if (idx >= 0 && selectedEntityVehicles[idx]) {
                          loadSingleVehicle(selectedEntityVehicles[idx]);
                        }
                      }}
                    >
                      {selectedEntityVehicles.map((v, i) => (
                        <option key={i} value={i}>
                          {v.registration || v.make_model || 'Vehicle'} · {v.type || '4W'} {v.make_model ? `(${v.make_model})` : ''} {v.color ? `· ${v.color}` : ''}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: 'var(--neutral)', display: 'block', marginTop: '4px' }}>
                      Choose a vehicle above to auto-fill registration, type, make, and color.
                    </small>
                  </div>
                )}

                {/* 3. Vehicle Details */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Registration Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. MH-02-CB-4491"
                      value={vehicleReg}
                      onChange={(e) => setVehicleReg(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Type *</label>
                    <select
                      className="form-select"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as any)}
                    >
                      <option value="FOUR_WHEELER">Four Wheeler (Car/SUV)</option>
                      <option value="TWO_WHEELER">Two Wheeler (Bike/Scooter)</option>
                      <option value="OTHER">Other / Commercial</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Make & Model</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Honda City"
                      value={vehicleMakeModel}
                      onChange={(e) => setVehicleMakeModel(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Silver"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Allocate Parking Bay</label>
                  <select
                    className="form-select"
                    value={vehicleSlotId}
                    onChange={(e) => setVehicleSlotId(e.target.value)}
                  >
                    <option value="">-- None --</option>
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.slot_number} ({s.zone || 'A'}) - {s.status}
                      </option>
                    ))}
                  </select>
                </div>

                {supportingDataError && (
                  <div
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{supportingDataError}</span>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => loadSupportingData()}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddVehicleModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !vehicleReg.trim() || !vehicleResidentId}
                >
                  {isSubmitting ? 'Registering...' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Vehicle */}
      {showEditVehicleModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Edit Vehicle #{vehicleReg}</h3>
              <button className="modal-close-btn" onClick={() => setShowEditVehicleModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditVehicleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Registration Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vehicleReg}
                      onChange={(e) => setVehicleReg(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Type *</label>
                    <select
                      className="form-select"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as any)}
                    >
                      <option value="FOUR_WHEELER">Four Wheeler (Car/SUV)</option>
                      <option value="TWO_WHEELER">Two Wheeler (Bike/Scooter)</option>
                      <option value="OTHER">Other / Commercial</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Make & Model</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vehicleMakeModel}
                      onChange={(e) => setVehicleMakeModel(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Resident Flat</label>
                    <select
                      className="form-select"
                      value={vehicleFlatId}
                      onChange={(e) => {
                        const newFlatId = e.target.value;
                        setVehicleFlatId(newFlatId);
                        if (newFlatId) {
                          const flatResidents = residents.filter((r) => r.flat_id === newFlatId);
                          if (flatResidents.length === 1) {
                            setVehicleResidentId(flatResidents[0].id);
                          } else if (flatResidents.length > 1) {
                            if (!flatResidents.some((r) => r.id === vehicleResidentId)) {
                              setVehicleResidentId('');
                            }
                          }
                        }
                      }}
                    >
                      <option value="">-- None / Select Flat --</option>
                      {flats.map((fl) => (
                        <option key={fl.id} value={fl.id}>
                          Flat {fl.flat_identifier} {fl.flat_type ? `(${fl.flat_type})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Allocate Parking Bay</label>
                    <select
                      className="form-select"
                      value={vehicleSlotId}
                      onChange={(e) => setVehicleSlotId(e.target.value)}
                    >
                      <option value="">-- None --</option>
                      {slots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.slot_number} ({s.zone || 'A'}) - {s.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Resident / Owner</label>
                  <select
                    className="form-select"
                    value={vehicleResidentId}
                    onChange={(e) => {
                      const newResidentId = e.target.value;
                      setVehicleResidentId(newResidentId);
                      if (newResidentId) {
                        const selRes = residents.find((r) => r.id === newResidentId);
                        if (selRes?.flat_id) {
                          setVehicleFlatId(selRes.flat_id);
                        }
                      }
                    }}
                  >
                    <option value="">-- None / Select Resident --</option>
                    {(vehicleFlatId
                      ? residents.filter((r) => !r.flat_id || r.flat_id === vehicleFlatId)
                      : residents
                    ).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name || 'Resident'}
                        {r.resident_type ? ` · ${r.resident_type}` : ''}
                        {r.user?.mobileNumber ? ` · ${r.user.mobileNumber}` : ''}
                        {r.flat_id
                          ? ` (Flat ${flats.find((f) => f.id === r.flat_id)?.flat_identifier || 'Unit'})`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEditVehicleModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !vehicleReg.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspected Slot Modal */}
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
                <div className="drawer-header-icon saffron">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                  </svg>
                </div>
                <div className="drawer-header-text">
                  <h3>Parking Bay #{inspectedSlot.slot_number}</h3>
                  <p>
                    Zone {inspectedSlot.zone || 'A'} • {inspectedSlot.slot_type} Bay
                  </p>
                </div>
              </div>
              <button className="drawer-close-btn" onClick={() => setInspectedSlot(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ margin: '14px 0', fontSize: '0.8125rem' }}>
              <p style={{ marginBottom: '8px' }}>
                Status: <strong>{inspectedSlot.status}</strong>
              </p>
              <p style={{ marginBottom: '8px' }}>
                Assigned Flat:{' '}
                <strong>
                  {inspectedSlot.flat?.flat_identifier
                    ? `Flat ${inspectedSlot.flat.flat_identifier}`
                    : inspectedSlot.flat?.flat_number
                    ? `Flat ${inspectedSlot.flat.flat_number}`
                    : inspectedSlot.flat_id
                    ? `Flat ${flats.find((f) => f.id === inspectedSlot.flat_id)?.flat_identifier || inspectedSlot.flat_id}`
                    : 'Unassigned / Visitor'}
                </strong>
              </p>
              <p style={{ marginBottom: '8px' }}>
                Resident:{' '}
                <strong>
                  {inspectedSlot.resident?.name
                    ? inspectedSlot.resident.name
                    : (inspectedSlot.resident?.first_name || inspectedSlot.resident?.last_name)
                    ? `${inspectedSlot.resident.first_name || ''} ${inspectedSlot.resident.last_name || ''}`.trim()
                    : inspectedSlot.resident?.user?.mobileNumber
                    ? inspectedSlot.resident.user.mobileNumber
                    : inspectedSlot.resident?.phone_number
                    ? inspectedSlot.resident.phone_number
                    : inspectedSlot.resident_id
                    ? residents.find((r) => r.id === inspectedSlot.resident_id)?.name ||
                      residents.find((r) => r.id === inspectedSlot.resident_id)?.user?.mobileNumber ||
                      'Assigned'
                    : 'None'}
                </strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {canManageParking && (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => openEditSlot(inspectedSlot)}
                  >
                    Edit Bay
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleDeleteSlot(inspectedSlot.id)}
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => setInspectedSlot(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
