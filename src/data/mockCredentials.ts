// src/data/mockCredentials.ts
// ⚠️ Este archivo ya NO se usa en Credentials.tsx
// Solo se mantiene por compatibilidad con otros componentes
// Puedes eliminarlo si no lo usas en ningún otro lugar

import { Credential } from '@/api/credentials';

export const mockCredentials: Credential[] = [
  {
    id: 1,
    personId: 1,
    username: 'jperez',
    password: 'erp2024*secure',
    system: 'erp',
    notes: 'Usuario administrador del sistema ERP',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    personId: 1,
    username: 'juan.perez@empresa.com',
    password: 'Email123!',
    system: 'email',
    notes: 'Correo corporativo principal',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 3,
    personId: 2,
    username: 'mgonzalez',
    password: 'crm2024*pass',
    system: 'crm',
    notes: 'Acceso al sistema de gestión de clientes',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
  },
  {
    id: 4,
    personId: 2,
    username: 'maria.gonzalez@empresa.com',
    password: 'SecurePass456!',
    system: 'email',
    createdAt: '2024-01-20T09:15:00Z',
    updatedAt: '2024-01-20T09:15:00Z',
  },
  {
    id: 5,
    personId: 3,
    username: 'crodriguez_support',
    password: 'glpi2024*tech',
    system: 'glpi',
    notes: 'Usuario técnico para soporte IT',
    createdAt: '2024-02-01T14:00:00Z',
    updatedAt: '2024-02-01T14:00:00Z',
  },
];