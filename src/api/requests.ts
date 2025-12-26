import apiFetch from '@/lib/fetchClient';

export type RequestType = 'equipment_request' | 'equipment_replacement' | 'consumables' | 'new_employee';
export type RequestStatus = 'pendiente_rrhh' | 'rrhh_rechazada' | 'pendiente_admin' | 'aceptada' | 'rechazada';

export interface RequestItem {
  id: number;
  code: string;
  personId: number;
  type: RequestType;
  status: RequestStatus;
  payload?: any;
  hrReason?: string | null;
  adminReason?: string | null;
  hrReviewerId?: number | null;
  adminReviewerId?: number | null;
  hrReviewer?: { firstName: string; lastName: string } | null;
  adminReviewer?: { firstName: string; lastName: string } | null;
  hrSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const requestsApi = {
  async create(data: { type: RequestType; payload?: any }): Promise<RequestItem> {
    const res = await apiFetch('/requests', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async list(status?: RequestStatus): Promise<RequestItem[]> {
    const url = status ? `/requests?status=${status}` : '/requests';
    const res = await apiFetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getOne(id: number): Promise<RequestItem> {
    const res = await apiFetch(`/requests/${id}`, { method: 'GET' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async seenByHr(id: number): Promise<RequestItem> {
    const res = await apiFetch(`/requests/${id}/seen-by-hr`, { method: 'PATCH' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async acceptByHr(id: number, reason?: string): Promise<RequestItem> {
    const res = await apiFetch(`/requests/${id}/accept-by-hr`, { method: 'PATCH', body: JSON.stringify({ reason }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async rejectByHr(id: number, reason: string): Promise<RequestItem> {
    const res = await apiFetch(`/requests/${id}/reject-by-hr`, { method: 'PATCH', body: JSON.stringify({ reason }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async acceptByAdmin(id: number, reason?: string): Promise<RequestItem> {
    const res = await apiFetch(`/requests/${id}/accept-by-admin`, { method: 'PATCH', body: JSON.stringify({ reason }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async rejectByAdmin(id: number, reason: string): Promise<RequestItem> {
    const res = await apiFetch(`/requests/${id}/reject-by-admin`, { method: 'PATCH', body: JSON.stringify({ reason }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
