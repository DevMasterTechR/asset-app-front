// src/api/devices.ts
import { Asset } from '@/data/mockDataExtended';

// Tipos para las operaciones CRUD
export interface CreateDeviceDto {
  assetCode: string;
  assetType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'decommissioned';
  branchId: string;
  assignedPersonId?: string;
  purchaseDate?: string;
  deliveryDate?: string;
  receivedDate?: string;
  notes?: string;
}

export interface UpdateDeviceDto extends Partial<CreateDeviceDto> {
  id: string;
}

// Simulación de respuesta de API
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Simulación de delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// MOCK: Base de datos temporal (en memoria)
let mockDatabase: Asset[] = [];

// Función para inicializar con datos mock
export const initializeMockData = (data: Asset[]) => {
  mockDatabase = [...data];
};

// ============= SERVICIOS API =============

export const devicesApi = {
  // GET /api/devices
  getAll: async (): Promise<ApiResponse<Asset[]>> => {
    await delay(300);
    try {
      return {
        success: true,
        data: mockDatabase
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al obtener dispositivos'
      };
    }
  },

  // GET /api/devices/:id
  getById: async (id: string): Promise<ApiResponse<Asset>> => {
    await delay(200);
    try {
      const device = mockDatabase.find(d => d.id === id);
      if (!device) {
        return {
          success: false,
          error: 'Dispositivo no encontrado'
        };
      }
      return {
        success: true,
        data: device
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al obtener dispositivo'
      };
    }
  },

  // POST /api/devices
  create: async (data: CreateDeviceDto): Promise<ApiResponse<Asset>> => {
    await delay(500);
    try {
      const newDevice: Asset = {
        id: (Math.max(...mockDatabase.map(d => parseInt(d.id)), 0) + 1).toString(),
        assetCode: data.assetCode,
        assetType: data.assetType,
        serialNumber: data.serialNumber || '',
        brand: data.brand,
        model: data.model,
        status: data.status,
        branchId: data.branchId,
        assignedPersonId: data.assignedPersonId,
        purchaseDate: data.purchaseDate,
        deliveryDate: data.deliveryDate,
        receivedDate: data.receivedDate,
        notes: data.notes,
      };
      
      mockDatabase.push(newDevice);
      
      return {
        success: true,
        data: newDevice
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al crear dispositivo'
      };
    }
  },

  // PUT /api/devices/:id
  update: async (data: UpdateDeviceDto): Promise<ApiResponse<Asset>> => {
    await delay(500);
    try {
      const index = mockDatabase.findIndex(d => d.id === data.id);
      
      if (index === -1) {
        return {
          success: false,
          error: 'Dispositivo no encontrado'
        };
      }

      const updatedDevice: Asset = {
        ...mockDatabase[index],
        assetCode: data.assetCode ?? mockDatabase[index].assetCode,
        assetType: data.assetType ?? mockDatabase[index].assetType,
        serialNumber: data.serialNumber ?? mockDatabase[index].serialNumber,
        brand: data.brand ?? mockDatabase[index].brand,
        model: data.model ?? mockDatabase[index].model,
        status: data.status ?? mockDatabase[index].status,
        branchId: data.branchId ?? mockDatabase[index].branchId,
        assignedPersonId: data.assignedPersonId ?? mockDatabase[index].assignedPersonId,
        purchaseDate: data.purchaseDate ?? mockDatabase[index].purchaseDate,
        deliveryDate: data.deliveryDate ?? mockDatabase[index].deliveryDate,
        receivedDate: data.receivedDate ?? mockDatabase[index].receivedDate,
        notes: data.notes ?? mockDatabase[index].notes,
      };

      mockDatabase[index] = updatedDevice;

      return {
        success: true,
        data: updatedDevice
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al actualizar dispositivo'
      };
    }
  },

  // DELETE /api/devices/:id
  delete: async (id: string): Promise<ApiResponse<void>> => {
    await delay(400);
    try {
      const index = mockDatabase.findIndex(d => d.id === id);
      
      if (index === -1) {
        return {
          success: false,
          error: 'Dispositivo no encontrado'
        };
      }

      mockDatabase.splice(index, 1);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al eliminar dispositivo'
      };
    }
  }
};

// ============= CUANDO TENGAS TU BACKEND =============
// Reemplaza las funciones anteriores con algo como esto:

/*
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const devicesApi = {
  getAll: async (): Promise<ApiResponse<Asset[]>> => {
    const response = await fetch(`${API_BASE_URL}/devices`);
    return response.json();
  },

  getById: async (id: string): Promise<ApiResponse<Asset>> => {
    const response = await fetch(`${API_BASE_URL}/devices/${id}`);
    return response.json();
  },

  create: async (data: CreateDeviceDto): Promise<ApiResponse<Asset>> => {
    const response = await fetch(`${API_BASE_URL}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  update: async (data: UpdateDeviceDto): Promise<ApiResponse<Asset>> => {
    const response = await fetch(`${API_BASE_URL}/devices/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};
*/