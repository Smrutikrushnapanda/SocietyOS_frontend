'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '../../types';
import { cleanPhoneNumber, formatIndianPhoneDisplay, useAuthFlow } from '../../hooks/useAuthFlow';
import { TEST_PERSONAS } from '../../lib/auth/otpProvider';
import { IconWhatsApp, IconArrowLeft, IconShield, IconLock } from '../common/Icons';

interface WhatsAppOTPFormProps {
  role: UserRole;
  societyName?: string;
  onSuccessRedirect?: string;
}

export const WhatsAppOTPForm: React.FC<WhatsAppOTPFormProps> = ({
  role,
  onSuccessRedirect,
}) => {
  const router = useRouter();

  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const defaultRedirect =
    role === 'admin' ? '/admin' : role === 'guard' ? '/guard' : '/resident';

  const {
    step,
    phone,
    isLoading,
    errorMessage,
    resendTimer,
    isResendDisabled,
    setPhone,
    setStep,
    setErrorMessage,
    handleSendOTP,
    handleResendOTP,
    handleVerifyOTP,
  } = useAuthFlow({
    role,
    successRedirect: onSuccessRedirect ?? defaultRedirect,
    onSuccess: (redirect) => router.push(redirect),
  });

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleOtpBoxChange = (index: number, val: string) => {
    if (val.length > 1) {
      const cleanDigits = val.replace(/\D/g, '');
      if (cleanDigits.length > 6) return;
      if (cleanDigits) {
        const nextArr = Array(6).fill('');
        for (let i = 0; i < 6; i++) nextArr[i] = cleanDigits[i] ?? '';
        setOtpValues(nextArr);
        otpInputsRef.current[Math.min(cleanDigits.length, 5)]?.focus();
      }
      return;
    }
    const digit = val.replace(/\D/g, '');
    const nextArr = [...otpValues];
    nextArr[index] = digit;
    setOtpValues(nextArr);
    if (digit && index < 5) otpInputsRef.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const personas = TEST_PERSONAS[role] ?? [];

  return (
    <div className="auth-form-wrap">
      {errorMessage && (
        <div className="auth-error-box" role="alert">
          <IconShield size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {step === 'phone' ? (
        <div>
          <h3 className="auth-form-title">
            {role === 'admin'
              ? 'Administrator Login'
              : role === 'guard'
              ? 'Guard Post Sign-In'
              : 'Resident Portal Login'}
          </h3>
          <p className="auth-form-caption">
            Enter your registered Indian mobile number to receive a secure OTP.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); void handleSendOTP(); }}>
            <div className="auth-phone-input-wrap">
              <span className="auth-phone-prefix">
                <span>🇮🇳</span>
                <span>+91</span>
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                className="auth-phone-input"
                placeholder="Enter 10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                autoFocus
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="auth-wa-button"
              disabled={isLoading || cleanPhoneNumber(phone).length < 10}
            >
              <IconWhatsApp size={18} />
              <span>{isLoading ? 'Sending OTP...' : 'Send OTP'}</span>
            </button>
          </form>

          {personas.length > 0 && (
            <div className="auth-personas-section">
              <div className="auth-personas-title">
                <span>⚡ Instant Dev Test Personas</span>
              </div>
              <div className="auth-persona-chip-list">
                {personas.map((p) => (
                  <button
                    key={p.phone}
                    type="button"
                    className="auth-persona-chip"
                    onClick={() => { setPhone(p.phone); void handleSendOTP(p.phone); }}
                    disabled={isLoading}
                  >
                    <div>
                      <div className="auth-persona-name">{p.name}</div>
                      <div className="auth-persona-sub">{p.badge} • +91 {p.phone}</div>
                    </div>
                    <span className="auth-persona-fill-badge">1-Tap Fill →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 className="auth-form-title">Verify OTP</h3>
          <p className="auth-form-caption">
            Enter the 6-digit code sent to{' '}
            <strong style={{ color: '#ffffff' }}>
              {formatIndianPhoneDisplay(cleanPhoneNumber(phone))}
            </strong>
          </p>

          <div className="auth-otp-grid">
            {otpValues.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpInputsRef.current[i] = el; }}
                type="text"
                name={`otp-${i}`}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                inputMode="numeric"
                maxLength={1}
                className={`auth-otp-box ${digit ? 'filled' : ''}`}
                value={digit}
                onChange={(e) => handleOtpBoxChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                disabled={isLoading}
              />
            ))}
          </div>

          <button
            type="button"
            className="auth-wa-button"
            onClick={() => void handleVerifyOTP(otpValues.join(''))}
            disabled={isLoading || otpValues.join('').length !== 6}
          >
            <IconLock size={16} />
            <span>{isLoading ? 'Verifying...' : 'Verify & Continue'}</span>
          </button>

          <div className="auth-aux-row">
            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setStep('phone');
                setErrorMessage(null);
                setOtpValues(['', '', '', '', '', '']);
              }}
            >
              <IconArrowLeft size={14} />
              <span>Change Number</span>
            </button>

            <button
              type="button"
              className="auth-resend-btn"
              onClick={() => void handleResendOTP()}
              disabled={isResendDisabled || isLoading}
            >
              {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend OTP'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
