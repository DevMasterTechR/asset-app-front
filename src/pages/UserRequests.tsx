import { useState, useEffect } from "react";
import UserLayout from "@/components/UserLayout";
import Pagination from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Loader2, Search, Plus, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface Request {
  id: string;
  code: string;
  type: 'equipment-replacement' | 'consumables' | 'equipment-request';
  equipment?: string;
  consumable?: string;
  reason?: string;
  // Campos para solicitud de equipo
  ci?: string;
  firstName?: string;
  lastName?: string;
  branchId?: string;
  departmentId?: string;
  equipmentNeeded?: string;
  // Motivo de rechazo (cuando status === 'rejected')
  rejectionReason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

const UserRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [openDialog, setOpenDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState({ open: false, reason: '' });
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; request: Request | null }>({ open: false, request: null });

  // Form state
  const [formData, setFormData] = useState({
    type: 'equipment-replacement',
    equipment: '',
    consumable: '',
    reason: '',
    ci: '',
    firstName: '',
    lastName: '',
    branchId: '',
    departmentId: '',
    equipmentNeeded: '',
  });

  const equipmentOptions = [
    { value: 'laptop', label: 'Laptop' },
    { value: 'telefono', label: 'Teléfono' },
    { value: 'monitor', label: 'Monitor' },
    { value: 'teclado', label: 'Teclado' },
    { value: 'mouse', label: 'Mouse' },
  ];

  const consumableOptions = [
    { value: 'cable-ethernet', label: 'Cable Ethernet' },
    { value: 'tintas', label: 'Tintas' },
    { value: 'toner', label: 'Tóner' },
    { value: 'conector-rj45', label: 'Conector RJ45' },
    { value: 'regleta', label: 'Regleta' },
  ];

  const branchOptions = [
    { value: 'matriz', label: 'Matriz' },
    { value: 'carapungo', label: 'Carapungo' },
  ];

  const departmentOptions = [
    { value: 'ti', label: 'T.I.' },
    { value: 'rrhh', label: 'RRHH' },
    { value: 'importaciones', label: 'Importaciones' },
  ];

  const generateRequestCode = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `SOL-${year}${month}${day}-${random}`;
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      // Por ahora usamos datos mock, cuando tengamos la API lo cambiaremos
      const mockRequests: Request[] = [
        // Pendientes - Un ejemplo de cada tipo
        {
          id: '1',
          code: 'SOL-20251223-0001',
          type: 'equipment-request',
          ci: '1234567890',
          firstName: 'Juan',
          lastName: 'Pérez',
          branchId: 'matriz',
          departmentId: 'ti',
          equipmentNeeded: 'Laptop Dell i5, Mouse inalámbrico, Teclado mecánico',
          status: 'pending',
          createdAt: new Date(2025, 11, 23, 9, 15).toISOString(),
        },
        {
          id: '2',
          code: 'SOL-20251223-0002',
          type: 'equipment-replacement',
          equipment: 'laptop',
          reason: 'La batería no carga correctamente y el equipo se apaga constantemente',
          status: 'pending',
          createdAt: new Date(2025, 11, 22, 14, 45).toISOString(),
        },
        {
          id: '3',
          code: 'SOL-20251223-0003',
          type: 'consumables',
          consumable: 'cable-ethernet',
          reason: 'Cable dañado, necesito reemplazo urgente para conexión de red',
          status: 'pending',
          createdAt: new Date(2025, 11, 21, 11, 20).toISOString(),
        },
        // Historial - Una aprobada y una rechazada
        {
          id: '4',
          code: 'SOL-20251220-0004',
          type: 'equipment-replacement',
          equipment: 'monitor',
          reason: 'Monitor con pantalla rota, imposible de usar',
          status: 'approved',
          createdAt: new Date(2025, 11, 20, 8, 10).toISOString(),
          updatedAt: new Date(2025, 11, 21, 16, 25).toISOString(),
        },
        {
          id: '5',
          code: 'SOL-20251219-0005',
          type: 'consumables',
          consumable: 'tintas',
          reason: 'Solicitud de tintas para impresora de área',
          rejectionReason: 'La solicitud no fue considerada por falta de stock y prioridad operativa. Se revisará en el próximo periodo.',
          status: 'rejected',
          createdAt: new Date(2025, 11, 19, 10, 5).toISOString(),
          updatedAt: new Date(2025, 11, 20, 12, 40).toISOString(),
        },
      ];
      setRequests(mockRequests);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las solicitudes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user?.id]);

  const handleSubmitRequest = () => {
    // Validaciones según el tipo
    if (formData.type === 'equipment-request') {
      if (!formData.ci || !formData.firstName || !formData.lastName || !formData.branchId || !formData.departmentId || !formData.equipmentNeeded) {
        toast({
          title: 'Error',
          description: 'Todos los campos son obligatorios para solicitud de equipo',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!formData.reason || !formData.reason.trim()) {
        toast({
          title: 'Error',
          description: 'Debes ingresar una razón o inconveniente',
          variant: 'destructive',
        });
        return;
      }

      if (formData.type === 'equipment-replacement' && !formData.equipment) {
        toast({
          title: 'Error',
          description: 'Debes seleccionar un equipo',
          variant: 'destructive',
        });
        return;
      }

      if (formData.type === 'consumables' && !formData.consumable) {
        toast({
          title: 'Error',
          description: 'Debes seleccionar un consumible',
          variant: 'destructive',
        });
        return;
      }
    }

    const newRequest: Request = {
      id: String(Date.now()),
      code: generateRequestCode(),
      type: formData.type as any,
      equipment: formData.equipment || undefined,
      consumable: formData.consumable || undefined,
      reason: formData.reason || undefined,
      ci: formData.ci || undefined,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      branchId: formData.branchId || undefined,
      departmentId: formData.departmentId || undefined,
      equipmentNeeded: formData.equipmentNeeded || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setRequests([newRequest, ...requests]);
    setFormData({ 
      type: 'equipment-replacement', 
      equipment: '', 
      consumable: '', 
      reason: '',
      ci: '',
      firstName: '',
      lastName: '',
      branchId: '',
      departmentId: '',
      equipmentNeeded: '',
    });
    setOpenDialog(false);
    setPage(1);

    toast({
      title: 'Éxito',
      description: 'Solicitud enviada correctamente',
    });
  };

  const filteredRequests = requests.filter((r) => {
    const matchesView = viewMode === 'pending' ? r.status === 'pending' : r.status !== 'pending';
    const search = searchTerm.toLowerCase();
    const matchesSearch = search === '' ||
      r.code.toLowerCase().includes(search) ||
      (r.reason?.toLowerCase().includes(search) || false) ||
      (r.equipment?.toLowerCase().includes(search) || false) ||
      (r.consumable?.toLowerCase().includes(search) || false);
    return matchesView && matchesSearch;
  });

  const displayedRequests = filteredRequests.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredRequests.length / limit);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || 'Desconocido'}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'equipment-replacement': 'Reemplazo de Equipo',
      'consumables': 'Pedido de Consumibles',
      'equipment-request': 'Solicitud de Equipo'
    };
    return labels[type] || type;
  };

  const getEquipmentLabel = (equipment?: string) => {
    if (!equipment) return '-';
    return equipmentOptions.find(e => e.value === equipment)?.label || equipment;
  };

  const getConsumableLabel = (consumable?: string) => {
    if (!consumable) return '-';
    return consumableOptions.find(c => c.value === consumable)?.label || consumable;
  };

  const getBranchLabel = (branchId?: string) => {
    if (!branchId) return '-';
    return branchOptions.find(b => b.value === branchId)?.label || branchId;
  };

  const getDepartmentLabel = (departmentId?: string) => {
    if (!departmentId) return '-';
    return departmentOptions.find(d => d.value === departmentId)?.label || departmentId;
  };

  const getItemLabel = (req: Request) => {
    if (req.type === 'equipment-replacement') {
      return getEquipmentLabel(req.equipment);
    } else if (req.type === 'consumables') {
      return getConsumableLabel(req.consumable);
    } else if (req.type === 'equipment-request') {
      return `${req.firstName} ${req.lastName}`;
    }
    return '-';
  };

  return (
    <UserLayout>
      <div className="p-6 md:pl-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Solicitudes</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tus solicitudes de reemplazo de equipo y consumibles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadRequests} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Solicitud
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nueva Solicitud</DialogTitle>
                  <DialogDescription>
                    Completa el formulario para enviar una nueva solicitud
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Tipo de Solicitud */}
                  <div className="space-y-2">
                    <Label htmlFor="request-type">Tipo de Solicitud</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ 
                          type: value, 
                          equipment: '', 
                          consumable: '',
                          reason: '',
                          ci: '',
                          firstName: '',
                          lastName: '',
                          branchId: '',
                          departmentId: '',
                          equipmentNeeded: '',
                        })
                      }
                    >
                      <SelectTrigger id="request-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment-request">Solicitud de Equipo</SelectItem>
                        <SelectItem value="equipment-replacement">Reemplazo de Equipo</SelectItem>
                        <SelectItem value="consumables">Pedido de Consumibles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Solicitud de Equipo */}
                  {formData.type === 'equipment-request' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="ci">CI (Cédula de Identidad)</Label>
                        <Input
                          id="ci"
                          placeholder="Ej: 12345678"
                          value={formData.ci}
                          onChange={(e) =>
                            setFormData({ ...formData, ci: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="firstName">Nombres</Label>
                        <Input
                          id="firstName"
                          placeholder="Nombres completos"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Apellidos</Label>
                        <Input
                          id="lastName"
                          placeholder="Apellidos completos"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="branch">Sucursal</Label>
                        <Select
                          value={formData.branchId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, branchId: value })
                          }
                        >
                          <SelectTrigger id="branch">
                            <SelectValue placeholder="Selecciona una sucursal" />
                          </SelectTrigger>
                          <SelectContent>
                            {branchOptions.map((branch) => (
                              <SelectItem key={branch.value} value={branch.value}>
                                {branch.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">Área</Label>
                        <Select
                          value={formData.departmentId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, departmentId: value })
                          }
                        >
                          <SelectTrigger id="department">
                            <SelectValue placeholder="Selecciona un área" />
                          </SelectTrigger>
                          <SelectContent>
                            {departmentOptions.map((dept) => (
                              <SelectItem key={dept.value} value={dept.value}>
                                {dept.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="equipmentNeeded">Equipos que necesita</Label>
                        <Textarea
                          id="equipmentNeeded"
                          placeholder="Describe los equipos que necesitas..."
                          value={formData.equipmentNeeded}
                          onChange={(e) =>
                            setFormData({ ...formData, equipmentNeeded: e.target.value })
                          }
                          className="min-h-24"
                        />
                      </div>
                    </>
                  )}

                  {/* Equipo (solo si es reemplazo) */}
                  {formData.type === 'equipment-replacement' && (
                    <div className="space-y-2">
                      <Label htmlFor="equipment">Selecciona tu Equipo</Label>
                      <Select
                        value={formData.equipment}
                        onValueChange={(value) =>
                          setFormData({ ...formData, equipment: value })
                        }
                      >
                        <SelectTrigger id="equipment">
                          <SelectValue placeholder="Elige un equipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Consumible (solo si es consumibles) */}
                  {formData.type === 'consumables' && (
                    <div className="space-y-2">
                      <Label htmlFor="consumable">Selecciona el Consumible</Label>
                      <Select
                        value={formData.consumable}
                        onValueChange={(value) =>
                          setFormData({ ...formData, consumable: value })
                        }
                      >
                        <SelectTrigger id="consumable">
                          <SelectValue placeholder="Elige un consumible" />
                        </SelectTrigger>
                        <SelectContent>
                          {consumableOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Razón (para reemplazo y consumibles) */}
                  {(formData.type === 'equipment-replacement' || formData.type === 'consumables') && (
                    <div className="space-y-2">
                      <Label htmlFor="reason">Razón o Inconveniente</Label>
                      <Textarea
                        id="reason"
                        placeholder="Explica por qué necesitas este cambio o qué problema tienes..."
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({ ...formData, reason: e.target.value })
                        }
                        className="min-h-24"
                      />
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setOpenDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitRequest}>
                      Enviar Solicitud
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Requests Table */}
        <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as 'pending' | 'history'); setPage(1); }} className="w-full">
          <TabsList>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value={viewMode} className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por código, tipo, equipo, consumible o razón..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : displayedRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {viewMode === 'pending'
                  ? 'No tienes solicitudes pendientes.'
                  : 'No hay historial de solicitudes.'}
              </div>
            ) : (
              <>
                <div className="border rounded-lg bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Código</th>
                          <th className="text-left p-3 font-medium">Tipo</th>
                          <th className="text-left p-3 font-medium">Item</th>
                          <th className="text-left p-3 font-medium">Fecha Solicitud</th>
                          {viewMode === 'history' && (
                            <th className="text-left p-3 font-medium">Fecha Respuesta</th>
                          )}
                          <th className="text-left p-3 font-medium">Estado</th>
                          {viewMode === 'pending' ? (
                            <th className="text-left p-3 font-medium">Acción</th>
                          ) : (
                            <th className="text-left p-3 font-medium">Razón</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRequests.map((req) => (
                          <tr key={req.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-sm">{req.code}</td>
                            <td className="p-3">{getTypeLabel(req.type)}</td>
                            <td className="p-3">{getItemLabel(req)}</td>
                            <td className="p-3">
                              {viewMode === 'pending'
                                ? new Date(req.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                                : new Date(req.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            {viewMode === 'history' && (
                              <td className="p-3">
                                {req.updatedAt
                                  ? new Date(req.updatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                                  : '-'}
                              </td>
                            )}
                            <td className="p-3">{getStatusBadge(req.status)}</td>
                            {viewMode === 'pending' ? (
                              <td className="p-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDetailsDialog({ open: true, request: req })}
                                >
                                  Ver más
                                </Button>
                              </td>
                            ) : (
                              <td className="p-3">
                                {req.status === 'rejected' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setRejectDialog({ open: true, reason: req.rejectionReason || 'Motivo no especificado.' })
                                    }
                                  >
                                    Ver razón
                                  </Button>
                                ) : req.status === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 text-green-600">
                                    <Check className="h-4 w-4" />
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {displayedRequests.length > 0 && (
                  <div className="flex items-center gap-4 w-full mt-4">
                    <div className="flex-1" />
                    <span className="text-sm text-muted-foreground text-center">Página {page} / {totalPages}</span>
                    <div className="flex-1 flex justify-end">
                      <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        limit={limit}
                        onLimitChange={(l) => { setLimit(l); setPage(1); }}
                        limits={[5, 10, 15, 20]}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog Razón de Rechazo */}
        <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Razón del rechazo</DialogTitle>
              <DialogDescription>
                Detalle del motivo proporcionado por el área responsable.
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm whitespace-pre-wrap">
              {rejectDialog.reason || 'Motivo no especificado.'}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setRejectDialog({ open: false, reason: '' })}>Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Detalle de Solicitud (Pendientes) */}
        <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog((prev) => ({ ...prev, open }))}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de solicitud</DialogTitle>
              <DialogDescription>
                Revisa la información completa de tu solicitud.
              </DialogDescription>
            </DialogHeader>
            {detailsDialog.request && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground">Código</div>
                    <div className="font-medium">{detailsDialog.request.code}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tipo</div>
                    <div className="font-medium">{getTypeLabel(detailsDialog.request.type)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Estado</div>
                    <div className="font-medium">{getStatusBadge(detailsDialog.request.status)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Fecha</div>
                    <div className="font-medium">{new Date(detailsDialog.request.createdAt).toLocaleDateString('es-ES', { year:'numeric', month:'2-digit', day:'2-digit' })}</div>
                  </div>
                </div>

                {detailsDialog.request.type === 'equipment-request' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-muted-foreground">CI</div>
                        <div className="font-medium">{detailsDialog.request.ci || '-'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sucursal</div>
                        <div className="font-medium">{getBranchLabel(detailsDialog.request.branchId)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Nombres</div>
                        <div className="font-medium">{detailsDialog.request.firstName || '-'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Área</div>
                        <div className="font-medium">{getDepartmentLabel(detailsDialog.request.departmentId)}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-muted-foreground">Apellidos</div>
                        <div className="font-medium">{detailsDialog.request.lastName || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Equipos que necesita</div>
                      <div className="font-medium whitespace-pre-wrap">{detailsDialog.request.equipmentNeeded || '-'}</div>
                    </div>
                  </div>
                )}

                {detailsDialog.request.type === 'equipment-replacement' && (
                  <div className="space-y-2">
                    <div>
                      <div className="text-muted-foreground">Equipo</div>
                      <div className="font-medium">{getEquipmentLabel(detailsDialog.request.equipment)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Razón</div>
                      <div className="font-medium whitespace-pre-wrap">{detailsDialog.request.reason || '-'}</div>
                    </div>
                  </div>
                )}

                {detailsDialog.request.type === 'consumables' && (
                  <div className="space-y-2">
                    <div>
                      <div className="text-muted-foreground">Consumible</div>
                      <div className="font-medium">{getConsumableLabel(detailsDialog.request.consumable)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Razón</div>
                      <div className="font-medium whitespace-pre-wrap">{detailsDialog.request.reason || '-'}</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setDetailsDialog({ open: false, request: null })}>Cerrar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </UserLayout>
  );
};

export default UserRequests;
