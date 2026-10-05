'use client';

import React, { useState, useEffect } from 'react';

export const PhoneStatusBar: React.FC = () => {
  const [time, setTime] = useState('09:41');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${mins}`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="phone-status-bar">
      <span>{time}</span>
      <div className="status-bar-icons">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.17 19.57 10.53 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0 0 12 4z" />
        </svg>
        <svg width="18" height="12" viewBox="0 0 24 14" fill="currentColor">
          <rect width="20" height="12" x="1" y="1" rx="3" ry="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect width="14" height="8" x="3" y="3" rx="1" ry="1" />
          <rect width="2" height="4" x="22" y="5" rx="1" />
        </svg>
      </div>
    </div>
  );
};
