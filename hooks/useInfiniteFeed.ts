'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../lib/api/client';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';
import { useAuthStore } from '../store/useAuthStore';
import { RESIDENT_FEED_REFRESH, type ResidentFeedRefresh } from '../lib/resident-refresh';
export interface FeedPage<T> { items: T[]; total: number; page: number; limit?: number; totalPages: number }
export function mergeFeedItems<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const unique = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) unique.set(item.id, item);
  return [...unique.values()];
}
export function useInfiniteFeed<T extends { id: string }>(path: string, params: Record<string, string | number | boolean | undefined> = {}, enabled = true, preserveOnRefresh = false) {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id ?? state.user?.id);
  const session = useAuthStore(state => state.sessionVersion);
  const query = JSON.stringify(params);
  const scope = `${organizationId}:${userId}:${session}:${path}:${query}`;
  const [data, setData] = useState<{ scope: string; items: T[]; page: number; total: number; totalPages: number }>({ scope: '', items: [], page: 0, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const request = useCallback(async (page: number, reset = false, pulled = false) => {
    if (!enabled || !organizationId || !userId || (inFlight.current && (!reset || (preserveOnRefresh && !pulled)))) return;
    if (reset) ++generation.current;
    const version = generation.current;
    const current = () => version === generation.current && useAuthStore.getState().organizationId === organizationId && (useAuthStore.getState().backendUser?.id ?? useAuthStore.getState().user?.id) === userId && useAuthStore.getState().sessionVersion === session;
    inFlight.current = true; setLoading(true); setError(null);
    if (reset && !preserveOnRefresh && !pulled) setData({ scope, items: [], page: 0, total: 0, totalPages: 1 });
    try {
      const response = await apiClient.get<FeedPage<T>>(path, { params: { ...JSON.parse(query), page, limit: JSON.parse(query).limit ?? 10 } });
      if (!current()) return;
      const next = response.data;
      if (!Array.isArray(next.items)) throw new Error('Invalid paginated response');
      setData(previous => ({ scope, items: reset || previous.scope !== scope ? mergeFeedItems([], next.items) : mergeFeedItems(previous.items, next.items), page: next.page, total: next.total, totalPages: Math.max(1, next.totalPages) }));
    } catch (reason) {
      if (current()) {
        setError(getUserFriendlyErrorMessage(reason, 'Unable to load records. Retry to continue.'));
        if (pulled) throw reason;
      }
    }
    finally { if (current()) { inFlight.current = false; setLoading(false); } }
  }, [enabled, organizationId, userId, session, scope, query, path, preserveOnRefresh]);
  const refresh = useCallback(() => { void request(1, true); }, [request]);
  const invalidate = useCallback(() => { ++generation.current; inFlight.current = false; }, []);
  useEffect(() => {
    const pulled = (event: Event) => { (event as ResidentFeedRefresh).detail.jobs.push(request(1, true, true)); };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- External feed requests expose loading before completion.
    refresh();
    window.addEventListener('societyos:notifications-changed', refresh);
    window.addEventListener('societyos:events-changed', refresh);
    window.addEventListener('societyos:notices-changed', refresh);
    window.addEventListener('societyos:resident-feed-changed', refresh);
    window.addEventListener(RESIDENT_FEED_REFRESH, pulled);
    return () => { invalidate(); window.removeEventListener('societyos:notifications-changed', refresh); window.removeEventListener('societyos:events-changed', refresh); window.removeEventListener('societyos:notices-changed', refresh); window.removeEventListener('societyos:resident-feed-changed', refresh); window.removeEventListener(RESIDENT_FEED_REFRESH, pulled); };
  }, [refresh, invalidate, request]);
  const current = data.scope === scope;
  const items = current ? data.items : [];
  const page = current ? data.page : 0;
  const hasMore = current && data.page < data.totalPages;
  const loadMore = useCallback(() => { if (!loading && !error && (hasMore || page === 0)) void request(page + 1); }, [loading, error, hasMore, page, request]);
  const retry = useCallback(() => { void request(page + 1); }, [request, page]);
  return { items, total: current ? data.total : 0, page, hasMore, isLoading: enabled && (loading || (!current && !error)), error, loadMore, refresh, retry };
}
