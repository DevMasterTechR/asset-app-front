import { useEffect, useState } from 'react';
import HumanResourcesLayout from '@/components/HumanResourcesLayout';
import { requestsApi, RequestItem, RequestStatus } from '@/api/requests';
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Estado para crear solicitud de equipo
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [creatingEquipment, setCreatingEquipment] = useState(false);
  const [equipmentForm, setEquipmentForm] = useState({
    personId: '',
    branchId: '',
    departmentId: '',
    equipmentNeeded: '',
  });
  
  // Opciones hardcodeadas (después se pueden obtener del backend)
  const branchOptions = [
    { value: '1', label: 'Matriz' },
    { value: '2', label: 'Carapungo' },
    { value: '3', label: 'Sucursal 3' },
    { value: '4', label: 'Sucursal 4' },
  ];

  const departmentOptions = [
    { value: '1', label: 'T.I.' },
    { value: '2', label: 'RRHH' },
    { value: '3', label: 'Importaciones' },
    { value: '4', label: 'Ventas' },
  ];

  const peopleOptions = [
    { value: '1', label: 'Juan Pérez (Juan.Perez@...)' },
    { value: '2', label: 'María García (Maria.Garcia@...)' },
    { value: '3', label: 'Carlos López (Carlos.Lopez@...)' },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      // Si está en pending, traer solo pendiente_rrhh
      // Si está en history, traer todo y filtrar localmente
      const data = await requestsApi.list();
      setRequests(data);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudieron cargar solicitudes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [viewMode]);

  const filtered = requests.filter((r) => {
    // Para RRHH:
    // - Pendientes: solo pendiente_rrhh
    // - Historial: aceptada, rechazada, rrhh_rechazada, pendiente_admin
    const isPending = r.status === 'pendiente_rrhh';
    const matchesView = viewMode === 'pending' ? isPending : !isPending;
    
    const search = searchTerm.toLowerCase();
    const matches = search === '' || r.code.toLowerCase().includes(search) || (r.payload && JSON.stringify(r.payload).toLowerCase().includes(search));
    return matchesView && matches;
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
      pendiente_rrhh: 'Pend. RRHH',
      rrhh_rechazada: 'Rechazada RRHH',
      pendiente_admin: 'Pend. Admin',
      aceptada: 'Aceptada',
      rechazada: 'Rechazada Admin',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const handleAccept = async (req: RequestItem) => {
    try {
      await requestsApi.acceptByHr(req.id, undefined);
      toast({ title: 'Éxito', description: 'Solicitud aceptada, enviada a Admin' });
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

    switch (type) {
      case 'equipment_replacement':
        return (
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Asset ID:</span>{' '}
              <span className="font-medium">{payload.assetId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Razón:</span>{' '}
              <span className="font-medium">{payload.reason || 'N/A'}</span>
            </div>
          </div>
        );
      case 'consumables':
        return (
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Consumible:</span>{' '}
              <span className="font-medium">{payload.consumible || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Razón:</span>{' '}
              <span className="font-medium">{payload.reason || 'N/A'}</span>
            </div>
          </div>
        );
      case 'equipment_request':
        return (
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Person ID:</span>{' '}
              <span className="font-medium">{payload.personId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sucursal ID:</span>{' '}
              <span className="font-medium">{payload.branchId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Departamento ID:</span>{' '}
              <span className="font-medium">{payload.departmentId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Equipos necesitados:</span>{' '}
              <span className="font-medium">{payload.equipmentNeeded || 'N/A'}</span>
            </div>
          </div>
        );
      default:
        return <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto max-h-40">{JSON.stringify(payload, null, 2)}</pre>;
    }
  };

  const handleCreateEquipmentRequest = async () => {
    if (!equipmentForm.personId || !equipmentForm.branchId || !equipmentForm.departmentId || !equipmentForm.equipmentNeeded.trim()) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    setCreatingEquipment(true);
    try {
      await requestsApi.create({
        type: 'equipment_request',
        payload: {
          personId: Number(equipmentForm.personId),
          branchId: Number(equipmentForm.branchId),
          departmentId: Number(equipmentForm.departmentId),
          equipmentNeeded: equipmentForm.equipmentNeeded,
        },
      });
      toast({
        title: 'Éxito',
        description: 'Solicitud de equipo creada correctamente',
      });
      setEquipmentForm({
        personId: '',
        branchId: '',
        departmentId: '',
        equipmentNeeded: '',
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
      setCreatingEquipment(false);
    }
  };

  return (
    <HumanResourcesLayout>
      <div className="p-6 md:pl-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Solicitudes (RRHH)</h1>
            <p className="text-muted-foreground mt-1">Revisión inicial y envío a Admin</p>
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
                  Solicitud de Equipo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nueva Solicitud de Equipo</DialogTitle>
                  <DialogDescription>
                    Crea una solicitud de equipo en nombre de un empleado
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Empleado</Label>
                    <Select
                      value={equipmentForm.personId}
                      onValueChange={(value) =>
                        setEquipmentForm({ ...equipmentForm, personId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {peopleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sucursal</Label>
                    <Select
                      value={equipmentForm.branchId}
                      onValueChange={(value) =>
                        setEquipmentForm({ ...equipmentForm, branchId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona sucursal" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Área/Departamento</Label>
                    <Select
                      value={equipmentForm.departmentId}
                      onValueChange={(value) =>
                        setEquipmentForm({ ...equipmentForm, departmentId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona área" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipment">Equipos solicitados</Label>
                    <Textarea
                      id="equipment"
                      placeholder="Describe los equipos que necesita el empleado..."
                      value={equipmentForm.equipmentNeeded}
                      onChange={(e) =>
                        setEquipmentForm({
                          ...equipmentForm,
                          equipmentNeeded: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCreateRequestOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateEquipmentRequest}
                      disabled={creatingEquipment}
                    >
                      {creatingEquipment ? 'Creando...' : 'Crear Solicitud'}
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
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
          <TabsContent value={viewMode} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Buscar por código o contenido" className="pl-10" />
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
                          <th className="text-left p-3 font-medium">Estado</th>
                          <th className="text-left p-3 font-medium">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayed.map((r) => (
                          <tr key={r.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-sm">{r.code}</td>
                            <td className="p-3">{r.type}</td>
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
                  <div className="font-medium">{selected.type}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-2">Contenido</div>
                  {renderPayloadDetails(selected.type, selected.payload)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => handleAccept(selected)} className="flex-1">Aceptar (Enviar a Admin)</Button>
                <Button variant="destructive" onClick={() => handleReject(selected)} className="flex-1">Rechazar</Button>
              </div>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Razón de rechazo (obligatoria para rechazar)" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </HumanResourcesLayout>
  );
};

export default HumanResourcesRequests;
