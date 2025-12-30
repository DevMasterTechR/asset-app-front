import apiFetch from '@/lib/fetchClient';

export const memoryAdapterApi = {
  async getAll() {
    const res = await apiFetch('/memory-adapter', { method: 'GET' });
    return res.json();
  },
  async create(data: { brand: string; model: string; adapterType?: string; compatibility?: string; speed?: string }) {
    const res = await apiFetch('/memory-adapter', { method: 'POST', body: JSON.stringify(data) });
    return res.json();
  },
};
