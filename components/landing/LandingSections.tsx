'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import s from './LandingSections.module.css';

/* ── 1. Mobile Application Section ────────────────────────────────── */
export function MobileAppSection() {
  const [activeTab, setActiveTab] = useState<'resident' | 'guard' | 'admin'>('resident');

  return (
    <section id="mobile-apps" className={s.mobileSection}>
      <div className={s.sectionContainer}>
        <div className={s.centerHeader}>
          <div className={s.badge}>
            <span>📱</span> MOBILE APPLICATIONS
          </div>
          <h2 className={s.sectionTitle}>
            Powerful Apps for <br />
            <span style={{ color: '#035F4F' }}>Every Stakeholder</span>
          </h2>
          <p className={s.sectionSubtitle}>
            Dedicated mobile apps for Residents, Security Guards, and Society Admins. Access your society anytime, from anywhere.
          </p>
        </div>

        <div className={s.mobileGrid}>
          {/* Feature highlights column */}
          <div className={s.mobileCardsList}>
            <div className={s.appCard}>
              <div className={s.appCardHead}>
                <div className={s.appIcon}>📲</div>
                <h3 className={s.appCardTitle}>Resident App (iOS & Android)</h3>
              </div>
              <p className={s.appCardDesc}>
                Pre-approve delivery partners, pay maintenance invoices via UPI/Cards in 1 tap, raise tracked tickets, and book clubhouses.
              </p>
            </div>

            <div className={s.appCard}>
              <div className={s.appCardHead}>
                <div className={s.appIcon}>🛡️</div>
                <h3 className={s.appCardTitle}>Security Guard App</h3>
              </div>
              <p className={s.appCardDesc}>
                Lightning-fast visitor entry logging with quick camera QR scan, vehicle plate capture, and instant resident call back.
              </p>
            </div>

            <div className={s.appCard}>
              <div className={s.appCardHead}>
                <div className={s.appIcon}>📊</div>
                <h3 className={s.appCardTitle}>Admin & Committee Portal</h3>
              </div>
              <p className={s.appCardDesc}>
                Live collection statistics, staff attendance logs, asset status, digital notice broadcasts, and audit reports on your palm.
              </p>
            </div>

            <div className={s.storeBadgesRow} style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
              <div
                style={{
                  background: '#0F172A',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <span>▶</span> Google Play
              </div>
              <div
                style={{
                  background: '#0F172A',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <span>🍏</span> App Store
              </div>
            </div>
          </div>

          {/* Interactive Phone Mockup */}
          <div className={s.phoneMockupWrapper}>
            <div className={s.phoneFrame}>
              <div className={s.phoneScreen}>
                <div className={s.screenHeader}>
                  <div className={s.screenUserRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className={s.screenAvatar}>SP</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '750' }}>Smruti Panda</div>
                        <div style={{ fontSize: '11px', opacity: 0.85 }}>Greenwood Heights</div>
                      </div>
                    </div>
                    <span className={s.screenFlatBadge}>Flat B-402</span>
                  </div>
                </div>

                {/* Tab switch inside mockup */}
                <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', gap: '4px', margin: '10px 14px 4px', borderRadius: '10px' }}>
                  {(['resident', 'guard', 'admin'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '7px',
                        border: 'none',
                        background: activeTab === tab ? '#035F4F' : 'transparent',
                        color: activeTab === tab ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className={s.screenBody}>
                  {activeTab === 'resident' && (
                    <>
                      <div className={s.screenActionCard}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Pending Maintenance</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#035F4F' }}>₹3,500 DUE</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', background: '#035F4F', color: '#fff', padding: '6px 12px', borderRadius: '8px' }}>Pay Now</span>
                      </div>
                      <div className={s.screenActionCard}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Pre-approve Visitor</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Create quick WhatsApp pass</div>
                        </div>
                        <span style={{ fontSize: '16px' }}>🎟️</span>
                      </div>
                      <div className={s.screenActionCard}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Clubhouse Booking</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Available slot: Tomorrow 6 PM</div>
                        </div>
                        <span style={{ fontSize: '16px' }}>🏸</span>
                      </div>
                    </>
                  )}

                  {activeTab === 'guard' && (
                    <>
                      <div style={{ background: '#035F4F', color: '#fff', padding: '16px', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '4px' }}>📷</div>
                        <div style={{ fontSize: '13px', fontWeight: '750' }}>Scan Visitor QR Code</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>Hold camera over resident pass</div>
                      </div>
                      <div className={s.screenActionCard}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Courier Logged</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Amazon • Flat A-1103</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981' }}>Allowed</span>
                      </div>
                    </>
                  )}

                  {activeTab === 'admin' && (
                    <>
                      <div className={s.screenActionCard}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Monthly Collection Rate</div>
                          <div style={{ fontSize: '18px', fontWeight: '850', color: '#035F4F' }}>86% (₹12.45L)</div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#16A085' }}>+12%</span>
                      </div>
                      <div className={s.screenActionCard}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Staff On Duty</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>14 of 16 Guards & Housekeeping</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', background: '#e6f4f1', color: '#035F4F', padding: '4px 8px', borderRadius: '6px' }}>Active</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 2. Accounting & Financial Management Section ─────────────────── */
export function AccountingSection() {
  const ACCOUNTING_POINTS = [
    {
      icon: '🧾',
      title: 'Automatic Maintenance Billing',
      desc: 'Set flat rates, sq. ft formulas, and scheduled automated WhatsApp invoice generation.',
    },
    {
      icon: '💳',
      title: 'Online Payments (Razorpay / UPI)',
      desc: 'Instant zero-reconciliation dues collection with automated payment receipts.',
    },
    {
      icon: '📈',
      title: 'Real-time Expense Tracking',
      desc: 'Vendor vouchers, diesel generator logs, and petty cash recorded with approval workflows.',
    },
    {
      icon: '📑',
      title: 'Detailed Reports & Excel Export',
      desc: 'Balance sheets, trial balance, and audit-ready P&L statements generated in one click.',
    },
    {
      icon: '🔒',
      title: 'Immutable Audit Logs',
      desc: 'Every fee edit, receipt cancellation, and manual ledger adjustment is digitally timestamped.',
    },
  ];

  return (
    <section id="accounting" className={s.accountingSection}>
      <div className={s.sectionContainer}>
        <div className={s.accountingGrid}>
          {/* Left: Financial visual breakdown card */}
          <div className={s.accountingVisualCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Financial Overview</span>
                <div style={{ fontSize: '20px', fontWeight: '850', color: '#0f172a' }}>October 2026</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', background: '#e6f4f1', color: '#035F4F', padding: '5px 10px', borderRadius: '8px' }}>
                Audited Live
              </span>
            </div>

            <div className={s.ringWrapper}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'conic-gradient(#035F4F 0% 86%, #e2e8f0 86% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '850', fontSize: '16px', color: '#035F4F' }}>
                  86%
                </div>
              </div>
              <div className={s.ringStats}>
                <span className={s.ringBig}>₹12,45,000</span>
                <span className={s.ringSub}>Collected of ₹14,42,000 Total Dues</span>
              </div>
            </div>

            <div>
              <div className={s.ledgerRow}>
                <span className={s.ledgerLabel}>Maintenance Collections</span>
                <span className={s.ledgerAmount}>₹12,45,080</span>
              </div>
              <div className={s.ledgerRow}>
                <span className={s.ledgerLabel}>Pending Arrears (42 Flats)</span>
                <span style={{ fontWeight: '800', color: '#f59e0b' }}>₹1,96,920</span>
              </div>
              <div className={s.ledgerRow}>
                <span className={s.ledgerLabel}>Monthly Society Expenses</span>
                <span style={{ fontWeight: '800', color: '#ef4444' }}>₹7,12,000</span>
              </div>
              <div className={s.ledgerRow} style={{ borderBottom: 'none' }}>
                <span className={s.ledgerLabel}>Society Sinking Reserve</span>
                <span style={{ fontWeight: '800', color: '#16A085' }}>₹54,20,000</span>
              </div>
            </div>
          </div>

          {/* Right: Copy & Checklist */}
          <div>
            <div className={s.badge}>
              <span>📊</span> TRANSPARENT & SIMPLE
            </div>
            <h2 className={s.sectionTitle}>
              Easy Accounting & <br />
              <span style={{ color: '#035F4F' }}>Financial Management</span>
            </h2>
            <p className={s.sectionSubtitle} style={{ marginBottom: '28px' }}>
              Track maintenance dues, generate automated receipts, manage society vendor expenses, and get detailed financial audit reports — all in one place.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {ACCOUNTING_POINTS.map((pt) => (
                <div key={pt.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e6f4f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {pt.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '750', color: '#0f172a' }}>{pt.title}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.45 }}>{pt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Other Features Grid (6+ cards) ────────────────────────────── */
export function OtherFeaturesSection() {
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

  return (
    <section id="features" className={s.otherFeaturesSection}>
      <div className={s.sectionContainer}>
        <div className={s.centerHeader}>
          <div className={s.badge}>
            <span>⭐</span> MORE FEATURES
          </div>
          <h2 className={s.sectionTitle}>
            All the Tools You Need <br />
            <span style={{ color: '#035F4F' }}>for a Better Community</span>
          </h2>
          <p className={s.sectionSubtitle}>
            Engineered to streamline daily residential management, eliminate committee fatigue, and delight apartment owners.
          </p>
        </div>

        <div className={s.featuresGrid6}>
          {FEATURES.map((f) => (
            <div key={f.title} className={s.featureBox}>
              <div className={s.featureIconCircle}>{f.icon}</div>
              <h3 className={s.featureBoxTitle}>{f.title}</h3>
              <p className={s.featureBoxDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 4. Testimonials Section ──────────────────────────────────────── */
export function TestimonialsSection() {
  const TESTIMONIALS = [
    {
      stars: '★★★★★',
      quote:
        '“SocietyOS simplified our operations and reduced manual gate work by 70%. The resident app is so clean that even our senior residents use it effortlessly.”',
      author: 'Rohit Sharma',
      role: 'President, Greenwood Heights',
      initials: 'RS',
    },
    {
      stars: '★★★★★',
      quote:
        '“Visitor management and online dues collection work flawlessly. We achieved a 98% on-time maintenance collection rate within 2 months of launching.”',
      author: 'Priya Mehta',
      role: 'Secretary, Lotus Heights',
      initials: 'PM',
    },
    {
      stars: '★★★★★',
      quote:
        '“Excellent support and a very modern, robust platform. Highly recommended for any apartment association looking for complete operational transparency.”',
      author: 'Amit Verma',
      role: 'Treasurer, Riverdale Enclave',
      initials: 'AV',
    },
  ];

  return (
    <section id="testimonials" className={s.testimonialsSection}>
      <div className={s.sectionContainer}>
        <div className={s.centerHeader}>
          <div className={s.badge}>
            <span>💬</span> TESTIMONIALS
          </div>
          <h2 className={s.sectionTitle}>
            Loved by Societies <br />
            <span style={{ color: '#035F4F' }}>Across India</span>
          </h2>
          <p className={s.sectionSubtitle}>
            See how apartment associations and gated communities transform their daily administration with SocietyOS.
          </p>
        </div>

        <div className={s.testimonialsGrid}>
          {TESTIMONIALS.map((t) => (
            <div key={t.author} className={s.testimonialCard}>
              <div>
                <div className={s.starsRow}>{t.stars}</div>
                <p className={s.testimonialQuote}>{t.quote}</p>
              </div>
              <div className={s.authorRow}>
                <div className={s.authorAvatar}>{t.initials}</div>
                <div>
                  <div className={s.authorName}>{t.author}</div>
                  <div className={s.authorRole}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 5. FAQ Section ───────────────────────────────────────────────── */
export function FaqSection() {
  const FAQS = [
    {
      q: 'What is SocietyOS?',
      a: 'SocietyOS is an all-in-one residential society management operating system designed for gated communities, apartment complexes, and RWAs to manage gate security, maintenance billing, complaints, and resident communication.',
    },
    {
      q: 'How does society onboarding and setup work?',
      a: 'We provide assisted onboarding. Send us your society flat directory in Excel/CSV, and our team sets up your towers, residents, vehicles, and billing rules within 24 to 48 hours.',
    },
    {
      q: 'Is there a mobile app for residents and security guards?',
      a: 'Yes! Both Android and iOS apps are available for residents to approve guests and pay dues. Security guards get a specialized tablet/mobile interface optimized for fast camera check-ins.',
    },
    {
      q: 'Can we import our existing accounting and resident data?',
      a: 'Absolutely. You can import resident lists, outstanding dues, past payment history, and vendor directories directly via our bulk Excel import tool.',
    },
    {
      q: 'Is there any setup fee or long-term lock-in contract?',
      a: 'No hidden setup fees or rigid lock-in contracts. We offer month-to-month and annual billing with a 30-day money-back guarantee.',
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className={s.faqSection}>
      <div className={s.sectionContainer}>
        <div className={s.centerHeader}>
          <div className={s.badge}>
            <span>❓</span> FAQ
          </div>
          <h2 className={s.sectionTitle}>Frequently Asked Questions</h2>
          <p className={s.sectionSubtitle}>
            Everything you need to know about setting up and running SocietyOS in your society.
          </p>
        </div>

        <div className={s.faqList}>
          {FAQS.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={faq.q} className={`${s.faqItem} ${isOpen ? s.faqItemOpen : ''}`}>
                <button
                  type="button"
                  className={s.faqQuestionBtn}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: '18px', color: '#035F4F' }}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <div className={s.faqAnswer}>{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── 6. Contact Us Section (Form: name, mobile, email, message) ─────── */
export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile || !formData.email) {
      alert('Please fill in Name, Mobile Number, and Email.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <section id="contact" className={s.contactSection}>
      <div className={s.sectionContainer}>
        <div className={s.contactGrid}>
          {/* Left contact info */}
          <div className={s.contactInfoCard}>
            <div className={s.badge}>
              <span>📞</span> GET IN TOUCH
            </div>
            <h2 className={s.sectionTitle} style={{ textAlign: 'left' }}>
              Have Questions? <br />
              <span style={{ color: '#035F4F' }}>Let’s Talk</span>
            </h2>
            <p className={s.sectionSubtitle} style={{ textAlign: 'left' }}>
              Schedule a personalized 15-minute live demo for your RWA committee members or request an on-campus demonstration.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '20px' }}>📍</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '750', color: '#0f172a' }}>Headquarters</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Bhubaneswar, Odisha, India</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '20px' }}>✉️</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '750', color: '#0f172a' }}>Email Us</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>hello@societyos.app</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '20px' }}>📞</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '750', color: '#0f172a' }}>Direct Phone</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>+91 73811 42451</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Small Contact Form */}
          <div className={s.contactFormCard}>
            {submitted ? (
              <div className={s.formSuccess}>
                ✓ Thank you, {formData.name}! Your request has been received. Our society specialist will call you at {formData.mobile} shortly.
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smruti Panda"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={s.formInput}
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>
                  Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 7381142451"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className={s.formInput}
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. president@greenwood.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={s.formInput}
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>Message / Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your society (number of flats, current gate setup, requirements)..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className={s.formTextarea}
                />
              </div>

              <button type="submit" className={s.btnSubmit}>
                Send Message / Request Demo →
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 7. Footer Section ────────────────────────────────────────────── */
export function FooterSection() {
  return (
    <footer className={s.footer}>
      <div className={s.footerContainer}>
        <div className={s.footerGrid}>
          <div className={s.footerBrandCol}>
            <div className={s.footerBrandTitle}>
              <div className={s.footerBrandBadge}>S</div>
              <span>SocietyOS</span>
            </div>
            <p className={s.footerDesc}>
              The calm operating system for modern residential communities, gated apartments, and housing societies across India.
            </p>
          </div>

          <div>
            <div className={s.footerColTitle}>Portals & Apps</div>
            <ul className={s.footerLinkList}>
              <li><Link href="/admin/login" className={s.footerLink}>Admin / Committee Portal</Link></li>
              <li><Link href="/resident/login" className={s.footerLink}>Resident Web App</Link></li>
              <li><Link href="/guard/login" className={s.footerLink}>Guard Gate Terminal</Link></li>
              <li><Link href="/login" className={s.footerLink}>Universal Login</Link></li>
            </ul>
          </div>

          <div>
            <div className={s.footerColTitle}>Product Modules</div>
            <ul className={s.footerLinkList}>
              <li><Link href="#security" className={s.footerLink}>Security & Gate ANPR</Link></li>
              <li><Link href="#accounting" className={s.footerLink}>Maintenance & Accounting</Link></li>
              <li><Link href="#mobile-apps" className={s.footerLink}>Resident Mobile App</Link></li>
              <li><Link href="#features" className={s.footerLink}>Complaints & Helpdesk</Link></li>
            </ul>
          </div>

          <div>
            <div className={s.footerColTitle}>Legal & Company</div>
            <ul className={s.footerLinkList}>
              <li><Link href="/privacy" className={s.footerLink}>Privacy Policy</Link></li>
              <li><Link href="/terms" className={s.footerLink}>Terms of Service</Link></li>
              <li><Link href="#contact" className={s.footerLink}>Contact Support</Link></li>
              <li><Link href="#faq" className={s.footerLink}>Knowledge Base / FAQ</Link></li>
            </ul>
          </div>
        </div>

        <div className={s.footerBottom}>
          <div>© {new Date().getFullYear()} SocietyOS Inc. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Bhubaneswar, India</span>
            <span>•</span>
            <span>Made with ❤️ for calmer communities</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
