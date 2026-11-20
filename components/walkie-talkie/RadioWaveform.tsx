'use client';

import React from 'react';
import clsx from 'clsx';

interface RadioWaveformProps {
  active: boolean;
  tone?: 'orange' | 'emerald' | 'red';
  label?: string;
}

const BAR_HEIGHTS = [32, 58, 86, 44, 94, 68, 100, 72, 92, 48, 82, 56, 38, 64];

export const RadioWaveform: React.FC<RadioWaveformProps> = ({
  active,
  tone = 'orange',
  label = 'Audio channel waveform',
}) => {
  return (
    <span
      className={clsx('wt-waveform', `tone-${tone}`, active && 'is-active')}
      role="img"
      aria-label={active ? `${label} transmitting` : `${label} idle`}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={index}
          className="wt-wave-bar"
          style={{
            height: `${height}%`,
            animationDelay: `${(index % 7) * 90}ms`,
          }}
        />
      ))}
    </span>
  );
};
