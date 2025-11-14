// src/api/credentials.ts
import { API_URL } from '@/lib/config';

export type SystemType = 'erp' | 'crm' | 'email' | 'glpi';

export interface Credential {
  id: number;
  personId: number;
  username: string;
  password: string;
  system: SystemType;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCredentialDto {
  personId: number;
  username: string;
  password: string;
  system: SystemType;
  notes?: string;
}

export interface UpdateCredentialDto {
  personId?: number;
  username?: string;
  password?: string;
  system?: SystemType;
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
    const response = await fetch(`${API_URL}/credentials`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    await handleApiError(response);
    return response.json();
  },

  async getById(id: number): Promise<Credential> {
    const response = await fetch(`${API_URL}/credentials/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    await handleApiError(response);
    return response.json();
  },

  async create(data: CreateCredentialDto): Promise<Credential> {
    const cleanedData: CreateCredentialDto = {
      personId: Number(data.personId),
      username: data.username.trim(),
      password: data.password,
      system: data.system,
      notes: data.notes?.trim() || undefined,
    };

    console.log('📤 Datos enviados al crear credencial:', cleanedData);

    const response = await fetch(`${API_URL}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(cleanedData),
    });
    await handleApiError(response);
    return response.json();
  },

  async update(id: number, data: UpdateCredentialDto): Promise<Credential> {
    const cleanedData: UpdateCredentialDto = {};

    if (data.personId !== undefined) cleanedData.personId = Number(data.personId);
    if (data.username) cleanedData.username = data.username.trim();
    if (data.password) cleanedData.password = data.password;
    if (data.system) cleanedData.system = data.system;
    if (data.notes !== undefined) cleanedData.notes = data.notes.trim() || undefined;

    console.log('📤 Datos enviados al actualizar credencial:', cleanedData);

    const response = await fetch(`${API_URL}/credentials/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(cleanedData),
    });
    await handleApiError(response);
    return response.json();
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/credentials/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    await handleApiError(response);
  },
};