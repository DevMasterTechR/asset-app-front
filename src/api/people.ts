// API para Personas - Conectado con Backend NestJS

import { Person } from '@/data/mockDataExtended';

// ============= CONFIGURACIÓN =============
const API_URL = 'http://localhost:3000';

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
  async getAll(): Promise<Person[]> {
    const response = await fetch(`${API_URL}/people`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    await handleApiError(response);
    return response.json();
  },

  async getOne(id: string): Promise<Person> {
    const response = await fetch(`${API_URL}/people/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    await handleApiError(response);
    return response.json();
  },

  async create(data: CreatePersonDto): Promise<Person> {
    // Convertir IDs de string a number si es necesario
    const cleanedData = {
      ...data,
      departmentId: data.departmentId ? Number(data.departmentId) : undefined,
      roleId: data.roleId ? Number(data.roleId) : undefined,
      branchId: data.branchId ? Number(data.branchId) : undefined,
    };

    console.log('Datos enviados al crear persona:', cleanedData);

    const response = await fetch(`${API_URL}/people`, {
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

  async update(id: string, data: UpdatePersonDto): Promise<Person> {
    // Convertir IDs de string a number si es necesario
    const cleanedData = {
      ...data,
      departmentId: data.departmentId ? Number(data.departmentId) : undefined,
      roleId: data.roleId ? Number(data.roleId) : undefined,
      branchId: data.branchId ? Number(data.branchId) : undefined,
    };

    console.log('Datos enviados al actualizar persona:', cleanedData);
    console.log('ID de la persona:', id);

    const response = await fetch(`${API_URL}/people/${id}`, {
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

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/people/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    await handleApiError(response);
  },
};