import { useEffect, useState } from 'react';
import HumanResourcesLayout from '@/components/HumanResourcesLayout';
import { requestsApi, RequestItem, RequestStatus } from '@/api/requests';
import { getBranches, getDepartments } from '@/api/catalogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Loader2, Search, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Pagination from '@/components/Pagination';
import { useToast } from '@/hooks/use-toast';

const HumanResourcesRequests = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [creationDateFilter, setCreationDateFilter] = useState('');
  const [responseDateFilter, setResponseDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState<'pending' | 'process' | 'history'>('pending');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Estado para crear solicitud de equipo
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [newHireForm, setNewHireForm] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    position: '',
    branchId: '',
    departmentId: '',
    notes: '',
  });
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    position: '',
    branchId: '',
    departmentId: '',
    notes: '',
  });
  
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await requestsApi.list();
      setRequests(data);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudieron cargar solicitudes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    setCatalogsLoading(true);
    try {
      const [branches, departments] = await Promise.all([getBranches(), getDepartments()]);
      setBranchOptions((branches || []).map((b: any) => ({ value: String(b.id ?? b.value ?? ''), label: b.name || b.label || 'Sin nombre' })).filter((b) => b.value));
      setDepartmentOptions((departments || []).map((d: any) => ({ value: String(d.id ?? d.value ?? ''), label: d.name || d.label || 'Sin nombre' })).filter((d) => d.value));
    } catch (e) {
      console.error('Error cargando catálogos', e);
      toast({ title: 'Error', description: 'No se pudieron cargar sucursales/áreas', variant: 'destructive' });
    } finally {
      setCatalogsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [viewMode]);
  useEffect(() => { loadCatalogs(); }, []);

  const filtered = requests.filter((r) => {
    // Para RRHH:
    // - Pendientes: solo pendiente_rrhh
    // - En Proceso: solo pendiente_admin (aceptadas por RRHH, esperando Sistemas)
    // - Historial: aceptada, rechazada, rrhh_rechazada
    const isPending = r.status === 'pendiente_rrhh';
    const isProcess = r.status === 'pendiente_admin';
    const isHistory = r.status === 'aceptada' || r.status === 'rechazada' || r.status === 'rrhh_rechazada';
    
    const matchesView = viewMode === 'pending' ? isPending 
                      : viewMode === 'process' ? isProcess 
                      : isHistory;
    
    const search = searchTerm.toLowerCase();
    const matches = search === '' || r.code.toLowerCase().includes(search) || (r.payload && JSON.stringify(r.payload).toLowerCase().includes(search));
    const matchesCreationDate = !creationDateFilter || new Date(r.createdAt).toISOString().slice(0,10) === creationDateFilter;
    const matchesResponseDate = viewMode !== 'history' || !responseDateFilter || (r.updatedAt && new Date(r.updatedAt).toISOString().slice(0,10) === responseDateFilter);
    return matchesView && matches && matchesCreationDate && matchesResponseDate;
  });

  const displayed = filtered.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filtered.length / limit);

  const getStatusBadge = (status: RequestStatus) => {
    const styles: Record<string,string> = {
      pendiente_rrhh: 'bg-yellow-100 text-yellow-800',
      rrhh_rechazada: 'bg-red-100 text-red-800',
      pendiente_admin: 'bg-blue-100 text-blue-800',
      aceptada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
    };
    const labels: Record<string,string> = {
      pendiente_rrhh: 'Pendiente RRHH',
      rrhh_rechazada: 'Rechazada RRHH',
      pendiente_admin: 'Pendiente Sistemas',
      aceptada: 'Aceptada',
      rechazada: 'Rechazada Sistemas',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      equipment_replacement: 'Reemplazo de equipo',
      consumables: 'Consumibles',
      equipment_request: 'Solicitud de equipo',
      new_employee: 'Nuevo trabajador',
    };
    return map[type] || type;
  };

  const handleAccept = async (req: RequestItem) => {
    try {
      await requestsApi.acceptByHr(req.id, undefined);
      toast({ title: 'Éxito', description: 'Solicitud aceptada, enviada a Sistemas' });
      setDetailsOpen(false);
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo aceptar', variant: 'destructive' });
    }
  };

  const handleReject = async (req: RequestItem) => {
    if (!rejectReason.trim()) {
      toast({ title: 'Razón requerida', description: 'Ingresa una razón para rechazar', variant: 'destructive' });
      return;
    }
    try {
      await requestsApi.rejectByHr(req.id, rejectReason.trim());
      toast({ title: 'Solicitud rechazada', description: 'Se notificará al usuario' });
      setRejectReason('');
      setDetailsOpen(false);
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo rechazar', variant: 'destructive' });
    }
  };

  const renderPayloadDetails = (type: string, payload: any) => {
    if (!payload) return <div className="text-muted-foreground">Sin datos</div>;

    const Item = ({ label, value }: { label: string; value: any }) => (
      <div className="flex gap-1 text-sm">
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium break-words">{value || 'N/A'}</span>
      </div>
    );

    switch (type) {
      case 'equipment_replacement':
        return (
          <div className="space-y-1">
            <Item label="Equipo" value={payload.assetId} />
            <Item label="Razón" value={payload.reason} />
          </div>
        );
      case 'consumables':
        return (
          <div className="space-y-1">
            <Item label="Consumible" value={payload.consumible} />
            <Item label="Razón" value={payload.reason} />
          </div>
        );
      case 'equipment_request':
        return (
          <div className="space-y-1">
            <Item label="Persona" value={payload.personId} />
            <Item label="Sucursal" value={payload.branchId} />
            <Item label="Departamento" value={payload.departmentId} />
            <Item label="Equipos solicitados" value={payload.equipmentNeeded} />
          </div>
        );
      case 'new_employee':
        return (
          <div className="space-y-1">
            <Item label="Nombre" value={payload.firstName} />
            <Item label="Apellido" value={payload.lastName} />
            <Item label="Cédula" value={payload.nationalId} />
            <Item label="Teléfono" value={payload.phone} />
            <Item label="Cargo" value={payload.position} />
            <Item label="Sucursal" value={payload.branchId} />
            <Item label="Área" value={payload.departmentId} />
            <Item label="Notas" value={payload.notes} />
          </div>
        );
      default: {
        const entries = Object.entries(payload || {});
        if (!entries.length) return <div className="text-muted-foreground">Sin datos</div>;
        return (
          <div className="space-y-1 text-sm">
            {entries.map(([k, v]) => (
              <Item key={k} label={k} value={typeof v === 'object' ? JSON.stringify(v) : String(v)} />
            ))}
          </div>
        );
      }
    }
  };

  const handleCreateNewHireRequest = async () => {
    // Resetear errores
    setFormErrors({
      firstName: '',
      lastName: '',
      nationalId: '',
      position: '',
      branchId: '',
      departmentId: '',
      notes: '',
    });

    // Validar campos
    const errors = {
      firstName: !newHireForm.firstName.trim() ? 'El nombre es obligatorio' : '',
      lastName: !newHireForm.lastName.trim() ? 'El apellido es obligatorio' : '',
      nationalId: !newHireForm.nationalId.trim() 
        ? 'La cédula es obligatoria' 
        : !/^\d+$/.test(newHireForm.nationalId.trim()) 
        ? 'La cédula debe contener solo números' 
        : '',
      position: !newHireForm.position.trim() ? 'El cargo es obligatorio' : '',
      branchId: !newHireForm.branchId ? 'La sucursal es obligatoria' : '',
      departmentId: !newHireForm.departmentId ? 'El área es obligatoria' : '',
      notes: !newHireForm.notes.trim() ? 'La razón de solicitud es obligatoria' : '',
    };

    // Verificar si hay errores
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors) {
      setFormErrors(errors);
      const firstError = Object.values(errors).find(e => e !== '') as string;
      toast({
        title: 'Error de validación',
        description: firstError,
        variant: 'destructive',
      });
      return;
    }

    setCreatingRequest(true);
    try {
      await requestsApi.create({
        type: 'new_employee',
        payload: {
          firstName: newHireForm.firstName,
          lastName: newHireForm.lastName,
          nationalId: newHireForm.nationalId,
          phone: newHireForm.phone,
          position: newHireForm.position,
          branchId: Number(newHireForm.branchId),
          departmentId: Number(newHireForm.departmentId),
          notes: newHireForm.notes,
        },
      });
      toast({
        title: 'Éxito',
        description: 'Solicitud de nuevo trabajador creada correctamente',
      });
      setNewHireForm({
        firstName: '',
        lastName: '',
        nationalId: '',
        phone: '',
        position: '',
        branchId: '',
        departmentId: '',
        notes: '',
      });
      setCreateRequestOpen(false);
      loadData();
    } catch (e) {
      console.error('Error creando solicitud:', e);
      toast({
        title: 'Error',
        description: 'No se pudo crear la solicitud',
        variant: 'destructive',
      });
    } finally {
      setCreatingRequest(false);
    }
  };

  return (
    <HumanResourcesLayout>
      <div className="p-6 md:pl-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Solicitudes (RRHH)</h1>
            <p className="text-muted-foreground mt-1">Revisión inicial y envío a Sistemas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadData} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            <Dialog open={createRequestOpen} onOpenChange={setCreateRequestOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo trabajador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Alta de nuevo trabajador</DialogTitle>
                  <DialogDescription>
                    Completa los datos del colaborador y asigna sucursal y área
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input
                        placeholder="Ej. Ana"
                        value={newHireForm.firstName}
                        onChange={(e) => setNewHireForm({ ...newHireForm, firstName: e.target.value })}
                        className={formErrors.firstName ? 'border-red-500' : ''}
                      />
                      {formErrors.firstName && <p className="text-xs text-red-500">{formErrors.firstName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido *</Label>
                      <Input
                        placeholder="Ej. Gómez"
                        value={newHireForm.lastName}
                        onChange={(e) => setNewHireForm({ ...newHireForm, lastName: e.target.value })}
                        className={formErrors.lastName ? 'border-red-500' : ''}
                      />
                      {formErrors.lastName && <p className="text-xs text-red-500">{formErrors.lastName}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cédula / ID *</Label>
                    <Input
                      placeholder="Número de identificación"
                      value={newHireForm.nationalId}
                      onChange={(e) => setNewHireForm({ ...newHireForm, nationalId: e.target.value })}
                      className={formErrors.nationalId ? 'border-red-500' : ''}
                    />
                    {formErrors.nationalId && <p className="text-xs text-red-500">{formErrors.nationalId}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Cargo / Rol *</Label>
                    <Input
                      placeholder="Ej. Analista Jr."
                      value={newHireForm.position}
                      onChange={(e) => setNewHireForm({ ...newHireForm, position: e.target.value })}
                      className={formErrors.position ? 'border-red-500' : ''}
                    />
                    {formErrors.position && <p className="text-xs text-red-500">{formErrors.position}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Sucursal *</Label>
                    <Select
                      value={newHireForm.branchId}
                      onValueChange={(value) => {
                        setNewHireForm({ ...newHireForm, branchId: value });
                        setBranchSearch('');
                      }}
                      disabled={catalogsLoading}
                    >
                      <SelectTrigger className={formErrors.branchId ? 'border-red-500' : ''}>
                        <SelectValue placeholder={catalogsLoading ? 'Cargando...' : 'Selecciona sucursal'} />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" sideOffset={5} className="max-w-xs" position="popper" avoidCollisions={false}>
                        <div className="p-2 pb-0">
                          <input
                            type="text"
                            placeholder="Buscar sucursal..."
                            value={branchSearch}
                            onChange={(e) => setBranchSearch(e.target.value.toLowerCase())}
                            className="w-full px-2 py-1 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="p-2">
                          {branchOptions.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-2">
                              {catalogsLoading ? 'Cargando...' : 'Sin sucursales'}
                            </div>
                          ) : branchSearch && !branchOptions.some(b => b.label.toLowerCase().includes(branchSearch)) ? (
                            <div className="text-sm text-muted-foreground py-2">Sin resultados</div>
                          ) : (
                            branchOptions
                              .filter(option => !branchSearch || option.label.toLowerCase().includes(branchSearch))
                              .map((option) => (
                                <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                                  {option.label}
                                </SelectItem>
                              ))
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                    {formErrors.branchId && <p className="text-xs text-red-500">{formErrors.branchId}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Área/Departamento *</Label>
                    <Select
                      value={newHireForm.departmentId}
                      onValueChange={(value) => {
                        setNewHireForm({ ...newHireForm, departmentId: value });
                        setDepartmentSearch('');
                      }}
                      disabled={catalogsLoading}
                    >
                      <SelectTrigger className={formErrors.departmentId ? 'border-red-500' : ''}>
                        <SelectValue placeholder={catalogsLoading ? 'Cargando...' : 'Selecciona área'} />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" sideOffset={5} className="max-w-xs" position="popper" avoidCollisions={false}>
                        <div className="p-2 pb-0">
                          <input
                            type="text"
                            placeholder="Buscar área..."
                            value={departmentSearch}
                            onChange={(e) => setDepartmentSearch(e.target.value.toLowerCase())}
                            className="w-full px-2 py-1 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="p-2">
                          {departmentOptions.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-2">
                              {catalogsLoading ? 'Cargando...' : 'Sin áreas'}
                            </div>
                          ) : departmentSearch && !departmentOptions.some(d => d.label.toLowerCase().includes(departmentSearch)) ? (
                            <div className="text-sm text-muted-foreground py-2">Sin resultados</div>
                          ) : (
                            departmentOptions
                              .filter(option => !departmentSearch || option.label.toLowerCase().includes(departmentSearch))
                              .map((option) => (
                                <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                                  {option.label}
                                </SelectItem>
                              ))
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                    {formErrors.departmentId && <p className="text-xs text-red-500">{formErrors.departmentId}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Razón de la solicitud *</Label>
                    <Textarea
                      placeholder="Información relevante (contrato, dotación inicial, etc.)"
                      value={newHireForm.notes}
                      onChange={(e) => setNewHireForm({ ...newHireForm, notes: e.target.value })}
                      className={formErrors.notes ? 'border-red-500' : ''}
                    />
                    {formErrors.notes && <p className="text-xs text-red-500">{formErrors.notes}</p>}
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCreateRequestOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateNewHireRequest}
                      disabled={creatingRequest}
                    >
                      {creatingRequest ? 'Creando...' : 'Crear Solicitud'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as any); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="pending">Pendientes RRHH</TabsTrigger>
            <TabsTrigger value="process">En Proceso</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
          <TabsContent value={viewMode} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Buscar por código o contenido" className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Fecha de creación</div>
                <Input type="date" value={creationDateFilter} onChange={(e) => { setCreationDateFilter(e.target.value); setPage(1); }} />
              </div>
              {viewMode === 'history' && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Fecha de respuesta</div>
                  <Input type="date" value={responseDateFilter} onChange={(e) => { setResponseDateFilter(e.target.value); setPage(1); }} />
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No hay solicitudes</div>
            ) : (
              <>
                <div className="border rounded-lg bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Código</th>
                          <th className="text-left p-3 font-medium">Tipo</th>
                          <th className="text-left p-3 font-medium">Creación</th>
                          {viewMode === 'history' && (
                            <th className="text-left p-3 font-medium">Respuesta</th>
                          )}
                          <th className="text-left p-3 font-medium">Estado</th>
                          <th className="text-left p-3 font-medium">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayed.map((r) => (
                          <tr key={r.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-sm">{r.code}</td>
                            <td className="p-3">{getTypeLabel(r.type)}</td>
                            <td className="p-3">{new Date(r.createdAt).toLocaleDateString('es-ES')}</td>
                            {viewMode === 'history' && (
                              <td className="p-3">{new Date(r.updatedAt).toLocaleDateString('es-ES')}</td>
                            )}
                            <td className="p-3">{getStatusBadge(r.status)}</td>
                            <td className="p-3">
                              <Button variant="outline" size="sm" onClick={() => { setSelected(r); setDetailsOpen(true); }}>Ver más</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full mt-4">
                  <div className="flex-1" />
                  <span className="text-sm text-muted-foreground">Página {page} / {totalPages}</span>
                  <div className="flex-1 flex justify-end">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} limit={limit} onLimitChange={(l) => { setLimit(l); setPage(1); }} limits={[10,20,50]} />
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud</DialogTitle>
            <DialogDescription>Revisa y decide la acción</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">Código</div>
                  <div className="font-medium">{selected.code}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tipo</div>
                  <div className="font-medium">{getTypeLabel(selected.type)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fecha de creación</div>
                  <div className="font-medium">{new Date(selected.createdAt).toLocaleDateString('es-ES')}</div>
                </div>
                {viewMode === 'history' && (
                  <div>
                    <div className="text-muted-foreground">Fecha de respuesta</div>
                    <div className="font-medium">{new Date(selected.updatedAt).toLocaleDateString('es-ES')}</div>
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-2">Contenido</div>
                  {renderPayloadDetails(selected.type, selected.payload)}
                </div>
                {viewMode === 'history' && (selected.hrReason || selected.adminReason) && (
                  <div className="col-span-2 space-y-2">
                    <div>
                      <div className="text-muted-foreground">Razón de rechazo</div>
                      <div className="text-destructive bg-destructive/10 p-2 rounded-md">
                        {selected.hrReason || selected.adminReason}
                      </div>
                    </div>
                    {((selected.hrReason && selected.hrReviewer) || (selected.adminReason && selected.adminReviewer)) && (
                      <div>
                        <div className="text-muted-foreground">Rechazado por</div>
                        <div className="font-medium">
                          {selected.adminReason && selected.adminReviewer 
                            ? `${selected.adminReviewer.firstName} ${selected.adminReviewer.lastName}`
                            : selected.hrReviewer 
                            ? `${selected.hrReviewer.firstName} ${selected.hrReviewer.lastName}`
                            : 'No disponible'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {viewMode === 'pending' && (
                <>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleAccept(selected)} className="flex-1">Aceptar (Enviar a Sistemas)</Button>
                    <Button variant="destructive" onClick={() => handleReject(selected)} className="flex-1">Rechazar</Button>
                  </div>
                  <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Razón de rechazo (obligatoria para rechazar)" />
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </HumanResourcesLayout>
  );
};

export default HumanResourcesRequests;
