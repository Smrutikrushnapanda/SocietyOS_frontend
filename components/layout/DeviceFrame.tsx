'use client';

import React from 'react';
import { useSessionLifecycle } from '../../hooks/useSessionLifecycle';
import { usePathname } from 'next/navigation';
import { PhoneStatusBar } from './PhoneStatusBar';
import { Toast } from '../common/Toast';
import { ModalRoot } from '../modals/ModalRoot';

import { ErrorBoundary } from '../common/ErrorBoundary';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  useSessionLifecycle();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname?.includes('/login');
  const isResidentPortal = ['/resident', '/visitors', '/complaints', '/notices', '/payments', '/amenities/bookings'].includes(pathname ?? '');

  // Admin Dashboard & Auth Login Pages are full desktop/responsive apps — bypass mobile device frame
  if (isAdmin || isAuthPage) {
    return (
      <ErrorBoundary>
        {children}
        <Toast />
      </ErrorBoundary>
    );
  }


  return (
    <div className="mobile-app-container">
      <div className={`device-wrapper${isResidentPortal ? ' device-wrapper-resident' : ''}`}>
        <div className="device-notch" aria-hidden="true">
          <div className="device-notch-camera"></div>
        </div>

        <div className={`phone-screen${isResidentPortal ? ' phone-screen-resident' : ''}`}>
          <PhoneStatusBar />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toast />
          <ModalRoot />
        </div>
      </div>
    </div>
  );
};
