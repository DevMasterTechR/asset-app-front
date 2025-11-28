// API para Personas - Conectado con Backend NestJS

import { Person } from '@/data/mockDataExtended';

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

// ============= TYPES =============
export type PersonStatus = 'active' | 'inactive' | 'suspended';

export interface CreatePersonDto {
  nationalId: string;
  firstName: string;
  lastName: string;
  username?: string;
  password: string;
  status?: PersonStatus;
  departmentId?: number;
  roleId?: number;
  branchId?: number;
}

export interface UpdatePersonDto {
  nationalId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  status?: PersonStatus;
  departmentId?: number;
  roleId?: number;
  branchId?: number;
}

// ============= PEOPLE API =============

export const peopleApi = {
  async getAll(page?: number, limit?: number, q?: string): Promise<{ data: Person[]; total: number; page: number; limit: number; totalPages: number } | Person[]> {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', String(page));
    if (limit !== undefined) params.append('limit', String(limit));
    if (q !== undefined && q !== null && String(q).trim() !== '') params.append('q', String(q).trim());
    const url = `${API_URL}/people${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiFetch(url, { method: 'GET' });
    await handleApiError(response);
    const json = await response.json();
    // If backend returns paginated shape, pass it through. Otherwise return array.
    if (json && typeof json === 'object' && Array.isArray(json.data)) {
      return json;
    }
    return json as Person[];
  },

  async getOne(id: string): Promise<Person> {
    const response = await apiFetch(`${API_URL}/people/${id}`, { method: 'GET' });
    await handleApiError(response);
    return response.json();
  },

  async create(data: CreatePersonDto): Promise<Person> {
    const cleanedData: CreatePersonDto = {
      nationalId: data.nationalId.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      password: data.password,
      username: data.username?.trim() || undefined,
      status: data.status || 'active',
    };

    if (data.departmentId !== undefined && data.departmentId !== null) {
      cleanedData.departmentId = Number(data.departmentId);
    }
    if (data.roleId !== undefined && data.roleId !== null) {
      cleanedData.roleId = Number(data.roleId);
    }
    if (data.branchId !== undefined && data.branchId !== null) {
      cleanedData.branchId = Number(data.branchId);
    }


    const response = await apiFetch(`${API_URL}/people`, { method: 'POST', body: JSON.stringify(cleanedData) });
    await handleApiError(response);
    return response.json();
  },

  async update(id: string, data: UpdatePersonDto): Promise<Person> {
    const cleanedData: UpdatePersonDto = {};

    if (data.nationalId) cleanedData.nationalId = data.nationalId.trim();
    if (data.firstName) cleanedData.firstName = data.firstName.trim();
    if (data.lastName) cleanedData.lastName = data.lastName.trim();
    if (data.username) cleanedData.username = data.username.trim();
    if (data.password && data.password.length > 0) cleanedData.password = data.password;
    if (data.status) cleanedData.status = data.status;

    if (data.departmentId !== undefined && data.departmentId !== null) {
      cleanedData.departmentId = Number(data.departmentId);
    }
    if (data.roleId !== undefined && data.roleId !== null) {
      cleanedData.roleId = Number(data.roleId);
    }
    if (data.branchId !== undefined && data.branchId !== null) {
      cleanedData.branchId = Number(data.branchId);
    }


    const response = await apiFetch(`${API_URL}/people/${id}`, { method: 'PUT', body: JSON.stringify(cleanedData) });
    await handleApiError(response);
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await apiFetch(`${API_URL}/people/${id}`, { method: 'DELETE' });
    await handleApiError(response);
  },
};