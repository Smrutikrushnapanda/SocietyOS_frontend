'use client';

import React from 'react';
import { useToastStore } from '../../store';

export const AdminReportsSection: React.FC = () => {
  const { showToast } = useToastStore();

  const visitor7DayData = [
    { day: 'Mon', count: 42, height: '65%' },
    { day: 'Tue', count: 38, height: '58%' },
    { day: 'Wed', count: 55, height: '82%' },
    { day: 'Thu', count: 49, height: '74%' },
    { day: 'Fri', count: 64, height: '95%' },
    { day: 'Sat', count: 70, height: '100%' },
    { day: 'Sun', count: 58, height: '86%' }
  ];

  const complaintsCategoryData = [
    { cat: 'Plumbing & Drainage', count: 18, pct: 36, color: 'var(--pine)' },
    { cat: 'Electrical & Common Lights', count: 12, pct: 24, color: 'var(--saffron)' },
    { cat: 'Elevator / Lift Issues', count: 8, pct: 16, color: 'var(--danger)' },
    { cat: 'Security / Access Control', count: 7, pct: 14, color: 'var(--pine-light)' },
    { cat: 'Housekeeping & Gardening', count: 5, pct: 10, color: 'var(--neutral)' }
  ];

  return (
    <div className="admin-section active" id="section-reports">
      <div className="section-header">
        <div>
          <h2>Analytics & Gate Activity Reports</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Visual insights generated purely from clean CSS bar metrics.
          </p>
        </div>
        <div className="section-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => showToast('Analytics dataset exported to CSV.')}>
            Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => showToast('Full Excel audit sheet generated & downloaded.')}>
            Export Excel
          </button>
        </div>
      </div>

      <div className="reports-grid">
        {/* Visitor 7-Day Vertical Bar Chart */}
        <div className="chart-card">
          <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Visitor Volume (Last 7 Days)</h3>
          <div
            className="css-bar-chart"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '200px',
              paddingTop: '20px',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            {visitor7DayData.map((d, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  height: '100%',
                  justifyContent: 'flex-end',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--pine)' }}>{d.count}</span>
                <div
                  style={{
                    width: '32px',
                    height: d.height,
                    background: 'linear-gradient(180deg, var(--pine), var(--pine-dark))',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease'
                  }}
                  title={`${d.day}: ${d.count} visitors`}
                ></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral)', marginTop: '4px' }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Complaints by Category Horizontal Bar Chart */}
        <div className="chart-card">
          <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Complaints by Category (YTD)</h3>
          <div className="h-bar-chart" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {complaintsCategoryData.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span>{c.cat}</span>
                  <strong>{c.count} tickets ({c.pct}%)</strong>
                </div>
                <div
                  style={{
                    height: '8px',
                    background: 'var(--surface-sunken)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${c.pct}%`,
                      height: '100%',
                      backgroundColor: c.color,
                      borderRadius: '4px'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
