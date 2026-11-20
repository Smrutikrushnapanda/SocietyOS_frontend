'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { IconCheck, IconClose } from '../common/Icons';

export interface MobileSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

interface GuardMobileSelectProps {
  id?: string;
  sheetTitle: string;
  placeholder: string;
  value: string;
  options: MobileSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  leadingIcon?: React.ReactNode;
  countLabel?: string;
}

export const GuardMobileSelect: React.FC<GuardMobileSelectProps> = ({
  id,
  sheetTitle,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  emptyMessage = 'No options available',
  searchable = true,
  searchPlaceholder = 'Search...',
  leadingIcon,
  countLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [isInPhoneFrame, setIsInPhoneFrame] = useState(false);
  const [accentTheme, setAccentTheme] = useState<string | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const titleId = useId();

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(trimmed) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(trimmed)),
    );
  }, [options, query]);

  const closeSheet = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSheet();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeSheet]);

  // Drag-down-to-close gesture matching Resident App bottom sheets
  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    let drag: {
      x: number;
      y: number;
      at: number;
      distance: number;
      height: number;
      active: boolean;
      transform: string;
      transition: string;
    } | null = null;
    let isClosing = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const later = (callback: () => void, ms: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        callback();
      }, ms);
      timers.add(timer);
    };

    const animMs = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;

    const begin = (target: EventTarget | null, x: number, y: number, mouse: boolean) => {
      if (!(target instanceof Element) || isClosing) return;
      if (!sheet.contains(target)) return;
      if (target.closest('input,textarea,select,button,a,[contenteditable="true"]')) return;

      const handle = target.closest('.guard-select-handle,.guard-select-header');
      if (mouse && !handle) return;

      if (!handle) {
        for (let item: Element | null = target; item; item = item.parentElement) {
          if (item.scrollTop > 1) return;
          if (item === sheet) break;
        }
      }

      drag = {
        x,
        y,
        at: performance.now(),
        distance: 0,
        height: sheet.getBoundingClientRect().height,
        active: false,
        transform: sheet.style.transform,
        transition: sheet.style.transition,
      };
    };

    const move = (event: Event, x: number, y: number) => {
      if (!drag) return;
      const dx = x - drag.x;
      const dy = y - drag.y;
      if (!drag.active && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
        if (dy <= 0 || Math.abs(dx) > dy * 0.8) {
          drag = null;
          return;
        }
        drag.active = true;
        sheet.style.animation = 'none';
        sheet.style.transition = 'none';
      }
      if (!drag.active) return;
      if (event.cancelable) event.preventDefault();
      drag.distance = Math.max(0, dy);
      sheet.style.transform = `translateY(${drag.distance}px)`;
    };

    const finish = (cancelled: boolean) => {
      const value = drag;
      drag = null;
      if (!value?.active) return;

      const threshold = Math.min(120, Math.max(64, value.height * 0.18));
      const velocity = value.distance / Math.max(1, performance.now() - value.at);
      const dismiss =
        !cancelled &&
        (value.distance >= threshold || (value.distance >= 32 && velocity > 0.55));
      const ms = animMs();
      sheet.style.transition = `transform ${ms}ms ease-out`;

      if (dismiss) {
        isClosing = true;
        sheet.style.transform = 'translateY(110%)';
        later(() => {
          closeSheet();
        }, ms);
      } else {
        sheet.style.transform = value.transform;
        later(() => {
          if (sheet.isConnected && !drag && !isClosing) {
            sheet.style.transition = value.transition;
          }
        }, ms);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        finish(true);
        return;
      }
      begin(e.target, e.touches[0].clientX, e.touches[0].clientY, false);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        finish(true);
        return;
      }
      move(e, e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (drag?.active && e.cancelable) e.preventDefault();
      finish(false);
    };
    const onCancel = () => finish(true);
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' && e.button === 0) {
        begin(e.target, e.clientX, e.clientY, true);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') move(e, e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') finish(false);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('touchcancel', onCancel);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onCancel);

    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onCancel);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onCancel);
    };
  }, [open, closeSheet]);

  const handleOpen = () => {
    if (disabled) return;
    if (typeof document !== 'undefined') {
      const phoneContainer = triggerRef.current?.closest('.phone-screen') as HTMLElement | null;
      const accentEl = triggerRef.current?.closest('[data-guard-accent]') as HTMLElement | null;
      setPortalTarget(phoneContainer ?? document.body);
      setIsInPhoneFrame(Boolean(phoneContainer));
      setAccentTheme(accentEl?.dataset.guardAccent);
    }
    setQuery('');
    setOpen(true);
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    closeSheet();
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={clsx(
          'guard-select-trigger',
          open && 'is-open',
          !selectedOption && 'is-placeholder',
        )}
        onClick={handleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
      >
        <span className="guard-select-trigger-main">
          {(selectedOption?.icon || leadingIcon) && (
            <span className="guard-select-trigger-icon" aria-hidden="true">
              {selectedOption?.icon ?? leadingIcon}
            </span>
          )}
          <span className="guard-select-trigger-text">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <span className="guard-select-trigger-chevron" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open &&
        portalTarget &&
        createPortal(
          <div
            className={clsx(
              'guard-sheet-backdrop',
              !isInPhoneFrame && 'is-viewport-fixed',
            )}
            data-guard-accent={accentTheme}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeSheet();
            }}
          >
            <div
              ref={sheetRef}
              className="guard-select-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="guard-select-handle" aria-hidden="true" />

              <div className="guard-select-header">
                <div className="guard-select-header-text">
                  <h3 id={titleId} className="guard-select-title">
                    {sheetTitle}
                  </h3>
                  {options.length > 0 && (
                    <span className="guard-select-count">
                      {countLabel || `${options.length} options`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="guard-select-close"
                  onClick={closeSheet}
                  aria-label="Close selector"
                >
                  <IconClose size={18} />
                </button>
              </div>

              {searchable && (
                <div className="guard-select-search-wrap">
                  <div className="guard-select-search-box">
                    <span className="guard-select-search-icon" aria-hidden="true">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      inputMode="search"
                      className="guard-select-search"
                      placeholder={searchPlaceholder}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label={searchPlaceholder}
                    />
                    {query && (
                      <button
                        type="button"
                        className="guard-select-search-clear"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                      >
                        <IconClose size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div
                id={listboxId}
                role="listbox"
                aria-labelledby={titleId}
                className="guard-select-list"
              >
                {filteredOptions.length === 0 ? (
                  <div className="guard-select-empty">
                    {query.trim() ? 'No matching options found' : emptyMessage}
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={clsx(
                          'guard-select-option',
                          isSelected && 'is-selected',
                        )}
                        onClick={() => handleSelect(opt.value)}
                      >
                        <span className="guard-select-option-main">
                          {opt.icon && (
                            <span
                              className="guard-select-option-icon"
                              aria-hidden="true"
                            >
                              {opt.icon}
                            </span>
                          )}
                          <span className="guard-select-option-copy">
                            <span className="guard-select-option-label">
                              {opt.label}
                            </span>
                            {opt.subtitle && (
                              <span className="guard-select-option-sub">
                                {opt.subtitle}
                              </span>
                            )}
                          </span>
                        </span>
                        <span
                          className={clsx(
                            'guard-select-check',
                            isSelected && 'is-selected',
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && <IconCheck size={13} />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
};
