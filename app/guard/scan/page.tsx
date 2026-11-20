'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GuardScannerScreen } from '../../../components/guard/GuardScannerScreen';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { useToastStore, useVisitorStore } from '../../../store';

export default function GuardScanPage() {
  const router = useRouter();
  const { showToast } = useToastStore();

  const handleConfirmEntry = async (visitId: string, token: string) => {
    await useVisitorStore.getState().checkInVisitorVisit(visitId, token);
    showToast('Guest entry recorded.', 'success');
    router.push('/guard');
  };

  return (
    <ProtectedRoute allowedRoles={['GUARD']} loginPath="/guard/login">
      <div className="phone-wrapper" style={{ margin: '0 auto', maxWidth: '440px' }}>
        <GuardScannerScreen
          onBack={() => router.push('/guard')}
          onConfirmEntry={handleConfirmEntry}
        />
      </div>
    </ProtectedRoute>
  );
}
