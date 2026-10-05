'use client';

import React from 'react';
import { useToastStore } from '../../store';
import { IconCheck } from './Icons';

export const Toast: React.FC = () => {
  const { message, visible } = useToastStore();

  if (!visible || !message) return null;

  return (
    <div className="mobile-toast-container" id="mobile-toast">
      <IconCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
};
