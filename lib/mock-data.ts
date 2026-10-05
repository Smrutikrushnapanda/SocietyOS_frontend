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
  id: 'SOC-001',
  name: 'Greenwood Heights',
  regNo: 'BOM/HSG/TC/10928/2018',
  address: 'Plot 42, Sector 19, Palm Beach Road, Sanpada, Navi Mumbai - 400705',
  tower: 'Tower A (Gulmohar)',
  currency: '₹',
  graceDays: 10,
  lateFeePercent: 2,
  ratePerSqFt: 3.5,
  whatsappConnected: true,
  whatsappNumber: '+91 98200 88990',
  societyHandle: 'Greenwood Heights RWA'
};

export const initialResident: ResidentProfile = {
  id: 'RES-01',
  name: 'Aarav Sharma',
  avatarInitials: 'AS',
  flat: 'A-101',
  building: 'tower-a',
  buildingName: 'Tower A (Gulmohar)',
  towerLabel: 'Greenwood Heights • Tower A #101',
  floor: 1,
  type: 'Owner',
  flatType: '3 BHK',
  phone: '+91 98201 11001',
  email: 'aarav.sharma@example.com',
  vehicleNo: 'MH-02-CB-4491',
  kycStatus: 'Verified',
  appAccess: 'Active',
  whatsappNotifications: {
    visitorApprovals: true,
    paymentReminders: true,
    noticeBroadcasts: true,
    complaintUpdates: true
  }
};

export const initialVisitors: Visitor[] = [
  {
    id: 'VIS-1081',
    name: 'Rohan Sharma',
    phone: '+91 98112 34567',
    purpose: 'Guest',
    flat: 'A-101',
    status: 'requested',
    requestedAt: '10 mins ago',
    vehicleNo: 'MH-02-BX-9021',
    notifiedViaWhatsApp: true
  },
  {
    id: 'VIS-1082',
    name: 'Sunil Verma (Amazon)',
    phone: '+91 98770 12345',
    purpose: 'Delivery',
    flat: 'A-101',
    status: 'requested',
    requestedAt: '14 mins ago',
    vehicleNo: null,
    notifiedViaWhatsApp: true
  },
  {
    id: 'VIS-1083',
    name: 'Mahesh Kumar (Urban Co.)',
    phone: '+91 98334 56789',
    purpose: 'Service',
    flat: 'A-101',
    status: 'approved',
    requestedAt: '35 mins ago',
    approvedAt: '25 mins ago',
    vehicleNo: 'MH-02-EP-5511',
    notifiedViaWhatsApp: true
  },
  {
    id: 'VIS-1084',
    name: 'Dr. Meenakshi Sundaram',
    phone: '+91 98450 99881',
    purpose: 'Guest',
    flat: 'A-101',
    status: 'approved',
    requestedAt: '42 mins ago',
    approvedAt: '30 mins ago',
    vehicleNo: 'MH-02-DD-1002',
    notifiedViaWhatsApp: true
  },
  {
    id: 'VIS-1085',
    name: 'Blinkit Rider',
    phone: '+91 98991 22334',
    purpose: 'Delivery',
    flat: 'A-101',
    status: 'checked-in',
    requestedAt: '1 hr ago',
    approvedAt: '55 mins ago',
    checkedInAt: '50 mins ago',
    vehicleNo: 'MH-02-EV-4410',
    notifiedViaWhatsApp: true
  },
  {
    id: 'VIS-1086',
    name: 'Deepak Interior Team',
    phone: '+91 98200 66778',
    purpose: 'Service',
    flat: 'A-101',
    status: 'checked-in',
    requestedAt: '2 hrs ago',
    approvedAt: '1 hr 50m ago',
    checkedInAt: '1 hr 45m ago',
    vehicleNo: 'MH-02-TR-9988',
    notifiedViaWhatsApp: true
  },
  {
    id: 'VIS-1087',
    name: 'Suresh Patil (Courier)',
    phone: '+91 98119 88776',
    purpose: 'Delivery',
    flat: 'A-101',
    status: 'checked-out',
    requestedAt: '3 hrs ago',
    approvedAt: '2 hrs 50m ago',
    checkedInAt: '2 hrs 45m ago',
    checkedOutAt: '2 hrs 10m ago',
    vehicleNo: null,
    notifiedViaWhatsApp: true
  },
  {
    id: 'VIS-1088',
    name: 'Kavita Chawla',
    phone: '+91 98330 11223',
    purpose: 'Guest',
    flat: 'A-101',
    status: 'checked-out',
    requestedAt: '4 hrs ago',
    approvedAt: '3 hrs 50m ago',
    checkedInAt: '3 hrs 40m ago',
    checkedOutAt: '1 hr ago',
    vehicleNo: 'MH-02-JK-3321',
    notifiedViaWhatsApp: true
  }
];

