'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore, useToastStore } from '../../store';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';
import { getBuildings, BackendBuilding } from '../../lib/api/buildings.api';
import { getFloors, BackendFloor } from '../../lib/api/floors.api';
import { getFlats, BackendFlat } from '../../lib/api/flats.api';
import {
  getResidents, deleteResident, updateResidentAppAccess,
  residentDisplayName, residentLabel, BackendResident,
} from '../../lib/api/residents.api';
import { useAdminLoading } from '../common/AdminLoading';
import { ResidentAvatar } from '../common/ResidentAvatar';
import { OnboardResidentWizard } from './OnboardResidentWizard';

export const AdminResidentsSection: React.FC = () => {
  const { organizationId, backendUser, permissions } = useAuthStore();
  const { showToast } = useToastStore();
  const userId = backendUser?.id;
  const canReadResidents = permissions.includes('resident:read');
  const canManageResidents = permissions.includes('resident:manage');
  const canReadBuildings = permissions.includes('building:read');
  const canReadFloors = permissions.includes('floor:read');
  const canReadFlats = permissions.includes('flat:read');
  const [residents, setResidents] = useState<BackendResident[]>([]);
  const [buildingList, setBuildings] = useState<BackendBuilding[]>([]);
  const [floorList, setFloors] = useState<BackendFloor[]>([]);
  const [flatList, setFlats] = useState<BackendFlat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const actionInFlight = useRef(false);
  const requestId = useRef(0);
  const [showAddResidentModal, setShowAddResidentModal] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<BackendResident | null>(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [residentSort, setResidentSort] = useState<'name' | 'flat' | 'building' | 'kyc' | 'access'>('name');
  const [residentSortDirection, setResidentSortDirection] = useState<'asc' | 'desc'>('asc');
  const [requestedPage, setResidentPage] = useState(1);
  const [residentPageSize, setResidentPageSize] = useState(10);

  useAdminLoading(isLoading, 'Loading residents…');

  const isCurrentScope = useCallback(() => {
    const current = useAuthStore.getState();
    return current.isAuthenticated && current.organizationId === organizationId
      && current.backendUser?.id === userId && current.permissions.includes('resident:read');
  }, [organizationId, userId]);

  const loadData = useCallback(async (blockContent = true) => {
    const request = ++requestId.current;
    if (!organizationId || !canReadResidents) {
      setIsLoading(false);
      return;
    }
    if (blockContent) setIsLoading(true);
    setErrorMessage(null);
    try {
      const [nextResidents, buildings, floors, flats] = await Promise.all([
        getResidents(),
        canReadBuildings ? getBuildings() : Promise.resolve([]),
        canReadFloors ? getFloors() : Promise.resolve([]),
        canReadFlats ? getFlats() : Promise.resolve([]),
      ]);
      if (request !== requestId.current || !isCurrentScope()) return;
      setResidents(nextResidents);
      setBuildings(buildings);
      setFloors(floors);
      setFlats(flats);
    } catch (error) {
      if (request === requestId.current && isCurrentScope()) {
        setErrorMessage(getUserFriendlyErrorMessage(error, 'Failed to load residents.'));
      }
    } finally {
      if (request === requestId.current && isCurrentScope()) setIsLoading(false);
    }
  }, [organizationId, canReadResidents, canReadBuildings, canReadFloors, canReadFlats, isCurrentScope]);

  useEffect(() => {
    void loadData();
    return () => { requestId.current++; };
  }, [loadData]);

  const handleToggleAppAccess = async (resident: BackendResident) => {
    if (!canManageResidents || actionInFlight.current || !isCurrentScope()) return;
    actionInFlight.current = true;
    setPendingAction(resident.id);
    try {
      const updated = await updateResidentAppAccess(resident.id, { app_access_status: !resident.app_access_status });
      if (!isCurrentScope()) return;
      setResidents(current => current.map(item => item.id === resident.id ? { ...item, ...updated } : item));
      showToast(`App access ${updated.app_access_status ? 'enabled' : 'disabled'} for resident.`);
    } catch (error) {
      if (isCurrentScope()) showToast(getUserFriendlyErrorMessage(error, 'Failed to update app access.'));
    } finally {
      actionInFlight.current = false;
      setPendingAction(null);
    }
  };

  const handleDeleteResident = async (resident: BackendResident) => {
    if (!canManageResidents || actionInFlight.current || !isCurrentScope()) return;
    if (!window.confirm(`Are you sure you want to remove resident "${residentDisplayName(resident)}"?`)) return;
    actionInFlight.current = true;
    setPendingAction(resident.id);
    try {
      await deleteResident(resident.id);
      if (!isCurrentScope()) return;
      showToast(`Resident "${residentDisplayName(resident)}" removed.`);
      await loadData(false);
    } catch (error) {
      if (isCurrentScope()) showToast(getUserFriendlyErrorMessage(error, 'Failed to remove resident.'));
    } finally {
      actionInFlight.current = false;
      setPendingAction(null);
    }
  };

  const flatById = useMemo(() => new Map(flatList.map(flat => [flat.id, flat])), [flatList]);
  const buildingById = useMemo(() => new Map(buildingList.map(building => [building.id, building])), [buildingList]);
  const filteredResidents = useMemo(() => {
    const search = residentSearch.trim().toLowerCase();
    const rows = residents.map(resident => {
      const flat = flatById.get(resident.flat_id || '') || resident.flat;
      const building = flat ? buildingById.get(flat.building_id) : undefined;
      return { resident, flat, building };
    }).filter(({ resident, flat, building }) => !search || [residentDisplayName(resident), resident.user?.mobileNumber, flat?.flat_identifier, building?.name]
      .some(value => value?.toLowerCase().includes(search)));
    return rows.sort((left, right) => {
      const value = (row: typeof left) => ({
        name: residentDisplayName(row.resident), flat: row.flat?.flat_identifier || '',
        building: row.building?.name || '', kyc: row.resident.kyc_status || '',
        access: String(row.resident.app_access_status),
      })[residentSort];
      return value(left).localeCompare(value(right)) * (residentSortDirection === 'asc' ? 1 : -1);
    }).map(row => row.resident);
  }, [residents, residentSearch, residentSort, residentSortDirection, flatById, buildingById]);
  const residentPageCount = Math.max(1, Math.ceil(filteredResidents.length / residentPageSize));
  const residentPage = Math.min(requestedPage, residentPageCount);
  const visibleResidents = filteredResidents.slice((residentPage - 1) * residentPageSize, residentPage * residentPageSize);
  useEffect(() => { setResidentPage(page => Math.min(page, residentPageCount)); }, [residentPageCount]);

  if (!organizationId) return <p role="status">Select an organization to manage residents.</p>;
  if (!canReadResidents) return <p role="alert">Access denied. Resident read permission is required.</p>;

  return (
    <section className="admin-section active" id="section-residents">
      {errorMessage ? (
        <div className="card" role="alert">
          <p>{errorMessage}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void loadData()}>Retry</button>
        </div>
      ) : (
        <div className="config-panel active" id="resident-directory">
          <div className="resident-directory-header">
            <div>
              <h2>Registered Residents Directory</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: '4px 0 0' }}>
                Manage resident-flat bindings, KYC status, and mobile application access permissions.
              </p>
            </div>
            {canManageResidents && (
              <button
                className="btn btn-primary btn-sm"
                disabled={pendingAction !== null}
                onClick={() => {
                  setResidentToEdit(null);
                  setShowAddResidentModal(true);
                }}
              >
                + Add Resident
              </button>
            )}
          </div>

          <div className="resident-directory-toolbar">
            <input
              className="form-control"
              value={residentSearch}
              onChange={(e) => { setResidentSearch(e.target.value); setResidentPage(1); }}
              placeholder="Search resident, mobile, flat or building"
              aria-label="Search residents"
            />
            <select className="form-control" aria-label="Sort residents" value={`${residentSort}:${residentSortDirection}`} onChange={(e) => {
              const [sort, direction] = e.target.value.split(':') as [typeof residentSort, typeof residentSortDirection];
              setResidentSort(sort); setResidentSortDirection(direction); setResidentPage(1);
            }}>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
              <option value="flat:asc">Flat ascending</option>
              <option value="flat:desc">Flat descending</option>
              <option value="building:asc">Building ascending</option>
              <option value="kyc:asc">KYC status</option>
              <option value="access:asc">App access</option>
            </select>
          </div>

          {residents.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <p style={{ color: 'var(--neutral)', margin: 0 }}>No residents registered in this organization yet.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="statement-table">
                <thead>
                  <tr>
                    <th>Sl. No.</th>
                    <th>Photo</th>
                    <th>Resident / Phone</th>
                    <th>Assigned Flat</th>
                    <th>Building Tower</th>
                    <th>KYC Status</th>
                    <th>App Access</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResidents.length === 0 && (
                    <tr><td colSpan={8} className="resident-directory-empty">No residents match your search.</td></tr>
                  )}
                  {visibleResidents.map((r, index) => {
                    const assignedFlat = flatById.get(r.flat_id || '') || r.flat;
                    const assignedBuilding = assignedFlat
                      ? buildingById.get(assignedFlat.building_id)
                      : null;

                    return (
                      <tr key={r.id}>
                        <td>{(residentPage - 1) * residentPageSize + index + 1}</td>
                        <td>
                          <ResidentAvatar fileId={r.profile_photo_file_id} name={residentDisplayName(r)} />
                        </td>
                        <td>
                          <strong>{residentDisplayName(r)}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--neutral)' }}>{r.user?.mobileNumber || '—'}</div>
                          {(r.resident_type || r.is_primary) && (
                            <span className="badge badge-pine" style={{ marginTop: '4px' }}>
                              {residentLabel(r)}
                            </span>
                          )}
                        </td>
                        <td>
                          {assignedFlat ? (
                            <span className="badge badge-pine">Flat {assignedFlat.flat_identifier}</span>
                          ) : (
                            <span className="badge badge-neutral">Unassigned</span>
                          )}
                        </td>
                        <td>{assignedBuilding?.name || '—'}</td>
                        <td>
                          <span
                            className={`badge ${
                              r.kyc_status === 'VERIFIED'
                                ? 'badge-success'
                                : r.kyc_status === 'REJECTED'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {r.kyc_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${r.app_access_status ? 'badge-success' : 'badge-neutral'}`}>
                            {r.app_access_status ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <div className="table-action-btns" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {canManageResidents && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-ghost"
                                  style={{ color: 'var(--pine-dark)' }}
                                  disabled={pendingAction !== null}
                                  onClick={() => { setResidentToEdit(r); setShowAddResidentModal(true); }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-ghost"
                                  disabled={pendingAction !== null}
                                  onClick={() => handleToggleAppAccess(r)}
                                >
                                  {r.app_access_status ? 'Disable Access' : 'Enable Access'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-ghost"
                                  style={{ color: '#ef4444' }}
                                  disabled={pendingAction !== null}
                                  onClick={() => handleDeleteResident(r)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredResidents.length > 0 && (
            <div className="resident-directory-pagination">
              <span>Showing {(residentPage - 1) * residentPageSize + 1}–{Math.min(residentPage * residentPageSize, filteredResidents.length)} of {filteredResidents.length}</span>
              <div>
                <select aria-label="Residents per page" value={residentPageSize} onChange={(e) => { setResidentPageSize(Number(e.target.value)); setResidentPage(1); }}>
                  <option value={10}>10 per page</option><option value={20}>20 per page</option><option value={50}>50 per page</option>
                </select>
                <button type="button" className="btn btn-xs btn-ghost" disabled={residentPage === 1} onClick={() => setResidentPage((page) => page - 1)}>Previous</button>
                <span>Page {residentPage} of {residentPageCount}</span>
                <button type="button" className="btn btn-xs btn-ghost" disabled={residentPage >= residentPageCount} onClick={() => setResidentPage((page) => page + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

      )}
      <OnboardResidentWizard
        open={showAddResidentModal}
        residentToEdit={residentToEdit}
        onClose={() => { setShowAddResidentModal(false); setResidentToEdit(null); }}
        onSuccess={() => { setShowAddResidentModal(false); setResidentToEdit(null); void loadData(); }}
        buildings={buildingList}
        floors={floorList}
        flats={flatList}
        canManageResidents={canManageResidents}
        canVerifyResidents={canManageResidents}
        showToast={showToast}
        initialFlatId={residentToEdit?.flat_id}
        initialBuildingId={flatById.get(residentToEdit?.flat_id || '')?.building_id}
      />
    </section>
  );
};
