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
import { requestsApi, RequestItem } from "@/api/requests";
import { assetsApi } from "@/api/devices";


interface UserAsset {
  id: number;
  assetCode: string;
  assetType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: string;
  purchaseDate?: string;
}

const UserRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [openDialog, setOpenDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'equipment_replacement',
    equipmentId: '',
    reason: '',
  });

  const consumableOptions = [
    { value: 'cable-ethernet', label: 'Cable Ethernet' },
    { value: 'tintas', label: 'Tintas' },
    { value: 'toner', label: 'Tóner' },
    { value: 'conector-rj45', label: 'Conector RJ45' },
    { value: 'regleta', label: 'Regleta' },
    { value: 'poder-strip', label: 'Regleta de Poder' },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, assets] = await Promise.all([
        requestsApi.list(),
        assetsApi.getUserAssets?.() || Promise.resolve([]),
      ]);
      console.log('[UserRequests] Requests loaded:', reqs);
      console.log('[UserRequests] Assets loaded:', assets);
      console.log('[UserRequests] Assets is array?', Array.isArray(assets));
      setRequests(Array.isArray(reqs) ? reqs : []);
      setUserAssets(Array.isArray(assets) ? assets : []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
      // Asegurar que los estados sean arrays vacíos en caso de error
      setRequests([]);
      setUserAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleSubmitRequest = async () => {
    if (!formData.equipmentId || !formData.reason.trim()) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        formData.type === 'equipment_replacement'
          ? {
              assetId: Number(formData.equipmentId),
              reason: formData.reason,
            }
          : {
              consumible: formData.equipmentId,
              reason: formData.reason,
            };

      await requestsApi.create({
        type: formData.type as any,
        payload,
      });

      toast({
        title: 'Éxito',
        description: 'Solicitud enviada correctamente',
      });

      setFormData({
        type: 'equipment_replacement',
        equipmentId: '',
        reason: '',
      });
      setOpenDialog(false);
      loadData();
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      
      let errorMessage = 'No se pudo enviar la solicitud';
      
      // Intentar obtener el mensaje de error del servidor
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    // Estados pendientes: pendiente_rrhh, pendiente_admin
    // Estados finalizados: aceptada, rechazada, rrhh_rechazada
    const isPending = r.status === 'pendiente_rrhh' || r.status === 'pendiente_admin';
    const matchesView = viewMode === 'pending' ? isPending : !isPending;
    
    const search = searchTerm.toLowerCase();
    const matches = search === '' ||
      r.code.toLowerCase().includes(search) ||
      (JSON.stringify(r.payload).toLowerCase().includes(search) || false);
    return matchesView && matches;
  });

  const displayedRequests = filteredRequests.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredRequests.length / limit);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pendiente_rrhh': 'bg-yellow-100 text-yellow-800',
      'rrhh_rechazada': 'bg-red-100 text-red-800',
      'pendiente_admin': 'bg-blue-100 text-blue-800',
      'aceptada': 'bg-green-100 text-green-800',
      'rechazada': 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      'pendiente_rrhh': 'Pendiente',
      'rrhh_rechazada': 'Rechazada',
      'pendiente_admin': 'Pendiente',
      'aceptada': 'Aceptada',
      'rechazada': 'Rechazada',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pendiente_rrhh}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getRejectReason = (req: RequestItem | null) => {
    if (!req) return '';
    if (req.status === 'rrhh_rechazada') return req.hrReason || 'Rechazada por RRHH.';
    if (req.status === 'rechazada') return req.adminReason || 'Rechazada por Sistemas.';
    return req.adminReason || req.hrReason || '';
  };

  const isRejected = selectedRequest?.status === 'rrhh_rechazada' || selectedRequest?.status === 'rechazada';

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      equipment_replacement: 'Reemplazo de equipo',
      consumables: 'Consumibles',
      equipment_request: 'Solicitud de equipo',
      new_employee: 'Nuevo trabajador',
    };
    return map[type] || type;
  };

  const renderPayloadReadable = (type: string, payload: any) => {
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

  return (
    <UserLayout>
      <div className="p-6 md:pl-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mis Solicitudes</h1>
            <p className="text-muted-foreground mt-1">
              Reemplazo de equipos y pedido de consumibles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={loadData}
              variant="outline"
              className="gap-2"
              disabled={loading}
            >
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nueva Solicitud</DialogTitle>
                  <DialogDescription>
                    Selecciona un tipo de solicitud
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Solicitud</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value, equipmentId: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment_replacement">
                          Reemplazo de Equipo
                        </SelectItem>
                        <SelectItem value="consumables">
                          Pedido de Consumibles
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {formData.type === "equipment_replacement"
                        ? "Equipo"
                        : "Consumible"}
                    </Label>
                    <Select
                      value={formData.equipmentId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, equipmentId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.type === "equipment_replacement" ? (
                          Array.isArray(userAssets) && userAssets.length > 0 ? (
                            userAssets.map((asset) => (
                              <SelectItem key={asset.id} value={String(asset.id)}>
                                {asset.assetCode} - {asset.assetType}
                                {asset.brand && ` (${asset.brand})`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-assets" disabled>
                              No tienes equipos asignados
                            </SelectItem>
                          )
                        ) : (
                          consumableOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Razón / Descripción</Label>
                    <Textarea
                      id="reason"
                      placeholder="Describe el problema o necesidad"
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                    />
                  </div>

                  <Button
                    onClick={handleSubmitRequest}
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Enviando..." : "Enviar Solicitud"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs
          value={viewMode}
          onValueChange={(v) => {
            setViewMode(v as any);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
          <TabsContent value={viewMode} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por código"
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : displayedRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay solicitudes
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
                          <th className="text-left p-3 font-medium">Estado</th>
                          <th className="text-left p-3 font-medium">Creada</th>
                          <th className="text-left p-3 font-medium">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRequests.map((r) => (
                          <tr key={r.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-sm">{r.code}</td>
                            <td className="p-3 text-sm">{getTypeLabel(r.type)}</td>
                            <td className="p-3">{getStatusBadge(r.status)}</td>
                            <td className="p-3 text-sm">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(r);
                                  setDetailsOpen(true);
                                }}
                              >
                                Ver más
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {displayedRequests.length > 0 && (
                  <div className="flex items-center gap-4 w-full mt-4">
                    <div className="flex-1" />
                    <span className="text-sm text-muted-foreground">
                      Página {page} / {totalPages}
                    </span>
                    <div className="flex-1 flex justify-end">
                      <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        limit={limit}
                        onLimitChange={(l) => {
                          setLimit(l);
                          setPage(1);
                        }}
                        limits={[5, 10, 15, 20]}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <Dialog
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) setSelectedRequest(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de solicitud</DialogTitle>
              <DialogDescription>Resumen y motivo</DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground">Código</div>
                    <div className="font-medium">{selectedRequest.code}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Estado</div>
                    <div className="font-medium">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tipo</div>
                    <div className="font-medium">{getTypeLabel(selectedRequest.type)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Creada</div>
                    <div className="font-medium">{new Date(selectedRequest.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {isRejected && (
                  <div>
                    <div className="text-muted-foreground">Razón de rechazo</div>
                    <div className="font-medium whitespace-pre-line">{getRejectReason(selectedRequest)}</div>
                  </div>
                )}

                <div>
                  <div className="text-muted-foreground mb-1">Contenido</div>
                  {renderPayloadReadable(selectedRequest.type, selectedRequest.payload)}
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
