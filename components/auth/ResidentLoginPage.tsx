'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogoResidentAdmin,
  IconMobileOutline,
  IconArrowRight
} from './AuthLogos';
import {
  cleanPhoneNumber,
  formatIndianPhoneDisplay,
  getOTPProvider,
  TEST_PERSONAS
} from '../../lib/auth/otpProvider';
import { useAuthStore, useToastStore, useResidentStore } from '../../store';

export const ResidentLoginPage: React.FC = () => {
  const router = useRouter();
  const { login } = useAuthStore();
  const { showToast } = useToastStore();
  const { setResident } = useResidentStore();

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
      const res = await provider.sendOTP({ phone: clean, role: 'resident' });
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
        role: 'resident',
        otp: code,
        requestId
      });

      if (res.success && res.user) {
        login(res.user);
        setResident({
          name: res.user.name,
          phone: res.user.phone,
          flat: res.user.flat || 'A-101'
        });
        showToast(`Welcome back, ${res.user.name}!`);
        router.push('/resident');
      } else {
        setErrorMessage(res.error || 'Invalid OTP code.');
      }
    } catch {
      setErrorMessage('Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const personas = TEST_PERSONAS.resident;

  return (
    <div className="auth-root-container">
      {/* Background Image Exactly Matches resident_login_bg.png */}
      <div className="auth-bg-exact auth-bg-resident-exact" />

      <div className="auth-main-wrapper">
        <div className="auth-mobile-card-col">
          {/* Header Branding */}
          <div className="auth-brand-head">
            <div className="auth-brand-logo-icon">
              <LogoResidentAdmin size={68} />
            </div>
            <h1 className="auth-brand-title resident-brand">
              Resident <span>App</span>
            </h1>
            <p className="auth-brand-subtitle">Your Community, Simplified</p>
          </div>

          {/* White Floating Card */}
          <div className="auth-exact-card">
            <h2 className="auth-card-welcome-title">Welcome Back</h2>
            <p className="auth-card-welcome-sub">
              {step === 'phone'
                ? 'Login with your WhatsApp registered mobile number'
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
                <div className="auth-exact-input-wrap">
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

                {/* Primary WhatsApp OTP Button */}
                <button
                  type="submit"
                  className="auth-btn-primary-exact resident-btn"
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
                      className="auth-otp-single-box"
                      value={v}
                      onChange={(e) => handleOtpBoxChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="auth-btn-primary-exact resident-btn"
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
                    style={{ background: 'none', border: 'none', color: '#14532d', fontWeight: 600, cursor: 'pointer' }}
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
                <span>⚡ 1-Click Test Resident Numbers</span>
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
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#14532d' }}>
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
            <span className="auth-bottom-nav-link active">Resident</span>
            <Link href="/guard/login" className="auth-bottom-nav-link">
              Guard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