export const initialPreApprovedPasses: PreApprovedPass[] = [
  {
    id: 'GP-8492',
    passCode: 'GP-8492',
    guestName: 'Sameer Kapoor',
    phone: '+91 98765 43210',
    purpose: 'Family / Friend',
    flat: 'A-101',
    resident: 'Aarav Sharma',
    startDate: '2026-09-28',
    startTime: '10:00 AM',
    endDate: '2026-09-29',
    endTime: '11:59 PM',
    validityDisplay: '28 Sep 10:00 AM – 29 Sep 11:59 PM',
    gate: 'All Gates (Gate 01 & 02)',
    vehicleNo: null,
    status: 'Active',
    createdAt: 'Today, 09:30 AM',
    qrToken: 'SOC-PASS-GP8492-A101-SEC99'
  },
  {
    id: 'GP-6120',
    passCode: 'GP-6120',
    guestName: 'Dr. Meenakshi Sundaram',
    phone: '+91 98450 99881',
    purpose: 'Family / Friend',
    flat: 'A-101',
    resident: 'Aarav Sharma',
    startDate: '2026-09-28',
    startTime: '02:00 PM',
    endDate: '2026-09-28',
    endTime: '08:00 PM',
    validityDisplay: 'Today, 02:00 PM – 08:00 PM',
    gate: 'Gate 01 • North Booth',
    vehicleNo: 'MH-02-DD-1002',
    status: 'Active',
    createdAt: 'Today, 11:00 AM',
    qrToken: 'SOC-PASS-GP6120-A101-SEC55'
  }
];

export const initialComplaints: Complaint[] = [
  {
    id: 'CMP-301',
    title: 'Main pipeline leakage in master bath',
    category: 'Plumbing',
    status: 'open',
    flat: 'A-101',
    raisedBy: 'Aarav Sharma',
    raisedAt: 'Today, 09:15 AM',
    priority: 'high',
    description: 'Continuous seepage from ceiling pipe joint.',
    assignedStaff: 'AquaFlow Plumbing AMC'
  },
  {
    id: 'CMP-304',
    title: 'Unauthorized vehicle in Slot A-04',
    category: 'Parking',
    status: 'in-progress',
    flat: 'A-101',
    raisedBy: 'Aarav Sharma',
    raisedAt: 'Yesterday, 06:10 PM',
    priority: 'medium',
    description: 'Unidentified black Activa parked without pass.',
    assignedStaff: 'Head Guard Deshmukh'
  },
  {
    id: 'CMP-305',
    title: 'Gym air conditioner not cooling',
    category: 'Common Area',
    status: 'resolved',
    flat: 'A-101',
    raisedBy: 'Aarav Sharma',
    raisedAt: '2 days ago',
    priority: 'low',
    description: 'Clubhouse gym 2-ton split AC filters clogged.',
    assignedStaff: 'Voltas Cool Care'
  },
  {
    id: 'CMP-306',
    title: 'Main gate intercom line static',
    category: 'Security',
    status: 'resolved',
    flat: 'A-101',
    raisedBy: 'Aarav Sharma',
    raisedAt: '3 days ago',
    priority: 'medium',
    description: 'Intercom line static resolved by line technician.',
    assignedStaff: 'Airtel Telecom Team'
  }
];

export const initialMaintenanceDue: MaintenanceDue = {
  flat: 'A-101',
  due: 4500,
  paid: 0,
  period: 'September 2026',
  dueDate: '10 Sep 2026',
  status: 'unpaid'
};

export const initialInvoiceBreakdown: InvoiceItem[] = [
  { title: 'Society Maintenance & Security', amount: 3500 },
  { title: 'Sinking & Reserve Fund', amount: 500 },
  { title: 'Water & Common Electricity', amount: 500 }
];

