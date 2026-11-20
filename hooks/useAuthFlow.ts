'use client';

/**
 * useAuthFlow
 *
 * Shared hook for authentication flows across all login pages
 * (Admin, Resident, Guard). Supports:
 *  - WhatsApp OTP login
 *  - Mobile-number + password login
 *  - WhatsApp verified password recovery
 *  - Auth store population via setAuth & /auth/me
 *  - ApiError normalization into user-facing messages
 *  - Loading state and double-submission prevention
 */

import { useState, useCallback, useEffect } from 'react';
import {
  requestOtp,
  verifyOtp,
  loginPassword,
  forgotPassword,
  verifyRecoveryOtp,
  resetPassword,
  getAuthMe,
  AuthSuccessResponse,
} from '../lib/api/auth.api';
import { ApiError } from '../lib/api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { discardLoginSession, persistCredential } from '../lib/auth/session-client';
import { resolvePortalContext } from '../lib/auth/portal-access';
import { logoutCurrentSession } from '../lib/auth/logout-session';
import type { UserRole, AuthUser } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip non-digits and normalise to 10-digit Indian mobile number. */
export function cleanPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

/** Format a 10-digit number as "+91 XXXXX XXXXX" for display. */
export function formatIndianPhoneDisplay(clean: string): string {
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return `+91 ${clean}`;
}

