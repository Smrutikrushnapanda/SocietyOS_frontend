'use client';

import { ResidentPortalApp } from '../../components/ResidentPortalApp';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function VisitorsPage() {
  return (
    <ProtectedRoute allowedRoles={['RESIDENT']} loginPath="/resident/login">
      <ResidentPortalApp initialTab="visitors" />
    </ProtectedRoute>
  );
}
