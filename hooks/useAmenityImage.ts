'use client';

import { useEffect, useState } from 'react';
import { getAmenityImage } from '../lib/api/amenities.api';
import { useAuthStore } from '../store/useAuthStore';

export function useAmenityImage(amenityId?: string | null): string | undefined {
  const organizationId = useAuthStore(state => state.organizationId);
  const userId = useAuthStore(state => state.backendUser?.id);
  const key = `${userId}:${organizationId}:${amenityId}`;
  const [image, setImage] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;
    if (amenityId && organizationId && userId) {
      void getAmenityImage(amenityId).then(blob => {
        if (disposed || !blob.type.startsWith('image/')) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ key, url: objectUrl });
      }).catch(() => { if (!disposed) setImage(null); });
    } else setImage(null);
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [amenityId, key, organizationId, userId]);

  return image?.key === key ? image.url : undefined;
}
