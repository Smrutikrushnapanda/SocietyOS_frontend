export type BackendComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
export type BackendComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export enum ComplaintCategory {
  MAINTENANCE = 'MAINTENANCE',
  FACILITY = 'FACILITY',
  AMENITY = 'AMENITY',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER',
}

export interface BackendComplaint {
  id: string;
  organization_id: string;
  resident_id: string;
  flat_id?: string | null;
  category: ComplaintCategory | string;
  subject: string;
  description: string;
  status: BackendComplaintStatus;
  priority: BackendComplaintPriority;
  assigned_to?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  // UI compatibility aliases
  title?: string;
  flat?: string;
  raisedBy?: string;
  raisedAt?: string;
  createdAt?: string;
  assignedStaff?: string;
  timeline?: Array<{
    status: string;
    timestamp: string;
    description: string;
  }>;
}

export interface CreateComplaintInput {
  category: ComplaintCategory | string;
  subject: string;
  description: string;
  priority?: BackendComplaintPriority;
  flat_id?: string;
  assigned_to?: string;
}

export interface UpdateComplaintInput {
  status?: BackendComplaintStatus;
  priority?: BackendComplaintPriority;
  assigned_to?: string;
}

export type ComplaintPriority = BackendComplaintPriority;
export type Complaint = BackendComplaint;
