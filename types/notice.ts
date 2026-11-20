export type NoticePriority = 'NORMAL' | 'IMPORTANT' | 'EMERGENCY';
export interface NoticeAttachment { id: string; original_filename: string; mime_type: string; size_bytes: number }
export type BackendNoticeStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface BackendNotice {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  status: BackendNoticeStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  attachment_ids?: string[];
  expires_at?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // UI compatibility aliases
  description?: string;
  date?: string;
  displayDate?: string;
  dayShort?: string;
  type?: string;
  priority?: NoticePriority | 'normal' | 'important' | 'urgent' | 'high' | 'low';
  category?: 'maintenance' | 'event' | 'rule' | 'general';
  broadcastViaWhatsApp?: boolean;
}

export interface CreateNoticeInput {
  priority?: NoticePriority;
  title: string;
  content: string;
  expires_at?: string;
}

export interface UpdateNoticeInput {
  priority?: NoticePriority;
  title?: string;
  content?: string;
  status?: BackendNoticeStatus;
  expires_at?: string;
}

export type Notice = BackendNotice;
