'use client';

import React from 'react';

export const DemoTopBar: React.FC = () => {
  return (
    <div className="demo-top-bar">
      <span style={{ fontSize: '0.75rem', color: 'var(--neutral)', fontWeight: 600 }}>
        PROTOTYPE:
      </span>
      <a href="/admin/index.html">Admin Dashboard</a>
      <a href="/" className="active">
        Resident App
      </a>
      <a href="/guard/index.html">Guard Gate App</a>
    </div>
  );
};
