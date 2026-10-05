'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVisitorStore, useToastStore } from '../../store';
import { PreApprovedPass } from '../../types';
import {
  IconCamera,
  IconArrowLeft,
  IconFlip,
  IconLightning,
  IconPhone,
  IconCheck,
  IconCalendar,
  IconCar,
  IconQrCode
} from '../common/Icons';

interface GuardScannerScreenProps {
  onBack: () => void;
  onConfirmEntry: (passCode: string, vehicleNo: string, gateName: string) => void;
}

export const GuardScannerScreen: React.FC<GuardScannerScreenProps> = ({
  onBack,
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

  const handleBack = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    onBack();
  };

  return (
    <div className="guard-scanner-page" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-sunken)' }}>
      {/* Top Bar with Back Button */}
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--pine-dark)',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '6px 8px',
            borderRadius: '6px'
          }}
          aria-label="Back to Queue"
        >
          <IconArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--pine-dark)',
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconCamera size={16} />
            <span>FastPass Scanner</span>
          </h2>
          <div style={{ fontSize: '0.6875rem', color: 'var(--neutral)', margin: 0 }}>
            {cameraActive ? 'Live Camera Active' : 'Optical QR Reader'}
          </div>
        </div>

        <span
          style={{
            background: cameraActive ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
            color: cameraActive ? 'var(--pine)' : 'var(--danger)',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '99px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: cameraActive ? 'var(--pine)' : 'var(--danger)'
            }}
          />
          {cameraActive ? 'LIVE' : 'READY'}
        </span>
      </header>

      {/* Main Content Area */}
      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        {!selectedPass ? (
          <>
            {/* Camera Video / Optical Viewport */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '260px',
                backgroundColor: '#091512',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: '2px solid var(--pine)',
                boxShadow: 'var(--shadow-md)'
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
                  width: '190px',
                  height: '190px',
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
                    width: '24px',
                    height: '24px',
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
                    width: '24px',
                    height: '24px',
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
                    width: '24px',
                    height: '24px',
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
                    width: '24px',
                    height: '24px',
                    borderBottom: '4px solid var(--saffron)',
                    borderRight: '4px solid var(--saffron)',
                    borderBottomRightRadius: '14px'
                  }}
                />
              </div>

              {/* Camera Top Controls */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  display: 'flex',
                  gap: '6px',
                  zIndex: 5
                }}
              >
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  style={{
                    background: 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Flip Camera"
                >
                  <IconFlip size={14} />
                  <span>Flip</span>
                </button>
                <button
                  type="button"
                  onClick={toggleTorch}
                  style={{
                    background: torchOn ? 'var(--saffron)' : 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: torchOn ? '#000' : '#fff',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Torch"
                >
                  <IconLightning size={14} />
                  <span>Light</span>
                </button>
              </div>

              {!cameraActive && (
                <div style={{ textAlign: 'center', zIndex: 2, color: '#ffffff', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <IconPhone size={36} style={{ color: 'var(--saffron)' }} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                    Align Visitor&apos;s Phone QR in Frame
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                    {cameraError ? `Camera notice: ${cameraError}` : 'Detecting QR Gate Pass...'}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Simulate Pre-Approved Passes */}
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--neutral)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                Simulate Target Pre-Approved Guest QR:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {preApprovedPasses.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="card"
                    style={{
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid var(--border)',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                      width: '100%',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface)',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSelectPass(p)}
                  >
                    <div>
                      <strong style={{ color: 'var(--pine-dark)', display: 'block' }}>{p.guestName}</strong>
                      <span style={{ color: 'var(--neutral)', fontSize: '0.75rem' }}>
                        Flat {p.flat} ({p.purpose}) • {p.validityDisplay || 'Valid Today'}
                      </span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <IconQrCode size={12} />
                      <span>Pass {p.passCode}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Passcode Lookup */}
            <div className="card" style={{ padding: '12px', background: 'var(--surface)' }}>
              <span className="form-label" style={{ marginBottom: '6px' }}>
                Or Enter Pass Code Manually
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  id="guard-manual-pass-input"
                  placeholder="e.g. GP-9481"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{ fontSize: '0.875rem', textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0 16px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                  onClick={handleManualLookup}
                >
                  Verify Pass
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Verified Pass Detail Dossier */}
            <div
              style={{
                border: '2px solid var(--pine)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                backgroundColor: 'var(--surface)',
                marginBottom: '16px',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '10px',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--pine-dark)', display: 'block' }}>
                    Pass #{selectedPass.passCode}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                    Pre-cleared by Resident ({selectedPass.resident || 'Host Resident'})
                  </div>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconCheck size={14} />
                  <span>PRE-APPROVED</span>
                </span>
              </div>

              <div className="verified-data-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="verified-data-item">
                  <label style={{ fontSize: '0.6875rem', color: 'var(--neutral)', textTransform: 'uppercase', display: 'block' }}>Guest Name</label>
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--pine-dark)' }}>{selectedPass.guestName}</strong>
                </div>
                <div className="verified-data-item">
                  <label style={{ fontSize: '0.6875rem', color: 'var(--neutral)', textTransform: 'uppercase', display: 'block' }}>Phone Number</label>
                  <strong style={{ fontSize: '0.875rem' }}>{selectedPass.phone}</strong>
                </div>
                <div className="verified-data-item">
                  <label style={{ fontSize: '0.6875rem', color: 'var(--neutral)', textTransform: 'uppercase', display: 'block' }}>Destination Flat</label>
                  <strong style={{ color: 'var(--pine)', fontSize: '0.9375rem' }}>
                    Flat {selectedPass.flat}
                  </strong>
                </div>
                <div className="verified-data-item">
                  <label style={{ fontSize: '0.6875rem', color: 'var(--neutral)', textTransform: 'uppercase', display: 'block' }}>Visit Purpose</label>
                  <strong style={{ fontSize: '0.875rem' }}>{selectedPass.purpose}</strong>
                </div>
                <div className="verified-data-item" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.6875rem', color: 'var(--neutral)', textTransform: 'uppercase', display: 'block' }}>Validity Window</label>
                  <span
                    style={{
                      color: 'var(--saffron-dark)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <IconCalendar size={14} />
                    <span>{selectedPass.validityDisplay || 'Valid Today'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Guard Input: Vehicle Plate */}
            <div className="card" style={{ padding: '14px', background: 'var(--surface)', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label
                  className="form-label"
                  style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <IconCar size={16} />
                  <span>Vehicle Registration Number Plate (Optional):</span>
                </label>
                <input
                  className="input"
                  id="guard-scanned-vehicle"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="e.g. MH-02-CB-1234"
                  style={{
                    fontSize: '0.9375rem',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    fontWeight: 700
                  }}
                />
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--neutral)',
                    marginTop: '3px',
                    display: 'block'
                  }}
                >
                  Identity pre-verified. Only log plate if visitor arrived in vehicle.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8125rem' }}>
                  Entry Gate Terminal
                </label>
                <select
                  className="select"
                  id="guard-scanned-gate"
                  style={{ fontSize: '0.875rem' }}
                  value={gateName}
                  onChange={(e) => setGateName(e.target.value)}
                >
                  <option value="Gate 01 • North Booth">Gate 01 • North Booth (Main Gate)</option>
                  <option value="Gate 02 • Back Gate">Gate 02 • Back Gate</option>
                  <option value="Service & Delivery Gate #3">Service & Delivery Gate #3</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1, padding: '12px', fontSize: '0.8125rem' }}
                onClick={() => setSelectedPass(null)}
              >
                Scan Another
              </button>
              <button
                type="button"
                className="btn btn-barrier"
                style={{
                  flex: 2,
                  padding: '14px',
                  fontSize: '0.9375rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={handleConfirm}
              >
                <IconCheck size={18} />
                <span>Confirm &amp; Open Barrier</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
