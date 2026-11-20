'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SessionStatus } from './SessionStatus';
import { useAuthStore } from '../../store/useAuthStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogoGuardShield,
  IconMobileOutline,
  IconArrowRight,
} from './AuthLogos';
import { PasswordInput } from './PasswordInput';
import { cleanPhoneNumber, formatIndianPhoneDisplay, useAuthFlow } from '../../hooks/useAuthFlow';
import { TEST_PERSONAS } from '../../lib/auth/otpProvider';

export const GuardLoginPage: React.FC = () => {
  const router = useRouter();

  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const {
    step,
    phone,
    password,
    loginMode,
    isLoading,
    errorMessage,
    resendTimer,
    isForgotModalOpen,
    forgotStep,
    forgotPhone,
    forgotOtp,
    newPassword,
    setPhone,
    setPassword,
    setLoginMode,
    setStep,
    setErrorMessage,
    setIsForgotModalOpen,
    setForgotStep,
    setForgotPhone,
    setForgotOtp,
    setNewPassword,
    handleSendOTP,
    handleResendOTP,
    handleVerifyOTP,
    handlePasswordLogin,
    handleSendRecoveryOtp,
    handleVerifyRecoveryOtp,
    handleResetPassword,
    handleLogout,
  } = useAuthFlow({
    role: 'guard',
    successRedirect: '/guard',
    onSuccess: (redirect) => router.push(redirect),
  });

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleOtpBoxChange = (index: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '');
      if (digits.length > 6) return;
      if (digits) {
        const next = Array(6).fill('');
        for (let i = 0; i < 6; i++) next[i] = digits[i] ?? '';
        setOtpValues(next);
        otpInputsRef.current[Math.min(digits.length, 5)]?.focus();
      }
      return;
    }
    const digit = val.replace(/\D/g, '');
    const next = [...otpValues];
    next[index] = digit;
    setOtpValues(next);
    if (digit && index < 5) otpInputsRef.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const personas = TEST_PERSONAS.guard;

  const session = useAuthStore();
  if (!session.isHydrated || session.isRestoring || session.sessionError) return <SessionStatus />;

  return (
    <div className="auth-root-container">
      <div className="auth-bg-exact auth-bg-guard-exact" />

      <div className="auth-main-wrapper">
        <div className="auth-mobile-card-col">
          <div className="auth-brand-head">
            <div className="auth-brand-logo-icon"><LogoGuardShield size={68} /></div>
            <h1 className="auth-brand-title guard-brand">Guard <span>App</span></h1>
            <p className="auth-brand-subtitle">Secure Communities, Smarter Living</p>
          </div>

          <div className="auth-exact-card">
            {/* Login Mode Toggle */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '4px',
              marginBottom: '18px',
            }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: loginMode === 'otp' ? 700 : 500,
                  background: loginMode === 'otp' ? '#ffffff' : 'transparent',
                  color: loginMode === 'otp' ? '#0f4c81' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: loginMode === 'otp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  setLoginMode('otp');
                  setErrorMessage(null);
                }}
              >
                💬 WhatsApp OTP
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: loginMode === 'password' ? 700 : 500,
                  background: loginMode === 'password' ? '#ffffff' : 'transparent',
                  color: loginMode === 'password' ? '#0f4c81' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: loginMode === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  setLoginMode('password');
                  setErrorMessage(null);
                }}
              >
                🔑 Password Login
              </button>
            </div>

            <h2 className="auth-card-welcome-title">Welcome Back</h2>
            <p className="auth-card-welcome-sub">
              {loginMode === 'password'
                ? 'Sign in with your security post registered mobile number and password'
                : step === 'phone'
                ? 'Login with verified WhatsApp OTP sent to your registered mobile number'
                : `Enter the 6-digit OTP sent to ${formatIndianPhoneDisplay(cleanPhoneNumber(phone))}`}
            </p>

            {errorMessage && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
                padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '14px',
              }}>
                {errorMessage}
              </div>
            )}

            {/* Password Login */}
            {loginMode === 'password' && (
              <form onSubmit={(e) => { e.preventDefault(); void handlePasswordLogin(); }}>
                <div className="auth-exact-input-wrap guard-focus">
                  <span className="auth-input-icon"><IconMobileOutline size={18} /></span>
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
                    disabled={isLoading}
                  />
                </div>

                <PasswordInput
                  wrapClassName="auth-exact-input-wrap guard-focus"
                  value={password}
                  onChange={setPassword}
                  disabled={isLoading}
                  autoComplete="current-password"
                  style={{ marginTop: '10px' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0f4c81',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setForgotPhone(phone);
                      setForgotStep('phone');
                      setIsForgotModalOpen(true);
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="auth-btn-primary-exact guard-btn"
                  disabled={isLoading || cleanPhoneNumber(phone).length < 10 || !password}
                  style={{ marginTop: '12px' }}
                >
                  <span>{isLoading ? 'Signing In...' : 'Sign In with Password'}</span>
                  <IconArrowRight size={18} />
                </button>
              </form>
            )}

            {/* OTP Login */}
            {loginMode === 'otp' && (
              <>
                {step === 'phone' ? (
                  <form onSubmit={(e) => { e.preventDefault(); void handleSendOTP(); }}>
                    <div className="auth-exact-input-wrap guard-focus">
                      <span className="auth-input-icon"><IconMobileOutline size={18} /></span>
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
                        disabled={isLoading}
                      />
                    </div>
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
                  <div>
                    <div className="auth-otp-input-boxes">
                      {otpValues.map((v, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpInputsRef.current[i] = el; }}
                          type="text"
                          name={`otp-${i}`}
                          autoComplete={i === 0 ? 'one-time-code' : 'off'}
                          inputMode="numeric"
                          maxLength={1}
                          className="auth-otp-single-box guard-focus"
                          value={v}
                          onChange={(e) => handleOtpBoxChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          disabled={isLoading}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      className="auth-btn-primary-exact guard-btn"
                      onClick={() => void handleVerifyOTP(otpValues.join(''))}
                      disabled={isLoading || otpValues.join('').length !== 6}
                    >
                      <span>{isLoading ? 'Verifying OTP...' : 'Login →'}</span>
                      <IconArrowRight size={18} />
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.75rem' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                        onClick={() => { setStep('phone'); setErrorMessage(null); setOtpValues(['', '', '', '', '', '']); }}
                      >
                        ← Change Number
                      </button>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#0f4c81', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => void handleResendOTP()}
                        disabled={resendTimer > 0 || isLoading}
                      >
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Forgot Password Modal */}
            {isForgotModalOpen && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '16px',
              }}>
                <div style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  maxWidth: '400px',
                  width: '100%',
                  padding: '24px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
                      Password Recovery
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotModalOpen(false);
                        setForgotStep('phone');
                        setErrorMessage(null);
                      }}
                      style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}
                    >
                      ✕
                    </button>
                  </div>

                  {errorMessage && (
                    <div style={{
                      background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
                      padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '14px',
                    }}>
                      {errorMessage}
                    </div>
                  )}

                  {forgotStep === 'phone' && (
                    <form onSubmit={(e) => { e.preventDefault(); void handleSendRecoveryOtp(); }}>
                      <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '14px' }}>
                        Enter your registered WhatsApp mobile number. A 6-digit recovery code will be sent to your WhatsApp.
                      </p>
                      <div className="auth-exact-input-wrap guard-focus">
                        <span className="auth-input-icon"><IconMobileOutline size={18} /></span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          className="auth-exact-input"
                          placeholder="Registered Mobile Number"
                          value={forgotPhone}
                          onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, ''))}
                          maxLength={10}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <button
                        type="submit"
                        className="auth-btn-primary-exact guard-btn"
                        disabled={isLoading || cleanPhoneNumber(forgotPhone).length < 10}
                        style={{ marginTop: '16px' }}
                      >
                        <span>{isLoading ? 'Sending Code...' : 'Send Recovery Code via WhatsApp'}</span>
                      </button>
                    </form>
                  )}

                  {forgotStep === 'otp' && (
                    <form onSubmit={(e) => { e.preventDefault(); void handleVerifyRecoveryOtp(); }}>
                      <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '14px' }}>
                        Enter the 6-digit recovery code sent to your WhatsApp number.
                      </p>
                      <div className="auth-exact-input-wrap guard-focus">
                        <span className="auth-input-icon">🔑</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="auth-exact-input"
                          placeholder="6-digit recovery code"
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <button
                        type="submit"
                        className="auth-btn-primary-exact guard-btn"
                        disabled={isLoading || forgotOtp.length !== 6}
                        style={{ marginTop: '16px' }}
                      >
                        <span>{isLoading ? 'Verifying...' : 'Verify Recovery Code'}</span>
                      </button>
                    </form>
                  )}

                  {forgotStep === 'reset' && (
                    <form onSubmit={(e) => { e.preventDefault(); void handleResetPassword(); }}>
                      <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '14px' }}>
                        Set a new, strong password (minimum 8 characters).
                      </p>
                      <PasswordInput
                        wrapClassName="auth-exact-input-wrap guard-focus"
                        placeholder="New Password (min 8 characters)"
                        value={newPassword}
                        onChange={setNewPassword}
                        minLength={8}
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="submit"
                        className="auth-btn-primary-exact guard-btn"
                        disabled={isLoading || newPassword.length < 8}
                        style={{ marginTop: '16px' }}
                      >
                        <span>{isLoading ? 'Updating Password...' : 'Save New Password'}</span>
                      </button>
                    </form>
                  )}

                  {forgotStep === 'done' && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                      <h4 style={{ margin: '0 0 6px', color: '#0f4c81' }}>Password Reset Complete!</h4>
                      <p style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        You can now sign in with your new password.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                    if (loginMode === 'otp') {
                      void handleSendOTP(p.phone);
                    }
                  }}
                  disabled={isLoading}
                >
                  <div>
                    <div className="auth-test-persona-name">{p.name}</div>
                    <div className="auth-test-persona-sub">{p.badge} • +91 {p.phone}</div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0f4c81' }}>
                    {loginMode === 'otp' ? 'Send OTP →' : 'Fill Phone'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="auth-bottom-nav-strip">
            <span className="auth-bottom-nav-label">Portals:</span>
            <Link href="/admin/login" className="auth-bottom-nav-link">Admin</Link>
            <Link href="/resident/login" className="auth-bottom-nav-link">Resident</Link>
            <span className="auth-bottom-nav-link active-guard">Guard</span>
            <button
              type="button"
              className="auth-bottom-nav-link auth-btn-logout"
              onClick={() => { void handleLogout(); }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
