'use client';

import { useAdminLoading } from '../common/AdminLoading';
import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useReportStore, ReportTab } from '../../store/useReportStore';
import { useAuthStore, useToastStore } from '../../store';
import { hasPermission } from '../../lib/auth/rbac';
import {
  exportResidents,
  exportVisitors,
  exportMaintenanceDues,
  exportPayments,
  exportComplaints,
  exportNotices,
  exportPolls,
  ExportDownloadResult,
} from '../../lib/api/exports.api';
import { Pagination } from '../common/Pagination';
import { IconDownload } from '../common/Icons';

export const AdminReportsSection: React.FC = () => {
  const { organizationId } = useAuthStore();
  const { showToast } = useToastStore();
  const {
    activeTab,
    isLoading,
    error,
    page,
    filters,
    occupancyData,
    residentsData,
    visitorsData,
    maintenanceDuesData,
    paymentsData,
    complaintsData,
    noticesData,
    pollsData,
    setActiveTab,
    setFilter,
    setPage,
    clearFilters,
    fetchCurrentReport,
  } = useReportStore();

  useAdminLoading(isLoading, 'Loading report…');

  const [isExporting, setIsExporting] = useState(false);

  const canReadReports = hasPermission('report:read');
  const canExportReports = hasPermission('report:export');

  useEffect(() => {
    if (canReadReports && organizationId) {
      fetchCurrentReport();
    }
  }, [canReadReports, organizationId, fetchCurrentReport]);

  if (!organizationId) {
    return (
      <div className="admin-section active" style={{ padding: '32px' }}>
        <div className="empty-state">
          <h3>Organization Context Required</h3>
          <p>Please select an organization from the top bar to view reports.</p>
        </div>
      </div>
    );
  }

  if (!canReadReports) {
    return (
      <div className="admin-section active" style={{ padding: '32px' }}>
        <div className="empty-state">
          <h3>Access Denied</h3>
          <p>You do not have permission (report:read) to view society reports.</p>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    if (isExporting || isLoading || error) return;
    if (!canExportReports) {
      showToast('You do not have permission (report:export) to export data.');
      return;
    }

    setIsExporting(true);
    try {
      let result: ExportDownloadResult | null = null;
      switch (activeTab) {
        case 'residents':
          result = await exportResidents(filters);
          break;
        case 'visitors':
          result = await exportVisitors(filters);
          break;
        case 'maintenance-dues':
          result = await exportMaintenanceDues(filters);
          break;
        case 'payments':
          result = await exportPayments(filters);
          break;
        case 'complaints':
          result = await exportComplaints(filters);
          break;
        case 'notices':
          result = await exportNotices(filters);
          break;
        case 'polls':
          result = await exportPolls(filters);
          break;
        default:
          showToast('Exports are not available for this report type.');
          setIsExporting(false);
          return;
      }

      if (result) {
        if (result.truncated) {
          showToast(`Exported ${result.rowCount} rows (Warning: Capped at server limit).`);
        } else {
          showToast(`Exported ${result.rowCount} records to ${result.filename}.`);
        }
      }
    } catch (err: any) {
      const msg = err?.backendMessage || err?.message || 'Export failed';
      showToast(`Export failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs: { key: ReportTab; label: string; exportable: boolean }[] = [
    { key: 'occupancy', label: 'Occupancy', exportable: false },
    { key: 'residents', label: 'Residents', exportable: true },
    { key: 'visitors', label: 'Visitors', exportable: true },
    { key: 'maintenance-dues', label: 'Maintenance Dues', exportable: true },
    { key: 'payments', label: 'Payments', exportable: true },
    { key: 'complaints', label: 'Complaints', exportable: true },
    { key: 'notices', label: 'Notices', exportable: true },
    { key: 'polls', label: 'Polls', exportable: true },
  ];

  const currentTabConfig = tabs.find((t) => t.key === activeTab);

  return (
    <div className="admin-section active" id="section-reports">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Reports & Analytics</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Society occupancy, activity and financial records. Filter reports or download CSV files.
          </p>
        </div>
        <div className="section-actions">
          <button type="button" className="btn btn-ghost btn-sm" disabled={isLoading} onClick={() => void fetchCurrentReport()}>Refresh</button>
          {currentTabConfig?.exportable && canExportReports && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={isExporting || isLoading || Boolean(error)}
              onClick={handleExport}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconDownload size={14} />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="module-subnav" style={{ marginBottom: '16px' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={clsx('module-tab-btn', activeTab === t.key && 'active')}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
            Failed to load report
          </div>
          <div style={{ color: '#991b1b', fontSize: '0.8125rem', marginBottom: '12px' }}>{error}</div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => fetchCurrentReport()}>
            Retry
          </button>
        </div>
      )}

      {/* Filters Bar */}
      {activeTab !== 'occupancy' && (
        <div
          className="admin-filter-bar"
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '16px',
            padding: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral)' }}>FILTERS:</span>

          {activeTab === 'residents' && (
            <>
              <select
                className="form-select"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                value={filters.kyc_status ?? 'ALL'}
                onChange={(e) => setFilter('kyc_status', e.target.value)}
              >
                <option value="ALL">All KYC Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <select
                className="form-select"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                value={filters.active ?? 'ALL'}
                onChange={(e) => setFilter('active', e.target.value)}
              >
                <option value="ALL">All Resident Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </>
          )}

          {activeTab === 'visitors' && (
            <select
              className="form-select"
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              value={filters.visit_status ?? 'ALL'}
              onChange={(e) => setFilter('visit_status', e.target.value)}
            >
              <option value="ALL">All Visit Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          )}

          {activeTab === 'maintenance-dues' && (
            <select
              className="form-select"
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              value={filters.status ?? 'ALL'}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="ALL">All Due Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="PAID">PAID</option>
            </select>
          )}

          {activeTab === 'payments' && (
            <>
              <select
                className="form-select"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                value={filters.payment_status ?? 'ALL'}
                onChange={(e) => setFilter('payment_status', e.target.value)}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
              <select
                className="form-select"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                value={filters.payment_method ?? 'ALL'}
                onChange={(e) => setFilter('payment_method', e.target.value)}
              >
                <option value="ALL">All Payment Methods</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="NET_BANKING">NET_BANKING</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="CARD">CARD</option>
              </select>
            </>
          )}

          {activeTab === 'complaints' && (
            <>
              <select
                className="form-select"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                value={filters.status ?? 'ALL'}
                onChange={(e) => setFilter('status', e.target.value)}
              >
                <option value="ALL">All Ticket Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <select
                className="form-select"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                value={filters.priority ?? 'ALL'}
                onChange={(e) => setFilter('priority', e.target.value)}
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </>
          )}

          {activeTab === 'notices' && (
            <select
              className="form-select"
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              value={filters.status ?? 'ALL'}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="ALL">All Notice Statuses</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          )}

          {activeTab === 'polls' && (
            <select
              className="form-select"
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              value={filters.status ?? 'ALL'}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="ALL">All Poll Statuses</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          )}

          {/* Date range inputs */}
          {activeTab !== 'residents' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                className="form-control"
                style={{ fontSize: '0.75rem', padding: '3px 6px', width: '130px' }}
                value={filters.from ?? ''}
                onChange={(e) => setFilter('from', e.target.value)}
                aria-label="Report from date"
                max={filters.to || undefined}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ fontSize: '0.75rem', padding: '3px 6px', width: '130px' }}
                value={filters.to ?? ''}
                onChange={(e) => setFilter('to', e.target.value)}
                aria-label="Report to date"
                min={filters.from || undefined}
              />
            </div>
          )}

          {Object.keys(filters).length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={clearFilters}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Content Body */}
      {isLoading ? (
<div role="status" className="card report-loading">Loading report records…</div>
      ) : (
        <>
          {/* 1. OCCUPANCY REPORT */}
          {activeTab === 'occupancy' && occupancyData && (
            <div>
              <div className="kpi-grid" style={{ marginBottom: '20px' }}>
                <div className="kpi-card">
                  <div className="kpi-data">
                    <span className="kpi-label">Total Buildings</span>
                    <h3 className="kpi-value">{occupancyData.totals.buildings}</h3>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-data">
                    <span className="kpi-label">Total Flats</span>
                    <h3 className="kpi-value">{occupancyData.totals.total_flats}</h3>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-data">
                    <span className="kpi-label">Occupied Units</span>
                    <h3 className="kpi-value">{occupancyData.totals.occupied_flats}</h3>
                    <span className="kpi-subtext" style={{ color: 'var(--pine)' }}>
                      {occupancyData.totals.occupancy_percentage}% Occupancy Rate
                    </span>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-data">
                    <span className="kpi-label">Vacant Units</span>
                    <h3 className="kpi-value">{occupancyData.totals.vacant_flats}</h3>
                  </div>
                </div>
              </div>

              <div className="card table-responsive" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Building Name</th>
                      <th>Code</th>
                      <th>Floors</th>
                      <th>Total Flats</th>
                      <th>Occupied</th>
                      <th>Vacant</th>
                      <th>Occupancy %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancyData.buildings.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--neutral)' }}>
                          No building records found for this society.
                        </td>
                      </tr>
                    ) : (
                      occupancyData.buildings.map((b) => (
                        <tr key={b.id}>
                          <td><strong>{b.name}</strong></td>
                          <td>{b.code || '—'}</td>
                          <td>{b.floors}</td>
                          <td>{b.total_flats}</td>
                          <td>{b.occupied_flats}</td>
                          <td>{b.vacant_flats}</td>
                          <td>
                            <progress max={100} value={b.occupancy_percentage} aria-label={`${b.name} occupancy`} style={{ width: 80, accentColor: 'var(--pine)', marginRight: 8 }} />
                            <span className="badge badge-pine">{b.occupancy_percentage}%</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. RESIDENTS REPORT */}
          {activeTab === 'residents' && residentsData && (
            <PaginatedReportView
              title="Residents Report"
              data={residentsData}
              page={page}
              onPageChange={setPage}
              headers={['Resident ID', 'Building', 'Floor', 'Flat', 'KYC Status', 'App Access', 'Active']}
              renderRow={(r) => (
                <tr key={r.resident_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.resident_id.slice(0, 8)}...</td>
                  <td>{r.building?.name || '—'}</td>
                  <td>{r.floor?.floor_number != null ? `Floor ${r.floor?.floor_number}` : '—'}</td>
                  <td>{r.flat?.flat_identifier ? `Flat ${r.flat.flat_identifier}` : '—'}</td>
                  <td>
                    <span className={clsx('badge', r.kyc_status === 'VERIFIED' ? 'badge-success' : 'badge-neutral')}>
                      {r.kyc_status}
                    </span>
                  </td>
                  <td>{r.app_access_status ? 'Yes' : 'No'}</td>
                  <td>{r.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
              )}
            />
          )}

          {/* 3. VISITORS REPORT */}
          {activeTab === 'visitors' && visitorsData && (
            <PaginatedReportView
              title="Visitors Report"
              data={visitorsData}
              page={page}
              onPageChange={setPage}
              headers={['Visit ID', 'Visitor Name', 'Mobile', 'Purpose', 'Status', 'Approval', 'Pass', 'Entry Time']}
              renderRow={(v) => (
                <tr key={v.visit_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{v.visit_id.slice(0, 8)}...</td>
                  <td><strong>{v.visitor.name}</strong></td>
                  <td>{v.visitor.mobile}</td>
                  <td>{v.visit_purpose || '—'}</td>
                  <td><span className="badge badge-neutral">{v.visit_status}</span></td>
                  <td>{v.approval_status || '—'}</td>
                  <td>{v.pass_status || '—'}</td>
                  <td style={{ fontSize: '0.75rem' }}>{v.actual_entry_time ? new Date(v.actual_entry_time).toLocaleString() : '—'}</td>
                </tr>
              )}
            />
          )}

          {/* 4. MAINTENANCE DUES REPORT */}
          {activeTab === 'maintenance-dues' && maintenanceDuesData && (
            <PaginatedReportView
              title="Maintenance Dues Report"
              data={maintenanceDuesData}
              page={page}
              onPageChange={setPage}
              headers={['Due ID', 'Building', 'Flat', 'Billing Period', 'Amount', 'Late Charge', 'Status', 'Due Date']}
              renderRow={(d) => (
                <tr key={d.due_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{d.due_id.slice(0, 8)}...</td>
                  <td>{d.building?.name || '—'}</td>
                  <td>{d.flat?.flat_identifier ? `Flat ${d.flat.flat_identifier}` : '—'}</td>
                  <td>{d.billing_period_start ? String(d.billing_period_start).slice(0, 7) : '—'}</td>
                  <td>₹{String(d.calculated_amount)}</td>
                  <td>₹{String(d.late_charge)} {d.is_late_charge_waived ? '(Waived)' : ''}</td>
                  <td>
                    <span className={clsx('badge', d.status === 'PAID' ? 'badge-success' : d.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning')}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem' }}>{d.due_date ? String(d.due_date).slice(0, 10) : '—'}</td>
                </tr>
              )}
            />
          )}

          {/* 5. PAYMENTS REPORT */}
          {activeTab === 'payments' && paymentsData && (
            <PaginatedReportView
              title="Payments Report"
              data={paymentsData}
              page={page}
              onPageChange={setPage}
              headers={['Payment ID', 'Amount', 'Method', 'Status', 'Txn ID', 'Flat', 'Date']}
              renderRow={(p) => (
                <tr key={p.payment_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.payment_id.slice(0, 8)}...</td>
                  <td><strong>₹{String(p.amount)}</strong></td>
                  <td><span className="badge badge-neutral">{p.payment_method}</span></td>
                  <td>
                    <span className={clsx('badge', p.payment_status === 'COMPLETED' ? 'badge-success' : 'badge-warning')}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.transaction_id || '—'}</td>
                  <td>{p.flat?.flat_identifier ? `Flat ${p.flat.flat_identifier}` : '—'}</td>
                  <td style={{ fontSize: '0.75rem' }}>{p.payment_date ? new Date(p.payment_date).toLocaleString() : '—'}</td>
                </tr>
              )}
            />
          )}

          {/* 6. COMPLAINTS REPORT */}
          {activeTab === 'complaints' && complaintsData && (
            <PaginatedReportView
              title="Complaints Report"
              data={complaintsData}
              page={page}
              onPageChange={setPage}
              headers={['Ticket ID', 'Category', 'Subject', 'Priority', 'Status', 'Flat', 'Assigned To', 'Created']}
              renderRow={(c) => (
                <tr key={c.complaint_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{c.complaint_id.slice(0, 8)}...</td>
                  <td><span className="badge badge-neutral">{c.category}</span></td>
                  <td><strong>{c.subject}</strong></td>
                  <td>
                    <span className={clsx('badge', c.priority === 'HIGH' ? 'badge-danger' : c.priority === 'MEDIUM' ? 'badge-warning' : 'badge-neutral')}>
                      {c.priority}
                    </span>
                  </td>
                  <td>
                    <span className={clsx('badge', c.status === 'RESOLVED' ? 'badge-success' : c.status === 'OPEN' ? 'badge-warning' : 'badge-neutral')}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.flat?.flat_identifier ? `Flat ${c.flat.flat_identifier}` : '—'}</td>
                  <td style={{ fontSize: '0.75rem' }}>{c.assigned_to ? `${c.assigned_to.slice(0, 8)}...` : 'Unassigned'}</td>
                  <td style={{ fontSize: '0.75rem' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              )}
            />
          )}

          {/* 7. NOTICES REPORT */}
          {activeTab === 'notices' && noticesData && (
            <PaginatedReportView
              title="Notices Report"
              data={noticesData}
              page={page}
              onPageChange={setPage}
              headers={['Notice ID', 'Title', 'Status', 'Published At', 'Created At']}
              renderRow={(n) => (
                <tr key={n.notice_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{n.notice_id.slice(0, 8)}...</td>
                  <td><strong>{n.title}</strong></td>
                  <td>
                    <span className={clsx('badge', n.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral')}>
                      {n.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem' }}>{n.published_at ? new Date(n.published_at).toLocaleString() : '—'}</td>
                  <td style={{ fontSize: '0.75rem' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              )}
            />
          )}

          {/* 8. POLLS REPORT */}
          {activeTab === 'polls' && pollsData && (
            <PaginatedReportView
              title="Polls Aggregate Report"
              data={pollsData}
              page={page}
              onPageChange={setPage}
              headers={['Poll ID', 'Question / Title', 'Status', 'Total Votes', 'Options & Results', 'Duration']}
              renderRow={(p) => (
                <tr key={p.poll_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.poll_id.slice(0, 8)}...</td>
                  <td><strong>{p.title}</strong></td>
                  <td>
                    <span className={clsx('badge', p.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral')}>
                      {p.status}
                    </span>
                  </td>
                  <td><strong>{p.total_votes}</strong> votes</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '300px' }}>
                      {p.options.map((opt) => (
                        <div key={opt.option_id} style={{ fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{opt.option_text}</span>
                            <strong>{opt.vote_count} ({opt.percentage}%)</strong>
                          </div>
                          <div style={{ height: '4px', background: 'var(--surface-sunken)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${opt.percentage}%`, height: '100%', background: 'var(--pine)' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.75rem' }}>
                    {p.starts_at ? new Date(p.starts_at).toLocaleDateString() : '—'} to {p.ends_at ? new Date(p.ends_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              )}
            />
          )}
        </>
      )}
    </div>
  );
};

interface PaginatedReportViewProps<T> {
  title: string;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  page: number;
  onPageChange: (p: number) => void;
  headers: string[];
  renderRow: (item: T) => React.ReactNode;
}

function PaginatedReportView<T>({
  title,
  data,
  page,
  onPageChange,
  headers,
  renderRow,
}: PaginatedReportViewProps<T>) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>
            {title} ({data.total} total)
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
            Page {data.page} of {data.totalPages || 1}
          </span>
        </div>

        <Pagination page={page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={onPageChange} label="Report records" />
      </div>

      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '24px', color: 'var(--neutral)' }}>
                  No records found matching filters.
                </td>
              </tr>
            ) : (
              data.items.map(renderRow)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
