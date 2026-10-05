export interface Notice {
  id: string;
  title: string;
  date: string;
  displayDate?: string;
  dayShort?: string;
  type?: string;
  category?: 'maintenance' | 'event' | 'rule' | 'general';
  priority?: 'urgent' | 'important' | 'high' | 'normal' | 'low';
  description: string;
  broadcastViaWhatsApp?: boolean;
}
