'use client';

import { useAdminLoading } from '../common/AdminLoading';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { useToastStore, useAuthStore } from '../../store';
import { hasPermission } from '../../lib/auth/rbac';
import { getUserFriendlyErrorMessage, isConflictError } from '../../lib/api/errors';
import {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  BackendBuilding,
} from '../../lib/api/buildings.api';
import {
  getFloors,
  createFloor,
  BackendFloor,
} from '../../lib/api/floors.api';
import { missingFloorNumbers } from '../../lib/api/floors.reconcile';
import { flatTypeOptions } from '../../lib/api/flat-types';
import {
  getFlats,
  createFlat,
  updateFlat,
  deleteFlat,
  BackendFlat,
} from '../../lib/api/flats.api';
import {
  getResidents,
  updateResident,
  assignFlatToResident,
  updateResidentAppAccess,
  residentDisplayName,
  residentLabel,
  BackendResident,
} from '../../lib/api/residents.api';
import { getStaffMembers, BackendStaffMember } from '../../lib/api/staff.api';
import { OnboardResidentWizard } from './OnboardResidentWizard';

interface FlatUnitView {
  id: string;
  backendFlat: BackendFlat;
  buildingId: string;
  floor: number;
  label: string;
  status: 'occupied' | 'vacant' | 'notice-due';
  owner: string;
  resident: string;
  type: string;
  phone: string;
  rentOrMaint: number;
  assignedResident?: BackendResident;
  residents?: BackendResident[];
}