/** Map an ApiError or unknown error to a user-facing string. */
export function toUserMessage(err: unknown): string {
  const message =
    err instanceof ApiError
      ? err.backendMessage
      : err instanceof Error
      ? err.message
      : '';
  const lower = (message || '').toLowerCase();

  if (
    lower.includes('invalid otp') ||
    lower.includes('otp is incorrect') ||
    lower.includes('incorrect otp') ||
    lower.includes('expired otp')
  ) {
    return 'OTP is incorrect';
  }

  if (
    lower.includes('not registered') ||
    lower.includes('unregistered') ||
    lower.includes('invalid mobile number')
  ) {
    return 'Mobile number is not registered';
  }

  if (err instanceof ApiError) {
    const { status, backendMessage } = err;
    if (status === 429) return 'Too many requests. Please wait before trying again.';
    if (status === 401) {
      if (lower.includes('otp')) return 'OTP is incorrect';
      return backendMessage || 'Invalid credentials or expired OTP. Please try again.';
    }
    if (status === 400) {
      if (lower.includes('mobile') || lower.includes('phone') || lower.includes('register')) {
        return 'Mobile number is not registered';
      }
      return backendMessage || 'Invalid request. Please check your input.';
    }
    if (status === 0)   return 'Network error. Please check your connection.';
    if (status >= 500)  return 'Server error. Please try again in a moment.';
    return backendMessage || 'Something went wrong. Please try again.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAuthFlowOptions {
  /** Portal whose membership must be verified before completing login. */
  role: UserRole;
  /** Route to push after successful verification. */
  successRedirect: string;
  /** Called with router.push(successRedirect) after successful auth. */
  onSuccess: (redirect: string) => void;
}

interface UseAuthFlowResult {
  step: 'phone' | 'otp';
  phone: string;
  password: string;
  loginMode: 'otp' | 'password';
  isLoading: boolean;
  errorMessage: string | null;
  resendTimer: number;
  isResendDisabled: boolean;
  // Forgot password flow
  isForgotModalOpen: boolean;
  forgotStep: 'phone' | 'otp' | 'reset' | 'done';
  forgotPhone: string;
  forgotOtp: string;
  newPassword: string;
  recoveryToken: string | null;
  setPhone: (v: string) => void;
  setPassword: (v: string) => void;
  setLoginMode: (m: 'otp' | 'password') => void;
  setStep: (s: 'phone' | 'otp') => void;
  setErrorMessage: (msg: string | null) => void;
  setIsForgotModalOpen: (open: boolean) => void;
  setForgotStep: (s: 'phone' | 'otp' | 'reset' | 'done') => void;
  setForgotPhone: (v: string) => void;
  setForgotOtp: (v: string) => void;
  setNewPassword: (v: string) => void;
  handleSendOTP: (overridePhone?: string) => Promise<void>;
  handleResendOTP: () => Promise<void>;
  handleVerifyOTP: (otp: string) => Promise<void>;
  handlePasswordLogin: () => Promise<void>;
  handleSendRecoveryOtp: () => Promise<void>;
  handleVerifyRecoveryOtp: () => Promise<void>;
  handleResetPassword: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

export function useAuthFlow({
  role,
  successRedirect,
  onSuccess,
}: UseAuthFlowOptions): UseAuthFlowResult {
  const { setAuth, login } = useAuthStore();
  const { showToast } = useToastStore();

  const [loginMode, setLoginMode] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  // Forgot password state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'phone' | 'otp' | 'reset' | 'done'>('phone');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void useAuthStore.getState().restoreSession().then(restored => {
      if (!active) return;
      try {
        const message = sessionStorage.getItem('societyos_auth_message');
        if (message) {
          setErrorMessage(message);
          sessionStorage.removeItem('societyos_auth_message');
        }
      } catch {}
      const state = useAuthStore.getState();
      if (restored && state.role === role) onSuccess(successRedirect);
    });
    return () => { active = false; };
  // Navigation callback identity need not restart session restoration.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, successRedirect]);

  // ── Countdown ticker ────────────────────────────────────────────────────
  const startResendCountdown = useCallback((seconds: number) => {
    setResendTimer(seconds);
    setIsResendDisabled(true);
    const tick = () => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setIsResendDisabled(false);
          return 0;
        }
        setTimeout(tick, 1000);
        return prev - 1;
      });
    };
    setTimeout(tick, 1000);
  }, []);

  // ── Establish Session (shared between OTP and password logins) ───────────
  const establishAuthSession = useCallback(
    async (res: AuthSuccessResponse, cleanNumber: string) => {
      // Temporarily set access token so apiClient can execute authenticated /auth/me call
      useAuthStore.getState().setAccessToken(res.accessToken);

      let authMe;
      try {
        authMe = await getAuthMe(null);
        const context = resolvePortalContext(authMe.memberships || [], role, useAuthStore.getState().organizationId);
        setAuth({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          backendUser: authMe.user,
          memberships: authMe.memberships,
          organizationId: context.organizationId,
        });
        await persistCredential(res.refreshToken);
      } catch (error) {
        await discardLoginSession(res.refreshToken);
        throw error;
      }
      const postAuthStore = useAuthStore.getState();
      if (
        !postAuthStore.organizationId &&
        postAuthStore.roles.includes('SUPER_ADMIN') &&
        postAuthStore.availableOrganizations.length > 0
      ) {
        postAuthStore.setOrganizationId(postAuthStore.availableOrganizations[0].id);
      }

      const currentStore = useAuthStore.getState();
      const activeOrgId = currentStore.organizationId ?? '';

      const legacyStub: AuthUser = {
        id: authMe.user.id,
        role,
        phone: formatIndianPhoneDisplay(cleanNumber),
        name: authMe.user.fullName?.trim() || '',
        avatarInitials: cleanNumber.slice(-2),
        societyId: activeOrgId,
        societyName: '',
      };
      login(legacyStub);

      showToast('Authenticated successfully.');
      onSuccess(successRedirect);
    },
    [login, onSuccess, role, setAuth, showToast, successRedirect],
  );

  // ── Request OTP ─────────────────────────────────────────────────────────
  const handleSendOTP = useCallback(
    async (overridePhone?: string) => {
      if (isLoading) return;

      const raw = overridePhone ?? phone;
      const clean = cleanPhoneNumber(raw);

      if (clean.length < 10) {
        setErrorMessage('Please enter a valid 10-digit mobile number.');
        return;
      }

      setErrorMessage(null);
      setIsLoading(true);

      try {
        const res = await requestOtp({ mobileNumber: clean, role });
        if (res.channel && res.channel !== 'whatsapp') {
          const message = 'WhatsApp could not send your OTP. Try again later or use password login.';
          setErrorMessage(message);
          showToast(message, 'error');
          return;
        }
        showToast(res.message || 'OTP sent successfully.');
        setStep('otp');
        startResendCountdown(res.cooldownSeconds || 30);
      } catch (err) {
        setErrorMessage(toUserMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, phone, role, showToast, startResendCountdown],
  );

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const handleResendOTP = useCallback(async () => {
    if (isResendDisabled || isLoading) return;
    await handleSendOTP(phone);
  }, [isResendDisabled, isLoading, handleSendOTP, phone]);

  // ── Verify OTP ──────────────────────────────────────────────────────────
  const handleVerifyOTP = useCallback(
    async (otp: string) => {
      if (isLoading) return;

      if (otp.length !== 6) {
        setErrorMessage('Please enter all 6 digits of the OTP.');
        return;
      }

      const clean = cleanPhoneNumber(phone);
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await verifyOtp({ mobileNumber: clean, otp });
        await establishAuthSession(res, clean);
      } catch (err) {
        setErrorMessage(toUserMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [establishAuthSession, isLoading, phone],
  );

  // ── Password Login ──────────────────────────────────────────────────────
  const handlePasswordLogin = useCallback(async () => {
    if (isLoading) return;

    const clean = cleanPhoneNumber(phone);
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginPassword({ mobileNumber: clean, password });
      await establishAuthSession(res, clean);
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [establishAuthSession, isLoading, password, phone]);

  // ── Password Recovery Handlers ──────────────────────────────────────────
  const handleSendRecoveryOtp = useCallback(async () => {
    const clean = cleanPhoneNumber(forgotPhone || phone);
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number for recovery.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await forgotPassword({ mobileNumber: clean });
      showToast(res.message);
      setForgotStep('otp');
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [forgotPhone, phone, showToast]);

  const handleVerifyRecoveryOtp = useCallback(async () => {
    const clean = cleanPhoneNumber(forgotPhone || phone);
    if (forgotOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the recovery code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyRecoveryOtp({ mobileNumber: clean, otp: forgotOtp });
      setRecoveryToken(res.recoveryToken);
      setForgotStep('reset');
      showToast('Recovery code verified.');
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [forgotOtp, forgotPhone, phone, showToast]);

  const handleResetPassword = useCallback(async () => {
    if (!recoveryToken) {
      setErrorMessage('Recovery session expired. Please request a new code.');
      setForgotStep('phone');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await resetPassword({ recoveryToken, newPassword });
      showToast(res.message || 'Password reset successfully.');
      setForgotStep('done');
      setLoginMode('password');
      setPassword('');
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotStep('phone');
      }, 1500);
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [newPassword, recoveryToken, showToast]);

  useEffect(() => {
    try {
      const warning = sessionStorage.getItem('societyos_push_cleanup_warning');
      if (warning) { showToast(warning, 'error'); sessionStorage.removeItem('societyos_push_cleanup_warning'); }
    } catch {}
  }, [showToast]);

  // ── Manual logout ───────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await logoutCurrentSession();
    useNotificationStore.getState().reset();
  }, []);

  return {
    step,
    phone,
    password,
    loginMode,
    isLoading,
    errorMessage,
    resendTimer,
    isResendDisabled,
    isForgotModalOpen,
    forgotStep,
    forgotPhone,
    forgotOtp,
    newPassword,
    recoveryToken,
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
  };
}
