'use client';

import React from 'react';
import Link from 'next/link';
import s from './FooterSection.module.css';

export default function FooterSection() {
  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.grid}>
          {/* Brand Column */}
          <div className={s.brandCol}>
            <Link href="/" className={s.brandRow}>
              <div className={s.brandLogo}>S</div>
              <span className={s.brandName}>SocietyOS</span>
            </Link>
            <p className={s.brandDesc}>
              The calm, modern operating system for residential communities, gated apartments, and housing
              societies across India.
            </p>
          </div>

          {/* Portals & Apps */}
          <div>
            <h4 className={s.colTitle}>Portals & Apps</h4>
            <ul className={s.linksList}>
              <li><Link href="/admin/login" className={s.link}>Admin / Committee Portal</Link></li>
              <li><Link href="/resident/login" className={s.link}>Resident Web App</Link></li>
              <li><Link href="/guard/login" className={s.link}>Guard Gate Terminal</Link></li>
              <li><Link href="/login" className={s.link}>Universal Sign In</Link></li>
            </ul>
          </div>

          {/* Product Modules */}
          <div>
            <h4 className={s.colTitle}>Product Modules</h4>
            <ul className={s.linksList}>
              <li><Link href="#security" className={s.link}>Smart Gate & ANPR</Link></li>
              <li><Link href="#mobile-app" className={s.link}>Resident Mobile App</Link></li>
              <li><Link href="#accounting" className={s.link}>Maintenance & Dues</Link></li>
              <li><Link href="#features" className={s.link}>Complaints Helpdesk</Link></li>
            </ul>
          </div>

          {/* Legal & Company */}
          <div>
            <h4 className={s.colTitle}>Company & Legal</h4>
            <ul className={s.linksList}>
              <li><Link href="/privacy" className={s.link}>Privacy Policy</Link></li>
              <li><Link href="/terms" className={s.link}>Terms of Service</Link></li>
              <li><Link href="#faq" className={s.link}>Help & Knowledge Base</Link></li>
              <li><Link href="#contact" className={s.link}>Contact Sales</Link></li>
            </ul>
          </div>
        </div>

        <div className={s.bottomRow}>
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
