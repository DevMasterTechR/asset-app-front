import { mockPeople, type Person } from '@/data/mockDataExtended';

export interface CreatePersonDto {
  firstName: string;
  lastName: string;
  nationalId: string;
  username: string;
  departmentId: string;
  roleId: string;
  branchId: string;
  status: 'active' | 'inactive' | 'suspended';
}

export type UpdatePersonDto = Partial<CreatePersonDto>;

let peopleData = [...mockPeople];

// Simular delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const peopleApi = {
  getAll: async (): Promise<Person[]> => {
    await delay(300);
    return [...peopleData];
  },

  create: async (data: CreatePersonDto): Promise<Person> => {
    await delay(500);
    const newPerson: Person = {
      id: `P${Date.now()}`,
      ...data
    };
    peopleData.push(newPerson);
    return newPerson;
  },

  update: async (id: string, data: UpdatePersonDto): Promise<Person> => {
    await delay(500);
    const index = peopleData.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Persona no encontrada');
    
    peopleData[index] = { ...peopleData[index], ...data };
    return peopleData[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay(500);
    peopleData = peopleData.filter(p => p.id !== id);
  }
};
