import apiFetch from '@/lib/fetchClient';

export interface Usb {
  id: number;
  brand: string;
  model: string;
  capacityGb?: number;
  usbType?: string;
  speed?: string;
  color?: string;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUsbDto {
  brand: string;
  model: string;
  capacityGb?: number;
  usbType?: string;
  speed?: string;
  color?: string;
  purchaseDate?: string;
  usageDate?: string;
  notes?: string;
}

export type UpdateUsbDto = Partial<CreateUsbDto>;

export const usbApi = {
  async getAll(): Promise<Usb[]> {
    const res = await apiFetch('/usb', { method: 'GET' });
    return res.json();
  },

  async getById(id: number): Promise<Usb> {
    const res = await apiFetch(`/usb/${id}`, { method: 'GET' });
    return res.json();
  },

  async create(data: CreateUsbDto): Promise<Usb> {
    const res = await apiFetch('/usb', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(id: number, data: UpdateUsbDto): Promise<Usb> {
    const res = await apiFetch(`/usb/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async delete(id: number): Promise<void> {
    await apiFetch(`/usb/${id}`, { method: 'DELETE' });
  },
};
