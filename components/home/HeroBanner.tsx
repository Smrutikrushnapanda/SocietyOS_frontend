'use client';

import React from 'react';
import { useModalStore } from '../../store';

export const HeroBanner: React.FC = () => {
  const { openModal } = useModalStore();

  return (
    <div className="resident-hero-card">
      <img
        src="/assets/resident_home_hero_3d.jpg"
        alt="Smart Home Suite"
        className="resident-hero-img"
        onError={(e) => {
          // fallback if direct path needed
          (e.target as HTMLImageElement).src = '/shared/assets/resident_home_hero_3d.jpg';
        }}
      />
      <div className="resident-hero-overlay"></div>
      <div className="resident-hero-content">
        <div className="resident-hero-title">
          <h4>Smart Living Suite</h4>
          <p>IoT Access & FastGate Active</p>
        </div>
        <button
          className="hero-chip-badge"
          onClick={() => openModal('qrGatePass')}
        >
          <span>Entry QR</span>
        </button>
      </div>
    </div>
  );
};
