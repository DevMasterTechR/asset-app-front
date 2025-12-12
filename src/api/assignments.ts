import apiFetch from '@/lib/fetchClient'

// Helper para manejar errores de la API (local, igual que en otros módulos)
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response;
}
import type { Assignment } from '@/data/mockDataExtended'

export interface CreateAssignmentDto {
  assetId: string | number
  personId: string | number
  branchId?: string | number
  assignmentDate?: string
  deliveryCondition: 'excellent' | 'good' | 'fair' | 'poor'
  deliveryNotes?: string
}

export interface UpdateAssignmentDto extends Partial<CreateAssignmentDto> {
  returnDate?: string
  returnCondition?: 'excellent' | 'good' | 'fair' | 'poor'
  returnNotes?: string
}

const mapBackendToFrontend = (b: any): Assignment & { asset?: any; person?: any; branch?: any } => {
  return {
    id: String(b.id),
    assetId: String(b.assetId),
    personId: String(b.personId),
    branchId: b.branchId ?? 0,
    assignmentDate: b.assignmentDate ? new Date(b.assignmentDate).toISOString() : new Date().toISOString(),
    returnDate: b.returnDate ? new Date(b.returnDate).toISOString() : undefined,
    deliveryCondition: b.deliveryCondition || 'good',
    returnCondition: b.returnCondition,
    deliveryNotes: b.deliveryNotes,
    returnNotes: b.returnNotes,
    // Incluir info relacionada si el backend la devuelve
    asset: b.asset ? {
      id: String(b.asset.id),
      assetCode: b.asset.assetCode,
      brand: b.asset.brand,
      model: b.asset.model,
      status: b.asset.status,
      assignedPersonId: b.asset.assignedPersonId,
      branchId: b.asset.branchId,
    } : undefined,
    person: b.person ? {
      id: String(b.person.id),
      firstName: b.person.firstName,
      lastName: b.person.lastName,
    } : undefined,
    branch: b.branch
      ? {
          id: b.branch.id,
          name: b.branch.name,
        }
      : undefined,
  }
}

export const assignmentsApi = {
  async getAll(): Promise<Assignment[]> {
    const res = await apiFetch('/assignment-history', { method: 'GET' })
    await handleApiError(res)
    const data = await res.json()
    return data.map(mapBackendToFrontend)
  },

  async create(payload: CreateAssignmentDto): Promise<{ assignment: Assignment; asset?: any }> {
    const body = {
      assetId: Number(payload.assetId),
      personId: Number(payload.personId),
      branchId: payload.branchId !== undefined ? Number(payload.branchId) : undefined,
      assignmentDate: payload.assignmentDate,
      deliveryCondition: payload.deliveryCondition,
      deliveryNotes: payload.deliveryNotes,
    }
    const res = await apiFetch('/assignment-history', { method: 'POST', body: JSON.stringify(body) })
    await handleApiError(res)
    const data = await res.json()
    // Si el backend devuelve { assignment, asset }
    if (data && data.assignment) {
      return { assignment: mapBackendToFrontend(data.assignment), asset: data.asset }
    }
    // Compatibilidad: si devuelve solo el assignment
    return { assignment: mapBackendToFrontend(data), asset: undefined }
  },

  async update(id: string, payload: UpdateAssignmentDto): Promise<Assignment> {
    const body: any = {}
    if (payload.assetId !== undefined) body.assetId = Number(payload.assetId)
    if (payload.personId !== undefined) body.personId = Number(payload.personId)
    if (payload.branchId !== undefined) body.branchId = Number(payload.branchId)
    if (payload.assignmentDate !== undefined) body.assignmentDate = payload.assignmentDate
    if (payload.deliveryCondition !== undefined) body.deliveryCondition = payload.deliveryCondition
    if (payload.deliveryNotes !== undefined) body.deliveryNotes = payload.deliveryNotes
    if (payload.returnDate !== undefined) body.returnDate = payload.returnDate
    if (payload.returnCondition !== undefined) body.returnCondition = payload.returnCondition
    if (payload.returnNotes !== undefined) body.returnNotes = payload.returnNotes

    const res = await apiFetch(`/assignment-history/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    await handleApiError(res)
    const data = await res.json()
    return mapBackendToFrontend(data)
  },

  async registerReturn(id: string, returnCondition: 'excellent' | 'good' | 'fair' | 'poor', returnNotes?: string): Promise<{ assignment: Assignment; asset?: any }> {
    const body = { returnDate: new Date().toISOString(), returnCondition, returnNotes }
    const res = await apiFetch(`/assignment-history/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    await handleApiError(res)
    const data = await res.json()
    // Si el backend devuelve { assignment, asset }
    if (data && data.assignment) {
      return { assignment: mapBackendToFrontend(data.assignment), asset: data.asset }
    }
    // Compatibilidad: si devuelve solo el assignment
    return { assignment: mapBackendToFrontend(data), asset: undefined }
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`/assignment-history/${id}`, { method: 'DELETE' })
    await handleApiError(res)
  },
}
