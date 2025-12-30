import apiFetch from '@/lib/fetchClient';

export const mousePadApi = {
  async getAll() {
    const res = await apiFetch('/mouse-pad', { method: 'GET' });
    return res.json();
  },
  async create(data: { brand: string; model: string; material?: string; size?: string }) {
    const res = await apiFetch('/mouse-pad', { method: 'POST', body: JSON.stringify(data) });
    return res.json();
  },
};
