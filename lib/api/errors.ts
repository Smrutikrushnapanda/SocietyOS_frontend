/**
 * SocietyOS Standardized Error Handling Utilities
 *
 * Provides central, consistent classification and user-facing message formatting
 * across all domains without leaking raw internal stack traces, DB errors, or secrets.
 */

import { ApiError, ApiValidationError } from './client';

export { ApiError };
export type { ApiValidationError };

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isPermissionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function isValidationError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 422 || error.status === 400);
}

export function isRateLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

export function isServerError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 500;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.backendMessage.toLowerCase().includes('network') || error.backendMessage.toLowerCase().includes('connect');
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') || msg.includes('failed to fetch') || msg.includes('connect');
  }
  return false;
}

/**
 * Returns a clean, user-friendly error message suitable for inline banners and toasts.
 * Strictly sanitizes sensitive backend internals (SQL, database names, stack traces, Redis).
 */
export function getUserFriendlyErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallbackMessage;

  if (error instanceof ApiError) {
    // 401: Unauthorized
    if (error.status === 401) {
      return 'Session expired. Please log in again.';
    }

    // 403: Forbidden / Permission Denied
    if (error.status === 403) {
      return 'Access denied. You do not have permission to perform this action.';
    }

    // 404: Not Found
    if (error.status === 404) {
      return error.backendMessage && error.backendMessage !== 'Not Found'
        ? error.backendMessage
        : 'The requested resource was not found.';
    }

    // 409: Conflict
    if (error.status === 409) {
      return error.backendMessage || 'A conflicting record or state already exists.';
    }

    // 422 / 400: Validation Error
    if (error.status === 422 || error.status === 400) {
      if (error.validationErrors && error.validationErrors.length > 0) {
        return error.validationErrors.map((v) => v.message).join('; ');
      }
      return error.backendMessage || 'Invalid request parameters. Please check your input.';
    }

    // 429: Rate Limit
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // 500+: Server Errors
    if (error.status >= 500) {
      return 'The server encountered an error. Please try again later.';
    }

    // Network / Offline (status 0)
    if (error.status === 0 || isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    // Sanitize any internal leaks in backendMessage
    const msg = error.backendMessage;
    if (
      msg.includes('SQL') ||
      msg.includes('QueryFailed') ||
      msg.includes('database') ||
      msg.includes('pg_') ||
      msg.includes('ORA-') ||
      msg.includes('syntax error') ||
      msg.includes('TypeORM')
    ) {
      return 'The service encountered an internal database issue. Please try again later.';
    }

    return msg || fallbackMessage;
  }

  if (error instanceof Error) {
    if (isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    return error.message || fallbackMessage;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallbackMessage;
}
