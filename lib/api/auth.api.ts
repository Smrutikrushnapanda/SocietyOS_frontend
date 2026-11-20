/**
 * SocietyOS Auth API
 *
 * Typed wrappers for backend authentication endpoints.
 * These functions use the shared apiClient but are intentionally called
 * without an Authorization header — the request interceptor only injects
 * the header when an accessToken is present in the auth store, so these
 * work correctly for unauthenticated users.
 *
 * Endpoints:
 *   POST /api/v1/auth/request-otp
 *   POST /api/v1/auth/verify-otp
 *   POST /api/v1/auth/whatsapp/request-otp
 *   POST /api/v1/auth/whatsapp/verify-otp
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/forgot-password
 *   POST /api/v1/auth/verify-recovery-otp
 *   POST /api/v1/auth/reset-password
 *   POST /api/v1/auth/refresh-token
 *   POST /api/v1/auth/logout
 *   GET  /api/v1/auth/me
 */

import apiClient from './client';
import { flushPendingLogout } from '../auth/session-client';
export type {
  BackendUser,
  BackendRole,
  OrganizationContextItem,
  OrganizationMembership,
  AuthMeResponse,
} from './types';

import type {
  BackendUser,
  BackendRole,
  OrganizationContextItem,
  OrganizationMembership,
  AuthMeResponse,
} from './types';

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface RequestOtpPayload {
  mobileNumber: string;
  role?: string;
}

export interface VerifyOtpPayload {
  mobileNumber: string;
  otp: string;
}

export interface PasswordLoginPayload {
  mobileNumber: string;
  password: string;
}

export interface ForgotPasswordPayload {
  mobileNumber: string;
}

export interface VerifyRecoveryOtpPayload {
  mobileNumber: string;
  otp: string;
}

export interface ResetPasswordPayload {
  recoveryToken: string;
  newPassword: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  refreshToken: string;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface RequestOtpResponse {
  success: boolean;
  message: string;
  expiresAt: string;
  cooldownSeconds?: number;
  channel?: string;
}

export interface AuthSuccessResponse {
  user: BackendUser;
  accessToken: string;
  refreshToken?: string;
  organizations?: OrganizationContextItem[];
  organizationId?: string;
  roles?: BackendRole[];
  permissions?: string[];
}

export type VerifyOtpResponse = AuthSuccessResponse;
export type PasswordLoginResponse = AuthSuccessResponse;
export type RefreshTokenResponse = AuthSuccessResponse;

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
}

export interface VerifyRecoveryOtpResponse {
  success: boolean;
  recoveryToken: string;
  expiresIn: number;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface LogoutResponse {
  success: boolean;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Mobile-number + password login.
 */
export async function loginPassword(
  payload: PasswordLoginPayload,
): Promise<PasswordLoginResponse> {
  await flushPendingLogout();
  const { data } = await apiClient.post<any>('/auth/login', payload);
  const result = data?.data !== undefined ? data.data : data;
  return result;
}

/**
 * Request a one-time password for the given mobile number.
 */
export async function requestOtp(
  payload: RequestOtpPayload,
): Promise<RequestOtpResponse> {
  const { data } = await apiClient.post<any>(
    '/auth/request-otp',
    { mobileNumber: payload.mobileNumber },
    payload.role ? { headers: { 'x-portal-role': payload.role } } : undefined,
  );
  return data?.data !== undefined ? data.data : data;
}

/**
 * Request a one-time password specifically via WhatsApp.
 */
export async function requestWhatsAppOtp(
  payload: RequestOtpPayload,
): Promise<RequestOtpResponse> {
  const { data } = await apiClient.post<any>(
    '/auth/whatsapp/request-otp',
    { mobileNumber: payload.mobileNumber },
    payload.role ? { headers: { 'x-portal-role': payload.role } } : undefined,
  );
  return data?.data !== undefined ? data.data : data;
}

/**
 * Verify the OTP and receive a JWT access token + opaque refresh token.
 */
export async function verifyOtp(
  payload: VerifyOtpPayload,
): Promise<VerifyOtpResponse> {
  await flushPendingLogout();
  const { data } = await apiClient.post<any>('/auth/verify-otp', payload);
  const result = data?.data !== undefined ? data.data : data;
  return result;
}

/**
 * Verify WhatsApp OTP specifically.
 */
export async function verifyWhatsAppOtp(
  payload: VerifyOtpPayload,
): Promise<VerifyOtpResponse> {
  await flushPendingLogout();
  const { data } = await apiClient.post<any>(
    '/auth/whatsapp/verify-otp',
    payload,
  );
  const result = data?.data !== undefined ? data.data : data;
  return result;
}

/**
 * Request password recovery OTP via verified WhatsApp number.
 */
export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  const { data } = await apiClient.post<any>(
    '/auth/forgot-password',
    payload,
  );
  return data?.data !== undefined ? data.data : data;
}

/**
 * Verify password recovery OTP and receive single-use recovery token.
 */
export async function verifyRecoveryOtp(
  payload: VerifyRecoveryOtpPayload,
): Promise<VerifyRecoveryOtpResponse> {
  const { data } = await apiClient.post<any>(
    '/auth/verify-recovery-otp',
    payload,
  );
  return data?.data !== undefined ? data.data : data;
}

/**
 * Reset password using single-use recovery token.
 */
export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  const { data } = await apiClient.post<any>(
    '/auth/reset-password',
    payload,
  );
  return data?.data !== undefined ? data.data : data;
}

/**
 * Exchange a valid refresh token for a new access token + rotated refresh token.
 */
export async function refreshToken(
  payload: RefreshTokenPayload,
): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post<any>('/auth/refresh-token', payload);
  return data?.data !== undefined ? data.data : data;
}

/**
 * Invalidate the refresh session on the backend.
 */
export async function logout(payload: LogoutPayload): Promise<LogoutResponse> {
  const { data } = await apiClient.post<any>('/auth/logout', payload);
  return data?.data !== undefined ? data.data : data;
}

/**
 * Fetch the authoritative authentication context for the currently authenticated user.
 */
export async function getAuthMe(organizationId?: string | null): Promise<AuthMeResponse> {
  const { data } = await apiClient.get<any>('/auth/me', organizationId === undefined
    ? undefined : { headers: { 'X-Organization-Id': organizationId || '' } });
  return data?.data !== undefined ? data.data : data;
}
