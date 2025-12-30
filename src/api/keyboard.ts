import apiFetch from '@/lib/fetchClient';

export const keyboardApi = {
  async getAll() {
    const res = await apiFetch('/keyboard', { method: 'GET' });
    return res.json();
  },
  async create(data: { brand: string; model: string; connectionType?: string; layout?: string; isNumeric?: boolean }) {
    const res = await apiFetch('/keyboard', { method: 'POST', body: JSON.stringify(data) });
    return res.json();
  },
};
