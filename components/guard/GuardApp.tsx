import { SocietySettingsBootstrap } from '../common/SocietySettings';
import { VisitorLiveStatus } from '../visitors/VisitorLiveStatus';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GuardHeader } from './GuardHeader';
import { GuardBottomNav, GuardTabType } from './GuardBottomNav';
import { GuardScannerScreen } from './GuardScannerScreen';
import { usePassClock } from '../../hooks/usePassClock';
import { isGuardQueueVisitor } from '../../lib/guard-passes';
import { GuardMobileSelect } from './GuardMobileSelect';
import { useVisitorStore, useToastStore, useAuthStore, useNoticeStore } from '../../store';
import { useSocietySettingsStore } from '../../store/useSocietySettingsStore';
import {
  IconLightning,
  IconCamera,
  IconClock,
  IconCar,
  IconCheck,
  IconClose,
  IconFlip,
  IconBuilding,
  IconDoor,
  IconQrCode
} from '../common/Icons';
import clsx from 'clsx';
import { getBuildings, BackendBuilding } from '../../lib/api/buildings.api';
import { getFlats, BackendFlat } from '../../lib/api/flats.api';
import { parkingApi } from '../../lib/api/parking.api';

// Vehicle plate validation: allows standard Indian numbers e.g. MH02AB1234, DL-01-C-1234, 22BH1234AA
const isValidPlateNumber = (plate: string): boolean => {
  const cleaned = plate.replace(/[\s-]/g, '').toUpperCase();
  const standardRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
  const bhSeriesRegex = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
  return standardRegex.test(cleaned) || bhSeriesRegex.test(cleaned);
};

// 10-digit mobile phone number validation
const isValidPhoneNumber = (phone: string): boolean => {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly);
};

interface ParkingBay {
  id: string;
  zone: 'A' | 'B';
  status: 'free' | 'occupied' | 'reserved';
  vehicle?: string | null;
  assignedFlat?: string | null;
}

