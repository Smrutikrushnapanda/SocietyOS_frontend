import { create } from 'zustand';
import { ResidentProfile } from '../types';
import type { AuthenticatedResidentProfile } from '../lib/api/resident.api';
import { useAuthStore } from './useAuthStore';

/**
 * Derive safe, non-fabricated display fields from authoritative backend profile.
 * No synthetic names ("Aarav") or mock towers are invented.
 */
export function deriveResidentProfile(
  backendProfile: AuthenticatedResidentProfile,
  existingNotifications?: ResidentProfile['whatsappNotifications'],
): ResidentProfile {
  const phone = backendProfile.user?.mobileNumber || '';
  const last4 = phone.slice(-4);
  const rawName = (backendProfile.name || '').trim();
  const hasRealName = rawName && !rawName.startsWith('+') && !/^\d+$/.test(rawName);
  const avatarInitials = hasRealName ? rawName.charAt(0).toUpperCase() : (last4 ? `#${last4}` : 'RES');
  const name = backendProfile.name || phone || 'Resident';
  const photoUrl = (backendProfile as any).profile_photo_url || (backendProfile as any).photo_url || null;

  const flatIdentifier = backendProfile.flat?.flat_identifier ?? '';
  const flatDisplay = flatIdentifier || 'No flat';
  const buildingName = backendProfile.flat?.building?.name || '—';
  const buildingId = backendProfile.flat?.building_id || '';
  const floorNumber = backendProfile.flat?.floor?.floor_number ?? 0;
  const flatType = backendProfile.flat?.flat_type || '—';

  const towerLabel = flatIdentifier
    ? `${buildingName} • #${flatIdentifier}`
    : 'No flat assigned';

  const kycMap: Record<string, ResidentProfile['kycStatus']> = {
    VERIFIED: 'Verified',
    PENDING: 'Pending',
    REJECTED: 'Rejected',
  };

  const appAccessMap: Record<string, ResidentProfile['appAccess']> = {
    true: 'Active',
    false: 'Suspended',
  };

  return {
    id: backendProfile.id,
    name,
    avatarInitials,
    photoUrl,
    flat: flatDisplay,
    building: buildingId,
    buildingName,
    towerLabel,
    floor: floorNumber,
    type:
      backendProfile.resident_type === 'TENANT'
        ? 'Tenant'
        : backendProfile.resident_type === 'FAMILY'
        ? 'Family'
        : 'Owner',
    flatType,
    phone,
    email: backendProfile.email || '—',
    vehicleNo: '—', // Real backend resident has no vehicle field yet
    kycStatus: kycMap[backendProfile.kyc_status] || 'Pending',
    appAccess: appAccessMap[String(backendProfile.app_access_status)] || 'Active',
    whatsappNotifications: existingNotifications ?? {
      visitorApprovals: true,
      paymentReminders: true,
      noticeBroadcasts: true,
      complaintUpdates: true,
    },
  };
}

interface ResidentState {
  profile: AuthenticatedResidentProfile | null;
  resident: ResidentProfile | null;
  isLoading: boolean;
  error: string | null;
  setProfile: (profile: AuthenticatedResidentProfile | null) => void;
  setResident: (profile: Partial<ResidentProfile>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  toggleNotification: (key: keyof ResidentProfile['whatsappNotifications']) => void;
  reset: () => void;
}

export const useResidentStore = create<ResidentState>((set) => ({
  profile: null,
  resident: null,
  isLoading: false,
  error: null,

  setProfile: (profile) =>
    set((state) => ({
      profile,
      resident: profile
        ? deriveResidentProfile(profile, state.resident?.whatsappNotifications)
        : null,
      error: null,
    })),

  setResident: (updated) =>
    set((state) => ({
      resident: state.resident ? { ...state.resident, ...updated } : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  toggleNotification: (key) =>
    set((state) => {
      if (!state.resident) return state;
      return {
        resident: {
          ...state.resident,
          whatsappNotifications: {
            ...state.resident.whatsappNotifications,
            [key]: !state.resident.whatsappNotifications[key],
          },
        },
      };
    }),

  reset: () =>
    set({
      profile: null,
      resident: null,
      isLoading: false,
      error: null,
    }),
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId) {
      useResidentStore.getState().reset();
    }
  });
}
