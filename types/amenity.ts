export interface Amenity {
  id: string;
  name: string;
  code: string;
  icon: string;
  category?: string;
  description?: string;
  imageFileId?: string;
  location?: string;
  capacity: number;
  openTime: string;
  closeTime: string;
  slotDuration: string;
  price: number;
  guestFee: number;
  statusText: string;
  status: 'Active' | 'Closed (Maintenance)';
}

export interface AmenityBooking {
  id: string;
  resident: string;
  flat: string;
  amenity: string;
  date: string;
  slot: string;
  guests: number;
  amount: number;
  status: 'Approved' | 'Pending' | 'Completed' | 'Cancelled' | 'Rejected' | 'Revoked';
}

export function amenityBookingDates(from: string, to: string): string[] {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to) || from > to) return [];
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const count = (Date.parse(`${to}T00:00:00.000Z`) - start) / 86400000 + 1;
  if (count > 62) return [];
  return Array.from({ length: count }, (_, index) => new Date(start + index * 86400000).toISOString().slice(0, 10));
}

export function availableAmenityRangeSlots(timeSlots: string[], dates: string[], availability: Map<string, string[]>): string[] {
  if (!dates.length) return [];
  return timeSlots.filter(slot => dates.every(date => !isAmenitySlotBooked(slot, availability.get(date) ?? [])));
}

export function amenityTimeSlots(amenity?: Pick<Amenity, 'openTime' | 'closeTime' | 'slotDuration'>): string[] {
  if (!amenity) return [];
  const parse = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    return match && Number(match[1]) < 24 && Number(match[2]) < 60 ? Number(match[1]) * 60 + Number(match[2]) : NaN;
  };
  const start = parse(amenity.openTime); const end = parse(amenity.closeTime);
  const duration = amenity.slotDuration.match(/^(\d+(?:\.\d+)?)\s*(mins?|minutes?|hrs?|hours?)$/i);
  if (!duration) return [];
  const step = Number(duration[1]) * (/^(hr|hour)/i.test(duration[2]) ? 60 : 1);
  if (!Number.isInteger(step) || step < 1 || end <= start) return [];
  const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const slots: string[] = [];
  for (let minute = start; minute + step <= end; minute += step) slots.push(`${clock(minute)} - ${clock(minute + step)}`);
  return slots;
}

export function amenityAllowsCustomTime(amenity?: Pick<Amenity, 'slotDuration'>): boolean {
  return !!amenity && !/^(\d+(?:\.\d+)?)\s*(mins?|minutes?|hrs?|hours?)$/i.test(amenity.slotDuration);
}

export function amenityCustomSlot(amenity: Pick<Amenity, 'openTime' | 'closeTime'> | undefined, start: string, end: string): string | null {
  if (!amenity || !start || !end) return null;
  const slot = `${start} - ${end}`;
  const requested = amenitySlotRange(slot);
  const operating = amenitySlotRange(`${amenity.openTime.slice(0, 5)} - ${amenity.closeTime.slice(0, 5)}`);
  return requested && operating && requested[0] >= operating[0] && requested[1] <= operating[1] ? slot : null;
}

export function amenityBookingSlotOptions(amenity?: Pick<Amenity, 'openTime' | 'closeTime' | 'slotDuration'>): string[] {
  if (!amenity || !amenityAllowsCustomTime(amenity)) return amenityTimeSlots(amenity);
  const operating = amenitySlotRange(`${amenity.openTime.slice(0, 5)} - ${amenity.closeTime.slice(0, 5)}`);
  if (!operating) return [];
  const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const slots: string[] = [];
  if (/full\s*day/i.test(amenity.slotDuration)) slots.push(`${clock(operating[0])} - ${clock(operating[1])}`);
  for (let minute = operating[0]; minute < operating[1]; minute += 60) slots.push(`${clock(minute)} - ${clock(Math.min(minute + 60, operating[1]))}`);
  return [...new Set(slots)];
}

export function amenitySlotRange(value: string): [number, number] | null {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  const minutes = (hour: string, minute: string, period?: string) => {
    let h = Number(hour);
    const m = Number(minute);
    if (m > 59 || (period ? h < 1 || h > 12 : h > 23)) return null;
    if (period) h = h % 12 + (period.toUpperCase() === 'PM' ? 12 : 0);
    return h * 60 + m;
  };
  const start = minutes(match[1], match[2], match[3]);
  const end = minutes(match[4], match[5], match[6]);
  return start !== null && end !== null && end > start ? [start, end] : null;
}

export function isAmenitySlotBooked(slot: string, bookedSlots: string[]): boolean {
  const range = amenitySlotRange(slot);
  return !!range && bookedSlots.some(booked => {
    const bookedRange = amenitySlotRange(booked);
    return !!bookedRange && range[0] < bookedRange[1] && range[1] > bookedRange[0];
  });
}

export function amenityDateAvailability(timeSlots: string[], bookedSlots: string[]): 'open' | 'partial' | 'full' {
  if (bookedSlots.length === 0) return 'open';
  return timeSlots.length > 0 && timeSlots.every(slot => isAmenitySlotBooked(slot, bookedSlots)) ? 'full' : 'partial';
}

export function formatAmenitySlot(value: string): string {
  const range = amenitySlotRange(value);
  if (!range) return value;
  const format = (minutes: number) => {
    const hour24 = Math.floor(minutes / 60);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minutes % 60).padStart(2, '0')} ${period}`;
  };
  return `${format(range[0])} - ${format(range[1])}`;
}
