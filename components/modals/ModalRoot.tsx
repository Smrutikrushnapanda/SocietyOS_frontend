'use client';

import React from 'react';
import { useModalStore } from '../../store';
import { MyQrGatePassModal } from './MyQrGatePassModal';
import { PreApproveGuestModal } from './PreApproveGuestModal';
import { QrPassCardModal } from './QrPassCardModal';
import { RaiseComplaintModal } from './RaiseComplaintModal';
import { AmenitiesBookingModal } from './AmenitiesBookingModal';
import { UpiPaymentModal } from './UpiPaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { NotificationsModal } from './NotificationsModal';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { ResidentDocumentsModal } from './ResidentDocumentsModal';

export const ModalRoot: React.FC = () => {
  const { activeModal } = useModalStore();

  if (!activeModal) return null;

  switch (activeModal) {
    case 'qrGatePass':
      return <MyQrGatePassModal />;
    case 'preApproveGuest':
      return <PreApproveGuestModal />;
    case 'qrPassCard':
      return <QrPassCardModal />;
    case 'raiseComplaint':
      return <RaiseComplaintModal />;
    case 'amenitiesBooking':
      return <AmenitiesBookingModal />;
    case 'upiPayment':
      return <UpiPaymentModal />;
    case 'receipt':
      return <ReceiptModal />;
    case 'notifications':
      return <NotificationsModal />;
    case 'profileSettings':
      return <ProfileSettingsModal />;
    case 'residentDocuments':
      return <ResidentDocumentsModal />;
    default:
      return null;
  }
};
