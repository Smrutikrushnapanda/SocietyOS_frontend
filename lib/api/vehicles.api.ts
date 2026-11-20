import apiClient from './client';

export interface Vehicle {
  id: string;
  organization_id: string;
  resident_id?: string | null;
  flat_id?: string | null;
  registration_number: string;
  vehicle_type: 'TWO_WHEELER' | 'FOUR_WHEELER' | 'OTHER';
  make_model?: string | null;
  color?: string | null;
  parking_slot_id?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
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
  flat?: {
    id: string;
    flat_identifier?: string;
    flat_number?: string;
    flat_type?: string;
    floor_number?: number;
  } | null;
  parking_slot?: {
    id: string;
    slot_number: string;
    zone?: string | null;
  } | null;
}

export interface CreateVehiclePayload {
  registration_number: string;
  vehicle_type: 'TWO_WHEELER' | 'FOUR_WHEELER' | 'OTHER';
  resident_id?: string;
  flat_id?: string;
  make_model?: string;
  color?: string;
  parking_slot_id?: string;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateVehiclePayload {
  registration_number?: string;
  vehicle_type?: 'TWO_WHEELER' | 'FOUR_WHEELER' | 'OTHER';
  resident_id?: string | null;
  flat_id?: string | null;
  make_model?: string | null;
  color?: string | null;
  parking_slot_id?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export const vehiclesApi = {
  async getVehicles(flatId?: string): Promise<Vehicle[]> {
    const res = await apiClient.get<Vehicle[]>('/vehicles', {
      params: flatId ? { flat_id: flatId } : undefined,
    });
    return res.data;
  },

  async getVehicle(id: string): Promise<Vehicle> {
    const res = await apiClient.get<Vehicle>(`/vehicles/${id}`);
    return res.data;
  },

  async createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
    const res = await apiClient.post<Vehicle>('/vehicles', payload);
    return res.data;
  },

  async updateVehicle(id: string, payload: UpdateVehiclePayload): Promise<Vehicle> {
    const res = await apiClient.patch<Vehicle>(`/vehicles/${id}`, payload);
    return res.data;
  },

  async deleteVehicle(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/vehicles/${id}`);
    return res.data;
  },
};
