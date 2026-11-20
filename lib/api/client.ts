/**
 * SocietyOS API Client
 *
 * Single axios instance for all backend communication.
 *
 * Responsibilities:
 *  - Base URL from NEXT_PUBLIC_API_URL (never hardcoded)
 *  - Inject Authorization: Bearer <accessToken> when available
 *  - Inject X-Organization-Id when organizationId is set in auth store
 *  - Silent token refresh on 401 (single concurrent refresh, no infinite loop)
 *  - Normalized ApiError rejection
 *
 * SSR safety:
 *  - The store is imported statically (Zustand is SSR-safe at import time).
 *  - All store.getState() calls are guarded by typeof window !== 'undefined'
 *    so they only execute in the browser, never during SSR module evaluation.
 *
 * Auth endpoints that must NOT trigger refresh:
 *  /auth/request-otp, /auth/verify-otp, /auth/refresh-token, /auth/logout
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { pushSession, pushTokenLifecycle } from '../firebase/push-token-lifecycle';
import { refreshAccessSession, sessionRejected } from '../auth/session-client';
import { sessionHeaders, credentialVault, sessionPortal } from '../auth/session-transport';

// ---------------------------------------------------------------------------
// Normalized error type
// ---------------------------------------------------------------------------

export interface ApiValidationError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly backendMessage: string;
  readonly validationErrors: ApiValidationError[];

  constructor(
    status: number,
    backendMessage: string,
    validationErrors: ApiValidationError[] = [],
  ) {
    super(backendMessage);
    this.name = 'ApiError';
    this.status = status;
    this.backendMessage = backendMessage;
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Auth-endpoint paths that must never trigger a refresh attempt
// ---------------------------------------------------------------------------

const AUTH_BYPASS_PATHS = [
  '/auth/request-otp',
  '/auth/verify-otp',
  '/auth/refresh-token',
  '/auth/logout',
  '/auth/login',
  '/auth/whatsapp/request-otp',
  '/auth/whatsapp/verify-otp',
  '/auth/forgot-password',
  '/auth/verify-recovery-otp',
  '/auth/reset-password',
] as const;

function isAuthBypassPath(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_BYPASS_PATHS.some((p) => url.includes(p));
}

// ---------------------------------------------------------------------------
// Lazy store accessors — SSR-safe
// Zustand's module-level create() is safe to import on the server; only
// getState() calls that read/write browser state need the window guard.
// ---------------------------------------------------------------------------

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    useAuthStore.getState().accessToken ||
    null
  );
}

function getOrganizationId(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    useAuthStore.getState().organizationId ||
    null
  );
}

async function storeClearAuth(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const before = useAuthStore.getState();
  useAuthStore.setState({ logoutInProgress: true });
  pushTokenLifecycle.invalidate();
  await credentialVault.save({ pendingLogout: true });
  if (useAuthStore.getState().sessionVersion !== before.sessionVersion) return false;
  useAuthStore.getState().clearAuth();
  void pushTokenLifecycle.cleanup(null);
  return true;
}

function applyRetriedHeaders(config: AxiosRequestConfig, token: string): void {
  const orgId = getOrganizationId();
  if (!config.headers) {
    config.headers = {};
  }

  if (typeof (config.headers as any).set === 'function') {
    (config.headers as any).set('Authorization', `Bearer ${token}`);
    if (orgId && !(config.headers as any).has('X-Organization-Id')) {
      (config.headers as any).set('X-Organization-Id', orgId);
    }
  } else {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    if (orgId && !(config.headers as Record<string, string>)['X-Organization-Id']) {
      (config.headers as Record<string, string>)['X-Organization-Id'] = orgId;
    }
  }
}

export function handleAutomaticLogout(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(
      'societyos_auth_message',
      'Your session has expired. Please log in again.',
    );
    localStorage.setItem(`societyos_logout_event:${sessionPortal()}`, String(Date.now()));
  } catch {}

  const pathname = window.location.pathname;
  const targetLogin = `/${sessionPortal()}/login`;

  // Prevent redirect loops on login, OTP, and logout pages
  if (
    !pathname.includes('/login') &&
    !pathname.includes('/verify-otp') &&
    !pathname.includes('/request-otp')
  ) {
    window.location.href = targetLogin;
  }
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : '/api/v1',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
  // Do NOT set a global Content-Type — axios sets it automatically for JSON
  // and multipart/form-data (with correct boundary) based on the request body.
});

// ---------------------------------------------------------------------------
// Request interceptor — inject auth headers
// ---------------------------------------------------------------------------

function matchesPushSession(config: AxiosRequestConfig): boolean {
  const scope: unknown = Reflect.get(config, 'societyosPushScope');
  if (scope === undefined) return true;
  if (config.signal?.aborted || typeof scope !== 'object' || scope === null ||
      !('userId' in scope) || !('organizationId' in scope)) return false;
  const state = useAuthStore.getState();
  return state.isAuthenticated && scope.userId === (state.backendUser?.id ?? state.user?.id) && scope.organizationId === state.organizationId;
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (!matchesPushSession(config)) throw new ApiError(401, 'Push registration session changed');
    // Preserve headers a caller set explicitly (for example the portal role
    // passed by the auth OTP calls) instead of overriding them.
    for (const [key, value] of Object.entries(sessionHeaders())) {
      if (!config.headers.has(key)) config.headers.set(key, value);
    }
    Reflect.set(config, 'societyosSessionVersion', useAuthStore.getState().sessionVersion);
    const accessToken = getAccessToken();
    const organizationId = getOrganizationId();

    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (organizationId && !config.headers.has('X-Organization-Id')) {
      config.headers.set('X-Organization-Id', organizationId);
    }

    return config;
  },
  (error: unknown) => Promise.reject(normalizeError(error)),
);

// ---------------------------------------------------------------------------
// Response interceptor — 401 refresh + error normalization
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => {
    if (
      response?.data &&
      typeof response.data === 'object' &&
      response.data.success === true &&
      'data' in response.data &&
      response.config?.responseType !== 'blob' &&
      response.config?.responseType !== 'arraybuffer'
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(normalizeError(error));
    }

    const axiosError = error as AxiosError;
    const originalConfig = axiosError.config as
      | (AxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const status = axiosError.response?.status;
    if (originalConfig && !matchesPushSession(originalConfig)) {
      return Promise.reject(new ApiError(401, 'Push registration session changed'));
    }

    const state = useAuthStore.getState();
    if (originalConfig && Reflect.get(originalConfig, 'societyosSessionVersion') !== undefined && Reflect.get(originalConfig, 'societyosSessionVersion') !== state.sessionVersion) {
      return Promise.reject(new ApiError(401, 'Session changed'));
    }
    if (status === 401 && originalConfig && !isAuthBypassPath(originalConfig.url) && !state.logoutInProgress) {
      if (originalConfig._retried) {
        // The session was just validated by refresh and /auth/me; an endpoint
        // rejection must not revoke it or sign out other tabs.
        return Promise.reject(normalizeError(axiosError));
      }
      originalConfig._retried = true;
      try {
        const token = await refreshAccessSession();
        if (!matchesPushSession(originalConfig)) throw new ApiError(401, 'Push registration session changed');
        applyRetriedHeaders(originalConfig, token);
        return apiClient(originalConfig);
      } catch (refreshError) {
        if (sessionRejected(refreshError) && useAuthStore.getState().sessionVersion === state.sessionVersion) {
          if (await storeClearAuth()) handleAutomaticLogout();
        }
        return Promise.reject(normalizeError(refreshError));
      }
    }

    return Promise.reject(normalizeError(axiosError));
  },
);

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      message?: string | string[];
      error?: string;
      statusCode?: number;
    }>;

    const status = axiosError.response?.status ?? 0;
    const responseData = axiosError.response?.data as any;

    // NestJS validation errors arrive as an array in `message`.
    // NestJS AllExceptionsFilter wraps error in { success: false, error: { code, message } }
    const rawMessage =
      responseData?.error?.message ??
      responseData?.message ??
      (typeof responseData?.error === 'string' ? responseData.error : undefined);
    let backendMessage = 'An unexpected error occurred';
    const validationErrors: ApiValidationError[] = [];

    if (Array.isArray(rawMessage)) {
      backendMessage = rawMessage[0] ?? backendMessage;
      rawMessage.forEach((msg) => {
        validationErrors.push({ field: '', message: String(msg) });
      });
    } else if (typeof rawMessage === 'string') {
      backendMessage = rawMessage;
    } else if (typeof rawMessage === 'object' && rawMessage !== null && typeof rawMessage.message === 'string') {
      backendMessage = rawMessage.message;
    } else if (typeof responseData?.error === 'string') {
      backendMessage = responseData.error;
    } else if (axiosError.message) {
      backendMessage = axiosError.message;
    }

    return new ApiError(status, backendMessage, validationErrors);
  }

  if (error instanceof Error) {
    return new ApiError(0, error.message);
  }

  return new ApiError(0, 'An unexpected error occurred');
}

export default apiClient;
