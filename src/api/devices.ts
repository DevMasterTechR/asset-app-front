// src/api/devices.ts
import { API_URL } from '@/lib/config';
import apiFetch from '@/lib/fetchClient';
export type DeviceStatus = 'available' | 'assigned' | 'maintenance' | 'decommissioned';

export interface Device {
  id: number;
  assetCode: string;
  assetType: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  status: DeviceStatus;
  branchId?: number;
  assignedPersonId?: number;
  purchaseDate?: string;
  deliveryDate?: string;x
  receivedDate?: string;
  notes?: string;
  attributesJson?: Record<string, string | number | boolean>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeviceDto {
  assetCode: string;
  assetType: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  status?: DeviceStatus;
  branchId?: number;
  assignedPersonId?: number;
  purchaseDate?: string;
  deliveryDate?: string;
  receivedDate?: string;
  notes?: string;
  attributesJson?: Record<string, string | number | boolean>;
}

export type UpdateDeviceDto = Partial<CreateDeviceDto>;

// Alias de exportación para compatibilidad
export type AssetStatus = DeviceStatus;
export type Asset = Device;
export type CreateAssetDto = CreateDeviceDto;
export type UpdateAssetDto = UpdateDeviceDto;

const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response;
};

export const devicesApi = {
  async getAll(): Promise<Device[]> {
    const response = await apiFetch('/assets/public', { method: 'GET' });
    await handleApiError(response);
    return response.json();
  },

  async getById(id: number): Promise<Device> {
    const response = await apiFetch(`/assets/public/${id}`, { method: 'GET' });
    await handleApiError(response);
    return response.json();
  },

  async create(data: CreateDeviceDto): Promise<Device> {
    console.log('📤 Creando dispositivo:', data);
    const response = await apiFetch('/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await handleApiError(response);
    return response.json();
  },

  async update(id: number, data: UpdateDeviceDto): Promise<Device> {
    console.log('📤 Actualizando dispositivo:', id, data);
    const response = await apiFetch(`/assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await handleApiError(response);
    return response.json();
  },

  async delete(id: number): Promise<void> {
    const response = await apiFetch(`/assets/${id}`, { method: 'DELETE' });
    await handleApiError(response);
  },
};