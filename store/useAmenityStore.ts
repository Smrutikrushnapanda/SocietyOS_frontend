import { create } from 'zustand';
import { Amenity, AmenityBooking } from '../types';
import { initialAmenities, initialAmenityBookings } from '../lib/mock-data';

interface AmenityState {
  amenities: Amenity[];
  bookings: AmenityBooking[];
  bookAmenity: (booking: Omit<AmenityBooking, 'id' | 'status'>) => AmenityBooking;
}

export const useAmenityStore = create<AmenityState>((set) => ({
  amenities: initialAmenities,
  bookings: initialAmenityBookings,
  bookAmenity: (bookingData) => {
    const newBooking: AmenityBooking = {
      id: 'BK-' + Math.floor(106 + Math.random() * 890),
      status: 'Approved',
      ...bookingData
    };

    set((state) => ({
      bookings: [newBooking, ...state.bookings]
    }));

    return newBooking;
  }
}));
