'use client';
import { useAuthStore } from '../../store/useAuthStore';
export function SessionStatus() {
  const error = useAuthStore(state => state.sessionError);
  return <div role="status" style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: 16, padding: 24, textAlign: 'center', background: 'var(--surface, #f6f8f6)', color: 'var(--ink, #18251f)' }}>
    <p>{error || 'Restoring your session…'}</p>
    {error && <button className="btn btn-primary" onClick={() => void useAuthStore.getState().restoreSession()}>Retry connection</button>}
  </div>;
}
