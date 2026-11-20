'use client';

import { ResidentPortalApp } from '../../../components/ResidentPortalApp';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';

export default function AmenityBookingsPage() {
  return <ProtectedRoute allowedRoles={['RESIDENT']} loginPath="/resident/login">
    <ResidentPortalApp initialTab="amenity-bookings" />
  </ProtectedRoute>;
}
