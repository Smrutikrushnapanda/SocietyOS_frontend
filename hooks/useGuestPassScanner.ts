'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { validateVisitorPass } from '../lib/api/visitors.api';
import { useAuthStore, useToastStore } from '../store';
import type { PreApprovedPass } from '../types';

export function useGuestPassScanner(video: RefObject<HTMLVideoElement | null>, active: boolean, onVerified: (pass: PreApprovedPass) => void) {
  const [isVerifying, setIsVerifying] = useState(false);
  const busy = useRef(false);
  const callback = useRef(onVerified);
  const mounted = useRef(true);
  const verifyRef = useRef<(token: string) => Promise<void>>(async () => {});
  useEffect(() => { callback.current = onVerified; });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const verifyToken = async (token: string) => {
    if (busy.current) return;
    busy.current = true;
    setIsVerifying(true);
    const session = useAuthStore.getState();
    try {
      const pass = await validateVisitorPass(token.trim());
      const current = useAuthStore.getState();
      if (!mounted.current || current.organizationId !== session.organizationId || current.backendUser?.id !== session.backendUser?.id || current.sessionVersion !== session.sessionVersion) return;
      callback.current({
        id: pass.passId, visitId: pass.visitId, passCode: pass.passCode, qrToken: pass.qrToken,
        guestName: pass.visitorName, phone: pass.visitorPhone, resident: pass.residentName,
        flat: pass.flat || 'Registered Unit', purpose: pass.purpose,
        startDate: pass.validityStart, endDate: pass.validityEnd,
        validityDisplay: `${new Date(pass.validityStart).toLocaleString()} – ${new Date(pass.validityEnd).toLocaleString()}`,
        gate: '', status: 'Active',
      });
    } catch (error) {
      if (mounted.current) useToastStore.getState().showToast(error instanceof Error ? error.message : 'Could not verify guest pass', 'error');
    } finally {
      busy.current = false;
      if (mounted.current) setIsVerifying(false);
    }
  };
  useEffect(() => { verifyRef.current = verifyToken; });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let lastToken = '';
    const scan = async () => {
      try {
        const element = video.current;
        if (!busy.current && element && element.readyState >= 2) {
          const { decodeGuestQr } = await import('../lib/visitors/qr-scanner');
          if (cancelled) return;
          const token = decodeGuestQr(element, element.videoWidth, element.videoHeight);
          if (!token) lastToken = '';
          else if (token !== lastToken) {
            lastToken = token;
            await verifyRef.current(token);
          }
        }
      } catch {
        if (!cancelled) useToastStore.getState().showToast('Camera QR reader failed. Try an image or enter the full pass code.', 'error');
        return;
      }
      if (!cancelled) timer = setTimeout(scan, 300);
    };
    void scan();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active, video]);

  const scanImage = async (file?: File) => {
    if (!file) return;
    try {
      const { decodeGuestQrFile } = await import('../lib/visitors/qr-scanner');
      const token = await decodeGuestQrFile(file);
      if (mounted.current) await verifyToken(token);
    } catch (error) {
      if (mounted.current) useToastStore.getState().showToast(error instanceof Error ? error.message : 'Could not read QR image', 'error');
    }
  };
  return { verifyToken, scanImage, isVerifying };
}
