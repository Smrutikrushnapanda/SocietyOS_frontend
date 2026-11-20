import {
  SocietyInfo,
  ResidentProfile,
  Visitor,
  PreApprovedPass,
  Complaint,
  MaintenanceDue,
  InvoiceItem,
  Notice,
  Amenity,
  AmenityBooking
} from '../types';

export const initialSociety: SocietyInfo = {
  id: '',
  name: '',
  regNo: '',
  address: '',
  tower: '',
  currency: '₹',
  graceDays: 0,
  lateFeePercent: 0,
  ratePerSqFt: 0,
  whatsappConnected: false,
  whatsappNumber: '',
  societyHandle: ''
};

export const initialResident: ResidentProfile = {
  id: '',
  name: '',
  avatarInitials: '',
  flat: '',
  building: '',
  buildingName: '',
  towerLabel: '',
  floor: 0,
  type: 'Owner',
  flatType: '',
  phone: '',
  email: '',
  vehicleNo: '',
  kycStatus: 'Pending',
  appAccess: 'Pending',
  whatsappNotifications: {
    visitorApprovals: false,
    paymentReminders: false,
    noticeBroadcasts: false,
    complaintUpdates: false
  }
};

export const initialVisitors: Visitor[] = [];

export const initialPreApprovedPasses: PreApprovedPass[] = [];

export const initialComplaints: Complaint[] = [];

export const initialMaintenanceDue: MaintenanceDue = {
  flat: '',
  due: 0,
  paid: 0,
  period: '',
  dueDate: '',
  status: 'unpaid'
};

export const initialInvoiceBreakdown: InvoiceItem[] = [];

export const initialNotices: Notice[] = [];

export const initialAmenities: Amenity[] = [];

export const initialAmenityBookings: AmenityBooking[] = [];
