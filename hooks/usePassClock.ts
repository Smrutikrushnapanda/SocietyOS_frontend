'use client';

import { useEffect, useState } from 'react';

export function usePassClock(boundaries: (string | undefined)[]): number {
  const [now, setNow] = useState(() => Date.now());
  const boundaryKey = boundaries.filter(Boolean).join('|');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const times = boundaryKey.split('|').map(value => Date.parse(value)).filter(Number.isFinite);
    const refresh = () => {
      clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      const next = Math.min(...times.filter(time => time > current));
      if (Number.isFinite(next)) timer = setTimeout(refresh, Math.min(next - current, 2147483647));
    };
    const resume = () => { if (!document.hidden) refresh(); };
    // Refresh cached time after data arrives, then wake only at a pass boundary.
    timer = setTimeout(refresh, 0);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [boundaryKey]);

  return now;
}
