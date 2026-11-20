'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import { IconLock, IconMic } from '../common/Icons';
import { RadioWaveform } from './RadioWaveform';

interface PushToTalkButtonProps {
  isTransmitting: boolean;
  disabled: boolean;
  disabledReason?: string | null;
  speakerName: string;
  variant?: 'group' | 'direct' | 'emergency';
  onTransmitStart: () => void;
  onTransmitStop: () => void;
}

export const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  isTransmitting,
  disabled,
  disabledReason,
  speakerName,
  variant = 'group',
  onTransmitStart,
  onTransmitStop,
}) => {
  const holdingRef = useRef(false);
  const stopRef = useRef(onTransmitStop);

  useLayoutEffect(() => {
    stopRef.current = onTransmitStop;
  }, [onTransmitStop]);

  const beginHold = () => {
    if (disabled || holdingRef.current) return;
    holdingRef.current = true;
    onTransmitStart();
  };

  const endHold = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    stopRef.current();
  };

  useEffect(() => {
    if (disabled && holdingRef.current) {
      holdingRef.current = false;
      stopRef.current();
    }
  }, [disabled]);

  useEffect(() => {
    const release = () => {
      if (!holdingRef.current) return;
      holdingRef.current = false;
      stopRef.current();
    };
    const onVisibilityChange = () => {
      if (document.hidden) release();
    };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      release();
    };
  }, []);

  return (
    <div className={clsx('wt-ptt-deck', `variant-${variant}`, isTransmitting && !disabled && 'is-transmitting')}>
      <div className="wt-ptt-ring-outer">
        <span className="wt-ptt-pulse-ring" aria-hidden="true" />
        <span className="wt-ptt-pulse-ring is-delayed" aria-hidden="true" />
        <button
          type="button"
          className={clsx(
            'wt-ptt-button',
            `variant-${variant}`,
            isTransmitting && !disabled && 'is-transmitting',
            disabled && 'is-disabled',
          )}
          disabled={disabled}
          aria-pressed={isTransmitting && !disabled}
          aria-label={
            disabled
              ? disabledReason || 'Push to talk disabled'
              : isTransmitting
                ? `Transmitting as ${speakerName}. Release to stop.`
                : 'Hold to talk'
          }
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            try {
              e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {
              // Ignore in synthetic pointer test environments
            }
            beginHold();
          }}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onLostPointerCapture={endHold}
          onBlur={endHold}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              beginHold();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              endHold();
            }
          }}
        >
          <span className="wt-ptt-mic-wrap" aria-hidden="true">
            {disabled ? <IconLock size={30} /> : isTransmitting ? (
              <RadioWaveform active tone={variant === 'emergency' ? 'red' : 'orange'} label="Push to talk preview" />
            ) : <IconMic size={34} />}
          </span>
          <span className="wt-ptt-label">
            {disabled
              ? 'RADIO LOCKED'
              : isTransmitting
                ? 'TRANSMITTING'
                : 'HOLD TO TALK'}
          </span>
          <span className="wt-ptt-sub">
            {disabled
              ? 'Unavailable'
              : isTransmitting
                ? 'Release to stop'
                : 'PUSH TO TALK'}
          </span>
        </button>
      </div>

      <div className="wt-ptt-status-note" role="status" aria-live="polite">
        {disabled ? (
          <span className="is-blocked">
            {disabledReason || 'Turn Radio ON to transmit'}
          </span>
        ) : isTransmitting ? (
          <span className="is-live">
            Transmitting · Release to listen
          </span>
        ) : (
          <span className="is-ready">Hold to speak. Release to listen.</span>
        )}
      </div>
    </div>
  );
};
