'use client';

import { useAdminLoading } from '../common/AdminLoading';
import React, { useState, useEffect, useCallback } from 'react';
import { useComplaintStore, useAuthStore, useToastStore } from '../../store';
import {
  ComplaintCategory,
  BackendComplaintPriority,
  BackendComplaint,
} from '../../types';
import {
  getPriorityConfigs,
  createPriorityConfig,
  updatePriorityConfig,
  deletePriorityConfig,
  PriorityConfig,
} from '../../lib/api/complaints.api';
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getAmcContracts,
  createAmcContract,
  updateAmcContract,
  deleteAmcContract,
  BackendVendor,
  BackendAmcContract,
} from '../../lib/api/vendors.api';
import { LoadingAnimation } from '../common/LoadingAnimation';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const QUICK_ASSIGNEES: string[] = [];

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

function formatMinutes(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return '—';
  if (m < 60) return `${m} min`;
  const hrs = m / 60;
  if (hrs < 24) return `${Number.isInteger(hrs) ? hrs : hrs.toFixed(1)} hrs`;
  const days = hrs / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} days`;
}

function titleCase(value?: string | null): string {
  const v = (value ?? '').trim();
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function priorityBadgeClass(code?: string | null): string {
  const c = (code ?? '').toUpperCase();
  if (['HIGH', 'URGENT', 'CRITICAL', 'P1', 'SEV1'].includes(c)) return 'badge-danger';
  if (['MEDIUM', 'P2', 'SEV2'].includes(c)) return 'badge-warning';
  if (['LOW', 'P3', 'P4', 'SEV3'].includes(c)) return 'badge-info';
  return 'badge-neutral';
}

function severityOf(code?: string | null): 'critical' | 'high' | 'medium' | 'low' {
  const c = (code ?? '').toUpperCase();
  if (['URGENT', 'CRITICAL', 'P1', 'SEV1'].includes(c)) return 'critical';
  if (['HIGH', 'P2', 'SEV2'].includes(c)) return 'high';
  if (['LOW', 'P3', 'P4', 'SEV3'].includes(c)) return 'low';
  return 'medium';
}

/** Human-friendly relative timestamp, tolerant of unexpected input. */
function formatWhen(value?: string | null): string {
  if (!value) return 'Recently logged';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDay(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(endDate?: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(end)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today.getTime()) / MS_PER_DAY);
}

function contractProgress(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 100;
  const pct = ((Date.now() - s) / (e - s)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function expiryMeta(endDate?: string | null): { label: string; cls: string } {
  const days = daysUntil(endDate);
  if (days === null) return { label: 'No end date', cls: 'hd-expiry--expired' };
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, cls: 'hd-expiry--expired' };
  if (days === 0) return { label: 'Expires today', cls: 'hd-expiry--urgent' };
  if (days <= 30) return { label: `${days}d left`, cls: 'hd-expiry--urgent' };
  if (days <= 90) return { label: `${days}d left`, cls: 'hd-expiry--soon' };
  return { label: `${days}d left`, cls: 'hd-expiry--ok' };
}

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const AdminComplaintsSection: React.FC = () => {
  const {
    complaints,
    isLoading: isComplaintsLoading,
    loadAdminComplaints,
    hasLoaded,
    assignTicket,
    resolveTicket,
    createAdminComplaint,
  } = useComplaintStore();
  const { organizationId } = useAuthStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'board' | 'sla' | 'vendors'>('board');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveReason, setResolveReason] = useState('Issue rectified and verified by facility manager');

  // New ticket state
  const [ticketCategory, setTicketCategory] = useState<string>('MAINTENANCE');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState<BackendComplaintPriority>('MEDIUM');
  const [ticketFlat, setTicketFlat] = useState('');
  const [ticketAssigned, setTicketAssigned] = useState('');

  // Assignment state (replaces the old window.prompt flow)
  const [assigningTicket, setAssigningTicket] = useState<BackendComplaint | null>(null);
  useAdminLoading(isComplaintsLoading, 'Loading complaints…');
  const [assignName, setAssignName] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Dynamic SLA Priorities State
  const [priorities, setPriorities] = useState<PriorityConfig[]>([]);
  const [isPrioritiesLoading, setIsPrioritiesLoading] = useState(false);
  const [deletingPriorityId, setDeletingPriorityId] = useState<string | null>(null);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [editingPriority, setEditingPriority] = useState<PriorityConfig | null>(null);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [priorityForm, setPriorityForm] = useState({
    priority: 'URGENT',
    name: '',
    description: '',
    order_severity: 1,
    response_deadline_minutes: 60,
    resolution_deadline_minutes: 720,
    escalation_window_minutes: 360,
    escalation_recipient: 'Operations Lead',
    status: 'Active',
  });

  // Dynamic Vendors & Contracts State
  const [vendorsList, setVendorsList] = useState<BackendVendor[]>([]);
  const [contractsList, setContractsList] = useState<BackendAmcContract[]>([]);
  const [isVendorsLoading, setIsVendorsLoading] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<BackendVendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    service_category: 'Lift & Elevator',
    contact_person: '',
    phone: '',
    email: '',
    sla: '2 Hours 24x7',
    status: 'Active',
    notes: '',
  });

  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<BackendAmcContract | null>(null);
  const [viewingContract, setViewingContract] = useState<BackendAmcContract | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState({
    vendor_id: '',
    contract_name: '',
    contract_type: 'Comprehensive',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 100000,
    status: 'Active',
    service_coverage: '',
    renewal_notes: '',
  });

  // Data Loaders
  const loadPrioritiesData = useCallback(async () => {
    if (!organizationId) return;
    setIsPrioritiesLoading(true);
    try {
      const data = await getPriorityConfigs();
      setPriorities(data);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to load priority configurations');
    } finally {
      setIsPrioritiesLoading(false);
    }
  }, [organizationId, showToast]);

  const loadVendorsAndContracts = useCallback(async () => {
    if (!organizationId) return;
    setIsVendorsLoading(true);
    try {
      const [vData, cData] = await Promise.all([getVendors(), getAmcContracts()]);
      setVendorsList(vData);
      setContractsList(cData);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to load AMC and vendors data');
    } finally {
      setIsVendorsLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => {
    if (organizationId) {
      void loadAdminComplaints();
      void loadPrioritiesData();
      void loadVendorsAndContracts();
    }
  }, [organizationId, loadAdminComplaints, loadPrioritiesData, loadVendorsAndContracts]);

  // Ticket Submission
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await createAdminComplaint({
        category: ticketCategory,
        subject: ticketTitle.trim(),
        description: ticketDescription.trim() || 'Logged via Admin Console',
        priority: ticketPriority,
        flat_id: ticketFlat.trim() || undefined,
        assigned_to: ticketAssigned.trim() || undefined,
      });

      showToast(`Ticket '${ticketTitle}' created successfully!`);
      setTicketTitle('');
      setTicketDescription('');
      setTicketFlat('');
      setTicketAssigned('');
      setShowNewModal(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to dispatch ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssign = (ticket: BackendComplaint) => {
    setAssigningTicket(ticket);
    setAssignName(ticket.assigned_to || ticket.assignedStaff || 'Facility Team');
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTicket) return;
    const technician = assignName.trim();
    if (!technician) {
      showToast('Enter a technician or team name to assign.');
      return;
    }
    setIsAssigning(true);
    try {
      await assignTicket(assigningTicket.id, technician);
      showToast(`Ticket assigned to ${technician}`);
      setAssigningTicket(null);
      setAssignName('');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveTicket(id, resolveReason);
      showToast(`Ticket marked as resolved.`);
      setResolvingId(null);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Resolve action failed');
    }
  };

  // Priority Handlers
  const handleSavePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriorityError(null);
    if (!priorityForm.name.trim()) {
      setPriorityError('A display name is required for the priority tier.');
      return;
    }
    if (priorityForm.resolution_deadline_minutes < priorityForm.response_deadline_minutes) {
      setPriorityError('Resolution SLA cannot be shorter than the response SLA.');
      return;
    }
    if (priorityForm.escalation_window_minutes > priorityForm.resolution_deadline_minutes) {
      setPriorityError('Escalation window cannot exceed the resolution SLA.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPriority) {
        await updatePriorityConfig(editingPriority.id, priorityForm);
        showToast(`Priority tier '${priorityForm.name}' updated successfully.`);
      } else {
        await createPriorityConfig(priorityForm);
        showToast(`New priority tier '${priorityForm.name}' created.`);
      }
      setShowPriorityModal(false);
      setEditingPriority(null);
      await loadPrioritiesData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save priority tier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePriority = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete priority configuration '${name}'?`)) return;
    setDeletingPriorityId(id);
    try {
      await deletePriorityConfig(id);
      showToast(`Priority tier '${name}' deleted.`);
      await loadPrioritiesData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete priority tier');
    } finally {
      setDeletingPriorityId(null);
    }
  };

  // Vendor Handlers
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, vendorForm);
        showToast(`Vendor '${vendorForm.name}' updated.`);
      } else {
        await createVendor(vendorForm);
        showToast(`Vendor '${vendorForm.name}' registered.`);
      }
      setShowVendorModal(false);
      setEditingVendor(null);
      await loadVendorsAndContracts();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    if (!confirm(`Delete vendor '${name}' from registry?`)) return;
    try {
      await deleteVendor(id);
      showToast(`Vendor '${name}' deleted.`);
      await loadVendorsAndContracts();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete vendor');
    }
  };

  // AMC Contract Handlers
  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setContractError(null);
    if (!contractForm.vendor_id || !contractForm.contract_name.trim()) {
      setContractError('Select a registered vendor and provide a contract name.');
      return;
    }
    if (new Date(contractForm.end_date) < new Date(contractForm.start_date)) {
      setContractError('Contract end date cannot be earlier than the start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingContract) {
        await updateAmcContract(editingContract.id, contractForm);
        showToast(`AMC Contract '${contractForm.contract_name}' updated.`);
      } else {
        await createAmcContract(contractForm);
        showToast(`AMC Contract '${contractForm.contract_name}' created.`);
      }
      setShowContractModal(false);
      setEditingContract(null);
      await loadVendorsAndContracts();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save AMC contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContract = async (id: string, name: string) => {
    if (!confirm(`Delete AMC contract '${name}'?`)) return;
    try {
      await deleteAmcContract(id);
      showToast(`AMC Contract '${name}' deleted.`);
      await loadVendorsAndContracts();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete AMC contract');
    }
  };

  // Filter complaints for board
  const openList = complaints.filter((c) => c.status === 'OPEN');
  const inProgList = complaints.filter((c) => c.status === 'IN_PROGRESS');
  const resolvedList = complaints.filter((c) => c.status === 'RESOLVED');
  const totalTickets = complaints.length;
  const highPriorityActive = [...openList, ...inProgList].filter(
    (c) => (c.priority || '').toUpperCase() === 'HIGH',
  ).length;
  const resolutionRate = totalTickets
    ? Math.round((resolvedList.length / totalTickets) * 100)
    : 0;

  const priorityLabel = (code?: string | null) => {
    const cfg = priorities.find((p) => p.priority === code);
    return cfg?.name || titleCase(code);
  };

  const renderTicket = (c: BackendComplaint, variant: 'open' | 'progress' | 'resolved') => {
    const priority = (c.priority || '').toUpperCase();
    const chip = c.category ? titleCase(String(c.category)) : 'General';

    if (variant === 'resolved') {
      return (
        <article key={c.id} className="hd-ticket hd-ticket--muted">
          <div className="hd-ticket-top">
            <code className="hd-ticket-id">#{c.id.slice(0, 8)}</code>
            <span className="badge badge-success">Resolved</span>
          </div>
          <h4 className="hd-ticket-title">{c.title}</h4>
          <div className="hd-ticket-meta">
            <span className="hd-chip">Flat {c.flat || c.flat_id || '—'}</span>
            <span className="hd-chip">
              Closed {formatDay(c.resolved_at || c.updated_at || c.created_at)}
            </span>
          </div>
        </article>
      );
    }

    return (
      <article key={c.id} className="hd-ticket" data-priority={priority}>
        <div className="hd-ticket-top">
          <code className="hd-ticket-id">#{c.id.slice(0, 8)}</code>
          <span className={`badge ${priorityBadgeClass(c.priority)}`}>{priorityLabel(c.priority)}</span>
        </div>
        <h4 className="hd-ticket-title">{c.title}</h4>
        <p className="hd-ticket-desc">{c.description}</p>
        <div className="hd-ticket-meta">
          <span className="hd-chip hd-chip--accent">{chip}</span>
          <span className="hd-chip">Flat {c.flat || c.flat_id || '—'}</span>
          {variant === 'progress' ? (
            <span className="hd-chip">Assigned: {c.assigned_to || c.assignedStaff || 'Unassigned'}</span>
          ) : (
            <span className="hd-chip">Raised {formatWhen(c.created_at || c.createdAt || c.raisedAt)}</span>
          )}
        </div>

        {variant === 'progress' ? (
          resolvingId === c.id ? (
            <div className="hd-resolve">
              <input
                type="text"
                className="form-control"
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder="Reason / resolution details"
                aria-label="Resolution details"
              />
              <div className="hd-resolve-actions">
                <button className="btn btn-sm btn-success" onClick={() => handleResolve(c.id)}>
                  Confirm resolution
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setResolvingId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="hd-ticket-actions">
              <button className="btn btn-sm btn-ghost" onClick={() => openAssign(c)}>
                Reassign
              </button>
              <button className="btn btn-sm btn-success" onClick={() => setResolvingId(c.id)}>
                Mark resolved
              </button>
            </div>
          )
        ) : (
          <div className="hd-ticket-actions">
            <button className="btn btn-sm btn-primary" onClick={() => openAssign(c)}>
              Assign technician
            </button>
          </div>
        )}
      </article>
    );
  };

  const renderSkeletonColumn = () => (
    <div className="hd-column-body" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="hd-skeleton hd-skeleton-card">
          <div className="hd-skeleton-block" style={{ height: 12, width: '45%' }} />
          <div className="hd-skeleton-block" style={{ height: 14, width: '85%' }} />
          <div className="hd-skeleton-block" style={{ height: 12, width: '70%' }} />
          <div className="hd-skeleton-block" style={{ height: 28, width: '100%' }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="admin-section active" id="section-complaints">
      <div className="section-header">
        <div>
          <h2>Helpdesk, SLA Escalations &amp; Society AMC</h2>
          <p className="hd-subtitle">
            Track maintenance tickets end to end, tune SLA response and escalation tiers, and govern
            facility AMC vendors and contracts.
          </p>
        </div>
        <div className="section-actions" id="complaints-header-actions">
          {activeTab === 'board' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)}>
              + Raise Maintenance Ticket
            </button>
          )}
          {activeTab === 'sla' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingPriority(null);
                setPriorityError(null);
                setPriorityForm({
                  priority: 'CUSTOM',
                  name: '',
                  description: '',
                  order_severity: priorities.length + 1,
                  response_deadline_minutes: 60,
                  resolution_deadline_minutes: 720,
                  escalation_window_minutes: 360,
                  escalation_recipient: 'Operations Lead',
                  status: 'Active',
                });
                setShowPriorityModal(true);
              }}
            >
              + Add Priority Level
            </button>
          )}
          {activeTab === 'vendors' && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditingVendor(null);
                  setVendorForm({
                    name: '',
                    service_category: 'Lift & Elevator',
                    contact_person: '',
                    phone: '',
                    email: '',
                    sla: '2 Hours 24x7',
                    status: 'Active',
                    notes: '',
                  });
                  setShowVendorModal(true);
                }}
              >
                + Add Vendor
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (vendorsList.length === 0) {
                    showToast('Please register at least one vendor first');
                    return;
                  }
                  setEditingContract(null);
                  setContractError(null);
                  setContractForm({
                    vendor_id: vendorsList[0].id,
                    contract_name: '',
                    contract_type: 'Comprehensive',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    amount: 120000,
                    status: 'Active',
                    service_coverage: '',
                    renewal_notes: '',
                  });
                  setShowContractModal(true);
                }}
              >
                + Add AMC Contract
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total tickets</span>
          <span className="kpi-value">{totalTickets}</span>
          <span className="kpi-sub">All categories &amp; statuses</span>
        </div>
        <div className="kpi-card kpi-saffron">
          <span className="kpi-label">Open / New</span>
          <span className="kpi-value">{openList.length}</span>
          <span className="kpi-sub">Awaiting assignment</span>
        </div>
        <div className="kpi-card kpi-info">
          <span className="kpi-label">In progress</span>
          <span className="kpi-value">{inProgList.length}</span>
          <span className="kpi-sub">Assigned &amp; being worked on</span>
        </div>
        <div className="kpi-card kpi-success">
          <span className="kpi-label">Resolved</span>
          <span className="kpi-value">{resolvedList.length}</span>
          <span className="kpi-sub">{resolutionRate}% resolution rate</span>
        </div>
        <div className="kpi-card kpi-danger">
          <span className="kpi-label">Escalation risk</span>
          <span className="kpi-value">{highPriorityActive}</span>
          <span className="kpi-sub">High priority, still active</span>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="module-subnav">
        <button
          className={`module-tab-btn ${activeTab === 'board' ? 'active' : ''}`}
          onClick={() => setActiveTab('board')}
        >
          Ticket Kanban <span className="hd-tab-count">{complaints.length}</span>
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'sla' ? 'active' : ''}`}
          onClick={() => setActiveTab('sla')}
        >
          Priority &amp; Escalation SLAs <span className="hd-tab-count">{priorities.length}</span>
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'vendors' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendors')}
        >
          AMC Contracts &amp; Vendors{' '}
          <span className="hd-tab-count">{contractsList.length + vendorsList.length}</span>
        </button>
      </div>

      {/* TAB 1: KANBAN BOARD */}
      {activeTab === 'board' && (
        <div className="config-panel active" id="cmptab-board">
          <div className="hd-board">
            {/* Col 1: Open */}
            <section className="hd-column" aria-label="Open tickets">
              <header className="hd-column-head">
                <span className="hd-column-title">
                  <span className="hd-column-dot hd-column-dot--open" />
                  Open / New
                </span>
                <span className="hd-count">{openList.length}</span>
              </header>
              {isComplaintsLoading ? (
                renderSkeletonColumn()
              ) : (
                <div className="hd-column-body">
                  {openList.length === 0 ? (
                    <div className="hd-empty hd-empty--column">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="hd-empty-title">{hasLoaded ? 'Inbox clear' : 'Not loaded yet'}</span>
                      <span className="hd-empty-desc">{hasLoaded ? 'New tickets appear here for assignment.' : ''}</span>
                    </div>
                  ) : (
                    openList.map((c) => renderTicket(c, 'open'))
                  )}
                </div>
              )}
            </section>

            {/* Col 2: In Progress */}
            <section className="hd-column" aria-label="In progress tickets">
              <header className="hd-column-head">
                <span className="hd-column-title">
                  <span className="hd-column-dot hd-column-dot--progress" />
                  In Progress
                </span>
                <span className="hd-count">{inProgList.length}</span>
              </header>
              {isComplaintsLoading ? (
                renderSkeletonColumn()
              ) : (
                <div className="hd-column-body">
                  {inProgList.length === 0 ? (
                    <div className="hd-empty hd-empty--column">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                      <span className="hd-empty-title">Nothing in flight</span>
                      <span className="hd-empty-desc">Assign an open ticket to start work.</span>
                    </div>
                  ) : (
                    inProgList.map((c) => renderTicket(c, 'progress'))
                  )}
                </div>
              )}
            </section>

            {/* Col 3: Resolved */}
            <section className="hd-column" aria-label="Resolved tickets">
              <header className="hd-column-head">
                <span className="hd-column-title">
                  <span className="hd-column-dot hd-column-dot--resolved" />
                  Resolved
                </span>
                <span className="hd-count">{resolvedList.length}</span>
              </header>
              {isComplaintsLoading ? (
                renderSkeletonColumn()
              ) : (
                <div className="hd-column-body">
                  {resolvedList.length === 0 ? (
                    <div className="hd-empty hd-empty--column">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="hd-empty-title">No closures yet</span>
                      <span className="hd-empty-desc">Resolved tickets are archived here.</span>
                    </div>
                  ) : (
                    resolvedList.map((c) => renderTicket(c, 'resolved'))
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: SLA RULES */}
      {activeTab === 'sla' && (
        <div className="config-panel active" id="cmptab-sla">
          <div className="hd-panel-head">
            <div>
              <h3>Priority levels &amp; escalation deadlines</h3>
              <p>
                Response and resolution SLAs with the automated escalation window for each priority
                tier. Tune these to match the society&apos;s committee escalation path.
              </p>
            </div>
          </div>

          {isPrioritiesLoading ? (
            <LoadingAnimation message="Loading priority levels & escalation deadlines…" size={140} />
          ) : priorities.length === 0 ? (
            <div className="hd-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
              </svg>
              <span className="hd-empty-title">No SLA tiers configured</span>
              <span className="hd-empty-desc">
                Add a priority level to define response, resolution, and escalation targets.
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingPriority(null);
                  setPriorityError(null);
                  setPriorityForm({
                    priority: 'CUSTOM',
                    name: '',
                    description: '',
                    order_severity: 1,
                    response_deadline_minutes: 60,
                    resolution_deadline_minutes: 720,
                    escalation_window_minutes: 360,
                    escalation_recipient: 'Operations Lead',
                    status: 'Active',
                  });
                  setShowPriorityModal(true);
                }}
              >
                + Add Priority Level
              </button>
            </div>
          ) : (
            <div className="hd-sla-grid">
              {priorities.map((s) => {
                const responsePct = Math.max(
                  4,
                  Math.min(100, Math.round((s.response_deadline_minutes / Math.max(s.resolution_deadline_minutes, 1)) * 100)),
                );
                const escalationPct = Math.max(
                  2,
                  Math.min(98, Math.round((s.escalation_window_minutes / Math.max(s.resolution_deadline_minutes, 1)) * 100)),
                );
                return (
                  <article key={s.id} className="hd-sla-card" data-sev={severityOf(s.priority)}>
                    <header className="hd-sla-head">
                      <div className="hd-sla-title">
                        <span className="hd-sla-sev" />
                        <div>
                          <h4>{s.name}</h4>
                          <span className="hd-sla-code">{s.priority}</span>
                        </div>
                      </div>
                      <span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                        {s.status}
                      </span>
                    </header>

                    {s.description && <p className="hd-sla-desc">{s.description}</p>}

                    <div className="hd-sla-metrics">
                      <div className="hd-metric">
                        <span className="hd-metric-label">Response</span>
                        <span className="hd-metric-value">{formatMinutes(s.response_deadline_minutes)}</span>
                      </div>
                      <div className="hd-metric">
                        <span className="hd-metric-label">Resolution</span>
                        <span className="hd-metric-value">{formatMinutes(s.resolution_deadline_minutes)}</span>
                      </div>
                      <div className="hd-metric">
                        <span className="hd-metric-label">Escalation</span>
                        <span className="hd-metric-value">{formatMinutes(s.escalation_window_minutes)}</span>
                      </div>
                    </div>

                    <div className="hd-sla-ratio">
                      <div className="hd-ratio-track">
                        <div className="hd-ratio-response" style={{ width: `${responsePct}%` }} />
                        <div className="hd-ratio-escalation" style={{ left: `${escalationPct}%` }} />
                      </div>
                      <div className="hd-ratio-legend">
                        <span>Respond by {formatMinutes(s.response_deadline_minutes)}</span>
                        <span>Resolve by {formatMinutes(s.resolution_deadline_minutes)}</span>
                      </div>
                    </div>

                    <footer className="hd-sla-foot">
                      <span className="hd-sla-recipient">
                        Escalates to <strong>{s.escalation_recipient}</strong>
                      </span>
                      <div className="hd-row-actions">
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            setEditingPriority(s);
                            setPriorityError(null);
                            setPriorityForm({
                              priority: s.priority,
                              name: s.name,
                              description: s.description || '',
                              order_severity: s.order_severity,
                              response_deadline_minutes: s.response_deadline_minutes,
                              resolution_deadline_minutes: s.resolution_deadline_minutes,
                              escalation_window_minutes: s.escalation_window_minutes,
                              escalation_recipient: s.escalation_recipient,
                              status: s.status,
                            });
                            setShowPriorityModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          style={{ color: 'var(--danger, #dc2626)' }}
                          onClick={() => handleDeletePriority(s.id, s.name)}
                          disabled={deletingPriorityId === s.id}
                        >
                          {deletingPriorityId === s.id ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span
                                style={{
                                  width: '10px',
                                  height: '10px',
                                  border: '2px solid currentColor',
                                  borderRightColor: 'transparent',
                                  borderRadius: '50%',
                                  display: 'inline-block',
                                  animation: 'spin 0.75s linear infinite',
                                }}
                              />
                              Deleting…
                            </span>
                          ) : (
                            'Delete'
                          )}
                        </button>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AMC CONTRACTS & VENDORS */}
      {activeTab === 'vendors' && (
        <div className="config-panel active" id="cmptab-vendors">
          {/* Subsection 1: AMC Contracts */}
          <div className="hd-subsection">
            <div className="hd-panel-head">
              <div>
                <h3>Active society AMC contracts</h3>
                <p>
                  Legally binding maintenance service contracts with validity windows, coverage scope,
                  and contract value.
                </p>
              </div>
            </div>

            {isVendorsLoading ? (
              <LoadingAnimation message="Loading AMC contracts & vendors…" size={140} />
            ) : contractsList.length === 0 ? (
              <div className="hd-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeLinejoin="round" />
                  <path d="M14 2v6h6M9 13h6M9 17h4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="hd-empty-title">No AMC contracts on record</span>
                <span className="hd-empty-desc">
                  Register a maintenance contract to track vendor SLAs, coverage, and renewal dates.
                </span>
              </div>
            ) : (
              <div className="hd-amc-grid">
                {contractsList.map((c) => {
                  const expiry = expiryMeta(c.end_date);
                  const progress = contractProgress(c.start_date, c.end_date);
                  return (
                    <article key={c.id} className="hd-amc-card">
                      <header className="hd-amc-head">
                        <span className="badge badge-pine">{c.contract_type}</span>
                        <span className={`hd-expiry ${expiry.cls}`}>{expiry.label}</span>
                      </header>
                      <div className="hd-amc-body">
                        <div>
                          <h4 className="hd-amc-title">{c.contract_name}</h4>
                          <span className="hd-amc-vendor">
                            {c.vendor?.name || 'Assigned contractor'}
                          </span>
                        </div>
                        <div className="hd-amc-value">
                          ₹{Number(c.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${
                                expiry.cls === 'hd-expiry--urgent' || expiry.cls === 'hd-expiry--expired'
                                  ? 'danger'
                                  : expiry.cls === 'hd-expiry--soon'
                                    ? 'warn'
                                    : 'success'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="hd-amc-dates">
                            <span>{formatDay(c.start_date)}</span>
                            <span>{formatDay(c.end_date)}</span>
                          </div>
                        </div>
                        {c.service_coverage && (
                          <p className="hd-amc-coverage">{c.service_coverage}</p>
                        )}
                      </div>
                      <footer className="hd-amc-foot">
                        <button className="btn btn-xs btn-ghost" onClick={() => setViewingContract(c)}>
                          View terms
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            setEditingContract(c);
                            setContractError(null);
                            setContractForm({
                              vendor_id: c.vendor_id,
                              contract_name: c.contract_name,
                              contract_type: c.contract_type,
                              start_date: c.start_date,
                              end_date: c.end_date,
                              amount: Number(c.amount || 0),
                              status: c.status,
                              service_coverage: c.service_coverage || '',
                              renewal_notes: c.renewal_notes || '',
                            });
                            setShowContractModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          style={{ color: 'var(--danger, #dc2626)' }}
                          onClick={() => handleDeleteContract(c.id, c.contract_name)}
                        >
                          Delete
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subsection 2: Maintenance Vendors */}
          <div>
            <div className="hd-panel-head">
              <div>
                <h3>Approved vendor &amp; contractor directory</h3>
                <p>
                  Certified service contractors for lift, generator, electrical, plumbing, and security
                  operations.
                </p>
              </div>
            </div>

            {isVendorsLoading ? (
              <div className="hd-vendor-grid">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="hd-skeleton hd-skeleton-card" style={{ height: 200 }}>
                    <div className="hd-skeleton-block" style={{ height: 42, width: '42px' }} />
                    <div className="hd-skeleton-block" style={{ height: 14, width: '70%' }} />
                    <div className="hd-skeleton-block" style={{ height: 40, width: '100%' }} />
                  </div>
                ))}
              </div>
            ) : vendorsList.length === 0 ? (
              <div className="hd-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="hd-empty-title">No vendors registered</span>
                <span className="hd-empty-desc">
                  Add your AMC vendors to attach contracts and route escalations.
                </span>
              </div>
            ) : (
              <div className="hd-vendor-grid">
                {vendorsList.map((v) => (
                  <article key={v.id} className="hd-vendor-card">
                    <header className="hd-vendor-head">
                      <span className="hd-vendor-avatar">{initials(v.name)}</span>
                      <div className="hd-vendor-headtext">
                        <h4 className="hd-vendor-name">{v.name}</h4>
                        <span className="badge badge-pine hd-vendor-cat">
                          {v.service_category}
                        </span>
                      </div>
                    </header>

                    <dl className="hd-vendor-meta">
                      <div>
                        <dt>Contact</dt>
                        <dd>{v.contact_person || '—'}</dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{v.phone || '—'}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>{v.email || '—'}</dd>
                      </div>
                      <div>
                        <dt>SLA</dt>
                        <dd>{v.sla || '—'}</dd>
                      </div>
                    </dl>

                    {v.notes && <p className="hd-vendor-notes">{v.notes}</p>}

                    <footer className="hd-vendor-foot">
                      <span
                        className={`badge hd-vendor-status ${v.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}
                      >
                        {v.status}
                      </span>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => {
                          setEditingVendor(v);
                          setVendorForm({
                            name: v.name,
                            service_category: v.service_category,
                            contact_person: v.contact_person,
                            phone: v.phone,
                            email: v.email || '',
                            sla: v.sla,
                            status: v.status,
                            notes: v.notes || '',
                          });
                          setShowVendorModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-xs btn-ghost"
                        style={{ color: 'var(--danger, #dc2626)' }}
                        onClick={() => handleDeleteVendor(v.id, v.name)}
                      >
                        Delete
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 0: Assign Technician */}
      {assigningTicket && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Assign technician</h3>
              <button className="modal-close-btn" onClick={() => setAssigningTicket(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body">
                <div className="hd-note hd-note--info">
                  <div>
                    <strong>#{assigningTicket.id.slice(0, 8)}</strong> · {assigningTicket.title}
                    <div className="hd-note-sub">
                      {titleCase(String(assigningTicket.category))} · Flat{' '}
                      {assigningTicket.flat || assigningTicket.flat_id || '—'} ·{' '}
                      {priorityLabel(assigningTicket.priority)}
                    </div>
                  </div>
                </div>

                <div className="form-group form-group--flush">
                  <label className="form-label">Technician or team</label>
                  <input
                    type="text"
                    className="form-control"
                    value={assignName}
                    onChange={(e) => setAssignName(e.target.value)}
                    placeholder="e.g. AquaFlow Plumbing AMC"
                    autoFocus
                    required
                  />
                  <span className="hd-field-hint">The ticket moves to In Progress once assigned.</span>
                </div>

                <div>
                  <span className="form-label">
                    Quick pick
                  </span>
                  <div className="hd-signoff">
                    {QUICK_ASSIGNEES.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={assignName === name ? 'active' : ''}
                        onClick={() => setAssignName(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAssigningTicket(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isAssigning}>
                  {isAssigning ? 'Assigning…' : 'Assign technician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: New Maintenance Ticket */}
      {showNewModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Raise helpdesk maintenance ticket</h3>
              <button className="modal-close-btn" onClick={() => setShowNewModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                    >
                      {Object.values(ComplaintCategory).map((cat) => (
                        <option key={cat} value={cat}>
                          {titleCase(cat)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                    >
                      {priorities.map((p) => (
                        <option key={p.id} value={p.priority}>
                          {p.name} ({formatMinutes(p.response_deadline_minutes)} SLA)
                        </option>
                      ))}
                      {priorities.length === 0 && (
                        <>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit / Flat</label>
                    <input
                      type="text"
                      className="form-control"
                      value={ticketFlat}
                      onChange={(e) => setTicketFlat(e.target.value)}
                      placeholder="e.g. A-101"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject / issue title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={ticketTitle}
                      onChange={(e) => setTicketTitle(e.target.value)}
                      placeholder="e.g. Main pipeline pressure drop"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Details / notes</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide diagnostic info or exact location…"
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Dispatching…' : 'Dispatch ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add/Edit Priority SLA */}
      {showPriorityModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{editingPriority ? 'Edit priority SLA tier' : 'Add priority SLA tier'}</h3>
              <button className="modal-close-btn" onClick={() => setShowPriorityModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePriority}>
              <div className="modal-body">
                <div className="hd-note hd-note--info">
                  Escalation window must sit inside the resolution SLA, which must be at least as long
                  as the response SLA.
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={priorityForm.priority}
                      onChange={(e) => setPriorityForm({ ...priorityForm, priority: e.target.value.toUpperCase() })}
                      placeholder="e.g. URGENT, HIGH, P1"
                      required
                      disabled={!!editingPriority}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Display name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={priorityForm.name}
                      onChange={(e) => setPriorityForm({ ...priorityForm, name: e.target.value })}
                      placeholder="e.g. Urgent (P1)"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Response SLA (minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={priorityForm.response_deadline_minutes}
                      onChange={(e) =>
                        setPriorityForm({ ...priorityForm, response_deadline_minutes: parseInt(e.target.value, 10) || 15 })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resolution SLA (minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={priorityForm.resolution_deadline_minutes}
                      onChange={(e) =>
                        setPriorityForm({ ...priorityForm, resolution_deadline_minutes: parseInt(e.target.value, 10) || 60 })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Auto-escalation window (minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={priorityForm.escalation_window_minutes}
                      onChange={(e) =>
                        setPriorityForm({ ...priorityForm, escalation_window_minutes: parseInt(e.target.value, 10) || 30 })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Escalation recipient</label>
                    <input
                      type="text"
                      className="form-control"
                      value={priorityForm.escalation_recipient}
                      onChange={(e) => setPriorityForm({ ...priorityForm, escalation_recipient: e.target.value })}
                      placeholder="e.g. Operations Lead"
                      required
                    />
                  </div>
                </div>

                <div className="form-group form-group--flush">
                  <label className="form-label">Description / scope</label>
                  <input
                    type="text"
                    className="form-control"
                    value={priorityForm.description}
                    onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                    placeholder="e.g. Emergency safety and major infrastructure issues"
                  />
                </div>

                {priorityError && (
                  <p className="form-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                    </svg>
                    {priorityError}
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPriorityModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save priority SLA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add/Edit AMC Vendor */}
      {showVendorModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{editingVendor ? 'Edit AMC vendor' : 'Register new AMC vendor'}</h3>
              <button className="modal-close-btn" onClick={() => setShowVendorModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveVendor}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Vendor company name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    placeholder="e.g. Voltas AC Maintenance"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Service category</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorForm.service_category}
                      onChange={(e) => setVendorForm({ ...vendorForm, service_category: e.target.value })}
                      placeholder="e.g. HVAC, Lift, Plumbing"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary contact person</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorForm.contact_person}
                      onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                      placeholder="e.g. Rakesh Sharma"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      placeholder="+91 98200 11223"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email (optional)</label>
                    <input
                      type="email"
                      className="form-control"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      placeholder="support@vendor.com"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SLA commitment</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vendorForm.sla}
                      onChange={(e) => setVendorForm({ ...vendorForm, sla: e.target.value })}
                      placeholder="e.g. 2 Hours 24x7"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={vendorForm.status}
                      onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes / service terms</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={vendorForm.notes}
                    onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                    placeholder="Contractual response details, escalation hierarchy…"
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowVendorModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add/Edit AMC Contract */}
      {showContractModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{editingContract ? 'Edit AMC contract' : 'Create society AMC contract'}</h3>
              <button className="modal-close-btn" onClick={() => setShowContractModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveContract}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select registered vendor</label>
                  <select
                    className="form-select"
                    value={contractForm.vendor_id}
                    onChange={(e) => setContractForm({ ...contractForm, vendor_id: e.target.value })}
                    required
                  >
                    {vendorsList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.service_category})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contract title / name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={contractForm.contract_name}
                    onChange={(e) => setContractForm({ ...contractForm, contract_name: e.target.value })}
                    placeholder="e.g. Annual Lift Comprehensive Maintenance"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contract type</label>
                    <select
                      className="form-select"
                      value={contractForm.contract_type}
                      onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}
                    >
                      <option value="Comprehensive">Comprehensive</option>
                      <option value="Non-Comprehensive">Non-Comprehensive</option>
                      <option value="Labour Only">Labour Only</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contract amount (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={contractForm.amount}
                      onChange={(e) => setContractForm({ ...contractForm, amount: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={contractForm.start_date}
                      onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={contractForm.end_date}
                      onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Service coverage scope</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={contractForm.service_coverage}
                    onChange={(e) => setContractForm({ ...contractForm, service_coverage: e.target.value })}
                    placeholder="e.g. Covers all elevators across Towers A & B. 24x7 breakdown response."
                  ></textarea>
                </div>
                <div className="form-group form-group--flush">
                  <label className="form-label">Renewal notes</label>
                  <input
                    type="text"
                    className="form-control"
                    value={contractForm.renewal_notes}
                    onChange={(e) => setContractForm({ ...contractForm, renewal_notes: e.target.value })}
                    placeholder="e.g. Renewal proposal due 60 days before expiry"
                  />
                </div>

                {contractError && (
                  <p className="form-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                    </svg>
                    {contractError}
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowContractModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: View Contract Terms */}
      {viewingContract && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>AMC contract terms &amp; coverage</h3>
              <button className="modal-close-btn" onClick={() => setViewingContract(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div>
                <span className="hd-term-label">Contract title</span>
                <h4 className="hd-term-heading">{viewingContract.contract_name}</h4>
              </div>
              <div className="hd-terms-grid">
                <div>
                  <span className="hd-term-label">Vendor</span>
                  <span className="hd-term-value">{viewingContract.vendor?.name || 'Contractor'}</span>
                </div>
                <div>
                  <span className="hd-term-label">Type</span>
                  <span className="hd-term-value">{viewingContract.contract_type}</span>
                </div>
                <div>
                  <span className="hd-term-label">Validity</span>
                  <span className="hd-term-value">
                    {formatDay(viewingContract.start_date)} – {formatDay(viewingContract.end_date)}
                  </span>
                </div>
                <div>
                  <span className="hd-term-label">Contract value</span>
                  <span className="hd-term-value hd-term-value--accent">
                    ₹{Number(viewingContract.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="hd-term-label">Expiry</span>
                  <span className="hd-term-value">
                    <span className={`hd-expiry ${expiryMeta(viewingContract.end_date).cls}`}>
                      {expiryMeta(viewingContract.end_date).label}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="hd-term-label">Status</span>
                  <span className={`badge ${viewingContract.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                    {viewingContract.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="hd-term-label">Service coverage</span>
                <p className="hd-term-body">
                  {viewingContract.service_coverage ||
                    'Standard manufacturer warranty and quarterly maintenance.'}
                </p>
              </div>
              <div>
                <span className="hd-term-label">Renewal terms</span>
                <p className="hd-term-body">
                  {viewingContract.renewal_notes || 'Notice period 30 days.'}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setViewingContract(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
