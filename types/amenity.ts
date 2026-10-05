export interface Amenity {
  id: string;
  name: string;
  code: string;
  icon: string;
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
  status: 'Approved' | 'Pending' | 'Completed' | 'Cancelled';
}
