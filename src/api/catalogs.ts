// API para Catálogos - Conectado con Backend NestJS

import { 
  Branch, 
  Department, 
  Role,
} from '@/data/mockDataExtended';

// ============= CONFIGURACIÓN =============
import { API_URL } from '@/lib/config';

// Helper para manejar errores de la API
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response;
};

// ============= TYPES =============
export interface CreateBranchDto {
  name: string;
  address: string;
  region: string;
}

export interface CreateDepartmentDto {
  name: string;
  description: string;
}

export interface CreateRoleDto {
  name: string;
  description: string;
}

// ============= BRANCHES =============

export const getBranches = async (): Promise<Branch[]> => {
  const response = await fetch(`${API_URL}/branches`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Envía cookies httpOnly
  });
  await handleApiError(response);
  return response.json();
};

export const createBranch = async (data: CreateBranchDto): Promise<Branch> => {
  const response = await fetch(`${API_URL}/branches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  await handleApiError(response);
  return response.json();
};

export const updateBranch = async (id: string, data: CreateBranchDto): Promise<Branch> => {
  const response = await fetch(`${API_URL}/branches/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  await handleApiError(response);
  return response.json();
};

export const deleteBranch = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/branches/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  await handleApiError(response);
};

// ============= DEPARTMENTS =============

export const getDepartments = async (): Promise<Department[]> => {
  const response = await fetch(`${API_URL}/departments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  await handleApiError(response);
  return response.json();
};

export const createDepartment = async (data: CreateDepartmentDto): Promise<Department> => {
  const response = await fetch(`${API_URL}/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  await handleApiError(response);
  return response.json();
};

export const updateDepartment = async (id: string, data: CreateDepartmentDto): Promise<Department> => {
  const response = await fetch(`${API_URL}/departments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  await handleApiError(response);
  return response.json();
};

export const deleteDepartment = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/departments/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  await handleApiError(response);
};

// ============= ROLES =============

export const getRoles = async (): Promise<Role[]> => {
  const response = await fetch(`${API_URL}/roles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  await handleApiError(response);
  return response.json();
};

export const createRole = async (data: CreateRoleDto): Promise<Role> => {
  const response = await fetch(`${API_URL}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  await handleApiError(response);
  return response.json();
};

export const updateRole = async (id: string, data: CreateRoleDto): Promise<Role> => {
  const response = await fetch(`${API_URL}/roles/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  await handleApiError(response);
  return response.json();
};

export const deleteRole = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/roles/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  await handleApiError(response);
};