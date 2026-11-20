'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore, useToastStore } from '../../store';
import { NoticeDraftEditor } from './NoticeDraftEditor';
import { cancelNoticeSchedule, getNoticeCapabilities, type NoticeCapabilities } from '../../lib/api/notices.api';
import { useCollectionPage } from '../../hooks/useCollectionPage';
import { Pagination } from '../common/Pagination';
import { publishNotice, expireNotice } from '../../lib/api/notices.api';
import type { BackendNotice } from '../../types/notice';
import { AdminPollsSection } from './AdminPollsSection';

export const AdminNoticesSection: React.FC = () => {
  const { organizationId } = useAuthStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'notices' | 'polls'>('notices');
  const { items: notices, isLoading, error, load: loadNotices, hasLoaded, page, setPage, total, totalPages, limit } = useCollectionPage<BackendNotice>('notices', activeTab === 'notices');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BackendNotice | null>(null);
  const [capabilities, setCapabilities] = useState<NoticeCapabilities | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const publishingIds = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    if (organizationId) void getNoticeCapabilities().then(value => { if (active) setCapabilities(value); }).catch(() => { if (active) setCapabilities(null); });
    return () => { active = false; };
  }, [organizationId]);

  const handlePublish = async (id: string) => {
    if (publishingIds.current.has(id)) return;
    try {
      const emergency = notices.find(notice => notice.id === id)?.priority === 'EMERGENCY';
      if (emergency && !window.confirm('Publish a mandatory emergency alert to organization residents?')) return;
      publishingIds.current.add(id);
      setPublishingId(id);
      await publishNotice(id, emergency);
      await loadNotices();
      showToast('Notice published in app. External delivery is queued when enabled.');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to publish notice');
    } finally {
      publishingIds.current.delete(id);
      setPublishingId(current => current === id ? null : current);
    }
  };

  const handleExpire = async (id: string) => {
    try {
      await expireNotice(id);
      await loadNotices();
      showToast('Notice marked as expired / archived.');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to archive notice');
    }
  };

  return (
    <div className="admin-section active" id="section-notices">
      <div className="section-header">
        <div>
          <h2>Society Notice Board, Circulars & Polls</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Official RWA circulars, maintenance drives, and democratic community ballots.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'notices' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => void loadNotices()} disabled={isLoading}>
                Refresh
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>
                + Create New Notice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subnav for Circulars vs Polls */}
      <div className="module-subnav" style={{ marginBottom: '16px' }}>
        <button
          className={`module-tab-btn ${activeTab === 'notices' ? 'active' : ''}`}
          onClick={() => setActiveTab('notices')}
        >
          Official Circulars & Notices
        </button>
        <button
          className={`module-tab-btn ${activeTab === 'polls' ? 'active' : ''}`}
          onClick={() => setActiveTab('polls')}
        >
          Community Polls & Voting
        </button>
      </div>

      {activeTab === 'polls' ? (
        <AdminPollsSection />
      ) : (
        <>

      {isLoading && notices.length === 0 && (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--neutral)' }}>
          <div style={{ fontSize: '0.875rem' }}>Loading society notices...</div>
        </div>
      )}

      {error && notices.length === 0 && (
        <div className="card" style={{ padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '12px' }}>{error}</p>
          <button className="btn btn-sm btn-ghost" onClick={() => void loadNotices()}>
            Retry
          </button>
        </div>
      )}

      {capabilities && <p role="status">Scheduled publication: {capabilities.scheduledPublication ? 'available' : 'unavailable'}. Push dispatch: {capabilities.pushDispatch && capabilities.deliveryWorker ? 'enabled' : 'disabled'}. WhatsApp dispatch: {capabilities.deliveryWorker ? 'enabled' : 'disabled'}. Disabled external deliveries remain queued.</p>}
      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} disabled={isLoading} label="Notices" />
      {/* Full Notices List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
        {notices.length === 0 && !isLoading && !error ? (
          <div className="card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--neutral)' }}>
            {hasLoaded ? 'No notices published or in draft. Click "+ Create New Notice" to broadcast.' : 'Notices not loaded yet.'}
          </div>
        ) : (
          notices.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid var(--border-subtle)',
                borderLeft:
                  n.status === 'PUBLISHED'
                    ? '4px solid var(--pine)'
                    : n.status === 'ARCHIVED'
                    ? '4px solid var(--neutral)'
                    : '4px solid var(--saffron)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    className={`badge ${
                      n.status === 'PUBLISHED'
                        ? 'badge-pine'
                        : n.status === 'ARCHIVED'
                        ? 'badge-neutral'
                        : 'badge-warning'
                    }`}
                  >
                    {n.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                    Created: {new Date(n.created_at).toLocaleDateString()}
                  </span>
                  {n.published_at && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--pine)' }}>
                      Published: {new Date(n.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {n.status === 'DRAFT' && <button className="btn btn-xs btn-ghost" onClick={() => { setEditing(n); setShowModal(true); }}>Edit draft</button>}
                  {n.status === 'SCHEDULED' && <button className="btn btn-xs btn-ghost" onClick={async () => { try { await cancelNoticeSchedule(n.id); await loadNotices(); showToast('Schedule cancelled. Draft can now be edited.'); } catch { showToast('Schedule could not be cancelled. Refresh and retry.'); } }}>Cancel schedule / edit</button>}
                  {n.status === 'DRAFT' && (
                    <button
                      className="btn btn-xs btn-primary"
                      onClick={() => handlePublish(n.id)}
                      disabled={publishingId === n.id}
                    >
                      {publishingId === n.id ? 'Publishing…' : 'Publish Notice →'}
                    </button>
                  )}
                  {n.status === 'PUBLISHED' && (
                    <button
                      className="btn btn-xs btn-danger"
                      onClick={() => handleExpire(n.id)}
                    >
                      Archive / Expire
                    </button>
                  )}
                </div>
              </div>

              {n.scheduled_at && <p>Scheduled: {new Date(n.scheduled_at).toLocaleString()}</p>}
              {n.priority === 'EMERGENCY' && <strong style={{ color: '#b91c1c' }}>EMERGENCY — mandatory alert</strong>}
              <h3 style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{n.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--neutral-dark)', lineHeight: 1.5 }}>
                {n.content || n.description}
              </p>
            </div>
          ))
        )}
      </div>

      {showModal && <NoticeDraftEditor key={`${organizationId}:${editing?.id ?? 'new'}`} notice={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); void loadNotices(); showToast('Notice saved.'); }} />}
      </>
      )}
    </div>
  );
};
