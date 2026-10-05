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
  IconQrCode
} from '../common/Icons';

interface GuardQrScannerModalProps {
  onClose: () => void;
  onConfirmEntry: (passCode: string, vehicleNo: string, gateName: string) => void;
}

export const GuardQrScannerModal: React.FC<GuardQrScannerModalProps> = ({
  onClose,
  onConfirmEntry
}) => {
  const { preApprovedPasses, getPassByCodeOrName } = useVisitorStore();
  const { showToast } = useToastStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [selectedPass, setSelectedPass] = useState<PreApprovedPass | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [gateName, setGateName] = useState('Gate 01 • North Booth');

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);

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
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Torch if available
  const toggleTorch = async () => {
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

  const handleManualLookup = () => {
    if (!manualCode.trim()) {
      alert('Please enter a Pass Code or QR Token');
      return;
    }
    const found = getPassByCodeOrName(manualCode) || preApprovedPasses[0];
    if (found) {
      handleSelectPass(found);
    } else {
      showToast('No matching pre-approved pass found. Please verify details.');
    }
  };

  const handleConfirm = () => {
    if (!selectedPass) return;
    onConfirmEntry(selectedPass.passCode || selectedPass.id, vehicleNo, gateName);
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
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '240px',
                  backgroundColor: '#091512',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  border: '2px solid var(--pine)'
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
                    zIndex: 5
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
                    {cameraActive ? 'CAMERA LIVE' : 'SIMULATION MODE'}
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
                      {cameraError ? `Camera notice: ${cameraError}` : 'Detecting holographic QR code...'}
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
                  Simulate Target Pre-Approved Guest QR:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {preApprovedPasses.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        padding: '8px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid var(--border)',
                        fontSize: '0.75rem',
                        textAlign: 'left',
                        width: '100%',
                        borderRadius: '8px',
                        background: '#ffffff'
                      }}
                      onClick={() => handleSelectPass(p)}
                    >
                      <div>
                        <strong style={{ color: 'var(--pine-dark)' }}>{p.guestName}</strong>
                        <span style={{ color: 'var(--neutral)', fontSize: '0.6875rem' }}>
                          {' '}
                          • Flat {p.flat} ({p.purpose})
                        </span>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.625rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IconQrCode size={11} />
                        <span>Scan {p.passCode}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Pass Code Input */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input
                  className="input"
                  id="guard-manual-pass-input"
                  placeholder="Or enter Pass Code (e.g. GP-9481)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{ fontSize: '0.8125rem' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0 16px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
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
                <select
                  className="select"
                  id="guard-scanned-gate"
                  style={{ fontSize: '0.8125rem' }}
                  value={gateName}
                  onChange={(e) => setGateName(e.target.value)}
                >
                  <option value="Gate 01 • North Booth">Gate 01 • North Booth (Main Gate)</option>
                  <option value="Gate 02 • Back Gate">Gate 02 • Back Gate</option>
                  <option value="Service & Delivery Gate #3">Service & Delivery Gate #3</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  onClick={() => setSelectedPass(null)}
                >
                  Scan Another
                </button>
                <button
                  className="btn btn-barrier"
                  style={{ flex: 2, padding: '12px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={handleConfirm}
                >
                  <IconCheck size={16} />
                  <span>Confirm &amp; Open Barrier</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
