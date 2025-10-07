// API Mock para Consumibles - TODO: Reemplazar con llamadas REST reales

import { 
  Ink, 
  UTPCable, 
  RJ45Connector, 
  PowerStrip,
  mockInks,
  mockUTPCables,
  mockRJ45Connectors,
  mockPowerStrips
} from '@/data/mockDataExtended';

// ============= TYPES =============
export interface CreateInkDto {
  brand: string;
  model: string;
  color: string;
  quantity: number;
  inkType: string;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface CreateUTPCableDto {
  brand: string;
  type: 'indoor' | 'outdoor';
  material: string;
  lengthMeters: number;
  color: string;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface CreateRJ45ConnectorDto {
  model: string;
  quantityUnits: number;
  material: string;
  type: string;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export interface CreatePowerStripDto {
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

// ============= INKS =============
let inks = [...mockInks];

export const getInks = async (): Promise<Ink[]> => {
  // TODO: GET /api/inks
  await new Promise(resolve => setTimeout(resolve, 300));
  return inks;
};

export const createInk = async (data: CreateInkDto): Promise<Ink> => {
  // TODO: POST /api/inks
  await new Promise(resolve => setTimeout(resolve, 500));
  const newInk: Ink = {
    id: String(Date.now()),
    ...data
  };
  inks.push(newInk);
  return newInk;
};

export const updateInk = async (id: string, data: CreateInkDto): Promise<Ink> => {
  // TODO: PUT /api/inks/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = inks.findIndex(i => i.id === id);
  if (index === -1) throw new Error('Tinta no encontrada');
  inks[index] = { id, ...data };
  return inks[index];
};

export const deleteInk = async (id: string): Promise<void> => {
  // TODO: DELETE /api/inks/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  inks = inks.filter(i => i.id !== id);
};

// ============= UTP CABLES =============
let utpCables = [...mockUTPCables];

export const getUTPCables = async (): Promise<UTPCable[]> => {
  // TODO: GET /api/utp-cables
  await new Promise(resolve => setTimeout(resolve, 300));
  return utpCables;
};

export const createUTPCable = async (data: CreateUTPCableDto): Promise<UTPCable> => {
  // TODO: POST /api/utp-cables
  await new Promise(resolve => setTimeout(resolve, 500));
  const newCable: UTPCable = {
    id: String(Date.now()),
    ...data
  };
  utpCables.push(newCable);
  return newCable;
};

export const updateUTPCable = async (id: string, data: CreateUTPCableDto): Promise<UTPCable> => {
  // TODO: PUT /api/utp-cables/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = utpCables.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Cable no encontrado');
  utpCables[index] = { id, ...data };
  return utpCables[index];
};

export const deleteUTPCable = async (id: string): Promise<void> => {
  // TODO: DELETE /api/utp-cables/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  utpCables = utpCables.filter(c => c.id !== id);
};

// ============= RJ45 CONNECTORS =============
let rj45Connectors = [...mockRJ45Connectors];

export const getRJ45Connectors = async (): Promise<RJ45Connector[]> => {
  // TODO: GET /api/rj45-connectors
  await new Promise(resolve => setTimeout(resolve, 300));
  return rj45Connectors;
};

export const createRJ45Connector = async (data: CreateRJ45ConnectorDto): Promise<RJ45Connector> => {
  // TODO: POST /api/rj45-connectors
  await new Promise(resolve => setTimeout(resolve, 500));
  const newConnector: RJ45Connector = {
    id: String(Date.now()),
    ...data
  };
  rj45Connectors.push(newConnector);
  return newConnector;
};

export const updateRJ45Connector = async (id: string, data: CreateRJ45ConnectorDto): Promise<RJ45Connector> => {
  // TODO: PUT /api/rj45-connectors/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = rj45Connectors.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Conector no encontrado');
  rj45Connectors[index] = { id, ...data };
  return rj45Connectors[index];
};

export const deleteRJ45Connector = async (id: string): Promise<void> => {
  // TODO: DELETE /api/rj45-connectors/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  rj45Connectors = rj45Connectors.filter(c => c.id !== id);
};

// ============= POWER STRIPS =============
let powerStrips = [...mockPowerStrips];

export const getPowerStrips = async (): Promise<PowerStrip[]> => {
  // TODO: GET /api/power-strips
  await new Promise(resolve => setTimeout(resolve, 300));
  return powerStrips;
};

export const createPowerStrip = async (data: CreatePowerStripDto): Promise<PowerStrip> => {
  // TODO: POST /api/power-strips
  await new Promise(resolve => setTimeout(resolve, 500));
  const newStrip: PowerStrip = {
    id: String(Date.now()),
    ...data
  };
  powerStrips.push(newStrip);
  return newStrip;
};

export const updatePowerStrip = async (id: string, data: CreatePowerStripDto): Promise<PowerStrip> => {
  // TODO: PUT /api/power-strips/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = powerStrips.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Regleta no encontrada');
  powerStrips[index] = { id, ...data };
  return powerStrips[index];
};

export const deletePowerStrip = async (id: string): Promise<void> => {
  // TODO: DELETE /api/power-strips/:id
  await new Promise(resolve => setTimeout(resolve, 500));
  powerStrips = powerStrips.filter(p => p.id !== id);
};

