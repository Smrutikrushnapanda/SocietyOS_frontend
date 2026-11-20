'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import apiClient from '../../../lib/api/client';
import s from './Navbar.module.css';

interface WeatherInfo {
  temperature: number;
  condition: string;
  location: string;
}

export default function Navbar() {
  const [weather, setWeather] = useState<WeatherInfo>({
    temperature: 28,
    condition: 'Sunny',
    location: 'Bhubaneswar',
  });

  const fetchWeather = useCallback(async () => {
    try {
      const res = await apiClient.get('/weather/current');
      if (res.data?.success && res.data?.data) {
        setWeather({
          temperature: Math.round(res.data.data.temperatureC ?? 28),
          condition: res.data.data.condition ?? 'Clear',
          location: res.data.data.location ?? 'Bhubaneswar',
        });
      }
    } catch {
      // Fallback smoothly
    }
  }, []);

  useEffect(() => {
    void fetchWeather();
  }, [fetchWeather]);

  return (
    <header className={s.header}>
      <div className={s.headerContainer}>
        <Link href="/" className={s.brand}>
          <div className={s.brandLogo}>S</div>
          <div className={s.brandText}>
            <span className={s.brandTitle}>SocietyOS</span>
            <span className={s.brandSubtitle}>Intelligent Living</span>
          </div>
        </Link>

        <nav className={s.navMenu} aria-label="Main Navigation">
          <Link href="#security" className={s.navLink}>Security</Link>
          <Link href="#mobile-app" className={s.navLink}>Mobile App</Link>
          <Link href="#accounting" className={s.navLink}>Accounting</Link>
          <Link href="#features" className={s.navLink}>Features</Link>
          <Link href="#testimonials" className={s.navLink}>Testimonials</Link>
          <Link href="#faq" className={s.navLink}>FAQ</Link>
          <Link href="#contact" className={s.navLink}>Contact Us</Link>
        </nav>

        <div className={s.navActions}>
          <div className={s.weatherWidget}>
            <span className={s.weatherDot} />
            <span>🌤️ {weather.location} {weather.temperature}°C</span>
          </div>
          <Link href="/login" className={s.btnSignIn}>Sign in</Link>
          <Link href="/admin/login" className={s.btnGetStarted}>
            Get Started →
          </Link>
        </div>
      </div>
    </header>
  );
}
