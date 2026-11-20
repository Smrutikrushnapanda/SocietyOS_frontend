'use client';

import { AdminApp } from '../../components/admin/AdminApp';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['SOCIETY_ADMIN', 'SUPER_ADMIN']} loginPath="/admin/login">
      <AdminApp />
    </ProtectedRoute>
  );
}
