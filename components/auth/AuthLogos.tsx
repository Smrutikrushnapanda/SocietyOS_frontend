'use client';

import React from 'react';

// Green Skyline + Leaf Icon for Resident App & Admin Portal
export const LogoResidentAdmin: React.FC<{ size?: number; className?: string }> = ({
  size = 72,
  className
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 84 84"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Left Building with Angled Cut Top */}
    <path
      d="M26 33.5L37 25.5V64H26V33.5Z"
      stroke="#1B4D3E"
      strokeWidth="3.2"
      strokeLinejoin="round"
      fill="none"
    />
    <line x1="31.5" y1="36" x2="31.5" y2="40" stroke="#1B4D3E" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="31.5" y1="46" x2="31.5" y2="50" stroke="#1B4D3E" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="31.5" y1="56" x2="31.5" y2="60" stroke="#1B4D3E" strokeWidth="2.5" strokeLinecap="round" />

    {/* Center Tall Building with Pointed Top */}
    <path
      d="M37 20L48 14V64H37V20Z"
      stroke="#2E7D5B"
      strokeWidth="3.2"
      strokeLinejoin="round"
      fill="none"
    />
    <line x1="42.5" y1="26" x2="42.5" y2="30" stroke="#2E7D5B" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="42.5" y1="36" x2="42.5" y2="40" stroke="#2E7D5B" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="42.5" y1="46" x2="42.5" y2="50" stroke="#2E7D5B" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="42.5" y1="56" x2="42.5" y2="60" stroke="#2E7D5B" strokeWidth="2.5" strokeLinecap="round" />

    {/* Right Lower Building */}
    <path
      d="M48 37H58V64H48V37Z"
      stroke="#1B4D3E"
      strokeWidth="3.2"
      strokeLinejoin="round"
      fill="none"
    />

    {/* Elegant Two-tone Green Leaf on Right */}
    <path
      d="M49 61C53 49 66 50 69 50C69 53 68 64 56 64C52 64 49 61 49 61Z"
      fill="#52B788"
    />
    <path
      d="M50 60C56 56 61 54 66 52"
      stroke="#FFFFFF"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M56 62C59 55 66 56 68 56C68 58 67 63 60 63C57 63 56 62 56 62Z"
      fill="#2E7D5B"
    />

    {/* Base Line */}
    <line x1="20" y1="64" x2="68" y2="64" stroke="#1B4D3E" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

// Blue Shield with Guard Officer Avatar for Guard App
export const LogoGuardShield: React.FC<{ size?: number; className?: string }> = ({
  size = 72,
  className
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 84 84"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Blue Shield */}
    <path
      d="M42 12L66 22V42C66 57 56 69 42 74C28 69 18 57 18 42V22L42 12Z"
      fill="#0284C7"
    />

    {/* Officer Cap */}
    <ellipse cx="42" cy="30" rx="13" ry="4" fill="#FFFFFF" />
    <path d="M31 30C31 24.5 36 22 42 22C48 22 53 24.5 53 30H31Z" fill="#FFFFFF" />
    <circle cx="42" cy="26" r="2" fill="#0284C7" />

    {/* Officer Face */}
    <path d="M35 31C35 31 35 41 42 41C49 41 49 31 49 31H35Z" fill="#FFFFFF" />

    {/* Officer Torso / Collar / Shoulders */}
    <path
      d="M26 56C26 47 33 44 38 43L42 49L46 43C51 44 58 47 58 56H26Z"
      fill="#FFFFFF"
    />

    {/* Officer Tie */}
    <polygon points="42,47 39.5,53 42,58 44.5,53" fill="#0284C7" />
  </svg>
);

// UI Icons
export const IconUserOutline: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconLockOutline: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconEyeOutline: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOffOutline: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

export const IconMobileOutline: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
);

export const IconArrowRight: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const IconShieldOutline: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconUsersOutline: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconBarChartOutline: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);
