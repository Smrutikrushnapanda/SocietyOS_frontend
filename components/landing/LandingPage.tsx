'use client';

import React from 'react';
import Navbar from './sections/Navbar';
import HeroSection from './sections/HeroSection';
import SecuritySection from './sections/SecuritySection';
import MobileAppSection from './sections/MobileAppSection';
import AccountingSection from './sections/AccountingSection';
import OtherFeaturesSection from './sections/OtherFeaturesSection';
import TestimonialsSection from './sections/TestimonialsSection';
import FaqSection from './sections/FaqSection';
import ContactSection from './sections/ContactSection';
import FooterSection from './sections/FooterSection';

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflowX: 'hidden',
      }}
    >
      <Navbar />
      <HeroSection />
      <SecuritySection />
      <MobileAppSection />
      <AccountingSection />
      <OtherFeaturesSection />
      <TestimonialsSection />
      <FaqSection />
      <ContactSection />
      <FooterSection />
    </div>
  );
}
