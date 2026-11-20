'use client';

import React, { useState } from 'react';
import { usePrivateImage } from '../../hooks/usePrivateImage';

export function ResidentAvatar({ fileId, name }: { fileId?: string | null; name: string }) {
  const url = usePrivateImage(fileId);
  const [failedUrl, setFailedUrl] = useState<string>();
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';
  return url && url !== failedUrl ? <img className="resident-directory-photo" src={url} alt={`${name} profile`} onError={() => setFailedUrl(url)} /> :
    <span className="resident-directory-avatar" role="img" aria-label={`${name} avatar`}>{initials}</span>;
}
