import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DeviceFrame } from '../components/layout/DeviceFrame';

export const metadata: Metadata = {
  title: 'SocietyOS — Resident Portal',
  description: 'Resident mobile application for Greenwood Heights Housing Society'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DeviceFrame>{children}</DeviceFrame>
      </body>
    </html>
  );
}
