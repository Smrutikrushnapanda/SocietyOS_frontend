'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GuardScannerScreen } from '../../../components/guard/GuardScannerScreen';
import { useToastStore } from '../../../store';

export default function GuardScanPage() {
  const router = useRouter();
  const { showToast } = useToastStore();

  const handleConfirmEntry = (passCode: string, vehicleNo: string, gateName: string) => {
    showToast(`Boom Barrier Opened! Entry logged for Pass ${passCode}. WhatsApp sync sent.`);
    router.push('/guard');
  };

  return (
    <div className="phone-wrapper" style={{ margin: '0 auto', maxWidth: '440px' }}>
      <GuardScannerScreen
        onBack={() => router.push('/guard')}
        onConfirmEntry={handleConfirmEntry}
      />
    </div>
  );
}
