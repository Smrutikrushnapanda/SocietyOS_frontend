'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useToastStore } from '../../store';
import { logoutCurrentSession } from '../../lib/auth/logout-session';
import { getStaffMembers } from '../../lib/api/staff.api';
import { authenticatedGuardName } from '../../lib/display';
import { LogoGuardShield } from '../auth/AuthLogos';
import { IconClose } from '../common/Icons';

interface GuardHeaderProps {
  title: string;
  queueCount: number;
  isOnline: boolean;
  onOpenVisitorEntry?: () => void;
  profilePhotoUrl?: string | null;
}

export const GuardHeader: React.FC<GuardHeaderProps> = ({
  title,
  queueCount,
  isOnline,
  onOpenVisitorEntry,
  profilePhotoUrl,
}) => {
  const { user, backendUser, organizationId } = useAuthStore();
  const { showToast } = useToastStore();
  const router = useRouter();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [fetchedGuardPhoto, setFetchedGuardPhoto] = useState<string | null>(null);
  const [staffRecordName, setStaffRecordName] = useState<string | null>(null);
  const guardPhoto = profilePhotoUrl || fetchedGuardPhoto;

  useEffect(() => {
    if (profilePhotoUrl || !organizationId) return;

    let isMounted = true;
    getStaffMembers()
      .then((staff) => {
        if (!isMounted || !Array.isArray(staff)) return;
        const rawPhone = (backendUser?.mobileNumber || user?.phone || '').replace(/\D/g, '');
        const found = staff.find((s) => {
          if (s.user_id && backendUser?.id && s.user_id === backendUser.id) return true;
          const sDigits = (s.phone || '').replace(/\D/g, '');
          return (
            sDigits.length >= 10 &&
            rawPhone.length >= 10 &&
            (sDigits.endsWith(rawPhone.slice(-10)) || rawPhone.endsWith(sDigits.slice(-10)))
          );
        });
        if (found) {
          if (found.profile_photo_url) setFetchedGuardPhoto(found.profile_photo_url);
          if (found.name) setStaffRecordName(found.name);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [profilePhotoUrl, organizationId, backendUser?.mobileNumber, backendUser?.id, user?.phone]);

  const rawPhone = backendUser?.mobileNumber || user?.phone || '';
  const displayPhone = rawPhone
    ? rawPhone.startsWith('+')
      ? rawPhone
      : `+91 ${rawPhone.replace(/^91/, '')}`
    : 'Not Registered';

  const resolvedFullName = authenticatedGuardName(
    { fullName: staffRecordName || backendUser?.fullName }, user?.name,
  );
  const initials = resolvedFullName
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'GU';
  const gatePost = 'Gate 01 • Main Terminal';

  const handleLogout = async () => {
    const confirmed = await logoutCurrentSession();
    if (confirmed) showToast('Guard post logged out');
    if (!useAuthStore.getState().isAuthenticated) router.push('/guard/login');
  };

  return (
    <>
      <header className="guard-header">
        <div className="guard-header-top">
          {/* Profile trigger button for left drawer showing Guard's 1st name */}
          <button
            type="button"
            className="guard-profile-pill-btn"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Guard Profile Drawer"
            title="View Guard Profile & Shift Details"
          >
            <div className="guard-avatar-circle">
              {guardPhoto ? (
                <img src={guardPhoto} alt={resolvedFullName} className="guard-avatar-img" />
              ) : (
                <span className="guard-avatar-initials">{initials}</span>
              )}
            </div>
            <div className="guard-profile-brief">
              <span className="guard-brief-name">{resolvedFullName}</span>
              <span className="guard-brief-badge">{gatePost}</span>
            </div>
          </button>

          <span className={`guard-connection-pill${isOnline ? '' : ' is-offline'}`} role="status">
            <span className="guard-connection-dot" aria-hidden="true" />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="guard-header-queue-status">
          <h1 className="guard-queue-status-title" id="phoneHeaderTitle">{title}</h1>
          <span className="guard-queue-counter">
            <strong>{queueCount}</strong>
            <span>in queue</span>
          </span>
        </div>
      </header>

      {/* Left Profile Drawer & Backdrop */}
      {isDrawerOpen && (
        <div
          className="guard-drawer-backdrop"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="guard-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Guard Profile"
          >
            {/* Drawer Header */}
            <div className="guard-drawer-header">
              <div className="guard-drawer-branding">
                <LogoGuardShield size={38} />
                <div>
                  <h3 className="guard-drawer-title">Security Duty Post</h3>
                  <span className="guard-drawer-subtitle">Gate Terminal OS</span>
                </div>
              </div>
              <button
                type="button"
                className="guard-drawer-close"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close Profile Drawer"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Drawer Profile Hero Card */}
            <div className="guard-drawer-card">
              <div className="guard-drawer-avatar-lg">
                {guardPhoto ? (
                  <img src={guardPhoto} alt={resolvedFullName} className="guard-drawer-avatar-img" />
                ) : (
                  <span className="guard-drawer-avatar-initials">{initials}</span>
                )}
              </div>
              <div className="guard-drawer-officer-info">
                <h4 className="guard-drawer-officer-name">{resolvedFullName}</h4>
                <div className="guard-drawer-role-tag">
                  <span className="duty-status-indicator" />
                  ON-DUTY GUARD
                </div>
              </div>

              <div className="guard-drawer-details-grid">
                <div className="guard-drawer-detail-item">
                  <span className="detail-item-label">Guard Name</span>
                  <strong className="detail-item-value">{resolvedFullName}</strong>
                </div>
                <div className="guard-drawer-detail-item">
                  <span className="detail-item-label">Mobile Number</span>
                  <strong className="detail-item-value">{displayPhone}</strong>
                </div>
                <div className="guard-drawer-detail-item">
                  <span className="detail-item-label">Terminal Post</span>
                  <strong className="detail-item-value">{gatePost}</strong>
                </div>
                <div className="guard-drawer-detail-item">
                  <span className="detail-item-label">Station Network</span>
                  <strong className="detail-item-value">
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isOnline ? '#10b981' : '#ef4444',
                        marginRight: '6px',
                      }}
                    />
                    {isOnline ? 'Online · Cloud Connected' : 'Offline'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Shift & Safety Notice */}
            <div className="guard-drawer-notice">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                <div>
                  <strong style={{ fontSize: '0.8125rem', color: '#0369a1', display: 'block' }}>
                    Active Duty Shift
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                    All guest entries and barrier actions are recorded with timestamps.
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="guard-drawer-footer">
              <button
                type="button"
                className="btn btn-block guard-drawer-logout-btn"
                onClick={handleLogout}
              >
                End Shift & Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
