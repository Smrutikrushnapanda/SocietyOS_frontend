'use client';

import React from 'react';
import s from './TestimonialsSection.module.css';

const TESTIMONIALS = [
  {
    stars: '★★★★★',
    quote:
      '“SocietyOS simplified our operations and reduced manual gate work by 70%. The resident app is so clean that even our senior residents use it effortlessly.”',
    author: 'Rohit Sharma',
    role: 'President, Greenwood Heights (420 Flats)',
    initials: 'RS',
  },
  {
    stars: '★★★★★',
    quote:
      '“Visitor management and online dues collection work flawlessly. We achieved a 98% on-time maintenance collection rate within 2 months of launching.”',
    author: 'Priya Mehta',
    role: 'Secretary, Lotus Heights (280 Flats)',
    initials: 'PM',
  },
  {
    stars: '★★★★★',
    quote:
      '“Excellent support and a very modern, robust platform. Highly recommended for any apartment association looking for complete operational transparency.”',
    author: 'Amit Verma',
    role: 'Treasurer, Riverdale Enclave (550 Flats)',
    initials: 'AV',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className={s.section}>
      <div className={s.container}>
        <div className={s.header}>
          <div className={s.badge}>
            <span>💬</span> Testimonials
          </div>
          <h2 className={s.title}>
            Loved by Societies <br />
            <span className={s.highlight}>Across India</span>
          </h2>
          <p className={s.subtitle}>
            See how apartment associations and gated communities transform their daily administration
            with SocietyOS.
          </p>
        </div>

        <div className={s.grid}>
          {TESTIMONIALS.map((t) => (
            <div key={t.author} className={s.card}>
              <div>
                <div className={s.stars}>{t.stars}</div>
                <p className={s.quote}>{t.quote}</p>
              </div>
              <div className={s.authorRow}>
                <div className={s.avatar}>{t.initials}</div>
                <div>
                  <div className={s.name}>{t.author}</div>
                  <div className={s.role}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
