'use client';

import { useAdminLoading } from '../common/AdminLoading';
import React, { useEffect } from 'react';
import clsx from 'clsx';
import { useAuditStore } from '../../store/useAuditStore';
import { useAuthStore } from '../../store';
import { hasPermission } from '../../lib/auth/rbac';
import { Pagination } from '../common/Pagination';
import { IconClose } from '../common/Icons';

export const AdminAuditSection: React.FC = () => {
  const { organizationId } = useAuthStore();
  const {
    auditLogs,
    total,
    page,
    limit,
    setLimit,
    clearFilters,
    totalPages,
    filters,
    selectedLog,
    selectedLogId,
    detailError,
    isLoading,
    isLoadingDetail,
    error,
    fetchAuditLogs,
    fetchAuditLogDetail,
    setFilter,
    setPage,
    setSelectedLog,
  } = useAuditStore();

  useAdminLoading(isLoading, 'Loading audit events…');

  const canReadAudit = hasPermission('audit:read');

  useEffect(() => {
    if (canReadAudit && organizationId) {
      fetchAuditLogs();
    }
  }, [canReadAudit, organizationId, fetchAuditLogs]);

  if (!organizationId) {
    return (
      <div className="admin-section active" style={{ padding: '32px' }}>
        <div className="empty-state">
          <h3>Organization Context Required</h3>
          <p>Please select an organization from the top bar to inspect audit logs.</p>
        </div>
      </div>
    );
  }

  if (!canReadAudit) {
    return (
      <div className="admin-section active" style={{ padding: '32px' }}>
        <div className="empty-state">
          <h3>Access Denied</h3>
          <p>You do not have permission (audit:read) to view immutable audit logs.</p>
        </div>
      </div>
    );
  }

  const commonActions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'REJECT', 'REVOKE', 'ASSIGN', 'RESOLVE', 'PUBLISH', 'EXPIRE', 'ARCHIVE', 'START', 'END', 'VOTE', 'GENERATE', 'MARK_PAID', 'MARK_OVERDUE', 'WAIVE_LATE_CHARGE', 'MARK_COMPLETED', 'MARK_FAILED', 'UPLOAD'];
  const commonEntityTypes = ['ALL', 'BUILDING', 'FLOOR', 'FLAT', 'RESIDENT', 'VISITOR', 'VISITOR_VISIT', 'VISITOR_APPROVAL', 'VISITOR_PASS', 'MAINTENANCE_CONFIGURATION', 'MAINTENANCE_DUE', 'PAYMENT', 'COMPLAINT', 'NOTICE', 'POLL', 'FILE', 'DOCUMENT_FOLDER'];

  return (
    <div className="admin-section active" id="section-audit">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2>System Audit Logs</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Track society changes and inspect recorded before and after values.
          </p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" disabled={isLoading} onClick={() => void fetchAuditLogs()}>Refresh</button>
      </div>

      {/* Filter Bar */}
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

        <select
          aria-label="Audit action"
          className="form-select"
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          value={filters.action ?? 'ALL'}
          onChange={(e) => setFilter('action', e.target.value)}
        >
          {commonActions.map((a) => (
            <option key={a} value={a}>
              {a === 'ALL' ? 'All Actions' : a}
            </option>
          ))}
        </select>

        <select
          aria-label="Audit entity type"
          className="form-select"
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          value={filters.entity_type ?? 'ALL'}
          onChange={(e) => setFilter('entity_type', e.target.value)}
        >
          {commonEntityTypes.map((t) => (
            <option key={t} value={t}>
              {t === 'ALL' ? 'All Entity Types' : t}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            className="form-control"
            style={{ fontSize: '0.75rem', padding: '3px 6px', width: '130px' }}
            value={filters.from ?? ''}
            onChange={(e) => setFilter('from', e.target.value)}
            aria-label="Audit from date"
            max={filters.to || undefined}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>to</span>
          <input
            type="date"
            className="form-control"
            style={{ fontSize: '0.75rem', padding: '3px 6px', width: '130px' }}
            value={filters.to ?? ''}
            onChange={(e) => setFilter('to', e.target.value)}
            aria-label="Audit to date"
            min={filters.from || undefined}
          />
        </div>

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

      {/* Error state */}
      {error && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
            Failed to load audit logs
          </div>
          <div style={{ color: '#991b1b', fontSize: '0.8125rem', marginBottom: '12px' }}>{error}</div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => fetchAuditLogs()}>
            Retry
          </button>
        </div>
      )}

      {/* Main Table */}
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
              Audit Events ({total} total)
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
              Page {page} of {totalPages || 1}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="form-select" style={{ width: 72, alignSelf: 'center' }} aria-label="Audit records per page" value={limit} onChange={e => setLimit(Number(e.target.value))}>
              {[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
            </select>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} disabled={isLoading} label="Audit events" />
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Actor User ID</th>
                <th>IP Address</th>
                <th style={{ textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--neutral)' }}>
                    <span role="status">Loading audit events…</span>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--neutral)' }}>
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-pine" style={{ fontSize: '0.6875rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                        {log.entity_type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      <span title={log.entity_id ?? undefined}>{log.entity_id ? `${log.entity_id.slice(0, 8)}…` : '—'}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      <span title={log.actor_user_id ?? undefined}>{log.actor_user_id ? `${log.actor_user_id.slice(0, 8)}…` : 'System / Platform'}</span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-xs btn-secondary"
                        onClick={() => fetchAuditLogDetail(log.id)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Read-Only Audit Log Detail Modal */}
      {selectedLogId && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-dialog audit-detail-dialog" role="dialog" aria-modal="true" aria-label="Audit Event Details" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Audit Event Details</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedLog(null)}
                aria-label="Close"
              >
                <IconClose size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {isLoadingDetail ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--neutral)' }}>
                  Loading event payload...
                </div>
              ) : detailError ? (
                <div role="alert" className="empty-state"><p>{detailError}</p><button className="btn btn-sm btn-primary" onClick={() => void fetchAuditLogDetail(selectedLogId)}>Retry details</button></div>
              ) : selectedLog ? (
                <div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      fontSize: '0.8125rem',
                      marginBottom: '16px',
                      padding: '12px',
                      background: 'var(--surface-sunken)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>EVENT ID</span>
                      <strong style={{ fontFamily: 'monospace' }}>{selectedLog.id}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>TIMESTAMP</span>
                      <strong>{new Date(selectedLog.created_at).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>ACTION</span>
                      <span className="badge badge-pine">{selectedLog.action}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>ENTITY</span>
                      <strong>{selectedLog.entity_type} {selectedLog.entity_id ? `(${selectedLog.entity_id})` : ''}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>ACTOR USER ID</span>
                      <span style={{ fontFamily: 'monospace' }}>{selectedLog.actor_user_id || 'System'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>ACTOR ORG ID</span>
                      <span style={{ fontFamily: 'monospace' }}>{selectedLog.actor_organization_id || 'Platform / Global'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>TARGET ORG ID</span>
                      <span style={{ fontFamily: 'monospace' }}>{selectedLog.target_organization_id || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>CLIENT IP</span>
                      <span>{selectedLog.ip_address || '—'}</span>
                    </div>
                  </div>

                  {selectedLog.user_agent && (
                    <div style={{ marginBottom: '14px', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem' }}>USER AGENT</span>
                      <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--neutral-dark)' }}>
                        {selectedLog.user_agent}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                      PREVIOUS STATE (old_values)
                    </span>
                    <pre
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        overflowX: 'auto',
                        margin: 0,
                      }}
                    >
                      {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : 'null'}
                    </pre>
                  </div>

                  <div>
                    <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                      NEW STATE (new_values)
                    </span>
                    <pre
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        overflowX: 'auto',
                        margin: 0,
                      }}
                    >
                      {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : 'null'}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedLog(null)}
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
