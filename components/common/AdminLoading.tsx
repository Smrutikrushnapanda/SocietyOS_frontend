'use client';

import React, { createContext, useCallback, useContext, useId, useLayoutEffect, useState } from 'react';

const LoadingContext = createContext<(id: string, message: string | null) => void>(() => {});

export function AdminLoadingProvider({ children }: { children: React.ReactNode }) {
  const [operations, setOperations] = useState<Record<string, string>>({});
  const update = useCallback((id: string, message: string | null) => {
    setOperations(current => {
      if (message === null && !(id in current)) return current;
      if (current[id] === message) return current;
      const next = { ...current };
      if (message === null) delete next[id]; else next[id] = message;
      return next;
    });
  }, []);
  const busy = Object.keys(operations).length > 0;
  return <LoadingContext.Provider value={update}>
    <div aria-busy={busy} inert={busy || undefined}>{children}</div>
    {busy && <div className="admin-loading-overlay" role="status" aria-live="polite">
      <div className="admin-loading-status"><span className="admin-loading-spinner" aria-hidden="true" /><span>{Object.values(operations)[0]}</span></div>
    </div>}
  </LoadingContext.Provider>;
}

export function useAdminLoading(loading: boolean, message = 'Loading…') {
  const id = useId();
  const update = useContext(LoadingContext);
  useLayoutEffect(() => {
    update(id, loading ? message : null);
    return () => update(id, null);
  }, [id, loading, message, update]);
}
