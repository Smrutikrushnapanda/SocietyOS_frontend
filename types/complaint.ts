export type ComplaintStatus = 'open' | 'in-progress' | 'resolved';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ComplaintTimelineItem {
  status: ComplaintStatus;
  timestamp: string;
  description: string;
}

export interface Complaint {
  id: string;
  title: string;
  category: string;
  status: ComplaintStatus;
  flat: string;
  raisedBy?: string;
  raisedAt?: string;
  createdAt?: string;
  priority: ComplaintPriority;
  description: string;
  assignedStaff?: string;
  timeline?: ComplaintTimelineItem[];
}
