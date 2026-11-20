'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVisitorStore, useToastStore } from '../../store';
import { PreApprovedPass } from '../../types';
import {
  IconCamera,
  IconClose,
  IconFlip,
  IconLightning,
  IconPhone,
  IconCheck,
  IconCalendar,
  IconCar,
  IconMaximize,
  IconMinimize,
  IconDoor
} from '../common/Icons';
import { GuardMobileSelect } from './GuardMobileSelect';
import { useGuestPassScanner } from '../../hooks/useGuestPassScanner';
import { usePassClock } from '../../hooks/usePassClock';
import { filterValidGuestPasses } from '../../lib/guard-passes';

interface GuardQrScannerModalProps {
  onClose: () => void;
  onConfirmEntry: (visitId: string, token: string, vehicleNo: string, gateName: string) => Promise<void>;
}

export const GuardQrScannerModal: React.FC<GuardQrScannerModalProps> = ({
  onClose,
  onConfirmEntry
}) => {
  const { preApprovedPasses } = useVisitorStore();
  const { showToast } = useToastStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedPass, setSelectedPass] = useState<PreApprovedPass | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const confirming = useRef(false);
  const [vehicleNo, setVehicleNo] = useState('');
  const [gateName, setGateName] = useState('Main Gate Terminal');

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!isFullScreen) {
      if (cameraContainerRef.current?.requestFullscreen) {
        try {
          await cameraContainerRef.current.requestFullscreen();
        } catch {
          // fallback to CSS fullscreen
        }
      }
      setIsFullScreen(true);
    } else {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore error
        }
      }
      setIsFullScreen(false);
    }
  };

  // Initialize WebRTC Camera Stream
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      if (selectedPass) return; // Don't start camera if already viewing verified pass

      // Stop any existing stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Camera API (getUserMedia) not supported on this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
        setCameraError(null);
      } catch (err: any) {
        if (isMounted) {
          setCameraActive(false);
          setCameraError(err.message || 'Unable to access camera.');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [facingMode, selectedPass]);

  // Flip Camera
  const toggleCameraFacing = () => {
    setTorchOn(false);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Torch (rear LED or front white-screen illumination)
  const toggleTorch = async () => {
    if (facingMode === 'user') {
      setTorchOn((prev) => !prev);
      return;
    }
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities && (track.getCapabilities() as any)) || {};
        if (capabilities.torch) {
          const nextTorch = !torchOn;
          await (track as any).applyConstraints({
            advanced: [{ torch: nextTorch }]
          });
          setTorchOn(nextTorch);
        } else {
          showToast('Torch / Flashlight not available on this camera hardware.');
        }
      } catch (e) {
        showToast('Torch toggle not supported.');
      }
    }
  };

  const passNow = usePassClock([
    ...preApprovedPasses.flatMap(pass => [pass.startDate, pass.endDate]),
    selectedPass?.startDate,
    selectedPass?.endDate,
  ]);
  const validPreApprovedPasses = filterValidGuestPasses(preApprovedPasses, new Date(passNow));
  const selectedPassExpired = !!selectedPass && Date.parse(selectedPass.endDate) <= passNow;

  useEffect(() => {
    if (selectedPassExpired && !isConfirming) {
      setSelectedPass(null);
      showToast('Guest pass has expired', 'error');
    }
  }, [selectedPassExpired, isConfirming, showToast]);

  const handleSelectPass = (pass: PreApprovedPass) => {
    // Stop camera
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
    setSelectedPass(pass);
    setVehicleNo(pass.vehicleNo || '');
    showToast(`QR FastPass Matched: #${pass.passCode} for Flat ${pass.flat}!`);
  };

  const { verifyToken, scanImage, isVerifying } = useGuestPassScanner(videoRef, cameraActive && !selectedPass, handleSelectPass);

  const handleManualLookup = () => { void verifyToken(manualCode); };

  const handleConfirm = async () => {
    if (!selectedPass?.visitId || !selectedPass.qrToken || selectedPassExpired || confirming.current) return;
    confirming.current = true;
    setIsConfirming(true);
    try {
      await onConfirmEntry(selectedPass.visitId, selectedPass.qrToken, vehicleNo, gateName);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Guest entry failed', 'error');
      setSelectedPass(null);
    } finally {
      confirming.current = false;
      setIsConfirming(false);
    }
  };

  const handleCloseModal = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseModal();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(224, 138, 44, 0.15)',
                color: 'var(--saffron-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(224, 138, 44, 0.3)'
              }}
            >
              <IconCamera size={18} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: 'var(--pine-dark)',
                  margin: 0
                }}
              >
                Scan Pre-Approved FastPass
              </h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--neutral)', margin: 0 }}>
                {cameraActive ? '● Live Camera Active (Optical Reader)' : 'Optical QR reader & resident pre-clearance'}
              </p>
            </div>
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--neutral)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={handleCloseModal}
            aria-label="Close"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Scanner Dynamic Content Area */}
        <div id="guard-scanner-content" style={{ padding: '16px', overflowY: 'auto' }}>
          {!selectedPass ? (
            <>
              {/* Camera Video / Optical Viewport */}
              <div
                ref={cameraContainerRef}
                className={facingMode === 'user' && torchOn ? 'guard-scanner-viewfinder-flash' : undefined}
                style={{
                  position: isFullScreen ? 'fixed' : 'relative',
                  inset: isFullScreen ? 0 : undefined,
                  width: isFullScreen ? '100vw' : '100%',
                  height: isFullScreen ? '100vh' : '240px',
                  zIndex: isFullScreen ? 99999 : undefined,
                  backgroundColor: facingMode === 'user' && torchOn ? '#ffffff' : '#091512',
                  borderRadius: isFullScreen ? 0 : 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: isFullScreen ? 0 : '14px',
                  border: isFullScreen ? 'none' : '2px solid var(--pine)'
                }}
              >
                {/* Live WebRTC Camera Feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraActive ? 'block' : 'none'
                  }}
                />

                {/* Laser Scanning Line Animation */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #22c55e, #4ade80, transparent)',
                    boxShadow: '0 0 10px #22c55e, 0 0 20px #4ade80',
                    zIndex: 4,
                    animation: 'scannerLaserMove 2.2s infinite ease-in-out'
                  }}
                />

                {/* Corner Targeting Brackets */}
                <div
                  style={{
                    position: 'absolute',
                    width: '180px',
                    height: '180px',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '16px',
                    zIndex: 3,
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      left: '-2px',
                      width: '20px',
                      height: '20px',
                      borderTop: '4px solid var(--saffron)',
                      borderLeft: '4px solid var(--saffron)',
                      borderTopLeftRadius: '14px'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '20px',
                      height: '20px',
                      borderTop: '4px solid var(--saffron)',
                      borderRight: '4px solid var(--saffron)',
                      borderTopRightRadius: '14px'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      left: '-2px',
                      width: '20px',
                      height: '20px',
                      borderBottom: '4px solid var(--saffron)',
                      borderLeft: '4px solid var(--saffron)',
                      borderBottomLeftRadius: '14px'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '20px',
                      height: '20px',
                      borderBottom: '4px solid var(--saffron)',
                      borderRight: '4px solid var(--saffron)',
                      borderBottomRightRadius: '14px'
                    }}
                  />
                </div>

                {/* Camera Top HUD Controls */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    right: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 10
                  }}
                >
                  <span
                    style={{
                      background: cameraActive ? 'rgba(22, 163, 74, 0.8)' : 'rgba(220, 38, 38, 0.8)',
                      color: '#ffffff',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '99px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff'
                      }}
                    />
                    {cameraActive ? 'CAMERA LIVE' : 'CAMERA UNAVAILABLE'}
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Flip Camera"
                    >
                      <IconFlip size={12} />
                      <span>Flip</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      style={{
                        background: isFullScreen ? 'var(--pine)' : 'rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={isFullScreen ? 'Close Full Screen' : 'Full Screen'}
                      aria-label={isFullScreen ? 'Close Full Screen' : 'Full Screen'}
                    >
                      {isFullScreen ? <IconMinimize size={12} /> : <IconMaximize size={12} />}
                      <span>{isFullScreen ? 'Exit Full' : 'Full Screen'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleTorch}
                      style={{
                        background: torchOn ? 'var(--saffron)' : 'rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: torchOn ? '#000' : '#fff',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Torch"
                    >
                      <IconLightning size={12} />
                      <span>Light</span>
                    </button>
                  </div>
                </div>

                {!cameraActive && (
                  <div style={{ textAlign: 'center', zIndex: 2, color: '#ffffff', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                      <IconPhone size={36} style={{ color: 'var(--saffron)' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                      Align Visitor&apos;s Phone QR in Frame
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                      {cameraError ? `Camera notice: ${cameraError}` : 'Detecting guest QR code...'}
                    </div>
                  </div>
                )}
              </div>

              {/* One-Tap Simulation Selectors */}
              <div style={{ marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--neutral)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '6px'
                  }}
                >
                  Pre-approved guest passes:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {validPreApprovedPasses.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid var(--border)',
                        fontSize: '0.8125rem',
                        textAlign: 'left',
                        width: '100%',
                        borderRadius: '8px',
                        background: '#ffffff'
                      }}
                      onClick={() => { void verifyToken(p.qrToken || p.id); }}
                    >
                      <strong style={{ color: 'var(--pine-dark)' }}>{p.guestName}</strong>
                      <span style={{ color: 'var(--neutral)', fontSize: '1rem', lineHeight: 1 }} aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              </div>

            <button
              type="button"
              className="guard-qr-image-upload"
              disabled={isVerifying}
              aria-busy={isVerifying}
              onClick={() => imageInputRef.current?.click()}
            >
              <span className="guard-qr-image-upload-icon" aria-hidden="true"><IconCamera size={22} /></span>
              <span className="guard-qr-image-upload-copy">
                <strong>{isVerifying ? 'Verifying guest pass…' : 'Scan QR from image'}</strong>
                <span>Choose a guest pass from your gallery</span>
              </span>
              <span className="guard-qr-image-upload-arrow" aria-hidden="true">›</span>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              disabled={isVerifying}
              aria-label="Scan QR from image"
              onChange={event => { void scanImage(event.target.files?.[0]); event.target.value = ''; }}
            />
            {isVerifying && <p role="status">Verifying guest pass…</p>}
              {/* Manual Pass Code Input */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input
                  className="input"
                  id="guard-manual-pass-input"
                  placeholder="Enter full pass code or QR token"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{ fontSize: '0.8125rem' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0 16px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  disabled={isVerifying}
                  onClick={handleManualLookup}
                >
                  Verify
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Verified Pass Detail Dossier */}
              <div
                style={{
                  border: '1.5px solid var(--pine)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px',
                  backgroundColor: 'var(--surface-sunken)',
                  marginBottom: '14px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--pine-dark)' }}>
                      Pass #{selectedPass.passCode}
                    </strong>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)' }}>
                      Pre-cleared by Host Resident
                    </div>
                  </div>
                  <span className="verified-tag">
                    <IconCheck size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} /> PRE-APPROVED
                  </span>
                </div>

                <div className="verified-data-grid">
                  <div className="verified-data-item">
                    <label>Guest Full Name</label>
                    <strong>{selectedPass.guestName}</strong>
                  </div>
                  <div className="verified-data-item">
                    <label>Phone Number</label>
                    <strong>{selectedPass.phone}</strong>
                  </div>
                  <div className="verified-data-item">
                    <label>Destination Flat</label>
                    <strong style={{ color: 'var(--pine)' }}>
                      Flat {selectedPass.flat} ({selectedPass.resident || 'Host Resident'})
                    </strong>
                  </div>
                  <div className="verified-data-item">
                    <label>Visit Purpose</label>
                    <strong>{selectedPass.purpose}</strong>
                  </div>
                  <div className="verified-data-item" style={{ gridColumn: 'span 2' }}>
                    <label>Validity Window</label>
                    <span
                      style={{
                        color: 'var(--saffron-dark)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <IconCalendar size={13} />
                      <span>{selectedPass.validityDisplay || 'Valid Today'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Guard Input: Vehicle Plate */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label
                  className="form-label"
                  style={{ fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <IconCar size={14} />
                  <span>Vehicle Registration Number Plate (Optional):</span>
                </label>
                <input
                  className="input"
                  id="guard-scanned-vehicle"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="e.g. MH-02-CB-1234 (Leave blank if Pedestrian/Cab)"
                  style={{
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    borderColor: 'var(--pine)'
                  }}
                />
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--neutral)',
                    marginTop: '2px',
                    display: 'block'
                  }}
                >
                  Name &amp; phone are pre-verified. Only log vehicle plate if guest arrived in car/bike.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Entry Gate Terminal
                </label>
                <GuardMobileSelect
                  id="guard-scanned-gate"
                  sheetTitle="Select Entry Gate"
                  placeholder="Select Entry Gate"
                  value={gateName}
                  leadingIcon={<IconDoor size={15} />}
                  options={[
                    { value: 'Main Gate Terminal', label: 'Main Gate Terminal', icon: <IconDoor size={16} /> },
                    { value: 'North Booth', label: 'North Booth', icon: <IconDoor size={16} /> },
                    { value: 'Back Gate', label: 'Back Gate', icon: <IconDoor size={16} /> },
                    { value: 'Service & Delivery Gate', label: 'Service & Delivery Gate', icon: <IconDoor size={16} /> },
                  ]}
                  onChange={(val) => setGateName(val)}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  disabled={isConfirming}
                  onClick={() => setSelectedPass(null)}
                >
                  Scan Another
                </button>
                <button
                  className="btn btn-barrier"
                  style={{ flex: 2, padding: '12px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  disabled={isConfirming || selectedPassExpired}
                  onClick={handleConfirm}
                >
                  <IconCheck size={16} />
                  <span>{isConfirming ? 'Logging entry…' : 'Confirm entry'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
