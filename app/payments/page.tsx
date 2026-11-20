'use client';

import { ResidentPortalApp } from '../../components/ResidentPortalApp';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function PaymentsPage() {
  return (
    <ProtectedRoute allowedRoles={['RESIDENT']} loginPath="/resident/login">
      <ResidentPortalApp initialTab="payments" />
    </ProtectedRoute>
  );
}
