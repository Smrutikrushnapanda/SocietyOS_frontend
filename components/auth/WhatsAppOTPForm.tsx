'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '../../types';
import {
  cleanPhoneNumber,
  formatIndianPhoneDisplay,
  getOTPProvider,
  TEST_PERSONAS
} from '../../lib/auth/otpProvider';
import { useAuthStore, useToastStore, useResidentStore } from '../../store';
import { IconWhatsApp, IconArrowLeft, IconCheck, IconShield, IconLock } from '../common/Icons';

interface WhatsAppOTPFormProps {
  role: UserRole;
  societyName?: string;
  onSuccessRedirect?: string;
}

export const WhatsAppOTPForm: React.FC<WhatsAppOTPFormProps> = ({
  role,
  societyName = 'Greenwood Heights',
  onSuccessRedirect
}) => {
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
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Count down timer for OTP Resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      setIsResendDisabled(true);
    } else if (resendTimer === 0) {
      setIsResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [step, resendTimer]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const fullOtp = otpValues.join('');
    if (fullOtp.length === 6 && step === 'otp') {
      handleVerifyOTP(fullOtp);
    }
  }, [otpValues]);

  const handleSendOTP = async (overridePhone?: string) => {
    const rawPhone = overridePhone || phone;
    const cleaned = cleanPhoneNumber(rawPhone);

    if (cleaned.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const provider = getOTPProvider();
      const result = await provider.sendOTP({ phone: cleaned, role });

      if (result.success) {
        setRequestId(result.requestId);
        setMockOtp(result.mockOtp || '123456');
        setStep('otp');
        setResendTimer(30);
        setIsResendDisabled(true);
        setOtpValues(['', '', '', '', '', '']);
        showToast(result.message);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage('Failed to send WhatsApp OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (isResendDisabled) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const provider = getOTPProvider();
      const result = await provider.resendOTP(
        { phone: cleanPhoneNumber(phone), role },
        requestId
      );

      if (result.success) {
        setRequestId(result.requestId);
        setMockOtp(result.mockOtp || '123456');
        setResendTimer(30);
        setIsResendDisabled(true);
        setOtpValues(['', '', '', '', '', '']);
        showToast(`Fresh OTP dispatched to ${formatIndianPhoneDisplay(cleanPhoneNumber(phone))}`);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage('Could not resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpBoxChange = (index: number, val: string) => {
    // Handle pasting multiple digits
    if (val.length > 1) {
      const cleanDigits = val.replace(/\D/g, '').slice(0, 6);
      if (cleanDigits) {
        const nextArr = [...otpValues];
        for (let i = 0; i < 6; i++) {
          nextArr[i] = cleanDigits[i] || '';
        }
        setOtpValues(nextArr);
        const focusIndex = Math.min(cleanDigits.length, 5);
        otpInputsRef.current[focusIndex]?.focus();
      }
      return;
    }

    const digit = val.replace(/\D/g, '');
    const nextArr = [...otpValues];
    nextArr[index] = digit;
    setOtpValues(nextArr);

    // Auto advance focus to next box
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCodeToVerify?: string) => {
    const fullOtp = otpCodeToVerify || otpValues.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const provider = getOTPProvider();
      const result = await provider.verifyOTP({
        phone: cleanPhoneNumber(phone),
        role,
        otp: fullOtp,
        requestId
      });

      if (result.success && result.user) {
        login(result.user);

        // Sync resident profile state if resident
        if (role === 'resident') {
          setResident({
            name: result.user.name,
            phone: result.user.phone,
            flat: result.user.flat || 'A-101'
          });
        }

        showToast(`Welcome ${result.user.name}! Authenticated via WhatsApp.`);

        // Determine target route
        const target =
          onSuccessRedirect ||
          (role === 'admin' ? '/admin' : role === 'guard' ? '/guard' : '/resident');

        router.push(target);
      } else {
        setErrorMessage(result.error || 'Invalid OTP code. Please check and re-enter.');
      }
    } catch {
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofillMock = () => {
    if (!mockOtp) return;
    const chars = mockOtp.split('').slice(0, 6);
    setOtpValues(chars);
    handleVerifyOTP(mockOtp);
  };

  const selectPersona = (pPhone: string) => {
    setPhone(pPhone);
    handleSendOTP(pPhone);
  };

  const personas = TEST_PERSONAS[role] || [];

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
            Enter your registered Indian mobile number to receive a secure WhatsApp OTP.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendOTP();
            }}
          >
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
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '');
                  setPhone(clean);
                }}
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
              <span>{isLoading ? 'Sending WhatsApp OTP...' : 'Send WhatsApp OTP'}</span>
            </button>
          </form>

          {/* Quick 1-Click Test Accounts */}
          {personas.length > 0 && (
            <div className="auth-personas-section">
              <div className="auth-personas-title">
                <span>⚡ Instant Dev Test Personas</span>
                <span style={{ fontSize: '0.6875rem', color: '#25d366' }}>Zero API Cost</span>
              </div>
              <div className="auth-persona-chip-list">
                {personas.map((p) => (
                  <button
                    key={p.phone}
                    type="button"
                    className="auth-persona-chip"
                    onClick={() => selectPersona(p.phone)}
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
          <h3 className="auth-form-title">Verify WhatsApp Code</h3>
          <p className="auth-form-caption">
            Enter the 6-digit code sent via WhatsApp to{' '}
            <strong style={{ color: '#ffffff' }}>
              {formatIndianPhoneDisplay(cleanPhoneNumber(phone))}
            </strong>
          </p>

          {/* 6-Digit Tactile Input Grid */}
          <div className="auth-otp-grid">
            {otpValues.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpInputsRef.current[i] = el;
                }}
                type="text"
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
            onClick={() => handleVerifyOTP()}
            disabled={isLoading || otpValues.join('').length !== 6}
          >
            <IconLock size={16} />
            <span>{isLoading ? 'Verifying...' : 'Verify & Continue'}</span>
          </button>

          {/* Development Mock OTP Banner */}
          {mockOtp && (
            <div className="auth-dev-banner">
              <div className="auth-dev-banner-head">
                <span>🛠️ Development Mock OTP (Zero API Cost)</span>
              </div>
              <div className="auth-dev-otp-display">
                <span className="auth-dev-otp-code">{mockOtp}</span>
                <button
                  type="button"
                  className="auth-dev-autofill-btn"
                  onClick={handleAutofillMock}
                >
                  ⚡ Auto-Fill &amp; Login
                </button>
              </div>
            </div>
          )}

          {/* Aux links: Change number & Resend */}
          <div className="auth-aux-row">
            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setStep('phone');
                setErrorMessage(null);
              }}
            >
              <IconArrowLeft size={14} />
              <span>Change Number</span>
            </button>

            <button
              type="button"
              className="auth-resend-btn"
              onClick={handleResendOTP}
              disabled={isResendDisabled || isLoading}
            >
              {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend WhatsApp OTP'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
