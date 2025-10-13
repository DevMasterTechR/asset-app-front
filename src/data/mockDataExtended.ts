// Mock data extendido para todas las entidades del sistema

export interface Branch {
  id: number;
  name: string;
  address: string;
  region: string;
}

export interface Department {
  id: number;
  name: string;
  description: string;
}

export interface Role { 
  id: number;
  name: string;
  description: string;
}

export interface Person {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  status: 'active' | 'inactive' | 'suspended';
  departmentId: number;
  roleId: number;
  branchId: number;
}

export interface AssetAttributes {
  cpu?: string;
  ram?: number;
  storage?: {
    type: string;
    capacity: number;
  };
  charger?: boolean;
}

export interface Asset {
  id: string;
  assetCode: string;
  assetType: string;
  serialNumber: string;
  brand: string;
  model: string;
  status: 'available' | 'assigned' | 'maintenance' | 'decommissioned';
  branchId: number;
  assignedPersonId?: string;
  purchaseDate?: string;
  deliveryDate?: string;
  receivedDate?: string;
  notes?: string;
  attributes?: AssetAttributes;
}

export interface Assignment {
  id: string;
  assetId: string;
  personId: string;
  branchId: number;
  assignmentDate: string;
  returnDate?: string;
  deliveryCondition: 'excellent' | 'good' | 'fair' | 'poor';
  returnCondition?: 'excellent' | 'good' | 'fair' | 'poor';
  deliveryNotes?: string;
  returnNotes?: string;
}

