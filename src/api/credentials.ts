// src/api/credentials.ts

export type SystemType = 'ERP' | 'CRM' | 'Email' | 'GLPI';

export interface Credential {
  id: string;
  personId: string;
  username: string;
  password: string;
  system: SystemType;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCredentialDto {
  personId: string;
  username: string;
  password: string;
  system: SystemType;
  notes?: string;
}

export interface UpdateCredentialDto extends Partial<CreateCredentialDto> {
  id: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// MOCK: Base de datos temporal
let mockDatabase: Credential[] = [];

export const initializeMockCredentials = (data: Credential[]) => {
  mockDatabase = [...data];
};

export const credentialsApi = {
  // GET /api/credentials
  getAll: async (): Promise<ApiResponse<Credential[]>> => {
    await delay(300);
    try {
      return {
        success: true,
        data: mockDatabase
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al obtener credenciales'
      };
    }
  },

  // GET /api/credentials/by-person/:personId
  getByPerson: async (personId: string): Promise<ApiResponse<Credential[]>> => {
    await delay(200);
    try {
      const credentials = mockDatabase.filter(c => c.personId === personId);
      return {
        success: true,
        data: credentials
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al obtener credenciales'
      };
    }
  },

  // GET /api/credentials/:id
  getById: async (id: string): Promise<ApiResponse<Credential>> => {
    await delay(200);
    try {
      const credential = mockDatabase.find(c => c.id === id);
      if (!credential) {
        return {
          success: false,
          error: 'Credencial no encontrada'
        };
      }
      return {
        success: true,
        data: credential
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al obtener credencial'
      };
    }
  },

  // POST /api/credentials
  create: async (data: CreateCredentialDto): Promise<ApiResponse<Credential>> => {
    await delay(500);
    try {
      const now = new Date().toISOString();
      const newCredential: Credential = {
        id: (Math.max(...mockDatabase.map(c => parseInt(c.id)), 0) + 1).toString(),
        personId: data.personId,
        username: data.username,
        password: data.password,
        system: data.system,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      };
      
      mockDatabase.push(newCredential);
      
      return {
        success: true,
        data: newCredential
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al crear credencial'
      };
    }
  },

  // PUT /api/credentials/:id
  update: async (data: UpdateCredentialDto): Promise<ApiResponse<Credential>> => {
    await delay(500);
    try {
      const index = mockDatabase.findIndex(c => c.id === data.id);
      
      if (index === -1) {
        return {
          success: false,
          error: 'Credencial no encontrada'
        };
      }

      const updatedCredential: Credential = {
        ...mockDatabase[index],
        personId: data.personId ?? mockDatabase[index].personId,
        username: data.username ?? mockDatabase[index].username,
        password: data.password ?? mockDatabase[index].password,
        system: data.system ?? mockDatabase[index].system,
        notes: data.notes ?? mockDatabase[index].notes,
        updatedAt: new Date().toISOString(),
      };

      mockDatabase[index] = updatedCredential;

      return {
        success: true,
        data: updatedCredential
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al actualizar credencial'
      };
    }
  },

  // DELETE /api/credentials/:id
  delete: async (id: string): Promise<ApiResponse<void>> => {
    await delay(400);
    try {
      const index = mockDatabase.findIndex(c => c.id === id);
      
      if (index === -1) {
        return {
          success: false,
          error: 'Credencial no encontrada'
        };
      }

      mockDatabase.splice(index, 1);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al eliminar credencial'
      };
    }
  }
};