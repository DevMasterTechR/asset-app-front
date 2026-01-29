// src/api/devices.ts
import { API_URL } from '@/lib/config';
import apiFetch from '@/lib/fetchClient';

export const assetsApi = {
  /**
   * Get assets assigned to the current user
   */
  async getUserAssets(): Promise<Device[]> {
    const response = await apiFetch(`${API_URL}/assets/user/assigned`, {
      method: "GET",
    });
    return response.json();
  },

  /**
   * Get all unique asset types available
   */
  async getAssetTypes(): Promise<string[]> {
    const response = await apiFetch(`${API_URL}/assets/types`, {
      method: "GET",
    });
    return response.json();
  },
};

export type DeviceStatus = 'available' | 'assigned' | 'maintenance' | 'decommissioned';

// ActaStatus ahora está en AssignmentHistory, no en Device
export type ActaStatus = 'no_generada' | 'acta_generada' | 'firmada';

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
  branch?: {
    id: number;
    name: string;
  };
  branchName?: string;
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
  async getAll(q?: string, page?: number, limit?: number): Promise<{ data: Device[]; total: number; page: number; limit: number; totalPages: number } | Device[]> {
    const params = new URLSearchParams();
    if (q !== undefined && q !== null && String(q).trim() !== '') params.append('q', String(q).trim());
    if (page !== undefined) params.append('page', String(page));
    if (limit !== undefined) params.append('limit', String(limit));
    const url = `/assets/public${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiFetch(url, { method: 'GET' });
    await handleApiError(response);
    const json = await response.json();
    if (json && typeof json === 'object' && Array.isArray(json.data)) return json;
    return json as Device[];
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

  async createBulk(quantity: number, template: CreateDeviceDto): Promise<{ created: number; quantity: number; message: string }> {
    console.log('📤 Creando dispositivos masivamente:', quantity, template);
    const response = await apiFetch('/assets/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, template }),
    });
    await handleApiError(response);
    return response.json();
  },

  // Server-supported quick check for phone uniqueness (recommended)
  // Backend should implement GET /assets/check-phone?phone=... returning { exists: boolean, deviceId?: number }
  async checkPhone(phone: string): Promise<{ exists: boolean; deviceId?: number }> {
    const params = new URLSearchParams({ phone });
    const response = await apiFetch(`/assets/check-phone?${params.toString()}`, { method: 'GET' });
    // If 404 or not implemented, let caller handle (we won't throw here)
    if (response.status === 404) return { exists: false };
    await handleApiError(response);
    return response.json();
  },
};