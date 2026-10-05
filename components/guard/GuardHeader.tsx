import React from 'react';
import clsx from 'clsx';
import { useAuthStore, useToastStore } from '../../store';
import { useRouter } from 'next/navigation';

interface GuardHeaderProps {
  title: string;
  queueCount: number;
  isOnline: boolean;
  pendingSyncCount: number;
  onToggleSync: () => void;
}

export const GuardHeader: React.FC<GuardHeaderProps> = ({
  title,
  queueCount,
  isOnline,
  pendingSyncCount,
  onToggleSync
}) => {
  const { user, logout } = useAuthStore();
  const { showToast } = useToastStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    showToast('Guard post logged out');
    router.push('/guard/login');
  };

  const guardName = user?.name || 'Officer Deshmukh';
  const gatePost = user?.gate || 'Gate 01 • North Booth';

  return (
    <header className="guard-header">
      <div className="guard-header-top">
        <span className="guard-station-pill">
          <span className="sync-dot" style={{ background: 'var(--saffron)' }}></span>
          {gatePost}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Persistent Auto-Sync Badge */}
          <div
            className={clsx('sync-badge', isOnline ? 'online' : 'offline')}
            id="headerSyncBadge"
            title="Tap to toggle live/offline simulation"
            onClick={onToggleSync}
            style={{ cursor: 'pointer' }}
          >
            <span className="sync-dot"></span>
            <span>{isOnline ? 'Live' : `Offline · ${pendingSyncCount} pending`}</span>
          </div>

          <button
            type="button"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              borderRadius: 'var(--radius-full)',
              padding: '2px 8px',
              fontSize: '0.6875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={handleLogout}
            title="Log out Guard Post"
          >
            Exit
          </button>
        </div>
      </div>
      <div className="guard-header-main">
        <h2 id="phoneHeaderTitle">{title}</h2>
        <span
          style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}
          id="guard-header-stats"
        >
          {guardName} • {queueCount} in Queue
        </span>
      </div>
    </header>
  );
};

