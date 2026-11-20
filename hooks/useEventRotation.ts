'use client';

import { useEffect, useState } from 'react';
import { nextEventId, reconcileEventId } from '../lib/smart-island/events';

export function useEventRotation(events: readonly { id: string }[], paused: boolean) {
  const [selection, setSelection] = useState<{ events: readonly { id: string }[]; id: string | null }>({ events, id: events[0]?.id ?? null });
  let currentId = selection.id;
  if (selection.events !== events) {
    currentId = reconcileEventId(events, selection.id, selection.events);
    setSelection({ events, id: currentId });
  }
  const multiple = events.length > 1;
  useEffect(() => {
    if (paused || !multiple) return;
    const timer = window.setInterval(() => {
      setSelection(current => ({ ...current, id: nextEventId(current.events, current.id) }));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paused, multiple]);
  return currentId;
}
