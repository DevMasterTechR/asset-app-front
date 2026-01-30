// API para Consumibles - Conectado con Backend NestJS

import { 
  Ink, 
  UTPCable, 
  RJ45Connector, 
  PowerStrip
} from '@/data/mockDataExtended';

// ============= CONFIGURACIÓN =============
import { API_URL } from '@/lib/config';
import apiFetch from '@/lib/fetchClient';

// Helper para manejar errores de la API
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response;
};

// Helper para convertir fechas datetime-local a ISO
const convertDatesToISO = <T extends Record<string, unknown>>(data: T): T => {
  const converted: Record<string, unknown> = { ...data };
  
  // Convertir campos de fecha si existen y no están vacíos
  if ('purchaseDate' in converted && typeof converted.purchaseDate === 'string' && converted.purchaseDate !== '') {
    converted.purchaseDate = new Date(converted.purchaseDate).toISOString();
  }
  if ('usageDate' in converted && typeof converted.usageDate === 'string' && converted.usageDate !== '') {
    converted.usageDate = new Date(converted.usageDate).toISOString();
  }
  
  return converted as T;
};

// ============= TYPES =============
export interface CreateInkDto extends Record<string, unknown> {
  brand: string;
  model: string;
  color: string;
  quantity?: number;
  inkType?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface CreateUTPCableDto extends Record<string, unknown> {
  brand: string;
  type: string; // Cat5, Cat5e, Cat6, Cat6a, Cat7, Cat8
  material?: string;
  lengthMeters?: number; // Backend espera Int, así que redondeamos antes de enviar
  color?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface CreateRJ45ConnectorDto extends Record<string, unknown> {
  model: string;
  quantityUnits: number;
  material: string;
  type: string;
  purchasePrice?: number;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface CreatePowerStripDto extends Record<string, unknown> {
  brand?: string; // Opcional en el backend
  model: string; // Obligatorio
  outletCount?: number; // Opcional
  lengthMeters?: number; // Opcional - acepta decimales
  color?: string; // Opcional
  capacity?: number; // Opcional - Int en el backend
  purchasePrice?: number;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

// ============= INKS =============

export const getInks = async (): Promise<Ink[]> => {
  const response = await apiFetch(`${API_URL}/inks`, { method: 'GET' });
  await handleApiError(response);
  return response.json();
};

export const createInk = async (data: CreateInkDto): Promise<Ink> => {
  const convertedData = convertDatesToISO(data);
  const response = await apiFetch(`${API_URL}/inks`, { method: 'POST', body: JSON.stringify(convertedData) });
  await handleApiError(response);
  return response.json();
};

export const updateInk = async (id: string, data: CreateInkDto): Promise<Ink> => {
  const convertedData = convertDatesToISO(data);
  const response = await apiFetch(`${API_URL}/inks/${id}`, { method: 'PUT', body: JSON.stringify(convertedData) });
  await handleApiError(response);
  return response.json();
};

export const deleteInk = async (id: string): Promise<void> => {
  const response = await apiFetch(`${API_URL}/inks/${id}`, { method: 'DELETE' });
  await handleApiError(response);
};

// ============= UTP CABLES =============

export const getUTPCables = async (): Promise<UTPCable[]> => {
  const response = await apiFetch(`${API_URL}/utp-cables`, { method: 'GET' });
  await handleApiError(response);
  return response.json();
};

export const createUTPCable = async (data: CreateUTPCableDto): Promise<UTPCable> => {
  const convertedData = convertDatesToISO(data);
  
  // Backend espera lengthMeters como Int, así que redondeamos
  if (convertedData.lengthMeters) {
    convertedData.lengthMeters = Math.round(convertedData.lengthMeters as number);
  }
  
  const response = await apiFetch(`${API_URL}/utp-cables`, { method: 'POST', body: JSON.stringify(convertedData) });
  await handleApiError(response);
  return response.json();
};

export const updateUTPCable = async (id: string, data: CreateUTPCableDto): Promise<UTPCable> => {
  const convertedData = convertDatesToISO(data);
  
  // Backend espera lengthMeters como Int, así que redondeamos
  if (convertedData.lengthMeters) {
    convertedData.lengthMeters = Math.round(convertedData.lengthMeters as number);
  }
  
  const response = await apiFetch(`${API_URL}/utp-cables/${id}`, { method: 'PUT', body: JSON.stringify(convertedData) });
  await handleApiError(response);
  return response.json();
};

export const deleteUTPCable = async (id: string): Promise<void> => {
  const response = await apiFetch(`${API_URL}/utp-cables/${id}`, { method: 'DELETE' });
  await handleApiError(response);
};

// ============= RJ45 CONNECTORS =============

export const getRJ45Connectors = async (): Promise<RJ45Connector[]> => {
  const response = await apiFetch(`${API_URL}/rj45-connectors`, { method: 'GET' });
  await handleApiError(response);
  return response.json();
};

export const createRJ45Connector = async (data: CreateRJ45ConnectorDto): Promise<RJ45Connector> => {
  const convertedData = convertDatesToISO(data);
  const response = await apiFetch(`${API_URL}/rj45-connectors`, { method: 'POST', body: JSON.stringify(convertedData) });
  await handleApiError(response);
  return response.json();
};

export const updateRJ45Connector = async (id: string, data: CreateRJ45ConnectorDto): Promise<RJ45Connector> => {
  const convertedData = convertDatesToISO(data);
  const response = await apiFetch(`${API_URL}/rj45-connectors/${id}`, { method: 'PUT', body: JSON.stringify(convertedData) });
  await handleApiError(response);
  return response.json();
};

export const deleteRJ45Connector = async (id: string): Promise<void> => {
  const response = await apiFetch(`${API_URL}/rj45-connectors/${id}`, { method: 'DELETE' });
  await handleApiError(response);
};

// ============= POWER STRIPS =============

export const getPowerStrips = async (): Promise<PowerStrip[]> => {
  const response = await apiFetch(`${API_URL}/power-strips`, { method: 'GET' });
  await handleApiError(response);
  return response.json();
};

export const createPowerStrip = async (data: CreatePowerStripDto): Promise<PowerStrip> => {
  const convertedData = convertDatesToISO(data);
  
  // Backend espera capacity como Int, así que redondeamos
  if (convertedData.capacity !== undefined) {
    convertedData.capacity = Math.round(convertedData.capacity as number);
  }
  
  console.log('Datos enviados al crear regleta:', convertedData);
  
  const response = await apiFetch(`${API_URL}/power-strips`, { method: 'POST', body: JSON.stringify(convertedData) });
  await handleApiError(response);
  return response.json();
};

export const updatePowerStrip = async (id: string, data: CreatePowerStripDto): Promise<PowerStrip> => {
  const convertedData = convertDatesToISO(data);
  
  // Backend espera capacity como Int, así que redondeamos
  if (convertedData.capacity !== undefined) {
    convertedData.capacity = Math.round(convertedData.capacity as number);
  }
  
  console.log('Datos enviados al actualizar regleta:', convertedData);
  console.log('ID de la regleta:', id);
  
  const response = await apiFetch(`${API_URL}/power-strips/${id}`, { method: 'PUT', body: JSON.stringify(convertedData) });
  await handleApiError(response);
  return response.json();
};

export const deletePowerStrip = async (id: string): Promise<void> => {
  const response = await apiFetch(`${API_URL}/power-strips/${id}`, { method: 'DELETE' });
  await handleApiError(response);
}