"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../lib/api/client';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';
import { useAuthStore } from '../store/useAuthStore';

interface CollectionPage<T> { items: T[]; total: number; page: number; limit: number; totalPages: number }
export function useCollectionPage<T>(resource: 'notices' | 'polls', enabled = true) {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CollectionPage<T>>({ items: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setLoaded] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (!organizationId || !enabled) return;
    const request = ++generation.current;
    const current = () => request === generation.current && useAuthStore.getState().organizationId === organizationId && useAuthStore.getState().backendUser?.id === userId;
    setLoading(true); setError(null);
    setData(current => ({ ...current, items: [] }));
    try {
      const response = await apiClient.get<CollectionPage<T>>(`/${resource}/page`, { params: { page, limit: 10 } });
      if (!current()) return;
      if (page > response.data.totalPages) { setPage(Math.max(1, response.data.totalPages)); return; }
      setData(response.data); setLoaded(true);
    } catch (reason) {
      if (current()) { setError(getUserFriendlyErrorMessage(reason, `Failed to load ${resource}`)); setData({ items: [], total: 0, page, limit: 10, totalPages: 1 }); }
    } finally { if (current()) setLoading(false); }
  }, [organizationId, userId, resource, page, enabled]);
  const invalidate = useCallback(() => { ++generation.current; }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- External requests expose loading before network completion.
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);
  return { ...data, page, setPage, isLoading, error, hasLoaded, load };
}
