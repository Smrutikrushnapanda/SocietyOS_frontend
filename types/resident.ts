export interface ResidentProfile {
  id: string;
  name: string;
  avatarInitials: string;
  photoUrl?: string | null;
  flat: string;
  building: string;
  buildingName: string;
  towerLabel: string;
  floor: number;
  type: 'Owner' | 'Tenant' | 'Family';
  flatType: string;
  phone: string;
  email: string;
  vehicleNo: string;
  kycStatus: 'Verified' | 'Pending' | 'Rejected';
  appAccess: 'Active' | 'Pending' | 'Suspended';
  whatsappNotifications: {
    visitorApprovals: boolean;
    paymentReminders: boolean;
    noticeBroadcasts: boolean;
    complaintUpdates: boolean;
  };
}
