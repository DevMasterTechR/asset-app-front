// API Mock para Catálogos - TODO: Reemplazar con llamadas REST reales

import { 
  Branch, 
  Department, 
  Role,
  mockBranches,
  mockDepartments,
  mockRoles
} from '@/data/mockDataExtended';

// ============= TYPES =============
export interface CreateBranchDto {
  name: string;
  address: string;
  region: string;
}

export interface CreateDepartmentDto {
  name: string;
}

export interface CreateRoleDto {
  name: string;
  description: string;
}

// ============= BRANCHES =============
let branches = [...mockBranches];

export const getBranches = async (): Promise<Branch[]> => {
  // TODO: GET /api/branches
  await new Promise(resolve => setTimeout(resolve, 300));
  return branches;
};

export const createBranch = async (data: CreateBranchDto): Promise<Branch> => {
  // TODO: POST /api/branches
  await new Promise(resolve => setTimeout(resolve, 500));
  const newBranch: Branch = {
    id: String(Date.now()),
    ...data
  };
  branches.push(newBranch);
  return newBranch;
};

export const updateBranch = async (id: string, data: CreateBranchDto): Promise<Branch> => {
  // TODO: PUT /api/branches/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = branches.findIndex(b => b.id === id);
  if (index === -1) throw new Error('Sucursal no encontrada');
  branches[index] = { id, ...data };
  return branches[index];
};

export const deleteBranch = async (id: string): Promise<void> => {
  // TODO: DELETE /api/branches/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  branches = branches.filter(b => b.id !== id);
};

// ============= DEPARTMENTS =============
let departments = [...mockDepartments];

export const getDepartments = async (): Promise<Department[]> => {
  // TODO: GET /api/departments
  await new Promise(resolve => setTimeout(resolve, 300));
  return departments;
};

export const createDepartment = async (data: CreateDepartmentDto): Promise<Department> => {
  // TODO: POST /api/departments
  await new Promise(resolve => setTimeout(resolve, 500));
  const newDept: Department = {
    id: String(Date.now()),
    ...data
  };
  departments.push(newDept);
  return newDept;
};

export const updateDepartment = async (id: string, data: CreateDepartmentDto): Promise<Department> => {
  // TODO: PUT /api/departments/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = departments.findIndex(d => d.id === id);
  if (index === -1) throw new Error('Departamento no encontrado');
  departments[index] = { id, ...data };
  return departments[index];
};

export const deleteDepartment = async (id: string): Promise<void> => {
  // TODO: DELETE /api/departments/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  departments = departments.filter(d => d.id !== id);
};

// ============= ROLES =============
let roles = [...mockRoles];

export const getRoles = async (): Promise<Role[]> => {
  // TODO: GET /api/roles
  await new Promise(resolve => setTimeout(resolve, 300));
  return roles;
};

export const createRole = async (data: CreateRoleDto): Promise<Role> => {
  // TODO: POST /api/roles
  await new Promise(resolve => setTimeout(resolve, 500));
  const newRole: Role = {
    id: String(Date.now()),
    ...data
  };
  roles.push(newRole);
  return newRole;
};

export const updateRole = async (id: string, data: CreateRoleDto): Promise<Role> => {
  // TODO: PUT /api/roles/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = roles.findIndex(r => r.id === id);
  if (index === -1) throw new Error('Rol no encontrado');
  roles[index] = { id, ...data };
  return roles[index];
};

export const deleteRole = async (id: string): Promise<void> => {
  // TODO: DELETE /api/roles/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  roles = roles.filter(r => r.id !== id);
};