const GateNoticesStrip: React.FC = () => {
  const { notices } = useNoticeStore();
  const publishedNotices = notices.filter((n) => n.status === 'PUBLISHED');

  if (publishedNotices.length === 0) return null;

  return (
    <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {publishedNotices.slice(0, 2).map((notice) => (
        <div
          key={notice.id}
          style={{
            padding: '8px 12px',
            background: 'var(--pine-tint)',
            border: '1px solid rgba(46, 117, 89, 0.25)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '0.8125rem' }}>📢</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: '0.75rem', color: 'var(--pine-dark)', display: 'block' }}>
              {notice.title}
            </strong>
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--neutral)',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {notice.content || notice.description}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export const GuardApp: React.FC = () => {
  const {
    visitors,
    preApprovedPasses,
    isLoading,
    hasLoadedVisitors,
    error,
    loadGuardData,
    approveVisitorVisit,
    denyVisitorVisit,
    checkInVisitorVisit,
    logWalkInVisitor,
  } = useVisitorStore();
  const { organizationId } = useAuthStore();
  const societyAccent = useSocietySettingsStore((state) => state.data?.branding.accent);
  const guardAccent = societyAccent === 'plum' ? 'plum' : 'blue';
  const { showToast } = useToastStore();

  const [currentTab, setCurrentTab] = useState<GuardTabType>('queue');
  const [queueFilter, setQueueFilter] = useState<'all' | 'requested' | 'approved'>('all');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'queue' || tab === 'visitor-entry' || tab === 'vehicle-entry') {
      const frameId = window.requestAnimationFrame(() => setCurrentTab(tab));
      return () => window.cancelAnimationFrame(frameId);
    }
  }, []);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Live connection verified: Guard terminal online.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Network disconnected: Guard terminal is online-only.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  const { loadNotices } = useNoticeStore();

  // Initial data loading from authoritative backend APIs
  useEffect(() => {
    if (organizationId) {
      loadGuardData();
      void loadNotices();
    }
  }, [organizationId, loadGuardData, loadNotices]);

  // Visitor Entry Form State
  const [purpose, setPurpose] = useState('Other');
  const [entryFlatId, setEntryFlatId] = useState<string>('');
  const [entryName, setEntryName] = useState('');
  const [entryPhone, setEntryPhone] = useState('');
  const [entryVehicle, setEntryVehicle] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [cameraModalMode, setCameraModalMode] = useState<'visitor-photo' | 'plate-scan' | null>(null);
  const [plateScanDraft, setPlateScanDraft] = useState('');
  const [plateSnapshotUrl, setPlateSnapshotUrl] = useState<string | null>(null);

  // Video Ref for Snapshot Camera Modal
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const photoFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [photoCameraActive, setPhotoCameraActive] = useState(false);
  const [photoCameraError, setPhotoCameraError] = useState<string | null>(null);
  const [photoFacingMode, setPhotoFacingMode] = useState<'environment' | 'user'>('environment');
  const [photoTorchOn, setPhotoTorchOn] = useState(false);
  const [isScreenFlashBurst, setIsScreenFlashBurst] = useState(false);

  const stopPhotoStream = useCallback(() => {
    if (photoFlashTimerRef.current) {
      clearTimeout(photoFlashTimerRef.current);
      photoFlashTimerRef.current = null;
    }
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach((track) => track.stop());
      photoStreamRef.current = null;
    }
  }, []);

  const openCameraModal = (mode: 'visitor-photo' | 'plate-scan') => {
    setPhotoCameraError(null);
    setPhotoTorchOn(false);
    setIsScreenFlashBurst(false);
    setPhotoFacingMode('environment');
    if (mode === 'plate-scan') {
      setPlateScanDraft(entryVehicle);
      setPlateSnapshotUrl(null);
    }
    setCameraModalMode(mode);
  };

  const closePhotoModal = () => {
    stopPhotoStream();
    setPhotoCameraActive(false);
    setPhotoCameraError(null);
    setPhotoTorchOn(false);
    setIsScreenFlashBurst(false);
    setPlateSnapshotUrl(null);
    setCameraModalMode(null);
  };

  const togglePhotoFacing = () => {
    setPhotoTorchOn(false);
    setIsScreenFlashBurst(false);
    if (cameraModalMode === 'plate-scan' && plateSnapshotUrl) {
      setPlateSnapshotUrl(null);
    }
    setPhotoFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const togglePhotoTorch = async () => {
    if (photoFacingMode === 'user') {
      setPhotoTorchOn((prev) => !prev);
      return;
    }
    if (cameraModalMode === 'plate-scan' && plateSnapshotUrl) {
      showToast('Tap Retake to toggle rear flash on live camera.', 'info');
      return;
    }
    if (!photoStreamRef.current) {
      showToast('Camera feed unavailable for flash control.', 'info');
      return;
    }
    const track = photoStreamRef.current.getVideoTracks()[0];
    if (!track) {
      showToast('Flash / Torch not available on this camera hardware.', 'info');
      return;
    }
    try {
      const capabilities =
        (track.getCapabilities && (track.getCapabilities() as { torch?: boolean })) || {};
      if (capabilities.torch) {
        const nextTorch = !photoTorchOn;
        await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setPhotoTorchOn(nextTorch);
      } else {
        showToast('Flash / Torch not available on this camera hardware.', 'info');
      }
    } catch {
      showToast('Flash / Torch toggle not supported on this device.', 'info');
    }
  };

  // Buildings & Flats state for dynamic Tower -> Flat selection
  const [buildings, setBuildings] = useState<BackendBuilding[]>([]);
  const [flats, setFlats] = useState<BackendFlat[]>([]);
  const [selectedTower, setSelectedTower] = useState<string>('');

  // Load authoritative towers and flats for visitor entry
  useEffect(() => {
    async function loadTowersAndFlats() {
      if (!organizationId) return;
      try {
        const [bldgs, flts] = await Promise.all([
          getBuildings().catch(() => []),
          getFlats().catch(() => [])
        ]);

        const validBldgs = Array.isArray(bldgs) && bldgs.length > 0
          ? bldgs
          : [
              { id: 'tower-a', name: 'Tower A', organization_id: organizationId, isActive: true },
              { id: 'tower-b', name: 'Tower B', organization_id: organizationId, isActive: true },
              { id: 'tower-c', name: 'Tower C', organization_id: organizationId, isActive: true }
            ];
        setBuildings(validBldgs);
        setSelectedTower(validBldgs[0].id);

        const validFlats = Array.isArray(flts) && flts.length > 0
          ? flts
          : [
              { id: '101', flat_identifier: '101', building_id: 'tower-a', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '102', flat_identifier: '102', building_id: 'tower-a', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '201', flat_identifier: '201', building_id: 'tower-a', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '202', flat_identifier: '202', building_id: 'tower-a', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '301', flat_identifier: '301', building_id: 'tower-a', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '101B', flat_identifier: '101', building_id: 'tower-b', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '102B', flat_identifier: '102', building_id: 'tower-b', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '201B', flat_identifier: '201', building_id: 'tower-b', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '101C', flat_identifier: '101', building_id: 'tower-c', organization_id: organizationId, floor_id: '', isActive: true },
              { id: '102C', flat_identifier: '102', building_id: 'tower-c', organization_id: organizationId, floor_id: '', isActive: true }
            ];
        setFlats(validFlats);

        const firstTowerFlats = validFlats.filter((f) => f.building_id === validBldgs[0].id);
        if (firstTowerFlats.length > 0) {
          setEntryFlatId(firstTowerFlats[0].flat_identifier);
        }
      } catch {
        // Fallback handled cleanly
      }
    }
    void loadTowersAndFlats();
  }, [organizationId]);

  // Derived available flats for currently selected tower
  const availableFlatsForTower = React.useMemo(() => {
    if (!selectedTower) return flats;
    return flats.filter((f) => f.building_id === selectedTower);
  }, [flats, selectedTower]);

  // Parking Bays State
  const [selectedZone, setSelectedZone] = useState<'A' | 'B'>('A');
  const [selectedBay, setSelectedBay] = useState<string | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [selectedVehicleOption, setSelectedVehicleOption] = useState<string>('');
  // Parking Bays State (dynamic - strictly Visitor / Common bays)
  const [parkingBays, setParkingBays] = useState<ParkingBay[]>([]);

  // Dynamic Visitor / Common parking slots loading (no resident flats occupied)
  useEffect(() => {
    async function loadVisitorParkingSlots() {
      if (!organizationId) return;
      try {
        const slots = await parkingApi.getParkingSlots().catch(() => []);
        if (Array.isArray(slots) && slots.length > 0) {
          // Filter to only visitor/common slots (no assigned flat_id)
          const visitorSlots = slots.filter((s) => !s.flat_id);
          const activeList = visitorSlots.length > 0 ? visitorSlots : slots.slice(0, 10);
          const mapped: ParkingBay[] = activeList.map((s) => ({
            id: s.slot_number,
            zone: (s.zone?.toUpperCase().includes('B') ? 'B' : 'A') as 'A' | 'B',
            status: s.status === 'AVAILABLE' ? 'free' : 'occupied',
            vehicle: null,
            assignedFlat: null
          }));
          setParkingBays(mapped);
          return;
        }
      } catch {}

      // Default dynamic Visitor / Common bays (no flat occupied bays)
      setParkingBays([
        { id: 'V-01', zone: 'A', status: 'free' },
        { id: 'V-02', zone: 'A', status: 'free' },
        { id: 'V-03', zone: 'A', status: 'free' },
        { id: 'V-04', zone: 'A', status: 'free' },
        { id: 'V-05', zone: 'A', status: 'free' },
        { id: 'V-06', zone: 'A', status: 'free' },
        { id: 'V-07', zone: 'B', status: 'free' },
        { id: 'V-08', zone: 'B', status: 'free' },
        { id: 'V-09', zone: 'B', status: 'free' },
        { id: 'V-10', zone: 'B', status: 'free' },
      ]);
    }
    void loadVisitorParkingSlots();
  }, [organizationId]);

  // Extract recent scanned / entry vehicle plates from visitors and pre-approved passes
  const recentScannedVehicles = React.useMemo(() => {
    const map = new Map<string, { plate: string; label: string }>();

    visitors.forEach((v) => {
      if (v.vehicleNo && v.vehicleNo.trim()) {
        const p = v.vehicleNo.trim().toUpperCase();
        if (!map.has(p)) {
          map.set(p, { plate: p, label: `${p} — ${v.name} (Flat ${v.flat})` });
        }
      }
    });

    preApprovedPasses.forEach((p) => {
      if (p.vehicleNo && p.vehicleNo.trim()) {
        const pl = p.vehicleNo.trim().toUpperCase();
        if (!map.has(pl)) {
          map.set(pl, { plate: pl, label: `${pl} — ${p.guestName} (Flat ${p.flat})` });
        }
      }
    });

    return Array.from(map.values());
  }, [visitors, preApprovedPasses]);

  // Snapshot Camera Lifecycle
  useEffect(() => {
    if (!cameraModalMode || (cameraModalMode === 'plate-scan' && plateSnapshotUrl)) {
      stopPhotoStream();
      return;
    }

    let isMounted = true;
    async function startPhotoCamera() {
      stopPhotoStream();
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Camera API not supported on this browser.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: photoFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
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
        setPhotoCameraError(null);
      } catch (err: unknown) {
        if (isMounted) {
          setPhotoCameraActive(false);
          setPhotoCameraError(
            err instanceof Error ? err.message : 'Unable to access camera.',
          );
        }
      }
    }

    void startPhotoCamera();

    return () => {
      isMounted = false;
      stopPhotoStream();
    };
  }, [cameraModalMode, plateSnapshotUrl, photoFacingMode, stopPhotoStream]);

  const takePhotoFrame = () => {
    if (photoVideoRef.current && photoVideoRef.current.videoWidth > 0) {
      const video = photoVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (photoFacingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (cameraModalMode === 'plate-scan') {
          stopPhotoStream();
          setPhotoCameraActive(false);
          setPlateSnapshotUrl(dataUrl);
          showToast('Plate frame captured. Confirm or enter plate number below.', 'info');
          return;
        }
        setPhotoDataUrl(dataUrl);
        closePhotoModal();
        showToast('Visitor facial snapshot captured & timestamped.');
        return;
      }
    }
    showToast('Camera feed unavailable. Please ensure camera permissions are granted.', 'error');
    if (cameraModalMode !== 'plate-scan') {
      closePhotoModal();
    }
  };

  const handleApplyPlateScan = () => {
    const formatted = plateScanDraft.trim().toUpperCase();
    if (!formatted) {
      showToast('Enter or scan a vehicle plate number to apply.', 'error');
      return;
    }
    setEntryVehicle(formatted);
    closePhotoModal();
    showToast(`Plate ${formatted} added to visitor entry.`);
  };

  const capturePhotoSnapshot = () => {
    if (photoFacingMode === 'user' && photoTorchOn) {
      if (photoFlashTimerRef.current) {
        clearTimeout(photoFlashTimerRef.current);
      }
      setIsScreenFlashBurst(true);
      photoFlashTimerRef.current = setTimeout(() => {
        photoFlashTimerRef.current = null;
        setIsScreenFlashBurst(false);
        takePhotoFrame();
      }, 160);
      return;
    }
    takePhotoFrame();
  };

  const queueNow = usePassClock(visitors.flatMap(visitor => [visitor.validityStart, visitor.validityEnd]));
  const activeVisitors = visitors.filter(visitor => isGuardQueueVisitor(visitor, queueNow));
  const requestedVisitors = activeVisitors.filter(visitor => visitor.status === 'requested');
  const approvedVisitors = activeVisitors.filter(visitor => visitor.status === 'approved');

  const filteredVisitors =
    queueFilter === 'requested'
      ? requestedVisitors
      : queueFilter === 'approved'
      ? approvedVisitors
      : activeVisitors;

  const handleApprove = async (id: string, name: string) => {
    if (!isOnline) {
      showToast('Guard terminal is online-only. Active internet connection required.');
      return;
    }
    try {
      await approveVisitorVisit(id);
      showToast(`Entry approved for ${name}! Ready for Gate Check-in.`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to approve visit');
    }
  };

  const handleDeny = async (id: string, name: string) => {
    if (!isOnline) {
      showToast('Guard terminal is online-only. Active internet connection required.');
      return;
    }
    try {
      await denyVisitorVisit(id);
      showToast(`Visitor ${name} turned away at gate.`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to deny visit');
    }
  };

  const handleCheckIn = async (id: string, name: string) => {
    if (!isOnline) {
      showToast('Guard terminal is online-only. Active internet connection required.');
      return;
    }
    try {
      await checkInVisitorVisit(id);
      showToast(`${name} checked in.`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to check in visit', 'error');
    }
  };

  const handleConfirmPreApprovedEntry = async (
    visitId: string,
    token: string,
    _vehicleNo: string,
    _gateName: string
  ) => {
    if (!isOnline) throw new Error('Guard terminal is online-only. Active internet connection required.');
    await checkInVisitorVisit(visitId, token);
    setIsScannerOpen(false);
    showToast('Guest entry recorded.', 'success');
    setCurrentTab('queue');
  };

  const handleSubmitVisitorEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      showToast('Offline: Network connection required to log visitor entry.');
      return;
    }
    if (!entryName.trim()) {
      showToast('Please enter visitor name');
      return;
    }
    if (!selectedTower) {
      showToast('Please select a Tower / Building');
      return;
    }
    if (!entryFlatId) {
      showToast('Please select a destination flat');
      return;
    }
    if (entryPhone.trim() && !isValidPhoneNumber(entryPhone.trim())) {
      showToast('Please enter a valid 10-digit phone number (e.g. 9820012345)');
      return;
    }
    if (entryVehicle.trim() && !isValidPlateNumber(entryVehicle.trim())) {
      showToast('Please enter a valid vehicle plate number (e.g. MH02AB1234)');
      return;
    }

    try {
      const towerObj = buildings.find((b) => b.id === selectedTower);
      const towerLabel = towerObj ? towerObj.name : '';
      const flatLabel = towerLabel ? `${towerLabel} - Flat ${entryFlatId}` : `Flat ${entryFlatId}`;

      await logWalkInVisitor({
        name: entryName.trim(),
        phone: entryPhone.trim() || '0000000000',
        purpose,
        flat: flatLabel,
        vehicleNo: entryVehicle.trim().toUpperCase() || null
      });

      showToast(`Visitor entry logged! Request sent for ${flatLabel}.`);

      setPurpose('Other');
      setEntryName('');
      setEntryPhone('');
      setEntryVehicle('');
      setPhotoDataUrl(null);
      setQueueFilter('all');
      setCurrentTab('queue');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to log visitor entry');
    }
  };

  const handleConfirmPark = () => {
    const finalPlate = vehiclePlate.trim().toUpperCase();
    if (!finalPlate) {
      showToast('Please select or enter vehicle registration plate');
      return;
    }
    if (!isValidPlateNumber(finalPlate)) {
      showToast('Please enter a valid vehicle registration plate (e.g. MH02AB1234)');
      return;
    }
    if (!selectedBay) {
      showToast('Please tap an available green parking bay above');
      return;
    }

    setParkingBays((prev) =>
      prev.map((b) =>
        b.id === selectedBay
          ? { ...b, status: 'occupied', vehicle: finalPlate }
          : b
      )
    );

    if (!isOnline) {
      showToast('Offline: Network connection required to record parking assignment.');
      return;
    }
    showToast(`Vehicle ${finalPlate} assigned to Bay ${selectedBay}. Barrier opened.`);
    setVehiclePlate('');
    setSelectedVehicleOption('');
    setSelectedBay(null);
  };

  const freeBaysA = parkingBays.filter((b) => b.zone === 'A' && b.status === 'free').length;
  const freeBaysB = parkingBays.filter((b) => b.zone === 'B' && b.status === 'free').length;

  if (isScannerOpen) {
    return (
      <div
        className="guard-portal-scope"
        data-guard-accent={guardAccent}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <GuardScannerScreen
          onBack={() => setIsScannerOpen(false)}
          onConfirmEntry={handleConfirmPreApprovedEntry}
        />
      </div>
    );
  }

  return (
    <div
      className="guard-portal-scope"
      data-guard-accent={guardAccent}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <SocietySettingsBootstrap />
      <VisitorLiveStatus silent />
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
        onOpenVisitorEntry={() => setCurrentTab('visitor-entry')}
      />

      <main className="phone-body" style={{ paddingTop: 'var(--space-3)' }}>
        {!organizationId && (
          <div
            className="card"
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '12px',
            }}
          >
            <strong style={{ color: 'var(--danger)', fontSize: '0.8125rem', display: 'block' }}>
              Organization Context Required
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
              Please select an organization to view visitors and log gate entries.
            </span>
          </div>
        )}

        {error && (
          <div
            className="card"
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong style={{ color: 'var(--danger)', fontSize: '0.8125rem', display: 'block' }}>
                Error Loading Gate Data
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>{error}</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => loadGuardData()}
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. QUEUE TAB */}
        {currentTab === 'queue' && (
          <div className="guard-screen active" id="screen-queue">
            {/* Gate Broadcast Notices from Admin / Society */}
            <GateNoticesStrip />

            {/* FastPass Quick Scan Banner */}
            <button
              type="button"
              className="fastpass-quick-scan-strip"
              onClick={() => setIsScannerOpen(true)}
            >
              <div className="fastpass-scan-content">
                <div className="fastpass-scan-icon" aria-hidden="true">
                  <IconQrCode size={20} />
                </div>
                <div className="fastpass-scan-copy">
                  <span className="fastpass-scan-eyebrow">FASTPASS GATE ENTRY</span>
                  <strong>Scan Resident Pre-Approved QR</strong>
                  <span className="fastpass-scan-sub">Instant verification &amp; 1-tap check-in</span>
                </div>
              </div>
              <span className="fastpass-scan-cta">
                <IconCamera size={14} />
                <span>Scan</span>
              </span>
            </button>

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
              {isLoading && !hasLoadedVisitors && filteredVisitors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">Loading Gate Queue...</div>
                  <div className="empty-state-desc">Fetching visitor requests for your terminal.</div>
                </div>
              ) : filteredVisitors.length === 0 ? (
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
                  id: 'Other',
                  label: 'Other',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="8.5" cy="12" r="0.75" />
                      <circle cx="12" cy="12" r="0.75" />
                      <circle cx="15.5" cy="12" r="0.75" />
                    </svg>
                  )
                },
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
              onClick={() => openCameraModal('visitor-photo')}
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
                  <span className="guard-photo-captured">
                    <IconCheck size={14} /> Photo Captured (Tap to Retake)
                  </span>
                ) : (
                  'Tap to Open Camera & Snap Photo'
                )}
              </span>
            </div>

            {/* 1. Visitor Full Name * */}
            <div className="form-group">
              <label className="form-label">Visitor Full Name *</label>
              <input
                className="input"
                placeholder="e.g. Rahul Patil (Zomato)"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
              />
            </div>

            {/* 2. Tower / Building * */}
            <div className="form-group">
              <label className="form-label">Tower / Building *</label>
              <GuardMobileSelect
                id="guard-entry-tower"
                sheetTitle="Select Tower / Building"
                placeholder="Select Tower"
                value={selectedTower}
                leadingIcon={<IconBuilding size={15} />}
                countLabel={`${buildings.length} ${buildings.length === 1 ? 'Tower' : 'Towers'}`}
                options={buildings.map((b) => ({
                  value: b.id,
                  label: b.name,
                  subtitle: b.code ? `Code: ${b.code}` : 'Residential Tower',
                  icon: <IconBuilding size={16} />,
                }))}
                onChange={(newTower) => {
                  setSelectedTower(newTower);
                  const matching = flats.filter((f) => f.building_id === newTower);
                  setEntryFlatId(matching.length > 0 ? matching[0].flat_identifier : '');
                }}
              />
            </div>

            {/* 3. Destination Flat According to Tower * */}
            <div className="form-group">
              <label className="form-label">Destination Flat *</label>
              <GuardMobileSelect
                id="guard-entry-flat"
                sheetTitle="Select Destination Flat"
                placeholder={selectedTower ? 'Select Flat' : 'Select Tower First'}
                value={entryFlatId}
                disabled={!selectedTower}
                leadingIcon={<IconDoor size={15} />}
                countLabel={`${availableFlatsForTower.length} ${availableFlatsForTower.length === 1 ? 'Flat' : 'Flats'}`}
                emptyMessage="No flats configured for this tower"
                options={availableFlatsForTower.map((fl) => ({
                  value: fl.flat_identifier,
                  label: `Flat ${fl.flat_identifier}`,
                  subtitle: fl.flat_type || undefined,
                  icon: <IconDoor size={16} />,
                }))}
                onChange={(val) => setEntryFlatId(val)}
              />
            </div>

            {/* 4. Phone Number (Optional) with 10-digit validation */}
            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input
                className="input"
                type="tel"
                placeholder="e.g. 9820012345 (10-digit mobile)"
                maxLength={10}
                value={entryPhone}
                onChange={(e) => setEntryPhone(e.target.value.replace(/\D/g, ''))}
              />
              {entryPhone.length > 0 && entryPhone.length < 10 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '3px', display: 'block' }}>
                  Please enter 10 digits ({entryPhone.length}/10 entered)
                </span>
              )}
            </div>

            {/* 5. Vehicle Plate Number (if any) with validation & Scan trigger */}
            <div className="form-group">
              <label className="form-label" htmlFor="guard-entry-vehicle">
                Vehicle Plate Number (if any)
              </label>
              <input
                id="guard-entry-vehicle"
                className="input"
                placeholder="e.g. MH02AB1234"
                style={{ textTransform: 'uppercase' }}
                value={entryVehicle}
                onChange={(e) => setEntryVehicle(e.target.value.toUpperCase())}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral)', marginTop: '3px', display: 'block' }}>
                Format: State Code + District + Series + Number (e.g. MH02AB1234)
              </span>
              <button
                type="button"
                id="guard-scan-plate-btn"
                className="guard-plate-scan-btn"
                onClick={() => openCameraModal('plate-scan')}
              >
                <span className="guard-plate-scan-icon" aria-hidden="true">
                  <IconCamera size={16} />
                </span>
                <span className="guard-plate-scan-copy">
                  <strong>Scan Number Plate</strong>
                  <span>Open plate camera &amp; fill plate input</span>
                </span>
                <span className="guard-plate-scan-pill">SCAN</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0f4c81 100%)',
                borderColor: '#0f4c81',
                color: '#ffffff',
                boxShadow: '0 3px 10px rgba(15, 76, 129, 0.35)',
              }}
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
              Tap Available Bay to Assign
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
            <div className="barrier-summary-card" role="status" aria-live="polite">
              <span className="parking-summary-icon" aria-hidden="true"><IconCar size={19} /></span>
              <div className="parking-summary-copy">
                <span>Selected Parking Bay</span>
                <strong>{selectedBay ? `Bay ${selectedBay}` : 'None Selected'}</strong>
              </div>
              <span className="parking-summary-zone">
                {selectedBay ? `Zone ${selectedZone}` : 'Visitor / common'}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Registration Plate *</label>
              <GuardMobileSelect
                id="guard-vehicle-select"
                sheetTitle="Select Vehicle Plate"
                placeholder={
                  recentScannedVehicles.length > 0
                    ? 'Select from Recent Entry Scan / Queue'
                    : 'Choose Vehicle Plate Option'
                }
                value={selectedVehicleOption}
                leadingIcon={<IconCar size={15} />}
                searchable={recentScannedVehicles.length > 4}
                options={[
                  ...recentScannedVehicles.map((item) => ({
                    value: item.plate,
                    label: item.plate,
                    subtitle: item.label.includes('—')
                      ? item.label.split('—').slice(1).join('—').trim()
                      : undefined,
                    icon: <IconCar size={16} />,
                  })),
                  {
                    value: 'OTHER',
                    label: 'Enter Other Vehicle Plate Number',
                    subtitle: 'Type registration number manually',
                    icon: <IconCar size={16} />,
                  },
                ]}
                onChange={(val) => {
                  setSelectedVehicleOption(val);
                  if (val === 'OTHER') {
                    setVehiclePlate('');
                  } else if (val) {
                    setVehiclePlate(val);
                  }
                }}
              />

              {(selectedVehicleOption === 'OTHER' || recentScannedVehicles.length === 0 || selectedVehicleOption === '') && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    className="input"
                    placeholder="e.g. MH02AB1234 or DL1CAB1234"
                    style={{
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      fontFamily: 'monospace'
                    }}
                    value={vehiclePlate}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase();
                      setVehiclePlate(upper);
                      if (selectedVehicleOption !== 'OTHER' && upper) {
                        setSelectedVehicleOption('OTHER');
                      }
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--neutral)', marginTop: '4px', display: 'block' }}>
                    Valid Plate: 2-letter State + District + Optional Series + 4 digits (e.g. MH02AB1234)
                  </span>
                </div>
              )}
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

      {/* Full-Screen Camera Modal (Visitor Photo / Vehicle Plate Scan) */}
      {cameraModalMode && (
        <div
          className={clsx(
            'guard-photo-modal',
            photoFacingMode === 'user' && photoTorchOn && 'is-front-flash',
          )}
          role="dialog"
          aria-modal="true"
          aria-label={cameraModalMode === 'plate-scan' ? 'Scan Vehicle Plate' : 'Snap Visitor Photo'}
        >
          <div className="guard-photo-modal-header">
            <h3 className="guard-photo-modal-title">
              {cameraModalMode === 'plate-scan' ? <IconCar size={18} /> : <IconCamera size={18} />}
              <span>
                {cameraModalMode === 'plate-scan' ? 'Scan Vehicle Plate' : 'Snap Visitor Photo'}
              </span>
            </h3>
            <div className="guard-photo-modal-controls">
              <button
                type="button"
                className="guard-photo-hud-btn"
                onClick={togglePhotoFacing}
                aria-label="Flip Camera"
                title="Flip Camera"
              >
                <IconFlip size={15} />
                <span>Flip</span>
              </button>
              <button
                type="button"
                className={clsx('guard-photo-hud-btn', photoTorchOn && 'is-active')}
                onClick={() => void togglePhotoTorch()}
                aria-label={photoTorchOn ? 'Turn Flash Off' : 'Turn Flash On'}
                aria-pressed={photoTorchOn}
                title="Toggle Flash"
              >
                <IconLightning size={15} />
                <span>{photoTorchOn ? 'Flash On' : 'Flash'}</span>
              </button>
              <button
                type="button"
                className="guard-photo-hud-close"
                onClick={closePhotoModal}
                aria-label="Close Camera"
              >
                <IconClose size={18} />
              </button>
            </div>
          </div>

          <div className="guard-photo-stage">
            {cameraModalMode === 'plate-scan' && plateSnapshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={plateSnapshotUrl}
                alt="Captured vehicle plate frame"
                className="guard-photo-video"
              />
            ) : (
              <video
                ref={photoVideoRef}
                autoPlay
                playsInline
                muted
                className={clsx(
                  'guard-photo-video',
                  photoFacingMode === 'user' && 'is-mirrored',
                )}
                style={{ display: photoCameraActive ? 'block' : 'none' }}
              />
            )}
            {photoFacingMode === 'user' && photoTorchOn && (
              <div className="guard-photo-screen-glow" aria-hidden="true" />
            )}
            {isScreenFlashBurst && (
              <div className="guard-photo-flash-burst" aria-hidden="true" />
            )}
            {!photoCameraActive && !(cameraModalMode === 'plate-scan' && plateSnapshotUrl) && (
              <div className="guard-photo-fallback">
                {cameraModalMode === 'plate-scan' ? <IconCar size={36} /> : <IconCamera size={36} />}
                <strong>Camera Feed Initializing</strong>
                <span>
                  {photoCameraError ||
                    (cameraModalMode === 'plate-scan'
                      ? 'Allow camera access to scan vehicle plate, or enter plate below.'
                      : 'Allow camera permission to capture visitor photo.')}
                </span>
              </div>
            )}
            {cameraModalMode === 'plate-scan' ? (
              <div className="guard-plate-reticle" aria-hidden="true">
                <div className="guard-plate-reticle-beam" />
              </div>
            ) : (
              <div className="guard-photo-reticle" aria-hidden="true" />
            )}
            <span className="guard-photo-hint">
              {cameraModalMode === 'plate-scan'
                ? plateSnapshotUrl
                  ? 'Plate frame captured · Review & apply below'
                  : 'Align license plate inside frame'
                : photoFacingMode === 'user'
                ? photoTorchOn
                  ? 'Front Screen Flash Active · Align face'
                  : 'Front Camera · Align face inside frame'
                : 'Rear Camera · Align face inside frame'}
            </span>
          </div>

          {cameraModalMode === 'plate-scan' && (
            <div className="guard-plate-result-bar">
              <label className="guard-plate-result-label" htmlFor="guard-plate-scan-input">
                Scanned / Detected Plate Number
              </label>
              <div className="guard-plate-result-row">
                <input
                  id="guard-plate-scan-input"
                  className="guard-plate-result-input"
                  placeholder="MH02AB1234"
                  value={plateScanDraft}
                  onChange={(e) => setPlateScanDraft(e.target.value.toUpperCase())}
                />
                {plateSnapshotUrl ? (
                  <button
                    type="button"
                    className="guard-plate-retake-btn"
                    onClick={() => setPlateSnapshotUrl(null)}
                  >
                    Retake
                  </button>
                ) : (
                  <button
                    type="button"
                    className="guard-plate-retake-btn"
                    onClick={capturePhotoSnapshot}
                  >
                    Snap Frame
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="guard-photo-footer">
            <button
              type="button"
              className="guard-photo-cancel"
              onClick={closePhotoModal}
            >
              Cancel
            </button>
            {cameraModalMode === 'plate-scan' ? (
              <button
                type="button"
                className="guard-photo-capture"
                onClick={handleApplyPlateScan}
              >
                <IconCheck size={17} />
                <span>Use Plate Number</span>
              </button>
            ) : (
              <button
                type="button"
                className="guard-photo-capture"
                onClick={capturePhotoSnapshot}
              >
                <IconCamera size={17} />
                <span>Capture Photo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