export const AdminBuildingsSection: React.FC = () => {
  const { showToast } = useToastStore();
  const { organizationId } = useAuthStore();

  // Permission gating
  const canManageBuildings = hasPermission('building:manage');
  const canManageFloors = hasPermission('floor:manage');
  const canManageFlats = hasPermission('flat:manage');
  const canManageResidents = hasPermission('resident:manage');
  const canReadBuildings = hasPermission('building:read');
  const canReadFloors = hasPermission('floor:read');
  const canReadFlats = hasPermission('flat:read');
  const canReadResidents = hasPermission('resident:read');
  const canReadStaff = hasPermission('staff:read');

  // Navigation & View state
  const [currentBuildingsTab, setCurrentBuildingsTab] = useState<
    'towers' | 'unittypes' | 'gates'
  >('towers');
  const [activeBuildingId, setActiveBuildingId] = useState<string>('');
  const [current3DViewAngle, setCurrent3DViewAngle] = useState<
    'view-iso-right' | 'view-axonometric' | 'view-front'
  >('view-iso-right');
  const [isBuildingDayMode, setIsBuildingDayMode] = useState<boolean>(false);
  const [highlightedFloor, setHighlightedFloor] = useState<number | null>(null);

  // Modals & Inspection state
  const [inspectedFlat, setInspectedFlat] = useState<FlatUnitView | null>(null);
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [showEditBuildingModal, setShowEditBuildingModal] = useState(false);
  const [showAddFlatModal, setShowAddFlatModal] = useState(false);
  const [showEditFlatModal, setShowEditFlatModal] = useState(false);
  const [showUnitTypeModal, setShowUnitTypeModal] = useState(false);
  const [showEditUnitTypeModal, setShowEditUnitTypeModal] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [showEditGateModal, setShowEditGateModal] = useState(false);
  const [showAddResidentModal, setShowAddResidentModal] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<BackendResident | null>(null);
  const [selectedFlatForOnboard, setSelectedFlatForOnboard] = useState<string | null>(null);
  const [selectedBuildingForOnboard, setSelectedBuildingForOnboard] = useState<string | null>(null);

  // Form states for creating Building
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingCode, setNewBuildingCode] = useState('');
  const [newBuildingFloors, setNewBuildingFloors] = useState('5');

  // Form states for editing Building
  const [editBuildingId, setEditBuildingId] = useState('');
  const [editBuildingName, setEditBuildingName] = useState('');
  const [editBuildingCode, setEditBuildingCode] = useState('');
  const [editBuildingFloors, setEditBuildingFloors] = useState('5');

  // Form states for creating Flat
  const [newFlatBuildingId, setNewFlatBuildingId] = useState('');
  const [newFlatFloorId, setNewFlatFloorId] = useState('');
  const [newFlatIdentifier, setNewFlatIdentifier] = useState('');
  const [newFlatType, setNewFlatType] = useState('');
  const [newFlatMultiplier, setNewFlatMultiplier] = useState('1.0');

  // Form states for editing Flat
  const [editFlatId, setEditFlatId] = useState('');
  const [editFlatBuildingId, setEditFlatBuildingId] = useState('');
  const [editFlatFloorId, setEditFlatFloorId] = useState('');
  const [editFlatIdentifier, setEditFlatIdentifier] = useState('');
  const [editFlatType, setEditFlatType] = useState('');
  const [editFlatMultiplier, setEditFlatMultiplier] = useState('1.0');

  // Dynamic flat type configuration states
  const [newUtName, setNewUtName] = useState('');
  const [newUtCode, setNewUtCode] = useState('');
  const [newUtBedrooms, setNewUtBedrooms] = useState('3');
  const [newUtBathrooms, setNewUtBathrooms] = useState('2');
  const [newUtBalconies, setNewUtBalconies] = useState('1');
  const [newUtDescription, setNewUtDescription] = useState('');
  const [newUtAreaSqFt, setNewUtAreaSqFt] = useState('1500');
  const [newUtMultiplier, setNewUtMultiplier] = useState('1.2');

  const [editUtId, setEditUtId] = useState('');
  const [editUtName, setEditUtName] = useState('');
  const [editUtCode, setEditUtCode] = useState('');
  const [editUtBedrooms, setEditUtBedrooms] = useState('3');
  const [editUtBathrooms, setEditUtBathrooms] = useState('2');
  const [editUtBalconies, setEditUtBalconies] = useState('1');
  const [editUtDescription, setEditUtDescription] = useState('');
  const [editUtAreaSqFt, setEditUtAreaSqFt] = useState('1500');
  const [editUtMultiplier, setEditUtMultiplier] = useState('1.2');
  const [editUtStatus, setEditUtStatus] = useState<'Active' | 'Inactive'>('Active');

  // Dynamic gate terminal states
  const [newGateName, setNewGateName] = useState('');
  const [newGateCode, setNewGateCode] = useState('');
  const [newGateType, setNewGateType] = useState('Main Entry / ANPR');
  const [newGateCustomType, setNewGateCustomType] = useState('');
  const [newGateLocation, setNewGateLocation] = useState('');
  const [newGateOperatingHours, setNewGateOperatingHours] = useState('24x7 Open');
  const [newGateGuards, setNewGateGuards] = useState<string[]>([]);
  const [newGateHardwareStatus, setNewGateHardwareStatus] = useState<'Online' | 'Offline' | 'Degraded'>('Online');

  const [editGateId, setEditGateId] = useState('');
  const [editGateName, setEditGateName] = useState('');
  const [editGateCode, setEditGateCode] = useState('');
  const [editGateType, setEditGateType] = useState('Main Entry / ANPR');
  const [editGateCustomType, setEditGateCustomType] = useState('');
  const [editGateLocation, setEditGateLocation] = useState('');
  const [editGateOperatingHours, setEditGateOperatingHours] = useState('24x7 Open');
  const [editGateGuards, setEditGateGuards] = useState<string[]>([]);
  const [editGateHardwareStatus, setEditGateHardwareStatus] = useState<'Online' | 'Offline' | 'Degraded'>('Online');
  const [editGateStatus, setEditGateStatus] = useState<'Active' | 'Inactive'>('Active');

  // Backend state
  const [buildings, setBuildings] = useState<BackendBuilding[]>([]);
  const [floors, setFloors] = useState<BackendFloor[]>([]);
  const [flats, setFlats] = useState<BackendFlat[]>([]);
  const [residents, setResidents] = useState<BackendResident[]>([]);
  const [guards, setGuards] = useState<BackendStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useAdminLoading(isLoading, 'Loading society and residents…');

  // Dynamic flat types & gates with local persistence per organization
  const defaultUnitTypes: {
    id: string;
    name: string;
    code: string;
    bedrooms: number;
    bathrooms: number;
    balconies?: number;
    description?: string;
    areaSqFt: number;
    maintenanceMultiplier: number;
    status: 'Active' | 'Inactive';
  }[] = [];

  const defaultGates: {
    id: string;
    name: string;
    code: string;
    type: string;
    location: string;
    operatingHours: string;
    assignedGuards: string[];
    hardwareStatus: 'Online' | 'Offline' | 'Degraded';
    status: 'Active' | 'Inactive';
  }[] = [];

  const [unitTypes, setUnitTypes] = useState(defaultUnitTypes);
  const [gates, setGates] = useState(defaultGates);

  // Initialize and persist dynamic unitTypes and gates in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && organizationId) {
      try {
        const storedUt = localStorage.getItem(`societyos_unittypes_${organizationId}`);
        if (storedUt) setUnitTypes(JSON.parse(storedUt));
        const storedGates = localStorage.getItem(`societyos_gates_${organizationId}`);
        if (storedGates) setGates(JSON.parse(storedGates));
      } catch {
        // Fallback to default
      }
    }
  }, [organizationId]);

  const persistUnitTypes = (items: typeof defaultUnitTypes) => {
    setUnitTypes(items);
    if (typeof window !== 'undefined' && organizationId) {
      try {
        localStorage.setItem(`societyos_unittypes_${organizationId}`, JSON.stringify(items));
      } catch {}
    }
  };

  const persistGates = (items: typeof defaultGates) => {
    setGates(items);
    if (typeof window !== 'undefined' && organizationId) {
      try {
        localStorage.setItem(`societyos_gates_${organizationId}`, JSON.stringify(items));
      } catch {}
    }
  };

  // Load backend data
  const loadData = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    const requestedOrg = organizationId;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [bldgs, flrs, flts, resList, staffList] = await Promise.all([
        canReadBuildings ? getBuildings() : Promise.resolve([]),
        canReadFloors ? getFloors() : Promise.resolve([]),
        canReadFlats ? getFlats() : Promise.resolve([]),
        canReadResidents ? getResidents() : Promise.resolve([]),
        canReadStaff ? getStaffMembers().catch(() => []) : Promise.resolve([]),
      ]);

      const safeBldgs = Array.isArray(bldgs) ? bldgs : (bldgs as any)?.data || [];
      const safeFlrs = Array.isArray(flrs) ? flrs : (flrs as any)?.data || [];
      const safeFlts = Array.isArray(flts) ? flts : (flts as any)?.data || [];
      const safeRes = Array.isArray(resList) ? resList : (resList as any)?.data || [];
      const safeStaff = Array.isArray(staffList) ? staffList : (staffList as any)?.data || [];

      if (useAuthStore.getState().organizationId !== requestedOrg) return;
      setBuildings(safeBldgs);
      setFloors(safeFlrs);
      setFlats(safeFlts);
      setResidents(safeRes);
      // Only security personnel are assignable to a gate.
      setGuards(
        safeStaff.filter((s: any) => /guard|security/i.test(String(s?.role || ''))),
      );

      if (safeBldgs.length > 0) {
        setActiveBuildingId(current => (current && safeBldgs.some((b: any) => b.id === current) ? current : safeBldgs[0].id));
      }
    } catch (err: unknown) {
      if (useAuthStore.getState().organizationId !== requestedOrg) return;
      const msg = err instanceof Error ? err.message : 'Failed to fetch society architecture data.';
      setErrorMessage(msg);
    } finally {
      if (useAuthStore.getState().organizationId === requestedOrg) setIsLoading(false);
    }
  }, [
    organizationId,
    canReadBuildings,
    canReadFloors,
    canReadFlats,
    canReadResidents,
    canReadStaff,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Ensure floor records exist for every declared floor (1..totalFloors) of a
   * building, creating only the missing ones. Flats reference floors by id,
   * and the floor dropdown, floor plates, and 3D tower all render from these
   * records — so a building that claims N floors must own N floor records.
   * Best-effort: a floor that fails to create never blocks the others.
   */
  const ensureFloorsForBuilding = async (
    bId: string,
    totalFloors: number,
    existing: { floor_number: number }[],
    orgId: string,
  ) => {
    const missing = missingFloorNumbers(
      totalFloors,
      existing.map((f) => f.floor_number),
    );
    const created: { id: string; floor_number: number }[] = [];
    for (const i of missing) {
      try {
        created.push(
          await createFloor({
            organization_id: orgId,
            building_id: bId,
            floor_number: i,
            name: `Floor ${i}`,
          }),
        );
      } catch {
        // Best-effort reconcile.
      }
    }
    return created;
  };

  // Handle building creation
  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      showToast('Error: Organization context is required.');
      return;
    }
    if (!newBuildingName.trim()) {
      showToast('Please provide a building name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const totalFloorsNum = parseInt(newBuildingFloors, 10) || 5;
      const created = await createBuilding({
        organization_id: organizationId,
        name: newBuildingName.trim(),
        code: newBuildingCode.trim() || undefined,
        totalFloors: totalFloorsNum,
      });

      // Auto-create initial floors for the building so the tower has one record
      // per declared floor (dropdown / floor plates / 3D tower rely on them).
      if (canManageFloors) {
        await ensureFloorsForBuilding(created.id, totalFloorsNum, [], organizationId);
      }

      showToast(`Building ${created.name} registered successfully.`);
      setShowAddBuildingModal(false);
      setNewBuildingName('');
      setNewBuildingCode('');
      setNewBuildingFloors('5');
      await loadData();
      setActiveBuildingId(created.id);
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to create building.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle building update
  const handleUpdateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      showToast('Error: Organization context is required.');
      return;
    }
    if (!canManageBuildings) {
      showToast('Permission denied: building:manage required.');
      return;
    }
    if (!editBuildingName.trim()) {
      showToast('Please provide a building name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const totalFloorsNum = parseInt(editBuildingFloors, 10) || 5;
      await updateBuilding(editBuildingId, {
        name: editBuildingName.trim(),
        code: editBuildingCode.trim() || undefined,
        totalFloors: totalFloorsNum,
      });

      // Reconcile floor records with the declared floor count (create any
      // missing ones) so the floor dropdown / 3D tower reflect every floor.
      if (canManageFloors) {
        await ensureFloorsForBuilding(
          editBuildingId,
          totalFloorsNum,
          floors.filter((f) => f.building_id === editBuildingId),
          organizationId,
        );
      }

      showToast(`Building ${editBuildingName} updated successfully.`);
      setShowEditBuildingModal(false);
      await loadData();
    } catch (err: unknown) {
      showToast(getUserFriendlyErrorMessage(err, 'Failed to update building.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle building deletion/deactivation
  const handleDeleteBuilding = async (buildingId: string) => {
    if (!canManageBuildings) {
      showToast('Permission denied: building:manage required.');
      return;
    }
    if (!confirm('Are you sure you want to deactivate this building?')) return;

    setIsSubmitting(true);
    try {
      await deleteBuilding(buildingId);
      showToast('Building deactivated.');
      await loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to deactivate building.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle flat creation
  const handleCreateFlat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      showToast('Error: Organization context is required.');
      return;
    }

    const bId = newFlatBuildingId || activeBuildingId || buildings[0]?.id;
    if (!bId) {
      showToast('Please select a building tower.');
      return;
    }

    const buildingFloors = floors.filter((f) => f.building_id === bId);
    let floorId = newFlatFloorId;

    if (!floorId && buildingFloors.length > 0) {
      floorId = buildingFloors[0].id;
    }

    // If the building has no floor records yet, establish floors 1..totalFloors
    // so the user can place this flat on any declared floor.
    if (!floorId) {
      try {
        const declaredFloors = buildings.find((b) => b.id === bId)?.totalFloors || 1;
        const createdFloors = await ensureFloorsForBuilding(
          bId,
          declaredFloors,
          [],
          organizationId,
        );
        floorId = createdFloors[0]?.id;
        if (!floorId) {
          const floor1 = await createFloor({
            organization_id: organizationId,
            building_id: bId,
            floor_number: 1,
            name: 'Floor 1',
          });
          floorId = floor1.id;
        }
      } catch {
        showToast('Failed to establish a floor for this building.');
        return;
      }
    }

    if (!newFlatIdentifier.trim()) {
      showToast('Please provide a flat identifier number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createFlat({
        organization_id: organizationId,
        building_id: bId,
        floor_id: floorId,
        flat_identifier: newFlatIdentifier.trim(),
        flat_type: newFlatType.trim() || undefined,
        maintenance_multiplier: parseFloat(newFlatMultiplier) || 1.0,
      });

      showToast(`Flat ${newFlatIdentifier} registered successfully.`);
      setShowAddFlatModal(false);
      setNewFlatIdentifier('');
      await loadData();
    } catch (err: unknown) {
      // A duplicate (409 Conflict) keeps the modal open and the entered values
      // intact so the user can correct the flat number.
      if (isConflictError(err)) {
        showToast(
          `Flat ${newFlatIdentifier.trim()} already exists in this building. Choose a different flat number.`,
        );
      } else {
        showToast(getUserFriendlyErrorMessage(err, 'Failed to register flat.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle flat removal
  const handleDeleteFlat = async (flatId: string) => {
    if (!canManageFlats) {
      showToast('Permission denied: flat:manage required.');
      return;
    }
    if (!confirm('Are you sure you want to remove this flat?')) return;

    try {
      await deleteFlat(flatId);
      showToast('Flat unit removed.');
      setInspectedFlat(null);
      await loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to remove flat.');
    }
  };

  // Handle resident app access toggle
  const handleToggleAppAccess = async (resident: BackendResident) => {
    if (!canManageResidents) {
      showToast('Permission denied: resident:manage required.');
      return;
    }

    try {
      await updateResidentAppAccess(resident.id, {
        app_access_status: !resident.app_access_status,
      });
      showToast(`App access ${!resident.app_access_status ? 'enabled' : 'disabled'} for resident.`);
      await loadData();
      if (inspectedFlat && inspectedFlat.assignedResident?.id === resident.id) {
        setInspectedFlat({
          ...inspectedFlat,
          assignedResident: { ...resident, app_access_status: !resident.app_access_status },
        });
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update app access.');
    }
  };

  // Handle flat assignment to resident
  const handleAssignFlat = async (residentId: string, flatId: string) => {
    if (!canManageResidents) {
      showToast('Permission denied: resident:manage required.');
      return;
    }

    try {
      await assignFlatToResident(residentId, { flat_id: flatId });
      showToast('Resident assigned to flat successfully.');
      await loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to assign flat to resident.');
    }
  };

  // Handle flat edit modal open & update
  const openEditFlat = (flat: BackendFlat) => {
    setEditFlatId(flat.id);
    setEditFlatBuildingId(flat.building_id);
    setEditFlatFloorId(flat.floor_id);
    setEditFlatIdentifier(flat.flat_identifier);
    setEditFlatType(flat.flat_type || unitTypes[0]?.name || '');
    setEditFlatMultiplier(String(flat.maintenance_multiplier || 1.0));
    setShowEditFlatModal(true);
  };

  const handleUpdateFlat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageFlats) {
      showToast('Permission denied: flat:manage required.');
      return;
    }
    if (!editFlatIdentifier.trim()) {
      showToast('Please provide a flat identifier number.');
      return;
    }
    if (!editFlatBuildingId) {
      showToast('Please select a building tower.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateFlat(editFlatId, {
        building_id: editFlatBuildingId,
        floor_id: editFlatFloorId || undefined,
        flat_identifier: editFlatIdentifier.trim(),
        flat_type: editFlatType.trim() || undefined,
        maintenance_multiplier: parseFloat(editFlatMultiplier) || 1.0,
      });

      showToast(`Flat ${editFlatIdentifier} updated successfully.`);
      setShowEditFlatModal(false);
      setInspectedFlat(null);
      await loadData();
    } catch (err: unknown) {
      if (isConflictError(err)) {
        showToast(
          `Flat ${editFlatIdentifier.trim()} already exists in the selected building. Choose a different flat number or tower.`,
        );
      } else {
        showToast(getUserFriendlyErrorMessage(err, 'Failed to update flat.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switching the tower in the flat modals resets the floor to the first floor
  // of the newly selected tower.
  const handleNewFlatBuildingChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const bId = e.target.value;
    setNewFlatBuildingId(bId);
    const firstFloor = floors.find((f) => f.building_id === bId);
    setNewFlatFloorId(firstFloor?.id || '');
  };

  const handleEditFlatBuildingChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const bId = e.target.value;
    setEditFlatBuildingId(bId);
    const firstFloor = floors.find((f) => f.building_id === bId);
    setEditFlatFloorId(firstFloor?.id || '');
  };

  // Flat Type dropdown options are driven by the society's configured Flat
  // Types ("Flat Types & Sizing"). The current selection is always included
  // so no existing value becomes unresettable. If no flat types are configured yet,
  // the built-in standard range is used as fallback.
  const flatTypeSelectOptions = useMemo(() => {
    const activeUnitTypes = unitTypes
      .filter((u) => u.status === 'Active')
      .map((u) => u.name);
    const configuredNames =
      activeUnitTypes.length > 0
        ? activeUnitTypes
        : unitTypes.map((u) => u.name);

    return flatTypeOptions({
      includeStandard: configuredNames.length === 0,
      selected: showEditFlatModal
        ? editFlatType
        : showAddFlatModal
          ? newFlatType
          : undefined,
      custom: configuredNames,
    });
  }, [
    unitTypes,
    newFlatType,
    editFlatType,
    showAddFlatModal,
    showEditFlatModal,
  ]);

  // Flat Types CRUD handlers
  const handleCreateUnitType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUtName.trim()) {
      showToast('Please provide a flat type name.');
      return;
    }
    const parsedMultiplier = parseFloat(newUtMultiplier);
    if (isNaN(parsedMultiplier) || parsedMultiplier < 0) {
      showToast('Maintenance multiplier must be a valid number (0 or greater).');
      return;
    }
    const parsedBalconies = newUtBalconies.trim() ? parseInt(newUtBalconies, 10) : 0;
    if (isNaN(parsedBalconies) || parsedBalconies < 0) {
      showToast('Balconies must be a valid non-negative number.');
      return;
    }
    if (newUtDescription.length > 500) {
      showToast('Description cannot exceed 500 characters.');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: newUtName.trim(),
      code: newUtCode.trim() || newUtName.trim().substring(0, 6).toUpperCase(),
      bedrooms: parseInt(newUtBedrooms, 10) || 2,
      bathrooms: parseInt(newUtBathrooms, 10) || 2,
      balconies: parsedBalconies,
      description: newUtDescription.trim() || undefined,
      areaSqFt: parseInt(newUtAreaSqFt, 10) || 1200,
      maintenanceMultiplier: parsedMultiplier,
      status: 'Active' as const,
    };
    persistUnitTypes([...unitTypes, newItem]);
    showToast(`Flat type ${newItem.name} created.`);
    setShowUnitTypeModal(false);
    setNewUtName('');
    setNewUtCode('');
    setNewUtBedrooms('3');
    setNewUtBathrooms('2');
    setNewUtBalconies('1');
    setNewUtDescription('');
    setNewUtAreaSqFt('1500');
    setNewUtMultiplier('1.2');
  };

  const openEditUnitType = (u: (typeof unitTypes)[0]) => {
    setEditUtId(u.id);
    setEditUtName(u.name);
    setEditUtCode(u.code);
    setEditUtBedrooms(String(u.bedrooms ?? 3));
    setEditUtBathrooms(String(u.bathrooms ?? 2));
    setEditUtBalconies(String(u.balconies ?? 0));
    setEditUtDescription(u.description ?? '');
    setEditUtAreaSqFt(String(u.areaSqFt ?? 1200));
    setEditUtMultiplier(String(u.maintenanceMultiplier ?? 1.0));
    setEditUtStatus(u.status);
    setShowEditUnitTypeModal(true);
  };

  const handleUpdateUnitType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUtName.trim()) {
      showToast('Flat type name is required.');
      return;
    }
    const parsedMultiplier = parseFloat(editUtMultiplier);
    if (isNaN(parsedMultiplier) || parsedMultiplier < 0) {
      showToast('Maintenance multiplier must be a valid number (0 or greater).');
      return;
    }
    const parsedBalconies = editUtBalconies.trim() ? parseInt(editUtBalconies, 10) : 0;
    if (isNaN(parsedBalconies) || parsedBalconies < 0) {
      showToast('Balconies must be a valid non-negative number.');
      return;
    }
    if (editUtDescription.length > 500) {
      showToast('Description cannot exceed 500 characters.');
      return;
    }

    const updated = unitTypes.map((u) =>
      u.id === editUtId
        ? {
            ...u,
            name: editUtName.trim(),
            code: editUtCode.trim() || u.code,
            bedrooms: parseInt(editUtBedrooms, 10) || 2,
            bathrooms: parseInt(editUtBathrooms, 10) || 2,
            balconies: parsedBalconies,
            description: editUtDescription.trim() || undefined,
            areaSqFt: parseInt(editUtAreaSqFt, 10) || 1200,
            maintenanceMultiplier: parsedMultiplier,
            status: editUtStatus,
          }
        : u
    );
    persistUnitTypes(updated);
    showToast(`Flat type ${editUtName} updated.`);
    setShowEditUnitTypeModal(false);
  };

  const handleDeleteUnitType = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete flat type "${name}"?`)) return;
    const filtered = unitTypes.filter((u) => u.id !== id);
    persistUnitTypes(filtered);
    showToast(`Flat type "${name}" deleted.`);
  };

  const handleToggleUnitTypeStatus = (id: string) => {
    const updated = unitTypes.map((u) =>
      u.id === id ? { ...u, status: u.status === 'Active' ? ('Inactive' as const) : ('Active' as const) } : u
    );
    persistUnitTypes(updated);
    showToast('Flat type status updated.');
  };

  // Gates CRUD handlers
  const handleCreateGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGateName.trim()) {
      showToast('Please provide a gate name.');
      return;
    }
    if (newGateType === 'Other' && !newGateCustomType.trim()) {
      showToast('Please specify the custom gate terminal type.');
      return;
    }
    const finalType = newGateType === 'Other' ? newGateCustomType.trim() : newGateType.trim();
    const guardsList = newGateGuards.filter(Boolean);
    const newGate = {
      id: Date.now().toString(),
      name: newGateName.trim(),
      code: newGateCode.trim() || `GATE-0${gates.length + 1}`,
      type: finalType || 'Main Entry / ANPR',
      location: newGateLocation.trim() || 'Campus Entrance',
      operatingHours: newGateOperatingHours.trim() || '24x7 Open',
      assignedGuards: guardsList.length > 0 ? guardsList : ['Post Staff On Duty'],
      hardwareStatus: newGateHardwareStatus,
      status: 'Active' as const,
    };
    persistGates([...gates, newGate]);
    showToast(`Gate ${newGate.name} added.`);
    setShowGateModal(false);
    setNewGateName('');
    setNewGateCode('');
    setNewGateType('Main Entry / ANPR');
    setNewGateCustomType('');
    setNewGateLocation('');
    setNewGateOperatingHours('24x7 Open');
    setNewGateGuards([]);
    setNewGateHardwareStatus('Online');
  };

  const openEditGate = (g: (typeof gates)[0]) => {
    setEditGateId(g.id);
    setEditGateName(g.name);
    setEditGateCode(g.code);
    const standardGateTypes = [
      'Main Entry / ANPR',
      'Pedestrian Turnstile',
      'Service & Delivery',
      'Emergency Exit',
    ];
    if (!standardGateTypes.includes(g.type)) {
      setEditGateType('Other');
      setEditGateCustomType(g.type);
    } else {
      setEditGateType(g.type);
      setEditGateCustomType('');
    }
    setEditGateLocation(g.location);
    setEditGateOperatingHours(g.operatingHours || '24x7 Open');
    setEditGateGuards([...g.assignedGuards]);
    setEditGateHardwareStatus(g.hardwareStatus);
    setEditGateStatus(g.status);
    setShowEditGateModal(true);
  };

  const handleUpdateGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGateName.trim()) {
      showToast('Gate name is required.');
      return;
    }
    if (editGateType === 'Other' && !editGateCustomType.trim()) {
      showToast('Please specify the custom gate terminal type.');
      return;
    }
    const finalType = editGateType === 'Other' ? editGateCustomType.trim() : editGateType.trim();
    const guardsList = editGateGuards.filter(Boolean);
    const updated = gates.map((g) =>
      g.id === editGateId
        ? {
            ...g,
            name: editGateName.trim(),
            code: editGateCode.trim() || g.code,
            type: finalType || g.type,
            location: editGateLocation.trim() || g.location,
            operatingHours: editGateOperatingHours.trim() || g.operatingHours,
            assignedGuards: guardsList.length > 0 ? guardsList : g.assignedGuards,
            hardwareStatus: editGateHardwareStatus,
            status: editGateStatus,
          }
        : g
    );
    persistGates(updated);
    showToast(`Gate ${editGateName} updated.`);
    setShowEditGateModal(false);
  };

  const handleDeleteGate = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete gate terminal "${name}"?`)) return;
    const filtered = gates.filter((g) => g.id !== id);
    persistGates(filtered);
    showToast(`Gate terminal "${name}" deleted.`);
  };

  const handleToggleGateStatus = (id: string) => {
    const updated = gates.map((g) =>
      g.id === id ? { ...g, status: g.status === 'Active' ? ('Inactive' as const) : ('Active' as const) } : g
    );
    persistGates(updated);
    showToast('Gate terminal status updated.');
  };

  // ── Assigned-guards picker (driven by the staff roster) ────────────────
  const toggleGateGuard = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    name: string,
  ) => {
    setter((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const guardByName = useMemo(() => {
    const map = new Map<string, BackendStaffMember>();
    for (const g of guards) if (g.name) map.set(g.name, g);
    return map;
  }, [guards]);

  // Roster guards plus any name already assigned to the open gate, so legacy
  // assignments stay visible/removable even if the person left the roster.
  const guardOptionNames = useMemo(() => {
    const names = new Set<string>();
    for (const g of guards) if (g.name) names.add(g.name);
    const current = showEditGateModal
      ? editGateGuards
      : showGateModal
        ? newGateGuards
        : [];
    for (const n of current) if (n) names.add(n);
    return Array.from(names);
  }, [guards, editGateGuards, newGateGuards, showEditGateModal, showGateModal]);

  const renderGuardPicker = (
    selected: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => (
    <div className="form-group">
      <label className="form-label">
        Assigned Guards{selected.length > 0 ? ` (${selected.length} selected)` : ''}
      </label>
      {guardOptionNames.length === 0 ? (
        <p className="onboard-hint">
          No guards found. Add security staff in the Staff module to assign them here.
        </p>
      ) : (
        <div className="gate-guard-list" role="group" aria-label="Assigned guards">
          {guardOptionNames.map((name) => {
            const member = guardByName.get(name);
            const checked = selected.includes(name);
            return (
              <label
                key={name}
                className={clsx('gate-guard-item', checked && 'gate-guard-item--active')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleGateGuard(setter, name)}
                />
                <span className="gate-guard-name" title={name}>
                  {name}
                </span>
                <span className="gate-guard-meta">
                  {member ? member.role : 'Not in roster'}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );

  // Compute active building and mapped flat units
  const buildingList: BackendBuilding[] = Array.isArray(buildings) ? buildings : (buildings as any)?.data || [];
  const floorList: BackendFloor[] = Array.isArray(floors) ? floors : (floors as any)?.data || [];
  const flatList: BackendFlat[] = Array.isArray(flats) ? flats : (flats as any)?.data || [];
  const residentList: BackendResident[] = Array.isArray(residents) ? residents : (residents as any)?.data || [];
  const activeBuilding: BackendBuilding | undefined = buildingList.find((b) => b.id === activeBuildingId) || buildingList[0];
  const activeBuildingFloors: BackendFloor[] = activeBuilding
    ? floorList.filter((fl) => fl.building_id === activeBuilding.id).sort((a, b) => b.floor_number - a.floor_number)
    : [];

  const activeFlats: FlatUnitView[] = activeBuilding
    ? flatList
        .filter((f) => f.building_id === activeBuilding.id)
        .map((f) => {
          const fl = floorList.find((x) => x.id === f.floor_id);
          const residentsOnFlat = residentList.filter((r) => r.flat_id === f.id);
          const assignedResident = residentsOnFlat[0];
          const isOccupied = residentsOnFlat.length > 0;
          const primaryResident =
            residentsOnFlat.find((r) => r.is_primary) ?? assignedResident;

          return {
            id: f.id,
            backendFlat: f,
            buildingId: f.building_id,
            floor: fl?.floor_number ?? 1,
            label: f.flat_identifier,
            status: isOccupied ? 'occupied' : 'vacant',
            owner: primaryResident
              ? residentDisplayName(primaryResident)
              : 'Vacant',
            resident: primaryResident
              ? residentDisplayName(primaryResident)
              : 'Vacant',
            type: f.flat_type || 'Standard',
            phone: assignedResident?.user?.mobileNumber || 'N/A',
            rentOrMaint: Math.round(4500 * (f.maintenance_multiplier || 1.0)),
            assignedResident,
            residents: residentsOnFlat,
          };
        })
    : [];

  const occCount = activeFlats.filter((f) => f.status === 'occupied').length;
  const vacCount = activeFlats.filter((f) => f.status === 'vacant').length;
  const dueCount = activeFlats.filter((f) => f.status === 'notice-due').length;
  const occRate = Math.round((occCount / (activeFlats.length || 1)) * 100);

  // Floor slices generation
  const totalFloorCount = activeBuilding
    ? Math.max(activeBuilding.totalFloors || 0, activeBuildingFloors.length, 1)
    : 1;

  const floorNumbers =
    activeBuildingFloors.length > 0
      ? activeBuildingFloors.map((fl) => fl.floor_number)
      : Array.from({ length: totalFloorCount }, (_, i) => totalFloorCount - i);

  // 1. Missing organization context state
  if (!organizationId) {
    return (
      <section className="admin-section active" id="section-buildings">
        <div className="section-header">
          <div>
            <h2>Society Architecture & Infrastructure</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
              Configure towers, flat types, and perimeter gate terminals.
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏢</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>Organization Context Required</h3>
          <p style={{ color: 'var(--neutral)', maxWidth: '420px', margin: '0 auto', fontSize: '0.875rem' }}>
            Please select an active organization context from the top navigation bar to inspect and configure society buildings and units.
          </p>
        </div>
      </section>
    );
  }

  // 2. Loading state
  if (isLoading && buildings.length === 0) {
    return (
      <section className="admin-section active" id="section-buildings">
        <div className="section-header">
          <div>
            <h2>Society Architecture & Infrastructure</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
              Configure towers, flat types, and perimeter gate terminals.
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', color: 'var(--neutral)' }}>
            Loading society architecture from backend...
          </div>
        </div>
      </section>
    );
  }

  // 3. Error state
  if (errorMessage && buildings.length === 0) {
    return (
      <section className="admin-section active" id="section-buildings">
        <div className="section-header">
          <div>
            <h2>Society Architecture & Infrastructure</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
              Configure towers, flat types, and perimeter gate terminals.
            </p>
          </div>
        </div>
        <div
          className="card"
          style={{
            padding: '24px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <h4 style={{ color: '#ef4444', margin: '0 0 8px' }}>Failed to Load Society Architecture</h4>
          <p style={{ color: 'var(--neutral)', margin: 0, fontSize: '0.875rem' }}>{errorMessage}</p>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '16px' }}
            onClick={loadData}
          >
            Retry Connection
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-section active" id="section-buildings">
      {/* Section Header */}
      <div className="section-header">
        <div>
          <h2>Society Architecture & Infrastructure</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Authoritative building infrastructure, floor plates, unit occupancy & resident access.
          </p>
        </div>
        <div className="section-actions" id="buildings-header-actions">
          {canManageBuildings && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setNewBuildingName('');
                setNewBuildingCode('');
                setNewBuildingFloors('5');
                setShowAddBuildingModal(true);
              }}
            >
              + Add Building
            </button>
          )}
          {canManageFlats && buildings.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setNewFlatBuildingId(activeBuilding?.id || buildings[0]?.id);
                setNewFlatFloorId(activeBuildingFloors[0]?.id || '');
                setNewFlatIdentifier('');
                const defaultType =
                  unitTypes.find((u) => u.status === 'Active')?.name ||
                  unitTypes[0]?.name ||
                  '';
                setNewFlatType(defaultType);
                const matchedType = unitTypes.find(
                  (u) => u.name.toLowerCase() === defaultType.toLowerCase(),
                );
                setNewFlatMultiplier(
                  matchedType ? String(matchedType.maintenanceMultiplier) : '1.0',
                );
                setShowAddFlatModal(true);
              }}
            >
              + Add Flat
            </button>
          )}
        </div>
      </div>

      {/* Module Subnav Bar */}
      <div className="module-subnav">
        <button
          type="button"
          className={clsx('module-tab-btn', currentBuildingsTab === 'towers' && 'active')}
          onClick={() => setCurrentBuildingsTab('towers')}
        >
          Towers & Unit Slices ({buildings.length})
        </button>

        <button
          type="button"
          className={clsx('module-tab-btn', currentBuildingsTab === 'unittypes' && 'active')}
          onClick={() => setCurrentBuildingsTab('unittypes')}
        >
          Flat Types &amp; Sizing
        </button>
        <button
          type="button"
          className={clsx('module-tab-btn', currentBuildingsTab === 'gates' && 'active')}
          onClick={() => setCurrentBuildingsTab('gates')}
        >
          Gates & Security Terminals
        </button>
      </div>

      {/* TAB 1: 3D Towers & Unit Slices */}
      {currentBuildingsTab === 'towers' && (
        <div className="config-panel active" id="bldgtab-towers">
          {buildings.length === 0 ? (
            /* 4. Empty State */
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>No Buildings Registered</h3>
              <p style={{ color: 'var(--neutral)', maxWidth: '420px', margin: '0 auto 16px', fontSize: '0.875rem' }}>
                There are currently no towers registered in this organization. Click "+ Add Building" above to register your first society tower.
              </p>
              {canManageBuildings && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddBuildingModal(true)}
                >
                  + Add First Building
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Summary Chips */}
              <div className="building-summary-chips" id="building-summary">
                <span className="badge badge-pine">Occupied: {occCount}</span>
                <span className="badge badge-neutral">Vacant: {vacCount}</span>
                {dueCount > 0 && <span className="badge badge-warning">Notice: {dueCount}</span>}
                <span className="badge badge-success">{occRate}% Occupancy Rate</span>
                {activeBuilding && canManageBuildings && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-xs btn-ghost"
                      style={{ color: 'var(--pine-dark)' }}
                      onClick={() => {
                        setEditBuildingId(activeBuilding.id);
                        setEditBuildingName(activeBuilding.name);
                        setEditBuildingCode(activeBuilding.code || '');
                        setEditBuildingFloors(String(activeBuilding.totalFloors || 5));
                        setShowEditBuildingModal(true);
                      }}
                    >
                      Edit Tower
                    </button>
                    <button
                      className="btn btn-xs btn-ghost"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDeleteBuilding(activeBuilding.id)}
                    >
                      Deactivate Tower
                    </button>
                  </div>
                )}
              </div>

              {/* Tower Selector Tabs */}
              <div className="building-tabs" id="building-tabs">
                {buildings.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={clsx('tab-btn', b.id === activeBuildingId && 'active')}
                    onClick={() => setActiveBuildingId(b.id)}
                  >
                    {b.name} {b.code ? `(${b.code})` : ''}
                  </button>
                ))}
              </div>

              {/* Split Visual View: 3D Model on Left + Floor Plates Matrix on Right */}
              <div className="building-split-view">
                {/* LEFT: 3D Isometric Architectural Elevation Stage */}
                <div
                  className={clsx('tower-stage-card', isBuildingDayMode && 'day-mode')}
                  id="tower-visual-model"
                >
                  {/* Viewport Controls Bar */}
                  <div className="viewport-controls-bar">
                    <div className="view-angle-btns">
                      <button
                        type="button"
                        className={clsx('angle-btn', current3DViewAngle === 'view-iso-right' && 'active')}
                        onClick={() => setCurrent3DViewAngle('view-iso-right')}
                      >
                        Isometric 3D
                      </button>
                      <button
                        type="button"
                        className={clsx('angle-btn', current3DViewAngle === 'view-axonometric' && 'active')}
                        onClick={() => setCurrent3DViewAngle('view-axonometric')}
                      >
                        Axonometric
                      </button>
                      <button
                        type="button"
                        className={clsx('angle-btn', current3DViewAngle === 'view-front' && 'active')}
                        onClick={() => setCurrent3DViewAngle('view-front')}
                      >
                        Front Elevation
                      </button>
                    </div>
                    <div
                      className="day-night-toggle"
                      onClick={() => setIsBuildingDayMode((prev) => !prev)}
                    >
                      <span>{isBuildingDayMode ? 'Day View' : 'Night Illumination'}</span>
                    </div>
                  </div>

                  {/* 3D Scene Viewport */}
                  <div className="tower-3d-scene">
                    <div className="central-glass-elevator-shaft">
                      <div className="elevator-moving-pod"></div>
                    </div>

                    <div className={clsx('tower-isometric-rig', current3DViewAngle)} id="towerRig">
                      {/* Architectural Rooftop */}
                      <div className="architectural-roof">
                        <div className="solar-grid-array" title="Grid-tied Solar PV Array">
                          <div className="solar-cell"></div>
                          <div className="solar-cell"></div>
                          <div className="solar-cell"></div>
                          <div className="solar-cell"></div>
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a7f3d0' }}>
                          SKY TERRACE
                        </div>
                        <div className="roof-water-tank">TANK 01</div>
                      </div>

                      {/* Floor Slices (Top to Bottom) */}
                      {floorNumbers.map((floorNum) => {
                        const floorFlats = activeFlats.filter((f) => f.floor === floorNum);
                        const isPenthouse =
                          floorNum === activeBuilding?.totalFloors && (activeBuilding?.totalFloors ?? 0) >= 5;
                        const isHighlighted = highlightedFloor === floorNum;

                        return (
                          <div
                            key={floorNum}
                            className={clsx('architectural-floor-slice', isHighlighted && 'active-slice')}
                            id={`slab-${floorNum}`}
                            onMouseEnter={() => setHighlightedFloor(floorNum)}
                            onMouseLeave={() => setHighlightedFloor(null)}
                          >
                            <div className="floor-slab-base">
                              <span className="floor-number-callout">
                                {isPenthouse ? `F${floorNum} PH` : `LEVEL ${floorNum}`}
                              </span>
                              <div className="units-facade-row">
                                {floorFlats.map((f) => (
                                  <div
                                    key={f.id}
                                    className={`realistic-window-unit unit-${f.status}`}
                                    title={`Flat ${f.label} • ${f.owner} (${f.status})`}
                                    onClick={() => setInspectedFlat(f)}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <span className="unit-label-text">{f.label}</span>
                                      <span style={{ fontSize: '0.5rem', opacity: 0.8 }}>
                                        {f.type.split(' ')[0]}
                                      </span>
                                    </div>
                                    <div className="balcony-glass-strip"></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Ground Podium */}
                      <div className="architectural-ground-podium">
                        <div className="podium-canopy-text">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          </svg>
                          <span>{activeBuilding?.name.toUpperCase()} MAIN ENTRANCE</span>
                        </div>
                        <span className="security-kiosk-badge">BOOTH ACTIVE</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend Bar */}
                  <div className="stage-arch-legend">
                    <div className="stage-arch-legend-items">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#34d399',
                            boxShadow: '0 0 6px #34d399',
                          }}
                        ></span>
                        <span>Occupied</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.3)',
                          }}
                        ></span>
                        <span>Vacant</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.625rem', opacity: 0.8 }}>Click unit to inspect</span>
                  </div>
                </div>

                {/* RIGHT: Floor Plates & Unit Matrix */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
                      {activeBuilding?.name} — Floor Slices
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                      Hover floor slab to highlight on 3D tower
                    </span>
                  </div>

                  <div className="floors-stack">
                    {floorNumbers.map((floorNum) => {
                      const floorFlats = activeFlats.filter((f) => f.floor === floorNum);
                      return (
                        <div
                          key={floorNum}
                          className={clsx('floor-row', highlightedFloor === floorNum && 'active-row')}
                          onMouseEnter={() => setHighlightedFloor(floorNum)}
                          onMouseLeave={() => setHighlightedFloor(null)}
                        >
                          <span className="floor-label">Floor {floorNum}</span>
                          <div className="flats-list">
                            {floorFlats.length === 0 ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--neutral)', padding: '4px 8px' }}>
                                No units
                              </span>
                            ) : (
                              floorFlats.map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  className={`flat-chip ${f.status}`}
                                  onClick={() => setInspectedFlat(f)}
                                  title={`Flat ${f.label} • ${f.status === 'vacant' ? 'Vacant - Click to inspect or onboard' : f.owner}`}
                                >
                                  <span className="status-dot"></span>
                                  <span>Flat {f.label}</span>
                                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({f.type})</span>
                                  {f.status === 'vacant' && canManageResidents && (
                                    <span
                                      style={{
                                        marginLeft: '6px',
                                        fontSize: '0.65rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        color: '#10b981',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                      title="Directly Onboard Resident"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setResidentToEdit(null);
                                        setSelectedFlatForOnboard(f.backendFlat.id);
                                        setSelectedBuildingForOnboard(f.backendFlat.building_id);
                                        setShowAddResidentModal(true);
                                      }}
                                    >
                                      + Add
                                    </span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: Flat Types & Sizing */}
      {currentBuildingsTab === 'unittypes' && (
        <div className="config-panel active" id="bldgtab-unittypes">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Flat Type Configuration &amp; Area Multipliers</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Define flat types, carpet areas, and maintenance calculation multipliers. These
                flat types populate the Flat Type dropdown when registering a new unit flat.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUnitTypeModal(true)}>
              + Add Flat Type
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Flat Type</th>
                  <th>Code</th>
                  <th>Bedrooms</th>
                  <th>Bathrooms</th>
                  <th>Balconies</th>
                  <th>Super Area (sq.ft.)</th>
                  <th>Maint. Multiplier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unitTypes.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      {u.description && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--neutral)', marginTop: '2px' }}>
                          {u.description}
                        </div>
                      )}
                    </td>
                    <td><code style={{ fontWeight: 700, color: 'var(--pine)' }}>{u.code}</code></td>
                    <td>{u.bedrooms} BHK</td>
                    <td>{u.bathrooms} Bath</td>
                    <td>{u.balconies ?? 0} Balcony</td>
                    <td>{u.areaSqFt.toLocaleString('en-IN')} sq.ft.</td>
                    <td><span className="badge badge-pine">{u.maintenanceMultiplier.toFixed(2)}x Base</span></td>
                    <td><span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>{u.status}</span></td>
                    <td>
                      <div className="table-action-btns" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          style={{ color: 'var(--pine-dark)' }}
                          onClick={() => openEditUnitType(u)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleToggleUnitTypeStatus(u.id)}
                        >
                          {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteUnitType(u.id, u.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Gates & Security Terminals */}
      {currentBuildingsTab === 'gates' && (
        <div className="config-panel active" id="bldgtab-gates">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Perimeter Gates & ANPR Boom Barriers</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Configure physical entry points, operational timings, and guard post allocations.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowGateModal(true)}>
              + Add Gate Terminal
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Gate Name</th>
                  <th>Gate Code</th>
                  <th>Gate Type</th>
                  <th>Physical Location</th>
                  <th>Operating Hours</th>
                  <th>Assigned Guards</th>
                  <th>Hardware / ANPR</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gates.map((g) => (
                  <tr key={g.id}>
                    <td><strong>{g.name}</strong></td>
                    <td><code style={{ fontWeight: 700, color: 'var(--pine)' }}>{g.code}</code></td>
                    <td><span className="badge badge-pine">{g.type}</span></td>
                    <td>{g.location}</td>
                    <td>{g.operatingHours}</td>
                    <td>{g.assignedGuards.join(', ')}</td>
                    <td>
                      <span className={`badge ${g.hardwareStatus === 'Online' ? 'badge-success' : 'badge-warning'}`}>
                        ● {g.hardwareStatus}
                      </span>
                    </td>
                    <td><span className={`badge ${g.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>{g.status}</span></td>
                    <td>
                      <div className="table-action-btns" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          style={{ color: 'var(--pine-dark)' }}
                          onClick={() => openEditGate(g)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleToggleGateStatus(g.id)}
                        >
                          {g.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteGate(g.id, g.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspected Flat Modal / Drawer */}
      {inspectedFlat && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedFlat(null);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: '500px', borderRadius: '16px', padding: '20px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  Unit Dossier: Flat {inspectedFlat.label}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: '4px 0 0' }}>
                  {inspectedFlat.type} • Floor {inspectedFlat.floor} • {activeBuilding?.name}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setInspectedFlat(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Direct Onboard / Add Resident Action */}
            {canManageResidents && (
              <div style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  }}
                  onClick={() => {
                    setResidentToEdit(null);
                    setSelectedFlatForOnboard(inspectedFlat.backendFlat.id);
                    setSelectedBuildingForOnboard(inspectedFlat.backendFlat.building_id);
                    setInspectedFlat(null);
                    setShowAddResidentModal(true);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {inspectedFlat.status === 'vacant'
                    ? `+ Onboard Resident to Flat ${inspectedFlat.label}`
                    : `+ Add Another Resident to Flat ${inspectedFlat.label}`}
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0', fontSize: '0.8125rem' }}>
              <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}>
                  RESIDENT PHONE
                </span>
                <strong style={{ color: 'var(--ink)' }}>{inspectedFlat.phone}</strong>
              </div>
              <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}>
                  OCCUPANCY STATUS
                </span>
                <span className={`badge badge-${inspectedFlat.status === 'occupied' ? 'success' : 'neutral'}`}>
                  {inspectedFlat.status.toUpperCase()}
                </span>
              </div>
              <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}>
                  BASE MAINTENANCE
                </span>
                <strong>₹{inspectedFlat.rentOrMaint.toLocaleString('en-IN')}/mo</strong>
              </div>
              <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}>
                  APP ACCESS
                </span>
                <span className={`badge ${inspectedFlat.assignedResident?.app_access_status ? 'badge-success' : 'badge-neutral'}`}>
                  {inspectedFlat.assignedResident?.app_access_status ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>

            {/* Residents on this flat (owner + tenant + family) */}
            {inspectedFlat.residents && inspectedFlat.residents.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  RESIDENTS ON THIS FLAT ({inspectedFlat.residents.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inspectedFlat.residents.map((res) => (
                    <div
                      key={res.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--surface-sunken)',
                        padding: '10px',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ fontSize: '0.8125rem', minWidth: 0 }}>
                        <strong style={{ color: 'var(--ink)', display: 'block' }}>
                          {residentDisplayName(res)}
                        </strong>
                        <span style={{ color: 'var(--neutral)', fontSize: '0.7rem' }}>
                          {res.user?.mobileNumber || '—'}
                          {(res.resident_type || res.is_primary) && (
                            <span style={{ marginLeft: '6px' }}>• {residentLabel(res)}</span>
                          )}
                        </span>
                      </div>
                      {canManageResidents && (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleToggleAppAccess(res)}
                        >
                          {res.app_access_status ? 'Disable App' : 'Enable App'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resident Assignment Section */}
            {canManageResidents &&
              residents.filter((res) => res.flat_id !== inspectedFlat.backendFlat.id).length > 0 && (
              <div style={{ marginBottom: '16px', background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Assign Another Existing Resident to This Flat:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.8rem' }}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignFlat(e.target.value, inspectedFlat.backendFlat.id);
                        setInspectedFlat(null);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select resident to assign...</option>
                    {residents
                      .filter((res) => res.flat_id !== inspectedFlat.backendFlat.id)
                      .map((res) => (
                        <option key={res.id} value={res.id}>
                          {residentDisplayName(res)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {canManageResidents && inspectedFlat.assignedResident && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleToggleAppAccess(inspectedFlat.assignedResident!)}
                >
                  Toggle App Access
                </button>
              )}
              {canManageFlats && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--pine-dark)' }}
                  onClick={() => openEditFlat(inspectedFlat.backendFlat)}
                >
                  Edit Unit
                </button>
              )}
              {canManageFlats && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ color: '#ef4444' }}
                  onClick={() => handleDeleteFlat(inspectedFlat.backendFlat.id)}
                >
                  Delete Flat
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => setInspectedFlat(null)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Onboard / Edit Resident Wizard */}
      <OnboardResidentWizard
        open={showAddResidentModal}
        residentToEdit={residentToEdit}
        onClose={() => {
          setShowAddResidentModal(false);
          setResidentToEdit(null);
          setSelectedFlatForOnboard(null);
          setSelectedBuildingForOnboard(null);
        }}
        onSuccess={() => {
          loadData();
          setShowAddResidentModal(false);
          setResidentToEdit(null);
          setSelectedFlatForOnboard(null);
          setSelectedBuildingForOnboard(null);
        }}
        buildings={buildingList}
        floors={floorList}
        flats={flatList}
        canManageResidents={canManageResidents}
        canVerifyResidents={canManageResidents}
        showToast={showToast}
        initialFlatId={selectedFlatForOnboard}
        initialBuildingId={selectedBuildingForOnboard}
      />

      {/* Modal: Add Building */}
      {showAddBuildingModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Society Tower Building</h3>
              <button className="modal-close-btn" onClick={() => setShowAddBuildingModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateBuilding}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Building Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Tower D (Palash)"
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Building Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. T-D"
                      value={newBuildingCode}
                      onChange={(e) => setNewBuildingCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Floors</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="100"
                      value={newBuildingFloors}
                      onChange={(e) => setNewBuildingFloors(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddBuildingModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !newBuildingName.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Tower'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Building */}
      {showEditBuildingModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Edit Society Tower Building</h3>
              <button className="modal-close-btn" onClick={() => setShowEditBuildingModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateBuilding}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Building Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Tower D (Palash)"
                    value={editBuildingName}
                    onChange={(e) => setEditBuildingName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Building Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. T-D"
                      value={editBuildingCode}
                      onChange={(e) => setEditBuildingCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Floors</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="100"
                      value={editBuildingFloors}
                      onChange={(e) => setEditBuildingFloors(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEditBuildingModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !editBuildingName.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Flat */}
      {showAddFlatModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Register New Unit Flat</h3>
              <button className="modal-close-btn" onClick={() => setShowAddFlatModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateFlat}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Select Tower *</label>
                    <select
                      className="form-select"
                      value={newFlatBuildingId || activeBuilding?.id || buildings[0]?.id}
                      onChange={handleNewFlatBuildingChange}
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Floor</label>
                    <select
                      className="form-select"
                      value={newFlatFloorId}
                      onChange={(e) => setNewFlatFloorId(e.target.value)}
                    >
                      {floors
                        .filter((f) => f.building_id === (newFlatBuildingId || activeBuilding?.id || buildings[0]?.id))
                        .map((fl) => (
                          <option key={fl.id} value={fl.id}>
                            {fl.name || `Floor ${fl.floor_number}`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Identifier Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 505"
                      value={newFlatIdentifier}
                      onChange={(e) => setNewFlatIdentifier(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Flat Type</label>
                    <select
                      className="form-select"
                      value={newFlatType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewFlatType(val);
                        const matched = unitTypes.find(
                          (u) => u.name.toLowerCase() === val.toLowerCase(),
                        );
                        if (matched && matched.maintenanceMultiplier !== undefined) {
                          setNewFlatMultiplier(String(matched.maintenanceMultiplier));
                        }
                      }}
                    >
                      {flatTypeSelectOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Maintenance Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10.0"
                    className="form-control"
                    value={newFlatMultiplier}
                    onChange={(e) => setNewFlatMultiplier(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddFlatModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !newFlatIdentifier.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save Flat Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Flat Type */}
      {showUnitTypeModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Flat Type Configuration</h3>
              <button className="modal-close-btn" onClick={() => setShowUnitTypeModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateUnitType}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Flat Type Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 5 BHK Presidential Suite"
                    value={newUtName}
                    onChange={(e) => setNewUtName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Code Identifier</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 5BHK-PS"
                      value={newUtCode}
                      onChange={(e) => setNewUtCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Super Built-up Area (sq.ft.)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newUtAreaSqFt}
                      onChange={(e) => setNewUtAreaSqFt(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bedrooms</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={newUtBedrooms}
                      onChange={(e) => setNewUtBedrooms(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bathrooms</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={newUtBathrooms}
                      onChange={(e) => setNewUtBathrooms(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Balconies</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="0"
                      value={newUtBalconies}
                      onChange={(e) => setNewUtBalconies(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maintenance Multiplier</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className="form-control"
                      value={newUtMultiplier}
                      onChange={(e) => setNewUtMultiplier(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    className="form-control"
                    placeholder="Additional details about the flat type (e.g. corner unit, sea facing, servant room included)"
                    value={newUtDescription}
                    onChange={(e) => setNewUtDescription(e.target.value)}
                  />
                  <small style={{ color: 'var(--neutral)', fontSize: '0.7rem' }}>
                    {newUtDescription.length}/500 characters
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowUnitTypeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Flat Type */}
      {showEditUnitTypeModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Edit Flat Type Configuration</h3>
              <button className="modal-close-btn" onClick={() => setShowEditUnitTypeModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateUnitType}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Flat Type Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editUtName}
                    onChange={(e) => setEditUtName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Code Identifier</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editUtCode}
                      onChange={(e) => setEditUtCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Super Built-up Area (sq.ft.)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editUtAreaSqFt}
                      onChange={(e) => setEditUtAreaSqFt(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bedrooms</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editUtBedrooms}
                      onChange={(e) => setEditUtBedrooms(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bathrooms</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editUtBathrooms}
                      onChange={(e) => setEditUtBathrooms(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Balconies</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="0"
                      value={editUtBalconies}
                      onChange={(e) => setEditUtBalconies(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maintenance Multiplier</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className="form-control"
                      value={editUtMultiplier}
                      onChange={(e) => setEditUtMultiplier(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    className="form-control"
                    placeholder="Additional details about the flat type"
                    value={editUtDescription}
                    onChange={(e) => setEditUtDescription(e.target.value)}
                  />
                  <small style={{ color: 'var(--neutral)', fontSize: '0.7rem' }}>
                    {editUtDescription.length}/500 characters
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={editUtStatus}
                    onChange={(e) => setEditUtStatus(e.target.value as 'Active' | 'Inactive')}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowEditUnitTypeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Update Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Gate */}
      {showGateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Perimeter Gate Terminal</h3>
              <button className="modal-close-btn" onClick={() => setShowGateModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateGate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gate Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Gate 04 • West Exit"
                      value={newGateName}
                      onChange={(e) => setNewGateName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gate Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. GATE-04"
                      value={newGateCode}
                      onChange={(e) => setNewGateCode(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gate Terminal Type</label>
                    <select
                      className="form-select"
                      value={newGateType}
                      onChange={(e) => {
                        setNewGateType(e.target.value);
                        if (e.target.value !== 'Other') setNewGateCustomType('');
                      }}
                    >
                      <option value="Main Entry / ANPR">Main Entry / ANPR Boom Barrier</option>
                      <option value="Pedestrian Turnstile">Pedestrian Turnstile</option>
                      <option value="Service & Delivery">Service & Delivery Lane</option>
                      <option value="Emergency Exit">Emergency Evacuation Gate</option>
                      <option value="Other">Other (Custom Type)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hardware Status</label>
                    <select
                      className="form-select"
                      value={newGateHardwareStatus}
                      onChange={(e) => setNewGateHardwareStatus(e.target.value as any)}
                    >
                      <option value="Online">Online</option>
                      <option value="Degraded">Degraded</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </div>
                </div>
                {newGateType === 'Other' && (
                  <div className="form-group">
                    <label className="form-label">Specify Custom Terminal Type *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. VIP Gate, Clubhouse Entry, Resident RFID Lane"
                      value={newGateCustomType}
                      onChange={(e) => setNewGateCustomType(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Physical Campus Location</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. West Boundary Logistics Lane"
                    value={newGateLocation}
                    onChange={(e) => setNewGateLocation(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Operating Hours</label>
                  <select
                    className="form-select"
                    value={newGateOperatingHours}
                    onChange={(e) => setNewGateOperatingHours(e.target.value)}
                  >
                    <option value="24x7 Open">24x7 Open</option>
                    <option value="06:00 AM - 10:00 PM">06:00 AM - 10:00 PM</option>
                    <option value="06:00 AM - 11:00 PM">06:00 AM - 11:00 PM</option>
                    <option value="07:00 AM - 07:00 PM">07:00 AM - 07:00 PM</option>
                    <option value="07:00 PM - 07:00 AM">07:00 PM - 07:00 AM</option>
                    <option value="08:00 AM - 08:00 PM">08:00 AM - 08:00 PM</option>
                    <option value="10:00 PM - 06:00 AM">10:00 PM - 06:00 AM</option>
                    <option value="Closed / Emergency Only">Closed / Emergency Only</option>
                  </select>
                </div>
                {renderGuardPicker(newGateGuards, setNewGateGuards)}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowGateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Gate */}
      {showEditGateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Edit Perimeter Gate Terminal</h3>
              <button className="modal-close-btn" onClick={() => setShowEditGateModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateGate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gate Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editGateName}
                      onChange={(e) => setEditGateName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gate Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editGateCode}
                      onChange={(e) => setEditGateCode(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gate Terminal Type</label>
                    <select
                      className="form-select"
                      value={editGateType}
                      onChange={(e) => {
                        setEditGateType(e.target.value);
                        if (e.target.value !== 'Other') setEditGateCustomType('');
                      }}
                    >
                      <option value="Main Entry / ANPR">Main Entry / ANPR Boom Barrier</option>
                      <option value="Pedestrian Turnstile">Pedestrian Turnstile</option>
                      <option value="Service & Delivery">Service & Delivery Lane</option>
                      <option value="Emergency Exit">Emergency Evacuation Gate</option>
                      <option value="Other">Other (Custom Type)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hardware Status</label>
                    <select
                      className="form-select"
                      value={editGateHardwareStatus}
                      onChange={(e) => setEditGateHardwareStatus(e.target.value as any)}
                    >
                      <option value="Online">Online</option>
                      <option value="Degraded">Degraded</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </div>
                </div>
                {editGateType === 'Other' && (
                  <div className="form-group">
                    <label className="form-label">Specify Custom Terminal Type *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. VIP Gate, Clubhouse Entry, Resident RFID Lane"
                      value={editGateCustomType}
                      onChange={(e) => setEditGateCustomType(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Physical Campus Location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editGateLocation}
                    onChange={(e) => setEditGateLocation(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Operating Hours</label>
                  <select
                    className="form-select"
                    value={editGateOperatingHours}
                    onChange={(e) => setEditGateOperatingHours(e.target.value)}
                  >
                    <option value="24x7 Open">24x7 Open</option>
                    <option value="06:00 AM - 10:00 PM">06:00 AM - 10:00 PM</option>
                    <option value="06:00 AM - 11:00 PM">06:00 AM - 11:00 PM</option>
                    <option value="07:00 AM - 07:00 PM">07:00 AM - 07:00 PM</option>
                    <option value="07:00 PM - 07:00 AM">07:00 PM - 07:00 AM</option>
                    <option value="08:00 AM - 08:00 PM">08:00 AM - 08:00 PM</option>
                    <option value="10:00 PM - 06:00 AM">10:00 PM - 06:00 AM</option>
                    <option value="Closed / Emergency Only">Closed / Emergency Only</option>
                    {![
                      '24x7 Open',
                      '06:00 AM - 10:00 PM',
                      '06:00 AM - 11:00 PM',
                      '07:00 AM - 07:00 PM',
                      '07:00 PM - 07:00 AM',
                      '08:00 AM - 08:00 PM',
                      '10:00 PM - 06:00 AM',
                      'Closed / Emergency Only',
                    ].includes(editGateOperatingHours) && (
                      <option value={editGateOperatingHours}>{editGateOperatingHours}</option>
                    )}
                  </select>
                </div>
                {renderGuardPicker(editGateGuards, setEditGateGuards)}
                <div className="form-group">
                  <label className="form-label">Gate Status</label>
                  <select
                    className="form-select"
                    value={editGateStatus}
                    onChange={(e) => setEditGateStatus(e.target.value as 'Active' | 'Inactive')}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowEditGateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Update Gate Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal: Edit Flat */}
      {showEditFlatModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Edit Flat Unit</h3>
              <button className="modal-close-btn" onClick={() => setShowEditFlatModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateFlat}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Select Tower *</label>
                    <select
                      className="form-select"
                      value={editFlatBuildingId}
                      onChange={handleEditFlatBuildingChange}
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Floor</label>
                    <select
                      className="form-select"
                      value={editFlatFloorId}
                      onChange={(e) => setEditFlatFloorId(e.target.value)}
                    >
                      {floors
                        .filter((f) => f.building_id === editFlatBuildingId)
                        .map((fl) => (
                          <option key={fl.id} value={fl.id}>
                            {fl.name || `Floor ${fl.floor_number}`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Identifier Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFlatIdentifier}
                      onChange={(e) => setEditFlatIdentifier(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Flat Type</label>
                    <select
                      className="form-select"
                      value={editFlatType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFlatType(val);
                        const matched = unitTypes.find(
                          (u) => u.name.toLowerCase() === val.toLowerCase(),
                        );
                        if (matched && matched.maintenanceMultiplier !== undefined) {
                          setEditFlatMultiplier(String(matched.maintenanceMultiplier));
                        }
                      }}
                    >
                      {flatTypeSelectOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Maintenance Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10.0"
                    className="form-control"
                    value={editFlatMultiplier}
                    onChange={(e) => setEditFlatMultiplier(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEditFlatModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !editFlatIdentifier.trim()}
                >
                  {isSubmitting ? 'Updating...' : 'Update Flat Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