export const initialNotices: Notice[] = [
  {
    id: 'NTC-501',
    title: 'Biannual Overhead Water Tank Cleaning',
    date: '2026-09-27',
    displayDate: 'Tomorrow (27 Sep)',
    dayShort: 'Sun',
    type: 'Water Supply',
    priority: 'high',
    description: 'Water supply suspended between 10:00 AM and 03:00 PM for all towers due to chemical scrubbing.'
  },
  {
    id: 'NTC-502',
    title: 'Annual General Body Meeting (AGM 2026)',
    date: '2026-09-29',
    displayDate: 'Tue, 29 Sep 06:30 PM',
    dayShort: 'Tue',
    type: 'AGM',
    priority: 'high',
    description: 'Discussion of FY26 audited accounts, solar panel installation project, and election of new committee members at Clubhouse.'
  },
  {
    id: 'NTC-503',
    title: 'Diwali Festive Lighting & Decoration Drive',
    date: '2026-10-02',
    displayDate: 'Fri, 02 Oct',
    dayShort: 'Fri',
    type: 'Celebration',
    priority: 'normal',
    description: 'Cultural committee volunteers invite kids and residents for compound diya lighting and rangoli preparation.'
  },
  {
    id: 'NTC-504',
    title: 'Pest Control Drive in Common Basements',
    date: '2026-10-04',
    displayDate: 'Sun, 04 Oct 08:00 AM',
    dayShort: 'Sun',
    type: 'Maintenance',
    priority: 'normal',
    description: 'Fumigation and herbal pest spray scheduled across parking bays A & B.'
  }
];

export const initialAmenities: Amenity[] = [
  {
    id: 'AMN-POOL',
    name: 'Infinity Swimming Pool',
    code: 'POOL-01',
    icon: 'pool',
    capacity: 25,
    openTime: '06:00',
    closeTime: '21:00',
    slotDuration: '2 Hours',
    price: 0,
    guestFee: 150,
    statusText: 'Open • 26°C',
    status: 'Active'
  },
  {
    id: 'AMN-HALL',
    name: 'Clubhouse Banquet & Party Hall',
    code: 'HALL-01',
    icon: 'party',
    capacity: 150,
    openTime: '09:00',
    closeTime: '23:30',
    slotDuration: 'Full Day / Evening',
    price: 5000,
    guestFee: 0,
    statusText: 'AC • 150 Pax',
    status: 'Active'
  },
  {
    id: 'AMN-BADM',
    name: 'Indoor Badminton Court #1',
    code: 'BADM-01',
    icon: 'badminton',
    capacity: 4,
    openTime: '06:00',
    closeTime: '22:00',
    slotDuration: '1 Hour',
    price: 0,
    guestFee: 100,
    statusText: 'Synthetic • #1',
    status: 'Active'
  },
  {
    id: 'AMN-GYM',
    name: 'Fitness Center & Gym',
    code: 'GYM-01',
    icon: 'gym',
    capacity: 30,
    openTime: '05:30',
    closeTime: '22:30',
    slotDuration: 'Open Access',
    price: 0,
    guestFee: 200,
    statusText: 'Trainer Active',
    status: 'Active'
  },
  {
    id: 'AMN-PICKLE',
    name: 'Tennis / Pickleball Court',
    code: 'TC-01',
    icon: 'tennis',
    capacity: 4,
    openTime: '06:00',
    closeTime: '21:30',
    slotDuration: '1 Hour',
    price: 0,
    guestFee: 100,
    statusText: 'Floodlit',
    status: 'Active'
  },
  {
    id: 'AMN-SNOOKER',
    name: 'Snooker & Billiards Lounge',
    code: 'SNOOK-01',
    icon: 'billiards',
    capacity: 8,
    openTime: '11:00',
    closeTime: '23:00',
    slotDuration: '1.5 Hours',
    price: 50,
    guestFee: 150,
    statusText: '2 Tables',
    status: 'Active'
  }
];

export const initialAmenityBookings: AmenityBooking[] = [
  {
    id: 'BK-101',
    resident: 'Aarav Sharma',
    flat: 'A-101',
    amenity: 'Infinity Swimming Pool',
    date: '2026-09-28',
    slot: '06:00 AM - 08:00 AM',
    guests: 2,
    amount: 0,
    status: 'Approved'
  }
];
