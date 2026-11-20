'use client';

import { ResidentPortalApp } from '../../components/ResidentPortalApp';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function ResidentRoute() {
  return (
    <ProtectedRoute allowedRoles={['RESIDENT']} loginPath="/resident/login">
      <ResidentPortalApp initialTab="home" />
    </ProtectedRoute>
  );
}
