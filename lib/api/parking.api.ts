import apiClient from './client';

export interface ParkingSlot {
  id: string;
  organization_id: string;
  slot_number: string;
  zone?: string | null;
  slot_type: '4W' | '2W' | 'EV' | string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | string;
  flat_id?: string | null;
  resident_id?: string | null;
  created_at: string;
  updated_at: string;
  flat?: {
    id: string;
    flat_identifier?: string;
    flat_number?: string;
    flat_type?: string;
    floor_number?: number;
  } | null;
  resident?: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    email?: string;
    user?: {
      mobileNumber?: string;
      email?: string;
    };
  } | null;
}

export interface CreateParkingSlotPayload {
  slot_number: string;
  zone?: string;
  slot_type?: '4W' | '2W' | 'EV' | string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | string;
  flat_id?: string;
  resident_id?: string;
}

export interface UpdateParkingSlotPayload {
  slot_number?: string;
  zone?: string | null;
  slot_type?: '4W' | '2W' | 'EV' | string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | string;
  flat_id?: string | null;
  resident_id?: string | null;
}

export const parkingApi = {
  async getParkingSlots(zone?: string, status?: string): Promise<ParkingSlot[]> {
    const res = await apiClient.get<ParkingSlot[]>('/parking-slots', {
      params: {
        ...(zone ? { zone } : {}),
        ...(status ? { status } : {}),
      },
    });
    return res.data;
  },

  async getParkingSlot(id: string): Promise<ParkingSlot> {
    const res = await apiClient.get<ParkingSlot>(`/parking-slots/${id}`);
    return res.data;
  },

  async createParkingSlot(payload: CreateParkingSlotPayload): Promise<ParkingSlot> {
    const res = await apiClient.post<ParkingSlot>('/parking-slots', payload);
    return res.data;
  },

  async updateParkingSlot(id: string, payload: UpdateParkingSlotPayload): Promise<ParkingSlot> {
    const res = await apiClient.patch<ParkingSlot>(`/parking-slots/${id}`, payload);
    return res.data;
  },

  async deleteParkingSlot(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/parking-slots/${id}`);
    return res.data;
  },
};
