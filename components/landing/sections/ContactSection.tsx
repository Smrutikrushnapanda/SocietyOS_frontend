'use client';

import React, { useState } from 'react';
import s from './ContactSection.module.css';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.email.trim()) {
      alert('Please fill out Name, Mobile Number, and Email.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <section id="contact" className={s.section}>
      <div className={s.container}>
        <div className={s.grid}>
          {/* Left: Contact Info */}
          <div className={s.infoCol}>
            <div className={s.badge}>
              <span>📞</span> Get In Touch
            </div>
            <h2 className={s.title}>
              Have Questions? <br />
              <span className={s.highlight}>Let’s Connect</span>
            </h2>
            <p className={s.desc}>
              Request a customized live demo for your RWA committee, or schedule an on-campus security
              assessment. Our team responds within 2 business hours.
            </p>

            <div className={s.contactCards}>
              <div className={s.contactItem}>
                <div className={s.itemIcon}>📍</div>
                <div>
                  <div className={s.itemTitle}>Office Location</div>
                  <div className={s.itemVal}>Bhubaneswar, Odisha, India</div>
                </div>
              </div>

              <div className={s.contactItem}>
                <div className={s.itemIcon}>✉️</div>
                <div>
                  <div className={s.itemTitle}>Email Address</div>
                  <div className={s.itemVal}>support@societyos.app</div>
                </div>
              </div>

              <div className={s.contactItem}>
                <div className={s.itemIcon}>📞</div>
                <div>
                  <div className={s.itemTitle}>Direct Phone / WhatsApp</div>
                  <div className={s.itemVal}>+91 73811 42451</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className={s.formCard}>
            {submitted && (
              <div className={s.successAlert}>
                <span>✓</span>
                <span>
                  Thank you, <strong>{formData.name}</strong>! Your demo request has been received. Our
                  representative will call you at <strong>{formData.mobile}</strong> shortly.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={s.formGroup}>
                <label className={s.label}>
                  Full Name <span className={s.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smruti Panda"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={s.input}
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.label}>
                  Mobile Number <span className={s.requiredStar}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 7381142451"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className={s.input}
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.label}>
                  Email Address <span className={s.requiredStar}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. president@greenwood.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={s.input}
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.label}>Message / Requirements</label>
                <textarea
                  placeholder="Tell us about your society (number of flats, current gate setup, specific requirements)..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className={s.textarea}
                />
              </div>

              <button type="submit" className={s.submitBtn}>
                Send Message / Request Demo →
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
