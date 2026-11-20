'use client';

/**
 * SocietyOS ProtectedRoute
 *
 * Route guard providing frontend defense-in-depth against unauthorized access:
 *  - Unauthenticated users -> redirected to specified loginPath
 *  - Authenticated users lacking required backend roles -> HTTP 403 equivalent UX
 *  - Strictly fail-closed: missing or empty roles deny access
 *
 * NOTE: Frontend route protection is UX defense-in-depth only.
 * The backend remains the final authority for role and permission authorization.
 */

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { SessionStatus } from './SessionStatus';
import type { BackendRole } from '../../lib/api/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: BackendRole[];
  loginPath: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  loginPath,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, isRestoring, sessionError, roles, hydrateSession } = useAuthStore();

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const hasAuthorizedRole = allowedRoles.some((r) => roles.includes(r));

  useEffect(() => {
    if (!isHydrated || isRestoring || sessionError) return;

    if (!isAuthenticated) {
      router.replace(loginPath);
    }
  }, [isHydrated, isRestoring, sessionError, isAuthenticated, loginPath, router]);

  if (!isHydrated || isRestoring || sessionError) return <SessionStatus />;

  if (!isAuthenticated) {
    return null;
  }

  if (!hasAuthorizedRole) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#0a0d0c',
          color: '#f3f4f6',
        }}
      >
        <div
          style={{
            fontSize: '2rem',
            padding: '12px 18px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          🛡️
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>
          Access Denied (403)
        </h2>
        <p style={{ maxWidth: '480px', color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>
          Your authenticated account does not possess the authoritative backend role authorization
          required to access this portal.
        </p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
          Required role: {allowedRoles.join(' or ')}
        </p>
        <button
          onClick={() => router.replace(loginPath)}
          style={{
            marginTop: '1rem',
            padding: '0.625rem 1.5rem',
            backgroundColor: '#1f2937',
            color: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #374151',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Return to Portal Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
