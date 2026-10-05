'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResidentPortalApp } from '../../components/ResidentPortalApp';
import { useAuthStore } from '../../store';

export default function ResidentRoute() {
  const router = useRouter();
  const { isAuthenticated, role, isHydrated, hydrateSession } = useAuthStore();

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (isHydrated && (!isAuthenticated || role !== 'resident')) {
      // If unauthenticated or another role, redirect to resident login
      // router.push('/resident/login');
    }
  }, [isAuthenticated, role, isHydrated, router]);

  return <ResidentPortalApp initialTab="home" />;
}
