'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAmenityStore, useModalStore } from '../../store';
import { useAmenityImage } from '../../hooks/useAmenityImage';
import { IconPool } from '../common/Icons';
import { Amenity } from '../../types';

interface Props {
  temperature?: number | null;
}

const AmenityCard: React.FC<{ amenity: Amenity; temperature?: number | null }> = ({ amenity, temperature }) => {
  const { openModal } = useModalStore();
  const image = useAmenityImage(amenity.imageFileId ? amenity.id : null);
  const isPool = /pool/i.test(`${amenity.name} ${amenity.category || ''} ${amenity.icon}`);

  return (
    <article className="amenities-spotlight-card amenity-carousel-card">
      <div className="amenities-img-wrap">
        <img
          src={image || '/assets/resident_amenities_3d.jpg'}
          alt={amenity.name}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/shared/assets/resident_amenities_3d.jpg'; }}
        />
        {isPool && temperature != null && (
          <span className="amenities-badge-float" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IconPool size={14} /> <span>{amenity.name}: {amenity.statusText} ({temperature}°C)</span>
          </span>
        )}
        {!isPool && <span className="amenities-badge-float">{amenity.statusText || amenity.status}</span>}
      </div>
      <div className="amenities-body">
        <div className="amenity-card-copy">
          <div className="amenities-title">{amenity.name}</div>
          <div className="amenities-sub">{amenity.description || amenity.location || amenity.category || amenity.statusText}</div>
        </div>
        <button className="btn btn-sm btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0 }} onClick={() => openModal('amenitiesBooking')}>
          Book Slot →
        </button>
      </div>
    </article>
  );
};

export const AmenitiesSpotlight: React.FC<Props> = ({ temperature }) => {
  const { amenities, loadAmenities, hasLoadedAmenities } = useAmenityStore();
  const [slideIndex, setActiveIndex] = useState(0);
  const activeIndex = Math.min(slideIndex, Math.max(0, amenities.length - 1));
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  useEffect(() => { if (!hasLoadedAmenities) void loadAmenities(); }, [hasLoadedAmenities, loadAmenities]);
  useEffect(() => {
    if (amenities.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex(index => (index + 1) % amenities.length), 5000);
    return () => window.clearInterval(timer);
  }, [amenities.length]);

  const moveSlide = (direction: -1 | 1) => {
    setActiveIndex(index => Math.max(0, Math.min(amenities.length - 1, index + direction)));
  };

  return (
    <section className="resident-amenities-section" aria-label="Society amenities">
      <div className="amenity-bookings-toolbar">
        <h3 className="resident-amenities-heading">Society Clubhouse &amp; Fitness Center</h3>
        <Link href="/amenities/bookings" className="btn btn-sm btn-ghost">My bookings</Link>
      </div>
      {amenities.length ? (
        <div
          className="amenity-slider"
          role="region"
          aria-roledescription="carousel"
          aria-label="Society amenities"
          onTouchStart={event => setTouchStartX(event.touches[0]?.clientX ?? null)}
          onTouchEnd={event => {
            if (touchStartX === null) return;
            const deltaX = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
            if (Math.abs(deltaX) > 40) moveSlide(deltaX < 0 ? 1 : -1);
            setTouchStartX(null);
          }}
          onTouchCancel={() => setTouchStartX(null)}
        >
          <div
            className="amenity-slider-track"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {amenities.map((amenity, index) => (
              <div className="amenity-slider-slide" key={amenity.id} aria-hidden={index !== activeIndex}>
                <AmenityCard amenity={amenity} temperature={temperature} />
              </div>
            ))}
          </div>
          {amenities.length > 1 && (
            <div className="amenity-slider-controls">
              <button type="button" className="amenity-slider-arrow" aria-label="Previous amenity" disabled={activeIndex === 0} onClick={() => moveSlide(-1)}>‹</button>
              <div className="amenity-slider-dots" aria-label={`Amenity ${activeIndex + 1} of ${amenities.length}`}>
                {amenities.map((amenity, index) => (
                  <button key={amenity.id} type="button" aria-label={`Show ${amenity.name}`} aria-current={index === activeIndex} className={index === activeIndex ? 'active' : ''} onClick={() => setActiveIndex(index)} />
                ))}
              </div>
              <button type="button" className="amenity-slider-arrow" aria-label="Next amenity" disabled={activeIndex === amenities.length - 1} onClick={() => moveSlide(1)}>›</button>
            </div>
          )}
        </div>
      ) : hasLoadedAmenities ? (
        <div className="amenities-empty-state">No society amenities are available yet.</div>
      ) : null}
    </section>
  );
};
