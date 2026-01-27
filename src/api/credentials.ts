// src/api/credentials.ts
import { API_URL } from '@/lib/config';
import apiFetch from '@/lib/fetchClient';

export type SystemType = 'erp' | 'crm' | 'email' | 'glpi' | 'tefl' | 'phone';


export interface Credential {
  id: number;
  personId: number;
  username: string;
  password: string;
  system: SystemType;
  phone?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}


export interface CreateCredentialDto {
  personId: number;
  username: string;
  password: string;
  system: SystemType;
  phone?: string;
  notes?: string;
}


export interface UpdateCredentialDto {
  personId?: number;
  username?: string;
  password?: string;
  system?: SystemType;
  phone?: string;
  notes?: string;
}

// Helper para manejar errores de la API
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response;
};

export const credentialsApi = {
  async getAll(): Promise<Credential[]> {
    const response = await apiFetch(`${API_URL}/credentials`, { method: 'GET' });
    await handleApiError(response);
    return response.json();
  },

  async getById(id: number): Promise<Credential> {
    const response = await apiFetch(`${API_URL}/credentials/${id}`, { method: 'GET' });
    await handleApiError(response);
    return response.json();
  },

  async create(data: CreateCredentialDto): Promise<Credential> {
    // Solo permitir valores válidos para system
    const allowedSystems = ['erp', 'crm', 'email', 'glpi', 'tefl'];
    let system: SystemType = data.system;
    if (!allowedSystems.includes(system)) {
      system = 'erp'; // valor por defecto seguro
    }
    const cleanedData: CreateCredentialDto = {
      personId: Number(data.personId),
      username: data.username ? data.username.trim() : '',
      password: data.password ? data.password : '',
      system,
      phone: data.phone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    };
    console.log(' Datos enviados al crear credencial:', cleanedData);
    const response = await apiFetch(`${API_URL}/credentials`, { method: 'POST', body: JSON.stringify(cleanedData) });
    await handleApiError(response);
    return response.json();
  },

  async update(id: number, data: UpdateCredentialDto): Promise<Credential> {
    const cleanedData: UpdateCredentialDto = {};

    if (data.personId !== undefined) cleanedData.personId = Number(data.personId);
    if (data.username) cleanedData.username = data.username.trim();
    if (data.password) cleanedData.password = data.password;
    if (data.system) cleanedData.system = data.system;
    if (data.phone !== undefined) cleanedData.phone = data.phone.trim() || undefined;
    if (data.notes !== undefined) cleanedData.notes = data.notes.trim() || undefined;

    console.log(' Datos enviados al actualizar credencial:', cleanedData);

    const response = await apiFetch(`${API_URL}/credentials/${id}`, { method: 'PUT', body: JSON.stringify(cleanedData) });
    await handleApiError(response);
    return response.json();
  },

  async delete(id: number): Promise<void> {
    const response = await apiFetch(`${API_URL}/credentials/${id}`, { method: 'DELETE' });
    await handleApiError(response);
  },
};