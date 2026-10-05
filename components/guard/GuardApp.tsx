'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GuardHeader } from './GuardHeader';
import { GuardBottomNav, GuardTabType } from './GuardBottomNav';
import { GuardScannerScreen } from './GuardScannerScreen';
import { useVisitorStore, useToastStore } from '../../store';
import { IconLightning, IconCamera, IconClock, IconCar, IconCheck, IconClose } from '../common/Icons';
import clsx from 'clsx';

interface ParkingBay {
  id: string;
  zone: 'A' | 'B';
  status: 'free' | 'occupied' | 'reserved';
  vehicle?: string | null;
  assignedFlat?: string | null;
}

export const GuardApp: React.FC = () => {
  const { visitors, approveVisitor, denyVisitor, createPreApprovedPass } = useVisitorStore();
  const { showToast } = useToastStore();

  const [currentTab, setCurrentTab] = useState<GuardTabType>('queue');
  const [queueFilter, setQueueFilter] = useState<'all' | 'requested' | 'approved'>('all');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Visitor Entry Form State
  const [purpose, setPurpose] = useState('Delivery');
  const [selectedTower, setSelectedTower] = useState('tower-a');
  const [entryFlat, setEntryFlat] = useState('A-101');
  const [entryName, setEntryName] = useState('');
  const [entryPhone, setEntryPhone] = useState('');
  const [entryVehicle, setEntryVehicle] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Video Ref for Snapshot Camera Modal
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const [photoCameraActive, setPhotoCameraActive] = useState(false);

  // Parking Bays State
  const [selectedZone, setSelectedZone] = useState<'A' | 'B'>('A');
  const [selectedBay, setSelectedBay] = useState<string | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [parkingBays, setParkingBays] = useState<ParkingBay[]>([
    { id: 'A-01', zone: 'A', status: 'occupied', vehicle: 'MH-02-CB-4491' },
    { id: 'A-02', zone: 'A', status: 'occupied', vehicle: 'MH-02-AK-9920' },
    { id: 'A-03', zone: 'A', status: 'reserved', vehicle: 'Reserved (EV)' },
    { id: 'A-04', zone: 'A', status: 'free' },
    { id: 'A-05', zone: 'A', status: 'occupied', vehicle: 'MH-02-EF-1029' },
    { id: 'A-06', zone: 'A', status: 'occupied', vehicle: 'MH-02-ZA-5512' },
    { id: 'A-07', zone: 'A', status: 'free' },
    { id: 'A-08', zone: 'A', status: 'occupied', vehicle: 'MH-02-QW-8819' },
    { id: 'A-09', zone: 'A', status: 'reserved', vehicle: 'MH-02-AA-0001' },
    { id: 'A-10', zone: 'A', status: 'occupied', vehicle: 'MH-02-BN-3341' },
    { id: 'A-11', zone: 'A', status: 'occupied', vehicle: 'MH-02-PL-7712' },
    { id: 'A-12', zone: 'A', status: 'free' },
    { id: 'B-01', zone: 'B', status: 'occupied', vehicle: 'MH-02-DR-9011' },
    { id: 'B-02', zone: 'B', status: 'occupied', vehicle: 'MH-02-WE-3412' },
    { id: 'B-03', zone: 'B', status: 'free' },
    { id: 'B-04', zone: 'B', status: 'occupied', vehicle: 'MH-02-CV-7819' },
    { id: 'B-05', zone: 'B', status: 'reserved', vehicle: 'MH-02-VIP-9' },
    { id: 'B-06', zone: 'B', status: 'occupied', vehicle: 'MH-02-PO-1188' },
    { id: 'B-07', zone: 'B', status: 'occupied', vehicle: 'MH-02-LK-9022' },
    { id: 'B-08', zone: 'B', status: 'free' },
    { id: 'B-09', zone: 'B', status: 'occupied', vehicle: 'MH-02-MN-6754' },
    { id: 'B-10', zone: 'B', status: 'occupied', vehicle: 'MH-02-RE-2231' },
    { id: 'B-11', zone: 'B', status: 'free' }
  ]);

  // Snapshot Camera Lifecycle
  useEffect(() => {
    if (!isPhotoModalOpen) {
      if (photoStreamRef.current) {
        photoStreamRef.current.getTracks().forEach((track) => track.stop());
        photoStreamRef.current = null;
      }
      setPhotoCameraActive(false);
      return;
    }

    let isMounted = true;
    async function startPhotoCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        photoStreamRef.current = stream;
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = stream;
          photoVideoRef.current.play().catch(() => {});
        }
        setPhotoCameraActive(true);
      } catch (err) {
        setPhotoCameraActive(false);
      }
    }

    startPhotoCamera();

    return () => {
      isMounted = false;
      if (photoStreamRef.current) {
        photoStreamRef.current.getTracks().forEach((track) => track.stop());
        photoStreamRef.current = null;
      }
    };
  }, [isPhotoModalOpen]);

  const capturePhotoSnapshot = () => {
    if (photoVideoRef.current) {
      const video = photoVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoDataUrl(dataUrl);
      }
    } else {
      setPhotoDataUrl('/assets/visitor_avatar.png');
    }
    setIsPhotoModalOpen(false);
    showToast('Visitor facial snapshot captured & timestamped!');
  };

  const activeVisitors = visitors.filter(
    (v) => v.status === 'requested' || v.status === 'approved'
  );
  const requestedVisitors = visitors.filter((v) => v.status === 'requested');
  const approvedVisitors = visitors.filter((v) => v.status === 'approved');

  const filteredVisitors =
    queueFilter === 'requested'
      ? requestedVisitors
      : queueFilter === 'approved'
      ? approvedVisitors
      : activeVisitors;

  const toggleSync = () => {
    if (isOnline) {
      setIsOnline(false);
      setPendingSyncCount((prev) => (prev === 0 ? 1 : prev));
      showToast('Switched to Offline Mode (Simulated).');
    } else {
      const count = pendingSyncCount;
      setIsOnline(true);
      setPendingSyncCount(0);
      showToast(
        count > 0
          ? `Auto-synced ${count} local transactions to Cloud API.`
          : 'Live connection verified.'
      );
    }
  };

  const handleApprove = (id: string, name: string) => {
    approveVisitor(id);
    if (!isOnline) setPendingSyncCount((p) => p + 1);
    showToast(`Entry approved for ${name}! Ready for Gate Check-in.`);
  };

  const handleDeny = (id: string, name: string) => {
    denyVisitor(id);
    if (!isOnline) setPendingSyncCount((p) => p + 1);
    showToast(`Visitor ${name} turned away at gate.`);
  };

  const handleCheckIn = (id: string, name: string) => {
    approveVisitor(id);
    if (!isOnline) setPendingSyncCount((p) => p + 1);
    showToast(`Boom barrier opened! ${name} checked in.`);
  };

  const handleConfirmPreApprovedEntry = (
    passCode: string,
    vehicleNo: string,
    gateName: string
  ) => {
    setIsScannerOpen(false);
    if (!isOnline) setPendingSyncCount((p) => p + 1);
    showToast(`Boom Barrier Opened! Entry logged for Pass ${passCode}. WhatsApp sync sent.`);
    setCurrentTab('queue');
  };

  const handleSubmitVisitorEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryName.trim()) {
      alert('Please enter visitor name');
      return;
    }

    createPreApprovedPass({
      guestName: entryName.trim(),
      phone: entryPhone.trim() || '+91 98000 00000',
      purpose,
      flat: entryFlat,
      vehicleNo: entryVehicle.trim() || null
    });

    if (!isOnline) setPendingSyncCount((p) => p + 1);
    showToast(`Visitor entry logged! WhatsApp approval request sent to Flat ${entryFlat}.`);

    setEntryName('');
    setEntryPhone('');
    setEntryVehicle('');
    setPhotoDataUrl(null);
    setQueueFilter('all');
    setCurrentTab('queue');
  };

  const handleConfirmPark = () => {
    if (!vehiclePlate.trim()) {
      alert('Please enter vehicle registration number plate');
      return;
    }
    if (!selectedBay) {
      alert('Please tap a free green parking bay above');
      return;
    }

    setParkingBays((prev) =>
      prev.map((b) =>
        b.id === selectedBay
          ? { ...b, status: 'occupied', vehicle: vehiclePlate.trim().toUpperCase() }
          : b
      )
    );

    if (!isOnline) setPendingSyncCount((p) => p + 1);
    showToast(`Vehicle ${vehiclePlate.toUpperCase()} assigned to Bay ${selectedBay}. Barrier opened.`);
    setVehiclePlate('');
    setSelectedBay(null);
  };

  const freeBaysA = parkingBays.filter((b) => b.zone === 'A' && b.status === 'free').length;
  const freeBaysB = parkingBays.filter((b) => b.zone === 'B' && b.status === 'free').length;

  if (isScannerOpen) {
    return (
      <GuardScannerScreen
        onBack={() => setIsScannerOpen(false)}
        onConfirmEntry={handleConfirmPreApprovedEntry}
      />
    );
  }

  return (
    <>
      <GuardHeader
        title={
          currentTab === 'queue'
            ? 'Visitor Approvals'
            : currentTab === 'visitor-entry'
            ? 'Log Visitor Entry'
            : 'Assign Parking Bay'
        }
        queueCount={activeVisitors.length}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onToggleSync={toggleSync}
      />

      <main className="phone-body" style={{ paddingTop: 'var(--space-3)' }}>
        {/* 1. QUEUE TAB */}
        {currentTab === 'queue' && (
          <div className="guard-screen active" id="screen-queue">
            {/* FastPass Quick Scan Banner */}
            <div
              className="fastpass-quick-scan-strip"
              onClick={() => setIsScannerOpen(true)}
            >
              <div className="fastpass-scan-content">
                <div className="fastpass-scan-icon">
                  <IconLightning size={18} />
                </div>
                <div>
                  <strong>Scan Resident Pre-Approved QR</strong>
                  <span>1-tap auto-verified entry · Auto-populates guest details</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-accent"
                style={{ padding: '6px 12px', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <IconCamera size={14} />
                <span>Scan QR</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="guard-filter-strip">
              <button
                type="button"
                className={clsx('guard-filter-chip', queueFilter === 'all' && 'active')}
                onClick={() => setQueueFilter('all')}
              >
                All ({activeVisitors.length})
              </button>
              <button
                type="button"
                className={clsx(
                  'guard-filter-chip',
                  queueFilter === 'requested' && 'active'
                )}
                onClick={() => setQueueFilter('requested')}
              >
                Waiting Approval ({requestedVisitors.length})
              </button>
              <button
                type="button"
                className={clsx(
                  'guard-filter-chip',
                  queueFilter === 'approved' && 'active'
                )}
                onClick={() => setQueueFilter('approved')}
              >
                Ready to Check-in ({approvedVisitors.length})
              </button>
            </div>

            <div id="guard-queue-list">
              {filteredVisitors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No Visitors in this View</div>
                  <div className="empty-state-desc">Queue is clear for the selected filter.</div>
                </div>
              ) : (
                filteredVisitors.map((v) => {
                  const initials = v.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isDelivery =
                    v.purpose.toLowerCase().includes('delivery') ||
                    v.purpose.toLowerCase().includes('amazon') ||
                    v.purpose.toLowerCase().includes('blinkit') ||
                    v.purpose.toLowerCase().includes('zomato');

                  return (
                    <div key={v.id} className={`guard-card status-${v.status}`}>
                      <div className="guard-card-head">
                        <div className="visitor-avatar-wrap">
                          <div
                            className={clsx(
                              'visitor-avatar',
                              isDelivery && 'delivery'
                            )}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="visitor-name-title">{v.name}</div>
                            <div className="visitor-purpose-tag">{v.purpose}</div>
                          </div>
                        </div>
                        <div className="flat-target-badge">
                          <span>FLAT</span>
                          {v.flat}
                        </div>
                      </div>

                      <div className="guard-info-row">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IconClock size={12} />
                          <span>Wait: <strong>{v.requestedAt}</strong></span>
                        </span>
                        {v.vehicleNo && (
                          <span className="plate-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconCar size={11} />
                            <span>{v.vehicleNo}</span>
                          </span>
                        )}
                        {v.notifiedViaWhatsApp && (
                          <span className="wa-status-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.554z" />
                            </svg>
                            WhatsApp Verified
                          </span>
                        )}
                      </div>

                      <div className="guard-action-grid">
                        {v.status === 'requested' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              style={{ flex: 1 }}
                              onClick={() => handleApprove(v.id, v.name)}
                            >
                              Call Flat / Verify
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeny(v.id, v.name)}
                            >
                              Deny
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-barrier"
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            onClick={() => handleCheckIn(v.id, v.name)}
                          >
                            <IconCheck size={14} />
                            <span>Open Gate Barrier (Check In)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 2. VISITOR ENTRY TAB */}
        {currentTab === 'visitor-entry' && (
          <div className="guard-screen active" id="screen-visitor-entry">
            <span className="form-label" style={{ marginBottom: '6px' }}>
              Purpose of Visit
            </span>
            <div className="purpose-select-grid">
              {[
                {
                  id: 'Delivery',
                  label: 'Delivery',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  )
                },
                {
                  id: 'Guest',
                  label: 'Guest',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  )
                },
                {
                  id: 'Cab / Ride',
                  label: 'Cab / Taxi',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                      <rect width="16" height="10" x="4" y="5" rx="2" />
                      <circle cx="7" cy="18" r="2" />
                      <circle cx="17" cy="18" r="2" />
                      <line x1="9" y1="18" x2="15" y2="18" />
                    </svg>
                  )
                },
                {
                  id: 'Service',
                  label: 'Service',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  )
                }
              ].map((t) => (
                <div
                  key={t.id}
                  className={clsx('purpose-tile', purpose === t.id && 'active')}
                  onClick={() => setPurpose(t.id)}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </div>
              ))}
            </div>

            {/* Live Camera Snapshot Box */}
            <div
              className="camera-scanner"
              style={{
                position: 'relative',
                cursor: 'pointer',
                backgroundImage: photoDataUrl ? `url(${photoDataUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              onClick={() => setIsPhotoModalOpen(true)}
            >
              {!photoDataUrl && <div className="scanner-reticle"></div>}
              {!photoDataUrl && (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e08a2c"
                  strokeWidth="2"
                  style={{ zIndex: 2 }}
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
              <span className="scanner-text" style={{ background: photoDataUrl ? 'rgba(0,0,0,0.6)' : undefined, padding: '4px 8px', borderRadius: '4px' }}>
                {photoDataUrl ? (
                  <span style={{ color: '#25d366', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <IconCheck size={14} /> Photo Captured (Tap to Retake)
                  </span>
                ) : (
                  'Tap to Open Camera & Snap Photo'
                )}
              </span>
            </div>

            {/* Destination Tower & Flat */}
            <div className="form-group">
              <label className="form-label">Destination Tower & Flat *</label>
              <div className="flat-tower-pills">
                {['tower-a', 'tower-b', 'tower-c'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={clsx('tower-pill', selectedTower === t && 'active')}
                    onClick={() => {
                      setSelectedTower(t);
                      setEntryFlat(t === 'tower-a' ? 'A-101' : t === 'tower-b' ? 'B-101' : 'C-101');
                    }}
                  >
                    {t === 'tower-a' ? 'Tower A' : t === 'tower-b' ? 'Tower B' : 'Tower C'}
                  </button>
                ))}
              </div>
              <select
                className="select"
                value={entryFlat}
                onChange={(e) => setEntryFlat(e.target.value)}
              >
                {selectedTower === 'tower-a' && (
                  <>
                    <option value="A-101">Flat A-101 — Aarav Sharma (3 BHK)</option>
                    <option value="A-102">Flat A-102 — Priya Mukherjee (2 BHK)</option>
                    <option value="A-103">Flat A-103 — Ramesh Patel (3 BHK)</option>
                    <option value="A-201">Flat A-201 — Deepak Verma (3 BHK)</option>
                  </>
                )}
                {selectedTower === 'tower-b' && (
                  <>
                    <option value="B-101">Flat B-101 — Vikas Dubey (3 BHK)</option>
                    <option value="B-201">Flat B-201 — Gautam Singhania (3 BHK)</option>
                    <option value="B-202">Flat B-202 — Isha Mehra (2 BHK)</option>
                  </>
                )}
                {selectedTower === 'tower-c' && (
                  <>
                    <option value="C-101">Flat C-101 — Amitav Ghosh (2 BHK)</option>
                    <option value="C-301">Flat C-301 — Shahid Kapoor (2 BHK)</option>
                    <option value="C-401">Flat C-401 — Ayushmann Khurrana (3 BHK)</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Visitor Full Name *</label>
              <input
                className="input"
                placeholder="e.g. Rahul Patil (Zomato)"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input
                className="input"
                placeholder="e.g. +91 98200 12345"
                value={entryPhone}
                onChange={(e) => setEntryPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Plate Number (if any)</label>
              <input
                className="input"
                placeholder="e.g. MH-02-AB-1234"
                style={{ textTransform: 'uppercase' }}
                value={entryVehicle}
                onChange={(e) => setEntryVehicle(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '4px', padding: '12px' }}
              onClick={handleSubmitVisitorEntry}
            >
              Dispatch WhatsApp Approval Request →
            </button>
          </div>
        )}

        {/* 3. VEHICLE ENTRY TAB */}
        {currentTab === 'vehicle-entry' && (
          <div className="guard-screen active" id="screen-vehicle-entry">
            {/* Zone Switcher */}
            <div className="bay-zone-switch">
              <button
                type="button"
                className={clsx('bay-zone-btn', selectedZone === 'A' && 'active')}
                onClick={() => setSelectedZone('A')}
              >
                Zone A • Basement (Free: {freeBaysA})
              </button>
              <button
                type="button"
                className={clsx('bay-zone-btn', selectedZone === 'B' && 'active')}
                onClick={() => setSelectedZone('B')}
              >
                Zone B • Stilt (Free: {freeBaysB})
              </button>
            </div>

            <span className="form-label" style={{ marginBottom: '6px' }}>
              Tap Available Green Bay to Assign
            </span>
            <div className="tactile-bay-grid">
              {parkingBays
                .filter((b) => b.zone === selectedZone)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={clsx(
                      'tactile-bay-tile',
                      s.status,
                      selectedBay === s.id && 'selected'
                    )}
                    onClick={() => {
                      if (s.status === 'free') setSelectedBay(s.id);
                    }}
                    disabled={s.status !== 'free'}
                  >
                    <span className="bay-num">{s.id}</span>
                    <span className="bay-type">
                      {s.status === 'free' ? 'FREE' : s.status}
                    </span>
                  </button>
                ))}
            </div>

            {/* Selected Bay Summary */}
            <div className="barrier-summary-card">
              <div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--neutral)',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}
                >
                  Selected Parking Bay
                </span>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--pine-dark)'
                  }}
                >
                  {selectedBay ? `Bay ${selectedBay}` : 'None Selected'}
                </div>
              </div>
              <span className="badge badge-pine">
                {selectedBay ? `Zone ${selectedZone} • Available` : 'Visitor Bay'}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Registration Plate *</label>
              <input
                className="input"
                placeholder="e.g. MH-02-DL-8899"
                style={{
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-barrier"
              style={{ width: '100%', padding: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={handleConfirmPark}
            >
              <IconCheck size={16} />
              <span>Confirm Parking & Open Boom Barrier</span>
            </button>
          </div>
        )}
      </main>

      <GuardBottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />

      {/* Camera Facial Snapshot Modal */}
      {isPhotoModalOpen && (
        <div
          className="mobile-modal-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 250,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '340px',
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--pine-dark)', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <IconCamera size={18} />
                <span>Snap Visitor Photo</span>
              </h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                onClick={() => setIsPhotoModalOpen(false)}
                aria-label="Close"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div
              style={{
                width: '100%',
                height: '220px',
                background: '#0a1613',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}
            >
              <video
                ref={photoVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '140px',
                  height: '170px',
                  border: '2px dashed rgba(224, 138, 44, 0.7)',
                  borderRadius: '50% / 60%',
                  pointerEvents: 'none'
                }}
              ></div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: '0.8125rem' }}
                onClick={() => setIsPhotoModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={capturePhotoSnapshot}
              >
                <IconCamera size={16} />
                <span>Capture Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
