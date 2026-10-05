'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogoGuardShield,
  IconMobileOutline,
  IconArrowRight
} from './AuthLogos';
import {
  cleanPhoneNumber,
  formatIndianPhoneDisplay,
  getOTPProvider,
  TEST_PERSONAS
} from '../../lib/auth/otpProvider';
import { useAuthStore, useToastStore } from '../../store';

export const GuardLoginPage: React.FC = () => {
  const router = useRouter();
  const { login } = useAuthStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [requestId, setRequestId] = useState('');
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendTimer]);

  const handleSendOTP = async (targetPhone?: string) => {
    const raw = targetPhone || phone;
    const clean = cleanPhoneNumber(raw);
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const provider = getOTPProvider();
      const res = await provider.sendOTP({ phone: clean, role: 'guard' });
      if (res.success) {
        setRequestId(res.requestId);
        setMockOtp(res.mockOtp || '123456');
        setStep('otp');
        setResendTimer(30);
        setOtpValues(['', '', '', '', '', '']);
        showToast(res.message);
        setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Failed to send WhatsApp OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpBoxChange = (index: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6);
      if (digits) {
        const next = [...otpValues];
        for (let i = 0; i < 6; i++) next[i] = digits[i] || '';
        setOtpValues(next);
        otpInputsRef.current[Math.min(digits.length, 5)]?.focus();
        if (digits.length === 6) handleVerifyOTP(digits);
      }
      return;
    }

    const digit = val.replace(/\D/g, '');
    const next = [...otpValues];
    next[index] = digit;
    setOtpValues(next);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValues.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const provider = getOTPProvider();
      const res = await provider.verifyOTP({
        phone: cleanPhoneNumber(phone),
        role: 'guard',
        otp: code,
        requestId
      });

      if (res.success && res.user) {
        login(res.user);
        showToast(`Guard Authenticated: ${res.user.name}`);
        router.push('/guard');
      } else {
        setErrorMessage(res.error || 'Invalid OTP code.');
      }
    } catch {
      setErrorMessage('Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const personas = TEST_PERSONAS.guard;

  return (
    <div className="auth-root-container">
      {/* Background Image Exactly Matches guard_login_bg.png */}
      <div className="auth-bg-exact auth-bg-guard-exact" />

      <div className="auth-main-wrapper">
        <div className="auth-mobile-card-col">
          {/* Header Branding */}
          <div className="auth-brand-head">
            <div className="auth-brand-logo-icon">
              <LogoGuardShield size={68} />
            </div>
            <h1 className="auth-brand-title guard-brand">
              Guard <span>App</span>
            </h1>
            <p className="auth-brand-subtitle">Secure Communities, Smarter Living</p>
          </div>

          {/* White Floating Card */}
          <div className="auth-exact-card">
            <h2 className="auth-card-welcome-title">Welcome Back</h2>
            <p className="auth-card-welcome-sub">
              {step === 'phone'
                ? 'Login with your security post registered mobile number'
                : `Enter the 6-digit WhatsApp code sent to ${formatIndianPhoneDisplay(cleanPhoneNumber(phone))}`}
            </p>

            {errorMessage && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  marginBottom: '14px'
                }}
              >
                {errorMessage}
              </div>
            )}

            {step === 'phone' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendOTP();
                }}
              >
                {/* Mobile Number Input */}
                <div className="auth-exact-input-wrap guard-focus">
                  <span className="auth-input-icon">
                    <IconMobileOutline size={18} />
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="auth-exact-input"
                    placeholder="Mobile Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    autoFocus
                    required
                  />
                </div>

                {/* Primary Blue WhatsApp OTP Button */}
                <button
                  type="submit"
                  className="auth-btn-primary-exact guard-btn"
                  disabled={isLoading || cleanPhoneNumber(phone).length < 10}
                  style={{ marginTop: '14px' }}
                >
                  <span>{isLoading ? 'Sending WhatsApp OTP...' : 'Send WhatsApp OTP'}</span>
                  <IconArrowRight size={18} />
                </button>
              </form>
            ) : (
              /* 6-Digit WhatsApp OTP Screen */
              <div>
                <div className="auth-otp-input-boxes">
                  {otpValues.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpInputsRef.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="auth-otp-single-box guard-focus"
                      value={v}
                      onChange={(e) => handleOtpBoxChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="auth-btn-primary-exact guard-btn"
                  onClick={() => handleVerifyOTP()}
                  disabled={isLoading || otpValues.join('').length !== 6}
                >
                  <span>{isLoading ? 'Verifying OTP...' : 'Login →'}</span>
                  <IconArrowRight size={18} />
                </button>

                {/* Development Mock OTP Banner */}
                {mockOtp && (
                  <div className="auth-dev-pill-banner">
                    <span className="auth-dev-pill-text">
                      Mock WhatsApp OTP: <strong>{mockOtp}</strong>
                    </span>
                    <button
                      type="button"
                      className="auth-dev-autofill-action"
                      onClick={() => {
                        setOtpValues(mockOtp.split(''));
                        handleVerifyOTP(mockOtp);
                      }}
                    >
                      1-Tap Auto Fill
                    </button>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '14px',
                    fontSize: '0.75rem'
                  }}
                >
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                    onClick={() => {
                      setStep('phone');
                      setErrorMessage(null);
                    }}
                  >
                    ← Change Number
                  </button>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#0f4c81', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => handleSendOTP()}
                    disabled={resendTimer > 0}
                  >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend WhatsApp OTP'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick 1-Click Dev Test Profiles */}
            <div className="auth-test-personas-tray">
              <div className="auth-test-personas-head">
                <span>⚡ 1-Click Test Guard Numbers</span>
              </div>
              {personas.map((p) => (
                <button
                  key={p.phone}
                  type="button"
                  className="auth-test-persona-item"
                  onClick={() => {
                    setPhone(p.phone);
                    handleSendOTP(p.phone);
                  }}
                >
                  <div>
                    <div className="auth-test-persona-name">{p.name}</div>
                    <div className="auth-test-persona-sub">{p.badge} • +91 {p.phone}</div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0f4c81' }}>
                    Send OTP →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Role Portal Switcher */}
          <div className="auth-bottom-nav-strip">
            <span className="auth-bottom-nav-label">Portals:</span>
            <Link href="/admin/login" className="auth-bottom-nav-link">
              Admin
            </Link>
            <Link href="/resident/login" className="auth-bottom-nav-link">
              Resident
            </Link>
            <span className="auth-bottom-nav-link active-guard">Guard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
