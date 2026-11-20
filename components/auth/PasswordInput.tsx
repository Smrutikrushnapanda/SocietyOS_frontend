'use client';

import React, { useState } from 'react';
import { IconEyeOffOutline, IconEyeOutline, IconLockOutline } from './AuthLogos';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  wrapClassName?: string;
  style?: React.CSSProperties;
  autoComplete?: string;
}

/** Shared password field with visibility toggle using AuthLogos icons and auth.css styling. */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = 'Password',
  disabled = false,
  required = true,
  minLength,
  wrapClassName = 'auth-exact-input-wrap',
  style,
  autoComplete,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className={wrapClassName} style={style}>
      <span className="auth-input-icon">
        <IconLockOutline size={18} />
      </span>
      <input
        type={visible ? 'text' : 'password'}
        className="auth-exact-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="auth-eye-btn"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        disabled={disabled}
      >
        {visible ? <IconEyeOffOutline size={18} /> : <IconEyeOutline size={18} />}
      </button>
    </div>
  );
};
