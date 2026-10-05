'use client';

import React from 'react';
import { useModalStore } from '../../store';
import { IconPool } from '../common/Icons';

export const AmenitiesSpotlight: React.FC = () => {
  const { openModal } = useModalStore();

  return (
    <div
      className="amenities-spotlight-card"
      onClick={() => openModal('amenitiesBooking')}
      style={{ cursor: 'pointer' }}
    >
      <div className="amenities-img-wrap">
        <img
          src="/assets/resident_amenities_3d.jpg"
          alt="Clubhouse & Infinity Pool"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/shared/assets/resident_amenities_3d.jpg';
          }}
        />
        <span className="amenities-badge-float" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <IconPool size={14} />
          <span>Infinity Pool: Open (26°C)</span>
        </span>
      </div>
      <div className="amenities-body">
        <div>
          <div className="amenities-title">Society Clubhouse & Fitness Center</div>
          <div className="amenities-sub">Gym active • 6 residents inside • Party hall open</div>
        </div>
        <button
          className="btn btn-sm btn-ghost"
          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          onClick={(e) => {
            e.stopPropagation();
            openModal('amenitiesBooking');
          }}
        >
          Book Slot →
        </button>
      </div>
    </div>
  );
};
