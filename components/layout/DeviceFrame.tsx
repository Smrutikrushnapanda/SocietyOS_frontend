'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PhoneStatusBar } from './PhoneStatusBar';
import { Toast } from '../common/Toast';
import { ModalRoot } from '../modals/ModalRoot';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname?.includes('/login');

  // Admin Dashboard & Auth Login Pages are full desktop/responsive apps — bypass mobile device frame
  if (isAdmin || isAuthPage) {
    return (
      <>
        {children}
        <Toast />
      </>
    );
  }


  return (
    <div className="mobile-app-container">
      <div className="device-wrapper">
        <div className="device-notch">
          <div className="device-notch-camera"></div>
        </div>

        <div className="phone-screen">
          <PhoneStatusBar />
          {children}
          <Toast />
          <ModalRoot />
        </div>
      </div>
    </div>
  );
};
