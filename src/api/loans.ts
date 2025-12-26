import apiFetch from '@/lib/fetchClient'

// Helper para manejar errores de la API
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response;
}

export interface CreateLoanDto {
  assetId: string | number
  personId: string | number
  branchId?: string | number
  loanDays: number
  loanDate?: string
  deliveryCondition?: 'excellent' | 'good' | 'fair' | 'poor'
  deliveryNotes?: string
}

export interface UpdateLoanDto extends Partial<CreateLoanDto> {
  returnDate?: string
  returnCondition?: 'excellent' | 'good' | 'fair' | 'poor'
  returnNotes?: string
}

export interface Loan {
  id: string
  assetId: string
  personId: string
  branchId?: number
  loanDate: string
  returnDate?: string
  loanDays: number
  deliveryCondition?: string
  returnCondition?: string
  deliveryNotes?: string
  returnNotes?: string
  createdAt?: string
  updatedAt?: string
  asset?: {
    id: string
    assetCode: string
    assetType: string
    brand?: string
    model?: string
    status: string
    serialNumber?: string
    purchaseDate?: string
  }
  person?: {
    id: string
    firstName: string
    lastName: string
  }
  branch?: {
    id: number
    name: string
  }
}

const mapBackendToFrontend = (b: any): Loan => {
  return {
    id: String(b.id),
    assetId: String(b.assetId),
    personId: String(b.personId),
    branchId: b.branchId ?? 0,
    loanDate: b.loanDate ? new Date(b.loanDate).toISOString() : new Date().toISOString(),
    returnDate: b.returnDate ? new Date(b.returnDate).toISOString() : undefined,
    loanDays: b.loanDays || 0,
    deliveryCondition: b.deliveryCondition || 'good',
    returnCondition: b.returnCondition,
    deliveryNotes: b.deliveryNotes,
    returnNotes: b.returnNotes,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    asset: b.asset ? {
      id: String(b.asset.id),
      assetCode: b.asset.assetCode,
      assetType: b.asset.assetType || b.asset.type,
      brand: b.asset.brand,
      model: b.asset.model,
      status: b.asset.status,
      serialNumber: b.asset.serialNumber,
      purchaseDate: b.asset.purchaseDate,
    } : undefined,
    person: b.person ? {
      id: String(b.person.id),
      firstName: b.person.firstName,
      lastName: b.person.lastName,
    } : undefined,
    branch: b.branch ? {
      id: b.branch.id,
      name: b.branch.name,
    } : undefined,
  };
};

const mapFrontendToBackend = (f: CreateLoanDto) => ({
  assetId: Number(f.assetId),
  personId: Number(f.personId),
  branchId: f.branchId ? Number(f.branchId) : undefined,
  loanDays: f.loanDays,
  loanDate: f.loanDate,
  deliveryCondition: f.deliveryCondition,
  deliveryNotes: f.deliveryNotes,
});

export const loansApi = {
  async getAll(): Promise<Loan[]> {
    const response = await apiFetch(`/loans`);
    await handleApiError(response);
    const data = await response.json();
    const loans = Array.isArray(data) ? data : data.data || [];
    return loans.map(mapBackendToFrontend);
  },

  async getById(id: string | number): Promise<Loan> {
    const response = await apiFetch(`/loans/${id}`);
    await handleApiError(response);
    const data = await response.json();
    return mapBackendToFrontend(data);
  },

  async getMyLoans(): Promise<Loan[]> {
    const response = await apiFetch(`/loans/user/my-loans`);
    await handleApiError(response);
    const data = await response.json();
    const loans = Array.isArray(data) ? data : data.data || [];
    return loans.map(mapBackendToFrontend);
  },

  async create(dto: CreateLoanDto): Promise<Loan> {
    const response = await apiFetch(`/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapFrontendToBackend(dto)),
    });
    await handleApiError(response);
    const data = await response.json();
    return mapBackendToFrontend(data.loan || data);
  },

  async update(id: string | number, dto: UpdateLoanDto): Promise<Loan> {
    const response = await apiFetch(`/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        returnDate: dto.returnDate,
        returnCondition: dto.returnCondition,
        returnNotes: dto.returnNotes,
        personId: dto.personId ? Number(dto.personId) : undefined,
        branchId: dto.branchId ? Number(dto.branchId) : undefined,
      }),
    });
    await handleApiError(response);
    const data = await response.json();
    return mapBackendToFrontend(data.loan || data);
  },

  async delete(id: string | number): Promise<void> {
    const response = await apiFetch(`/loans/${id}`, {
      method: 'DELETE',
    });
    await handleApiError(response);
  },
};
