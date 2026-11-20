'use client';

import React from 'react';
import s from './OtherFeaturesSection.module.css';

const FEATURES = [
  {
    icon: '📢',
    title: 'Digital Notice Board',
    desc: 'Broadcast emergency water supply cuts, AGM meeting notices, and festival announcements with delivery receipts.',
  },
  {
    icon: '🔧',
    title: 'Complaints & Helpdesk',
    desc: 'Ticketing system with photo attachments, SLA timers, plumber/electrician assignment, and resident satisfaction ratings.',
  },
  {
    icon: '🗳️',
    title: 'Society Polls & Voting',
    desc: 'Decide clubhouse renovation rules or festival budgets with verifiable digital voting for apartment owners.',
  },
  {
    icon: '🏸',
    title: 'Amenity Booking',
    desc: 'Reserve tennis courts, party halls, and swimming slots with transparent booking calendars and guest rules.',
  },
  {
    icon: '👥',
    title: 'Staff & Maid Attendance',
    desc: 'Track daily check-ins for maids, drivers, security guards, and gardeners with instant entry notifications.',
  },
  {
    icon: '🚗',
    title: 'Vehicle & Parking Slot Registry',
    desc: 'Map allocated parking slots, manage guest parking overflow, and prevent unauthorized campus vehicle blocking.',
  },
];

export default function OtherFeaturesSection() {
  return (
    <section id="features" className={s.section}>
      <div className={s.container}>
        <div className={s.header}>
          <div className={s.badge}>
            <span>⭐</span> More Capabilities
          </div>
          <h2 className={s.title}>
            All the Tools You Need <br />
            <span className={s.highlight}>for a Better Community</span>
          </h2>
          <p className={s.subtitle}>
            Engineered to streamline daily residential management, eliminate committee fatigue,
            and delight apartment owners.
          </p>
        </div>

        <div className={s.grid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={s.card}>
              <div className={s.iconBox}>{f.icon}</div>
              <h3 className={s.cardTitle}>{f.title}</h3>
              <p className={s.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
