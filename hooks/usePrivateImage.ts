'use client';

import { useEffect, useState } from 'react';
import { downloadFile } from '../lib/api/files.api';
import { useAuthStore } from '../store/useAuthStore';

export function usePrivateImage(fileId?: string | null): string | undefined {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id);
  const [image, setImage] = useState<{ key: string; url: string } | null>(null);
  const key = `${userId}:${organizationId}:${fileId}`;
  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;
    if (fileId && organizationId && userId) {
      void downloadFile(fileId).then(blob => {
        if (disposed || !blob.type.startsWith('image/')) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ key, url: objectUrl });
      }).catch(() => { if (!disposed) setImage(null); });
    } else setImage(null);
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [key, fileId, organizationId, userId]);
  return image?.key === key ? image.url : undefined;
}
