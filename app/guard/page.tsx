'use client';

import { GuardApp } from '../../components/guard/GuardApp';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export default function GuardPage() {
  return (
    <ProtectedRoute allowedRoles={['GUARD']} loginPath="/guard/login">
      <GuardApp />
    </ProtectedRoute>
  );
}
