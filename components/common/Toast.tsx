'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useToastStore, ToastType } from '../../store';
import { IconCheck, IconClose } from './Icons';
import { LoadingAnimation } from './LoadingAnimation';

export interface ToastViewProps {
  message: string | null;
  title: string | null;
  type: ToastType;
  visible: boolean;
  duration: number;
  isGuardMobile: boolean;
  isClosing?: boolean;
  onClose: () => void;
}

export const ToastView: React.FC<ToastViewProps> = ({
  message,
  title,
  type,
  visible,
  duration,
  isGuardMobile,
  isClosing = false,
  onClose,
}) => {
  if (!visible || !message) return null;

  if (isGuardMobile) {
    const mobileLabels: Record<ToastType, string> = {
      success: 'Done',
      error: 'Attention',
      loading: 'Processing',
      info: 'Notice',
    };

    const mobileTitle = title || mobileLabels[type] || 'Notice';

    return (
      <div
        className={`guard-mobile-alert-wrap ${isClosing ? 'is-closing' : ''}`}
        id="mobile-toast"
      >
        <div
          className={`guard-mobile-alert guard-mobile-alert--${type}`}
          role={type === 'error' ? 'alert' : 'status'}
          aria-live={type === 'error' ? 'assertive' : 'polite'}
        >
          <div className="guard-mobile-alert-icon" aria-hidden="true">
            {type === 'success' && <IconCheck size={17} />}
            {type === 'error' && (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="12.5" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {type === 'info' && (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="11" x2="12" y2="16" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            {type === 'loading' && <span className="guard-mobile-alert-spinner" />}
          </div>

          <div className="guard-mobile-alert-body">
            <span className="guard-mobile-alert-title">{mobileTitle}</span>
            <p className="guard-mobile-alert-msg">{message}</p>
          </div>

          {type !== 'loading' && (
            <button
              type="button"
              className="guard-mobile-alert-close"
              onClick={onClose}
              aria-label="Dismiss alert"
            >
              <IconClose size={15} />
            </button>
          )}

          {type !== 'loading' && duration > 0 && (
            <div className="guard-mobile-alert-timer" aria-hidden="true">
              <div
                key={`${message}-${duration}`}
                className="guard-mobile-alert-timer-fill"
                style={{ animationDuration: `${duration}ms` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const typeConfig: Record<
    ToastType,
    {
      defaultTitle: string;
      color: string;
      gradient: string;
      buttonBg: string;
      buttonHover: string;
      ringColor: string;
      iconNode: React.ReactNode;
    }
  > = {
    success: {
      defaultTitle: 'Success!',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.05) 100%)',
      buttonBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      buttonHover: '#047857',
      ringColor: 'rgba(16,185,129,0.4)',
      iconNode: (
        <div className="swal-icon swal-icon-success">
          <div className="swal-icon-circle-bg" />
          <svg className="swal-check-svg" viewBox="0 0 52 52">
            <circle className="swal-check-circle" cx="26" cy="26" r="24" fill="none" />
            <path className="swal-check-path" fill="none" d="M14 27l8 8 16-16" />
          </svg>
        </div>
      ),
    },
    error: {
      defaultTitle: 'Oops...',
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(185,28,28,0.06) 100%)',
      buttonBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      buttonHover: '#b91c1c',
      ringColor: 'rgba(239,68,68,0.4)',
      iconNode: (
        <div className="swal-icon swal-icon-error">
          <div className="swal-icon-circle-bg" />
          <svg className="swal-error-svg" viewBox="0 0 52 52">
            <circle className="swal-error-circle" cx="26" cy="26" r="24" fill="none" />
            <path className="swal-error-line swal-error-line-1" fill="none" d="M16 16l20 20" />
            <path className="swal-error-line swal-error-line-2" fill="none" d="M36 16L16 36" />
          </svg>
        </div>
      ),
    },
    loading: {
      defaultTitle: 'Please Wait',
      color: '#0ea5e9',
      gradient: 'linear-gradient(135deg, rgba(14,165,233,0.2) 0%, rgba(2,132,199,0.06) 100%)',
      buttonBg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      buttonHover: '#0369a1',
      ringColor: 'rgba(14,165,233,0.4)',
      iconNode: (
        <div style={{ width: '84px', height: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <LoadingAnimation size={84} centered={false} />
        </div>
      ),
    },
    info: {
      defaultTitle: 'Notice',
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(79,70,229,0.06) 100%)',
      buttonBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      buttonHover: '#4338ca',
      ringColor: 'rgba(99,102,241,0.4)',
      iconNode: (
        <div className="swal-icon swal-icon-info">
          <div className="swal-icon-circle-bg" />
          <svg className="swal-info-svg" viewBox="0 0 52 52">
            <circle className="swal-info-circle" cx="26" cy="26" r="24" fill="none" />
            <circle cx="26" cy="18" r="3" fill="currentColor" />
            <line x1="26" y1="26" x2="26" y2="38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      ),
    },
  };

  const current = typeConfig[type] || typeConfig.info;
  const headerTitle = title || current.defaultTitle;

  return (
    <div
      className={`swal-toast-backdrop ${isClosing ? 'swal-backdrop-hide' : ''}`}
      id="mobile-toast"
      onClick={(e) => {
        if (e.target === e.currentTarget && type !== 'loading') onClose();
      }}
    >
      <div
        className={`swal-toast-popup ${isClosing ? 'swal-popup-hide' : ''}`}
        style={{
          boxShadow: `0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 32px -4px ${current.ringColor}`,
        }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="swal-toast-title"
        aria-describedby="swal-toast-message"
      >
        {/* Subtle Ambient Gradient Background */}
        <div
          className="swal-popup-accent-glow"
          style={{ background: current.gradient }}
        />

        {/* Bottom-sheet grab handle (mobile only) */}
        {type !== 'loading' && <div className="swal-sheet-handle" aria-hidden="true" />}

        {/* Top-Right Quick Close */}
        {type !== 'loading' && (
          <button
            type="button"
            className="swal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <IconClose size={15} />
          </button>
        )}

        {/* Big Animated Hero Icon (SweetAlert2 Signature) */}
        <div className="swal-icon-wrapper">{current.iconNode}</div>

        {/* Title */}
        <h2 id="swal-toast-title" className="swal-title" style={{ color: current.color }}>
          {headerTitle}
        </h2>

        {/* Message / Description */}
        <div id="swal-toast-message" className="swal-message">{message}</div>

        {/* Action Button */}
        {type !== 'loading' ? (
          <div className="swal-actions">
            <button
              type="button"
              className="swal-confirm-btn"
              style={{
                background: current.buttonBg,
                boxShadow: `0 8px 20px -4px ${current.ringColor}`,
              }}
              onClick={onClose}
            >
              OK
            </button>
          </div>
        ) : (
          <div className="swal-loading-indicator">
            <span className="swal-loading-dot" />
            <span className="swal-loading-dot" />
            <span className="swal-loading-dot" />
          </div>
        )}

        {/* Auto-Dismiss Progress Bar */}
        {type !== 'loading' && duration > 0 && (
          <div className="swal-timer-track">
            <div
              key={`${message}-${duration}`}
              className="swal-timer-fill"
              style={{
                background: current.buttonBg,
                animationDuration: `${duration}ms`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const Toast: React.FC = () => {
  const pathname = usePathname();
  const { message, title, type, visible, duration, hideToast } = useToastStore();
  const [closingToastKey, setClosingToastKey] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGuardMobile =
    Boolean(pathname?.startsWith('/guard') || pathname?.startsWith('/walkie-talkie')) ||
    process.env.NEXT_PUBLIC_MOBILE_PORTAL === 'guard';

  const toastKey = `${visible}-${message ?? ''}-${type}`;
  const isClosing = closingToastKey === toastKey;

  useEffect(() => {
    if (visible && closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [visible, message, type]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    const activeKey = toastKey;
    setClosingToastKey(activeKey);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      hideToast();
      setClosingToastKey((current) => (current === activeKey ? null : current));
    }, 220);
  };

  return (
    <ToastView
      message={message}
      title={title}
      type={type}
      visible={visible}
      duration={duration}
      isGuardMobile={isGuardMobile}
      isClosing={isClosing}
      onClose={handleClose}
    />
  );
};
