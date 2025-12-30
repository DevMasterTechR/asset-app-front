import apiFetch from '@/lib/fetchClient';

export const mouseApi = {
  async getAll() {
    const res = await apiFetch('/mouse', { method: 'GET' });
    return res.json();
  },
  async create(data: { brand: string; model: string; connectionType?: string; dpi?: number }) {
    const res = await apiFetch('/mouse', { method: 'POST', body: JSON.stringify(data) });
    return res.json();
  },
};
