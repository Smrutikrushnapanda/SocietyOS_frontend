import { parsePush } from '../../public/societyos-push';
import { getNoticeById } from '../api/notices.api';
import { getMyComplaints } from '../api/complaints.api';
import { getMyVisitorVisits } from '../api/visitors.api';
import { getAmenityBookings } from '../api/amenities.api';
import { getPollById } from '../api/polls.api';

export type ResidentPush = NonNullable<ReturnType<typeof parsePush>>;
export type PushScreen = 'notices' | 'polls' | 'complaints' | 'visitors' | 'amenities';
export interface PushDestination { screen: PushScreen; referenceId: string }

export async function handleResidentForegroundPush(
  value: unknown,
  scope: string,
  ports: { scope: () => string; claim: (id: string) => Promise<boolean>; refresh: () => void; notify: () => void },
): Promise<void> {
  const data = parsePush(value);
  if (!data || !scope || ports.scope() !== scope) return;
  if (!await ports.claim(data.deliveryId) || ports.scope() !== scope) return;
  ports.refresh();
  ports.notify();
}

export async function authorizedPushDestination(
  data: ResidentPush,
  scope: string,
  currentScope: () => string,
  lookup: (data: ResidentPush) => Promise<boolean> = lookupPushRecord,
): Promise<PushDestination | null> {
  if (!scope || scope !== currentScope()) return null;
  const screens: Record<string, PushScreen> = {
    NOTICE: 'notices', EMERGENCY: 'notices', POLL: 'polls', COMPLAINT: 'complaints', AMENITY: 'amenities',
    VISITOR_ARRIVAL: 'visitors', VISITOR_APPROVAL: 'visitors',
  };
  const screen = screens[data.category];
  if (!screen) return null;
  try {
    if (!await lookup(data) || scope !== currentScope()) return null;
    return { screen, referenceId: data.referenceId };
  } catch { return null; }
}

async function lookupPushRecord(data: ResidentPush): Promise<boolean> {
  if (data.category === 'POLL') {
    const poll = await getPollById(data.referenceId);
    return !!poll && poll.status === 'PUBLISHED' && Date.parse(poll.ends_at) > Date.now();
  }
  if (data.category === 'NOTICE' || data.category === 'EMERGENCY') {
    const notice = await getNoticeById(data.referenceId);
    return !!notice && notice.status === 'PUBLISHED' &&
      (!notice.expires_at || Date.parse(notice.expires_at) > Date.now());
  }
  if (data.category === 'COMPLAINT') return (await getMyComplaints()).some((item) => item.id === data.referenceId);
  if (data.category === 'AMENITY') return (await getAmenityBookings()).some((item) => item.id === data.referenceId);
  if (data.category === 'VISITOR_ARRIVAL' || data.category === 'VISITOR_APPROVAL') {
    return (await getMyVisitorVisits()).some((item) => item.id === data.referenceId);
  }
  return false;
}
