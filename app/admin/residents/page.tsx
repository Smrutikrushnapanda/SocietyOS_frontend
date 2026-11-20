'use client';

import { AdminApp } from '../../../components/admin/AdminApp';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';

export default function ResidentsPage() {
  return (
    <ProtectedRoute allowedRoles={['SOCIETY_ADMIN', 'SUPER_ADMIN']} loginPath="/admin/login">
      <AdminApp initialSection="residents" />
    </ProtectedRoute>
  );
}
