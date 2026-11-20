'use client';

import React, { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';

interface LoadingAnimationProps {
  /** Text displayed below the animation */
  message?: string;
  /** Size in pixels or CSS units (e.g. 120, '140px', '40%'). Default 140px */
  size?: number | string;
  /** Centers horizontally and vertically in its container */
  centered?: boolean;
  /** Fullscreen fixed backdrop overlay */
  fullscreen?: boolean;
  /** Inline display for buttons or small widgets */
  inline?: boolean;
  className?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  message,
  size = 140,
  centered = true,
  fullscreen = false,
  inline = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    let anim: AnimationItem | null = null;

    import('lottie-web').then((lottieModule) => {
      if (!isMounted || !containerRef.current) return;
      const lottie = lottieModule.default || lottieModule;

      try {
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '/animations/loading.json',
        });
        animRef.current = anim;
      } catch {
        // Fallback gracefully if JSON fails to fetch or parse
      }
    });

    return () => {
      isMounted = false;
      if (anim) {
        anim.destroy();
      } else if (animRef.current) {
        animRef.current.destroy();
      }
    };
  }, []);

  const sizeStyle = typeof size === 'number' ? `${size}px` : size;

  const content = (
    <div
      className={`loading-animation-wrapper ${className}`}
      style={{
        display: inline ? 'inline-flex' : 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: inline ? '0' : '24px 16px',
        textAlign: 'center',
        width: inline ? 'auto' : '100%',
        maxWidth: '100%',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: sizeStyle,
          height: sizeStyle,
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Loading animation"
        role="status"
      />
      {message && (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '0.875rem',
            color: 'var(--neutral-dark, #475569)',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          {message}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </div>
    );
  }

  if (centered && !inline) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '220px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};
