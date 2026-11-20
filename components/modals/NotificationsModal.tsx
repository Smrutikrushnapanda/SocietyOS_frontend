'use client';

import React, { useEffect, useState } from 'react';
import { useInfiniteFeed } from '../../hooks/useInfiniteFeed';
import { FeedTabs, InfiniteFeedBoundary } from '../common/InfiniteFeed';
import { NotificationItem, markNotificationRead, markAllNotificationsRead } from '../../lib/api/notifications.api';
import { useAuthStore, useModalStore } from '../../store';
import { useNotificationStore } from '../../store/useNotificationStore';
import { IconBell, IconClose, IconCheck } from '../common/Icons';

function formatNotificationTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export const NotificationsModal: React.FC = () => {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id);
  return <NotificationContent key={`${organizationId}-${userId}`} />;
};

const NotificationContent: React.FC = () => {
  const { closeModal } = useModalStore();
  const {
    unreadCount,
  } = useNotificationStore();

  const [pageError, setPageError] = useState(false);
  const [state, setState] = useState('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const feed = useInfiniteFeed<NotificationItem>('/notifications/page', { state });
  const { items: notifications, isLoading, refresh: fetchNotifications } = feed;
  const error = pageError ? 'Could not update notification. Please retry.' : feed.error;
  const scope = useAuthStore();
  const read = async (id?: string) => {
    setPageError(false);
    try {
      if (id) await markNotificationRead(id); else await markAllNotificationsRead();
      const current = useAuthStore.getState();
      if (current.organizationId !== scope.organizationId || current.backendUser?.id !== scope.backendUser?.id) return;
      useNotificationStore.setState(state => {
        const wasUnread = id ? state.notifications.some(item => item.id === id && !item.is_read) : state.unreadCount > 0;
        return {
          notifications: state.notifications.map(item => !id || item.id === id ? { ...item, is_read: true } : item),
          unreadCount: id ? Math.max(0, state.unreadCount - (wasUnread ? 1 : 0)) : 0,
        };
      });
      fetchNotifications();
      void useNotificationStore.getState().fetchUnreadCount();
    } catch { setPageError(true); }
  };

  return (
    <div
      className="mobile-modal-overlay"
      id="notifications-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="mobile-bottom-sheet" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="sheet-handle"></div>

        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon saffron">
              <IconBell size={20} />
            </div>
            <div className="drawer-header-text">
              <h3>Notifications & Alerts</h3>
              <p>Gate and society updates</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={closeModal} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        <FeedTabs label="Notification filters" value={state} onChange={setState} tabs={[{ value: 'all', label: 'All alerts' }, { value: 'unread', label: 'Unread' }, { value: 'read', label: 'Read' }]} />
        {unreadCount > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 4px 10px',
              borderBottom: '1px solid var(--border)',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
              {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{ fontSize: '0.75rem', color: 'var(--pine)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => void read()}
            >
              <IconCheck size={14} />
              Mark all as read
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingBottom: '8px' }}>
          {isLoading && notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--neutral)', fontSize: '0.8125rem' }}>
              Loading notifications...
            </div>
          ) : error ? (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8125rem', color: '#dc2626', marginBottom: '8px' }}>{error}</p>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => { setPageError(false); fetchNotifications(); }}
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ color: 'var(--neutral)', marginBottom: '4px', fontSize: '0.9375rem', fontWeight: 600 }}>
                No notifications yet
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                You will receive alerts here when gate visitors arrive or updates are published.
              </div>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: '10px 12px',
                  background: n.is_read ? '#ffffff' : '#f8fafc',
                  borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--pine)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => {
                  if (!n.is_read) {
                    void read(n.id);
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2px',
                  }}
                >
                  <strong style={{ fontSize: '0.8125rem', color: n.is_read ? 'var(--ink)' : 'var(--pine-dark)' }}>
                    {n.title}
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--neutral)' }}>
                    {formatNotificationTime(n.created_at)}
                  </span>
                </div>
                <button
                  type="button"
                  aria-expanded={expandedIds.has(n.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedIds(current => {
                      const next = new Set(current);
                      if (next.has(n.id)) next.delete(n.id); else next.add(n.id);
                      return next;
                    });
                    if (!n.is_read) void read(n.id);
                  }}
                  style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: expandedIds.has(n.id) ? 'unset' : 3,
                      overflow: expandedIds.has(n.id) ? 'visible' : 'hidden',
                      fontSize: '0.75rem',
                      color: 'var(--neutral)',
                      lineHeight: 1.4,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {n.body}
                  </span>
                  {n.body.length > 120 && (
                    <span style={{ display: 'block', marginTop: '3px', color: 'var(--pine)', fontSize: '0.7rem', fontWeight: 600 }}>
                      {expandedIds.has(n.id) ? 'Show less' : 'Show more'}
                    </span>
                  )}
                </button>
                {n.type === 'POLL' && typeof n.data?.pollId === 'string' && <button type="button" className="btn btn-xs btn-outline" style={{ marginTop: '8px' }} onClick={event => {
                  event.stopPropagation(); if (!n.is_read) void read(n.id);
                  window.dispatchEvent(new CustomEvent('resident:open-poll', { detail: { pollId: n.data?.pollId } }));
                }}>Open Poll</button>}
              </div>
            ))
          )}
          <InfiniteFeedBoundary feed={feed} label="Notifications" />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  );
};
