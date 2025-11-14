// src/api/devices.ts
import { API_URL } from '@/lib/config';

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
  deliveryDate?: string;
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

const buildHeaders = (withJson = true): Record<string, string> => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (withJson) headers['Content-Type'] = 'application/json';
  try {
    const token = localStorage.getItem('access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {
    // localStorage may be unavailable in some environments
  }
  return headers;
};

export const devicesApi = {
  async getAll(): Promise<Device[]> {
    const response = await fetch(`${API_URL}/assets`, {
      method: 'GET',
      headers: buildHeaders(true),
      credentials: 'include',
    });
    await handleApiError(response);
    return response.json();
  },

  async getById(id: number): Promise<Device> {
    const response = await fetch(`${API_URL}/assets/${id}`, {
      method: 'GET',
      headers: buildHeaders(true),
      credentials: 'include',
    });
    await handleApiError(response);
    return response.json();
  },

  async create(data: CreateDeviceDto): Promise<Device> {
    console.log('📤 Creando dispositivo:', data);

    const response = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: buildHeaders(true),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    await handleApiError(response);
    return response.json();
  },

  async update(id: number, data: UpdateDeviceDto): Promise<Device> {
    console.log('📤 Actualizando dispositivo:', id, data);

    const response = await fetch(`${API_URL}/assets/${id}`, {
      method: 'PUT',
      headers: buildHeaders(true),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    await handleApiError(response);
    return response.json();
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/assets/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(true),
      credentials: 'include',
    });
    await handleApiError(response);
  },
};