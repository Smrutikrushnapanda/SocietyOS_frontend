export type VisitorStatus = 'requested' | 'approved' | 'checked-in' | 'checked-out' | 'denied';

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  flat: string;
  status: VisitorStatus;
  requestedAt?: string;
  approvedAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  entryTime?: string;
  exitTime?: string;
  vehicleNo?: string | null;
  notifiedViaWhatsApp?: boolean;
  passCode?: string;
  passcode?: string;
  gate?: string;
  photo?: string;
  isPreApproved?: boolean;
}

export type VisitorRecord = Visitor;

export interface PreApprovedPass {
  id: string;
  passCode: string;
  guestName: string;
  phone: string;
  purpose: string;
  flat: string;
  resident: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  validityDisplay: string;
  gate: string;
  vehicleNo?: string | null;
  status: 'Active' | 'Checked-In' | 'Expired' | 'Revoked';
  createdAt: string;
  qrToken: string;
}
