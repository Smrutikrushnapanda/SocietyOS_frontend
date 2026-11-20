'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../lib/api/client';
import { residentPreview } from '../lib/api/resident-feeds.api';
import { markNotificationRead, markAllNotificationsRead, NotificationItem } from '../lib/api/notifications.api';
import { BackendVisitorVisit } from '../lib/api/visitors.api';
import { BackendComplaint } from '../types/complaint';
import { useAuthStore, useModalStore, useNotificationStore } from '../store';
import { buildIslandEvents, eligibleEvents, IslandEvent } from '../lib/smart-island/events';
import { useEventRotation } from '../hooks/useEventRotation';

interface Props {
  nativePresentation?: boolean;
  onOpenRequest: (id: string) => void;
  onOpenVisitors?: (id?: string) => void;
  onOpenNotice?: (id?: string) => void;
}
export function SocietySmartIsland(props: Props) {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id);
  return <IslandContent key={`${organizationId}-${userId}`} {...props} />;
}
function IslandIcon({ name, className }: { name: string; className?: string }) {
  const color = name === 'alert' ? '#ff3b30' : name === 'visitor' ? '#22c55e' : '#3b82f6';
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'alert' ? <><path d="M12 3 22 20H2L12 3Z" /><path d="M12 9v5m0 3h.01" /></> : name === 'visitor' ? <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></> : name === 'maintenance' ? <><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 12l-2-2 2.7-3.7Z" /></> : name === 'parcel' ? <><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z" /><path d="m3 7 9 4 9-4m-9 4v10" /></> : <><path d="M4 5h16v14H4z" /><path d="M7 9h10m-10 4h10m-10 4h6" /></>}
  </svg>;
}
function IslandBellIcon() {
  return <svg className="island-arrival-bell" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10" />
    <path d="M10 22h4" />
  </svg>;
}
function IslandContent({ onOpenRequest, onOpenVisitors, onOpenNotice, nativePresentation = false }: Props) {
  const permissions = useAuthStore(state => state.permissions);
  const { activeModal, openModal } = useModalStore();
  const [events, setEvents] = useState<IslandEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [bellRinging, setBellRinging] = useState(false);
  const [preview, setPreview] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressing = useRef(false);
  const eventSnapshots = useRef(new Map<string, string>());
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const readingRef = useRef(false);
  const expandedRef = useRef(false);
  const knownNotificationIds = useRef<Set<string> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bellTimerRef = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const sources = useRef<{ requests: BackendComplaint[]; notifications: NotificationItem[]; visits: BackendVisitorVisit[] }>({ requests: [], notifications: [], visits: [] });
  const canTrack = permissions.includes('complaint:my');
  const canNotify = permissions.includes('notification:read');
  const canVisit = permissions.includes('visitor:my');
  const currentId = useEventRotation(events, expanded || interacting || hidden || !!activeModal);
  const event = events.find(item => item.id === currentId);
  const critical = events.some(item => item.critical);

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioContextRef.current && typeof window.AudioContext !== 'undefined') {
        audioContextRef.current = new window.AudioContext();
      }
      if (audioContextRef.current?.state === 'suspended') void audioContextRef.current.resume();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (bellTimerRef.current !== null) window.clearTimeout(bellTimerRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close();
    };
  }, []);

  const playNotificationBell = useCallback(() => {
    const audio = audioContextRef.current;
    if (!audio || audio.state !== 'running') return;
    const start = audio.currentTime;
    [784, 988].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19 + index * 0.035);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start + index * 0.045);
      oscillator.stop(start + 0.23 + index * 0.035);
    });
  }, []);

  const notifyArrival = useCallback(() => {
    playNotificationBell();
    setBellRinging(true);
    if (bellTimerRef.current !== null) window.clearTimeout(bellTimerRef.current);
    bellTimerRef.current = window.setTimeout(() => {
      setBellRinging(false);
      bellTimerRef.current = null;
    }, 1100);
  }, [playNotificationBell]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let refreshPending = false;
    const deviceOnline = () => document.documentElement.dataset.residentOnline !== 'false' && navigator.onLine;
    const notifications = async () => {
      if (!canNotify) return { items: [] as NotificationItem[], total: 0 };
      const response = await apiClient.get<{ items: NotificationItem[]; total: number; totalPages: number }>('/notifications/page', { params: { unread: true, page: 1 } });
      return { items: response.data.items, total: response.data.total };
    };
    const refresh = async () => {
      setOffline(!deviceOnline());
      setHidden(document.hidden);
      if (inFlight) { refreshPending = true; return; }
      if (document.hidden || !deviceOnline()) return;
      inFlight = true;
      const results = await Promise.allSettled([
        canTrack ? residentPreview<BackendComplaint>('/complaints/my/page', { tab: 'active', limit: 10 }) : Promise.resolve([] as BackendComplaint[]),
        notifications(),
        canVisit ? residentPreview<BackendVisitorVisit>('/visitor-visits/my/page', { tab: 'requested', limit: 10 }) : Promise.resolve([] as BackendVisitorVisit[]),
      ]);
      if (!disposed) {
        if (results[0].status === 'fulfilled') sources.current.requests = results[0].value;
        if (results[1].status === 'fulfilled') {
          const fetchedNotifications = results[1].value.items;
          const knownIds = knownNotificationIds.current;
          if (knownIds && fetchedNotifications.some(notification => !knownIds.has(notification.id) && notification.type !== 'EMERGENCY')) notifyArrival();
          if (!knownIds) knownNotificationIds.current = new Set(fetchedNotifications.map(notification => notification.id));
          else fetchedNotifications.forEach(notification => knownIds.add(notification.id));
          const retainedRead = expandedRef.current ? sources.current.notifications.filter(notification => notification.is_read) : [];
          const retainedIds = new Set(retainedRead.map(notification => notification.id));
          sources.current.notifications = [...retainedRead, ...fetchedNotifications.filter(notification => !retainedIds.has(notification.id))];
          useNotificationStore.setState({ unreadCount: results[1].value.total });
        }
        if (results[2].status === 'fulfilled') sources.current.visits = results[2].value;
        setError(results.some(result => result.status === 'rejected'));
        setLoading(false);
        const next = buildIslandEvents(sources.current.requests, sources.current.notifications, sources.current.visits, expandedRef.current);
        if (nativePresentation) {
          const snapshots = new Map(next.map(item => [item.id, JSON.stringify(item)]));
          if (next.some(item => eventSnapshots.current.get(item.id) !== snapshots.get(item.id))) {
            setPreview(true);
            if (previewTimer.current) clearTimeout(previewTimer.current);
            const finishPreview = () => {
              if (pressing.current) { previewTimer.current = setTimeout(finishPreview, 100); return; }
              setPreview(false);
            };
            previewTimer.current = setTimeout(finishPreview, 5000);
          }
          eventSnapshots.current = snapshots;
        }
        setEvents(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      }
      inFlight = false;
      if (refreshPending && !disposed) { refreshPending = false; void refresh(); }
    };
    void refresh();
    const timer = window.setInterval(() => { setEvents(current => { const next = eligibleEvents(current); return next.length === current.length ? current : next; }); void refresh(); }, 60000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('societyos:notifications-changed', refresh);
    window.addEventListener('societyos:events-changed', refresh);
    const overlay = (event: Event) => { setInteracting(Boolean((event as CustomEvent<boolean>).detail)); };
    window.addEventListener('resident:overlay', overlay);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true; clearInterval(timer);
      if (previewTimer.current) clearTimeout(previewTimer.current);
      window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh);
      window.removeEventListener('focus', refresh); window.removeEventListener('societyos:notifications-changed', refresh);
      window.removeEventListener('societyos:events-changed', refresh);
      window.removeEventListener('resident:overlay', overlay);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [canTrack, canNotify, canVisit, notifyArrival, nativePresentation]);
  const collapse = useCallback(() => {
    expandedRef.current = false;
    setExpanded(false);
    setPreview(false);
    pressing.current = false;
    setInteracting(false);
    sources.current.notifications = sources.current.notifications.filter(notification => !notification.is_read);
    setEvents(buildIslandEvents(sources.current.requests, sources.current.notifications, sources.current.visits));
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) collapse(); };
    const release = () => { if (pressing.current) { pressing.current = false; if (!expandedRef.current) setInteracting(false); } };
    const visibility = () => { if (document.hidden) release(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('pointerup', release); document.addEventListener('pointercancel', release);
    document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('pointerup', release); document.removeEventListener('pointercancel', release); document.removeEventListener('visibilitychange', visibility); };
  }, [collapse]);
  const read = async (item: IslandEvent) => {
    if (!canNotify || !item.notificationId || readingRef.current) return;
    const scope = useAuthStore.getState();
    readingRef.current = true; setReading(item.id);
    try {
      await markNotificationRead(item.notificationId);
      const current = useAuthStore.getState();
      if (current.organizationId !== scope.organizationId || current.backendUser?.id !== scope.backendUser?.id) return;
      sources.current.notifications = expandedRef.current
        ? sources.current.notifications.map(notification => notification.id === item.notificationId ? { ...notification, is_read: true } : notification)
        : sources.current.notifications.filter(notification => notification.id !== item.notificationId);
      setEvents(buildIslandEvents(sources.current.requests, sources.current.notifications, sources.current.visits, expandedRef.current));
      useNotificationStore.setState(state => ({ notifications: state.notifications.map(n => n.id === item.notificationId ? { ...n, is_read: true } : n), unreadCount: Math.max(0, state.unreadCount - 1) }));
    } catch { setError(true); }
    finally { readingRef.current = false; setReading(null); }
  };
  const open = async (item: IslandEvent) => {
    collapse();
    if (item.notificationId && item.unread) await read(item);
    if (item.complaintId) onOpenRequest(item.complaintId);
    else if (item.target === 'visitors' && onOpenVisitors) onOpenVisitors(item.visitId);
    else if (item.target === 'notices' && onOpenNotice) onOpenNotice(item.noticeId);
    else openModal('notifications');
  };
  if (activeModal || (!event && !expanded && (nativePresentation || !offline))) return null;
  return <aside ref={root} className="society-smart-island" data-expanded={expanded} data-preview={nativePresentation && preview && !expanded} data-emergency={critical} aria-label="Society updates"
    onPointerEnter={e => { if (e.pointerType === 'mouse') setInteracting(true); }} onPointerLeave={() => { if (!expandedRef.current) setInteracting(false); }}
    onFocusCapture={e => { if (e.target.matches(':focus-visible')) setInteracting(true); }} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}
    onKeyDown={e => { if (e.key === 'Escape') { collapse(); root.current?.querySelector('button')?.focus(); } }}>
    <button className="island-toggle" type="button" aria-expanded={expanded} aria-controls="smart-island-panel" data-event-id={currentId ?? ''}
      onPointerDown={() => { if (nativePresentation) { pressing.current = true; setInteracting(true); } }}
      aria-label={`${expanded ? 'Collapse' : 'Expand'} society updates${unreadCount > 0 ? `, ${unreadCount} unread notifications` : ''}${critical ? ', critical alert available' : ''}`}
      onClick={() => {
        if (nativePresentation) { pressing.current = false; if (previewTimer.current) clearTimeout(previewTimer.current); setPreview(false); }
        if (expandedRef.current) {
          collapse();
          return;
        }
        expandedRef.current = true;
        setExpanded(true);
        setEvents(buildIslandEvents(sources.current.requests, sources.current.notifications, sources.current.visits, true));
        if (canNotify && unreadCount > 0) {
          const scope = useAuthStore.getState();
          void markAllNotificationsRead().then(() => {
            const current = useAuthStore.getState();
            if (current.organizationId !== scope.organizationId || current.backendUser?.id !== scope.backendUser?.id) return;
            sources.current.notifications = sources.current.notifications.map(notification => ({ ...notification, is_read: true }));
            useNotificationStore.setState(state => ({ unreadCount: 0, notifications: state.notifications.map(notification => ({ ...notification, is_read: true })) }));
            setEvents(buildIslandEvents(sources.current.requests, sources.current.notifications, sources.current.visits, expandedRef.current));
          }).catch(() => setError(true));
        }
      }}>
      {event ? <>{bellRinging ? <IslandBellIcon /> : <IslandIcon name={event.icon} className="island-type-icon" />}<span className="island-unread-count" aria-live="polite" aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : undefined}>{unreadCount > 0 ? unreadCount : ''}</span><span className="island-accessible-title">{event.title}</span></> : <span className="island-status">{offline ? 'Offline' : loading ? 'Loading updates…' : 'No active updates'}</span>}
    </button>
    <button className="island-critical" aria-hidden={!critical || !expanded} inert={!critical || !expanded} onClick={() => openModal('notifications')}><IslandIcon name="alert" /> Critical alert — open notification center</button>
    <div id="smart-island-panel" className="smart-island-details" aria-hidden={!expanded} inert={!expanded}>
      <div className="island-panel-header"><strong>Society updates</strong><button onClick={collapse}>Collapse</button></div>
      {(offline || error) && <p role="status">{offline ? 'Offline. Showing last received updates.' : 'Some updates could not be refreshed. Retrying automatically.'}</p>}
      {!events.length && <p>{loading ? 'Loading updates…' : 'No active updates.'}</p>}
      {events.map(item => <article key={item.id} className="island-event">
        <button className="island-event-link" onClick={() => void open(item)}><IslandIcon name={item.icon} /><strong>{item.title}</strong></button>
        <p>{item.body}</p><small>{item.category} · {item.unread ? 'Unread' : item.notificationId ? 'Read' : 'Active request'}</small>
        {item.reference && <small>Reference: {item.reference}</small>}
        {item.date && <time dateTime={item.date}>{new Date(item.date).toLocaleString()}</time>}
        {item.notificationId && item.unread && canNotify && <button disabled={reading !== null} onClick={() => void read(item)}>{reading === item.id ? 'Marking read…' : 'Mark as read'}</button>}
      </article>)}
      <button onClick={() => openModal('notifications')}>Open notification center</button>
    </div>
  </aside>;
}
