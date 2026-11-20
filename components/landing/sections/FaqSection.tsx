'use client';

import React, { useState } from 'react';
import s from './FaqSection.module.css';

const FAQS = [
  {
    q: 'What is SocietyOS and who is it designed for?',
    a: 'SocietyOS is an integrated residential operating platform designed for apartment associations, gated residential layouts, and RWAs to manage smart gate security, automatic maintenance collection, resident requests, and financial accounting.',
  },
  {
    q: 'How long does onboarding and data migration take?',
    a: 'Our team assists you throughout. Once you provide your flat directory in Excel/CSV, your entire society campus, residents, staff directory, and billing formulas are configured within 24 to 48 hours.',
  },
  {
    q: 'Are mobile applications available for guards and residents?',
    a: 'Yes! Both Android and iOS apps are available for residents to pre-approve guests and pay dues. Security guards receive an intuitive high-contrast tablet/mobile app optimized for camera check-in.',
  },
  {
    q: 'Can we collect maintenance dues through UPI and payment gateways?',
    a: 'Yes. SocietyOS integrates with Razorpay, UPI QR codes, and net banking. Receipts are generated automatically and arrears are reconciled in real-time with zero manual ledger work.',
  },
  {
    q: 'Is our resident and society data secure and private?',
    a: 'All data is encrypted in transit and at rest with strict role-based access control. Phone numbers are masked for delivery partners and audit logs are permanently stored.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className={s.section}>
      <div className={s.container}>
        <div className={s.header}>
          <div className={s.badge}>
            <span>❓</span> Common Questions
          </div>
          <h2 className={s.title}>Frequently Asked Questions</h2>
          <p className={s.subtitle}>
            Have questions about implementation, pricing, or security? Find your answers here.
          </p>
        </div>

        <div className={s.list}>
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={faq.q} className={`${s.item} ${isOpen ? s.itemOpen : ''}`}>
                <button
                  type="button"
                  className={s.questionBtn}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  <span>{faq.q}</span>
                  <span className={s.indicator}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <div className={s.answer}>{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
