'use client';

import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { WalkieTalkiePage } from '../../components/walkie-talkie/WalkieTalkiePage';

export default function WalkieTalkieRoutePage() {
  return (
    <ProtectedRoute allowedRoles={['GUARD']} loginPath="/guard/login">
      <WalkieTalkiePage />
    </ProtectedRoute>
  );
}
