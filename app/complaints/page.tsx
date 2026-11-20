'use client';

import { ResidentPortalApp } from '../../components/ResidentPortalApp';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function ComplaintsPage() {
  return (
    <ProtectedRoute allowedRoles={['RESIDENT']} loginPath="/resident/login">
      <ResidentPortalApp initialTab="complaints" />
    </ProtectedRoute>
  );
}
