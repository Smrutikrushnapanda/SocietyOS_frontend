'use client';

import { useEffect, useState } from 'react';
import { downloadFile } from '../../lib/api/files.api';
import { getUserFriendlyErrorMessage } from '../../lib/api/errors';

export function DocumentPreview({ id, mimeType, filename }: { id: string; mimeType: string; filename: string }) {
  const [preview, setPreview] = useState<{ url?: string; text?: string; error?: string; loading: boolean }>({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    void downloadFile(id).then(async blob => {
      if (cancelled) return;
      if (mimeType === 'text/plain') {
        const text = await blob.text();
        if (!cancelled) setPreview({ text, loading: false });
      } else {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
        setPreview({ url: objectUrl, loading: false });
      }
    }).catch(reason => {
      if (!cancelled) setPreview({ error: getUserFriendlyErrorMessage(reason, 'Unable to preview this document.'), loading: false });
    });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, mimeType, attempt]);

  if (preview.loading) return <p role="status">Loading document preview…</p>;
  if (preview.error) return <div role="alert"><p>{preview.error}</p><button className="btn btn-sm btn-ghost" onClick={() => { setPreview({ loading: true }); setAttempt(value => value + 1); }}>Retry preview</button></div>;
  if (preview.text !== undefined) return <pre style={{ maxHeight: '55vh', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{preview.text}</pre>;
  // eslint-disable-next-line @next/next/no-img-element -- Private blob URLs must stay in the authenticated browser.
  if (mimeType.startsWith('image/')) return <img src={preview.url} alt={filename} style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain' }} />;
  if (mimeType === 'application/pdf') return <iframe src={preview.url} title={`Preview of ${filename}`} style={{ width: '100%', height: '55vh', border: 0 }} />;
  return <p>Preview unavailable. Download this file to open it.</p>;
}