export interface Ink {
  id: string;
  brand: string;
  model: string;
  color: string;
  quantity: number;
  inkType: string;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface UTPCable {
  id: string;
  brand: string;
  type: 'indoor' | 'outdoor';
  material: string;
  lengthMeters: number;
  color: string;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface RJ45Connector {
  id: string;
  model: string;
  quantityUnits: number;
  material: string;
  type: string;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface PowerStrip {
  id: string;
  brand: string;
  model: string;
  outletCount: number;
  lengthMeters: number;
  color: string;
  capacity: number;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

// ============= MOCK DATA =============

export const mockBranches: Branch[] = [
  { id: 1, name: 'Oficina Principal', address: 'Av. Principal 123', region: 'Centro' },
  { id: 2, name: 'Sucursal Norte', address: 'Calle Norte 456', region: 'Norte' },
  { id: 3, name: 'Sucursal Sur', address: 'Av. Sur 789', region: 'Sur' },
];

export const mockDepartments: Department[] = [
  { id: 1, name: 'Tecnología', description: 'Encargado de sistemas, redes y soporte técnico.' },
  { id: 2, name: 'Recursos Humanos', description: 'Gestión de personal y procesos administrativos.' },
  { id: 3, name: 'Ventas', description: 'Responsable de comercialización de productos y servicios.' },
  { id: 4, name: 'Administración', description: 'Control de finanzas y administración general.' },
  { id: 5, name: 'Operaciones', description: 'Supervisión de actividades operativas.' },
];

export const mockRoles: Role[] = [
  { id: 1, name: 'Admin', description: 'Administrador del sistema' },
  { id: 2, name: 'Manager', description: 'Gerente de área' },
  { id: 3, name: 'Employee', description: 'Empleado estándar' },
  { id: 4, name: 'IT Support', description: 'Soporte técnico' },
];

export const mockPeople: Person[] = [
  {
    id: '1',
    nationalId: '1234567890',
    firstName: 'Juan',
    lastName: 'Pérez',
    username: 'jperez',
    password: '1234',
    status: 'active',
    departmentId: 1,
    roleId: 1,
    branchId: 1,
  },
  {
    id: '2',
    nationalId: '0987654321',
    firstName: 'María',
    lastName: 'González',
    username: 'mgonzalez',
    password: '1234',
    status: 'active',
    departmentId: 2,
    roleId: 2,
    branchId: 1,
  },
  {
    id: '3',
    nationalId: '1122334455',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    username: 'crodriguez',
    password: '1234',
    status: 'active',
    departmentId: 3,
    roleId: 3,
    branchId: 2,
  },
];

export const mockAssets: Asset[] = [
  {
    id: '1',
    assetCode: 'LAPTOP-001',
    assetType: 'laptop',
    serialNumber: 'SN123456',
    brand: 'Dell',
    model: 'Latitude 5420',
    status: 'assigned',
    branchId: 1,
    assignedPersonId: '1',
    purchaseDate: '2024-01-15',
    attributes: {
      cpu: 'Intel Core i5-1135G7',
      ram: 16,
      storage: { type: 'SSD', capacity: 512 },
      charger: true,
    },
  },
  {
    id: '2',
    assetCode: 'PHONE-001',
    assetType: 'smartphone',
    serialNumber: 'IMEI123456',
    brand: 'Samsung',
    model: 'Galaxy S23',
    status: 'assigned',
    branchId: 1,
    assignedPersonId: '2',
    purchaseDate: '2024-02-10',
    attributes: {
      cpu: 'Snapdragon 8 Gen 2',
      ram: 8,
      storage: { type: 'Soldered', capacity: 256 },
    },
  },
  {
    id: '3',
    assetCode: 'MOUSE-001',
    assetType: 'mouse',
    serialNumber: 'MX123',
    brand: 'Logitech',
    model: 'M720',
    status: 'available',
    branchId: 1,
    purchaseDate: '2024-03-05',
  },
  {
    id: '4',
    assetCode: 'KEYBOARD-001',
    assetType: 'keyboard',
    serialNumber: 'KB456',
    brand: 'Logitech',
    model: 'K380',
    status: 'available',
    branchId: 2,
    purchaseDate: '2024-03-05',
  },
];

export const mockAssignments: Assignment[] = [
  {
    id: '1',
    assetId: '1',
    personId: '1',
    branchId: 1,
    assignmentDate: '2024-01-20',
    deliveryCondition: 'excellent',
    deliveryNotes: 'Equipo nuevo entregado',
  },
  {
    id: '2',
    assetId: '2',
    personId: '2',
    branchId: 1,
    assignmentDate: '2024-02-15',
    deliveryCondition: 'good',
    deliveryNotes: 'Celular con cargador incluido',
  },
];

export const mockInks: Ink[] = [
  {
    id: '1',
    brand: 'HP',
    model: '58A',
    color: 'Black',
    quantity: 5,
    inkType: 'Toner',
    purchaseDate: '2024-01-10',
  },
  {
    id: '2',
    brand: 'Canon',
    model: 'GI-790',
    color: 'Cyan',
    quantity: 2,
    inkType: 'Pigment',
    purchaseDate: '2024-02-15',
  },
];

export const mockUTPCables: UTPCable[] = [
  {
    id: '1',
    brand: 'Panduit',
    type: 'outdoor',
    material: '100% Copper',
    lengthMeters: 305,
    color: 'Black',
    purchaseDate: '2024-01-05',
  },
];

export const mockRJ45Connectors: RJ45Connector[] = [
  {
    id: '1',
    model: 'RJ45 CAT6',
    quantityUnits: 100,
    material: 'Gold plated',
    type: 'CAT6',
    purchaseDate: '2024-01-05',
  },
];

export const mockPowerStrips: PowerStrip[] = [
  {
    id: '1',
    brand: 'Belkin',
    model: 'Surge Protector 8',
    outletCount: 8,
    lengthMeters: 2.5,
    color: 'Black',
    capacity: 2400,
    purchaseDate: '2024-02-01',
  },
];

// Helper functions
export const getBranchName = (id: number) => mockBranches.find(b => b.id === id)?.name || 'N/A';
export const getDepartmentName = (id: number) => mockDepartments.find(d => d.id === id)?.name || 'N/A';
export const getRoleName = (id: number) => mockRoles.find(r => r.id === id)?.name || 'N/A';
export const getPersonName = (id: string) => {
  const person = mockPeople.find(p => p.id === id);
  return person ? `${person.firstName} ${person.lastName}` : 'N/A';
};
export const getAssetInfo = (id: string) => mockAssets.find(a => a.id === id);