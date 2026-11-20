'use client';

import { useVisitorLiveUpdates } from '../../hooks/useVisitorLiveUpdates';

export function VisitorLiveStatus({ silent = false }: { silent?: boolean }) {
  const state = useVisitorLiveUpdates();
  if (state === 'stopped' || silent) return null;
  return <span role="status" aria-live="polite" style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
    {state === 'connected' ? '' : 'Visitors: reconnecting · refresh or refocus to reload'}
  </span>;
}