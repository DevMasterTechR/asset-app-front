import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "@/components/UserLayout";
import DevicesSummaryModal from '@/components/DevicesSummaryModal';
import Pagination from "@/components/Pagination";
import { assignmentsApi } from "@/api/assignments";
import { extractArray } from "@/lib/extractData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Loader2, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);
  const [searchTerm, setSearchTerm] = useState("");
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryCodes, setSummaryCodes] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);

  const parseDateSafe = (value?: string) => {
    if (!value) return null;
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const parts = value.split(/[\/\-]/).map(Number);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      const year = c;
      const month = a > 12 ? b : a;
      const day = a > 12 ? a : b;
      const alt = new Date(year, month - 1, day);
      if (!Number.isNaN(alt.getTime())) return alt;
    }
    return null;
  };

  const isOlderThanFiveYears = (purchaseDate?: string) => {
    const date = parseDateSafe(purchaseDate);
    if (!date) return false;
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - 5);
    return date <= threshold;
  };

  const oldAssetClass = "text-red-700 font-semibold animate-[pulse_0.9s_ease-in-out_infinite]";

  const loadData = async () => {
    setLoading(true);
    try {
      const myAssignmentsRes = await assignmentsApi.getMyAssignments();
      const userAssignments = extractArray<any>(myAssignmentsRes) || [];

      // Mapear asignaciones con información del dispositivo
      const myAssignmentsData = userAssignments.map((a: any) => {
        const device = a.asset;
        return {
          id: a.id,
          assetId: a.assetId,
          assetCode: device?.assetCode || '',
          type: device?.assetType || device?.type || '',
          brand: device?.brand || '',
          model: device?.model || '',
          serialNumber: device?.serialNumber || '',
          assignmentDate: a.assignmentDate,
          returnDate: a.returnDate,
          deliveryCondition: a.deliveryCondition,
          returnCondition: a.returnCondition,
          deliveryNotes: a.deliveryNotes,
          returnNotes: a.returnNotes,
          status: device?.status === 'loaned' ? 'Prestado' : device?.status || '',
        };
      });

      setMyAssignments(myAssignmentsData);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  // Use tokens + normalization for assignments search as well
  const filteredAssignments = myAssignments.filter((a) => {
    const hasReturn = !!a.returnDate;
    const matchesView = viewMode === 'active' ? !hasReturn : hasReturn;
    const search = (searchTerm || '').toString().trim().toLowerCase();
    if (!matchesView) return false;
    if (!search) return true;

    const tokens = search.split(/\s+/).filter(Boolean);

    // if query is numeric-only or prefixed with code:, search only assetCode
    const codeOnlyMatch = search.match(/^\s*(?:code:)??\s*([0-9]+)\s*$/i);
    if (codeOnlyMatch) {
      const q = codeOnlyMatch[1].replace(/[^0-9]/g, '');
      return (a.assetCode || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').includes(q);
    }

    // support type: prefix to search only by type
    const typePrefix = search.match(/^\s*type:\s*(.+)$/i);
    if (typePrefix) {
      const q = typePrefix[1].toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return (a.type || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').includes(q);
    }

    const fields = [
      a.assetCode,
      a.type,
      a.brand,
      a.model,
    ].map(f => (f || '').toString().toLowerCase());
    const normalizedFields = fields.map(f => f.replace(/[^a-z0-9]/g, ''));

    return tokens.every((t) => {
      const normT = t.replace(/[^a-z0-9]/g, '');
      return fields.some(f => f.includes(t)) || normalizedFields.some(f => f.includes(normT));
    });
  });

  const displayedAssignments = filteredAssignments.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredAssignments.length / limit);

  const handleViewSummary = (codes: string[]) => {
    setSummaryCodes(codes);
    setSummaryOpen(true);
  };

  return (
    <UserLayout>
      <div className="p-6 md:pl-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mis Asignaciones</h1>
            <p className="text-muted-foreground mt-1">
              Equipos asignados e historial de asignaciones
            </p>
          </div>
          <Button onClick={loadData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* My Assignments Table */}
        <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as 'active' | 'history'); setPage(1); }} className="w-full">
          <TabsList>
            <TabsTrigger value="active">Mis Equipos Activos</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value={viewMode} className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por código, tipo, marca, modelo..."
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
            ) : displayedAssignments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {viewMode === 'active'
                  ? 'No tienes equipos asignados actualmente.'
                  : 'No hay historial de asignaciones.'}
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
                          <th className="text-left p-3 font-medium">Marca</th>
                          <th className="text-left p-3 font-medium">Modelo</th>
                          <th className="text-left p-3 font-medium">Serial</th>
                          <th className="text-left p-3 font-medium">Fecha Asignación</th>
                          {viewMode === 'history' && (
                            <th className="text-left p-3 font-medium">Fecha Devolución</th>
                          )}
                          {viewMode === 'active' && (
                            <th className="text-left p-3 font-medium">Acción</th>
                          )}
                          {viewMode === 'history' && (
                            <th className="text-left p-3 font-medium">Acción</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedAssignments.map((a) => (
                          <tr key={a.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-sm">{a.assetCode || '-'}</td>
                            <td className="p-3">{a.type || '-'}</td>
                            <td className="p-3">{a.brand || '-'}</td>
                            <td className="p-3">{a.model || '-'}</td>
                            <td className="p-3 font-mono text-xs">{a.serialNumber || '-'}</td>
                            <td className="p-3">
                              {a.assignmentDate
                                ? new Date(a.assignmentDate).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })
                                : '-'}
                            </td>
                            {viewMode === 'history' && (
                              <td className="p-3">
                                {a.returnDate
                                  ? new Date(a.returnDate).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  })
                                  : '-'}
                              </td>
                            )}
                            {viewMode === 'active' && (
                              <td className="p-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setSelectedAssignment(a); setDetailsOpen(true); }}
                                >
                                  Ver más
                                </Button>
                              </td>
                            )}
                            {viewMode === 'history' && (
                              <td className="p-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setSelectedAssignment(a); setDetailsOpen(true); }}
                                >
                                  Ver más
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {displayedAssignments.length > 0 && (
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
      </div>

      {/* Modals */}
      <DevicesSummaryModal
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        codes={summaryCodes}
      />

      {/* Detalle de Asignación */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de asignación</DialogTitle>
            <DialogDescription>
              Información completa del equipo asignado.
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">Código</div>
                  <div className="font-medium">{selectedAssignment.assetCode || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Serial</div>
                  <div className="font-medium">{selectedAssignment.serialNumber || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tipo</div>
                  <div className="font-medium">{selectedAssignment.type || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Marca</div>
                  <div className="font-medium">{selectedAssignment.brand || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Modelo</div>
                  <div className="font-medium">{selectedAssignment.model || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Estado</div>
                  <div className="font-medium">{(() => {
                    const map: Record<string, string> = {
                      assigned: 'Asignado',
                      available: 'Disponible',
                      maintenance: 'Mantenimiento',
                      decommissioned: 'Baja',
                    };
                    const key = String(selectedAssignment.status || '').toLowerCase();
                    return map[key] || (selectedAssignment.status || '-');
                  })()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Estado Acta</div>
                  <div className="font-medium">{(() => {
                    const map: Record<string, string> = {
                      no_generada: 'No generada',
                      acta_generada: 'Acta generada',
                      firmada: 'Firmada',
                    };
                    return map[selectedAssignment.actaStatus || 'no_generada'] || 'No generada';
                  })()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Estado de asignación</div>
                  <div className="font-medium">{selectedAssignment.returnDate ? 'Devuelto' : 'Entregado'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fecha Asignación</div>
                  <div className="font-medium">{selectedAssignment.assignmentDate ? new Date(selectedAssignment.assignmentDate).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</div>
                </div>
                {selectedAssignment.returnDate && (
                  <div>
                    <div className="text-muted-foreground">Fecha Devolución</div>
                    <div className="font-medium">{new Date(selectedAssignment.returnDate).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground">Condición de Entrega</div>
                <div className="font-medium whitespace-pre-wrap">{(() => {
                  const map: Record<string, string> = { good: 'Bueno', fair: 'Regular', poor: 'Malo', excellent: 'Excelente', damaged: 'Dañado' };
                  const key = String(selectedAssignment.deliveryCondition || '').toLowerCase();
                  return map[key] || selectedAssignment.deliveryCondition || '-';
                })()}</div>
              </div>
              {selectedAssignment.returnDate && (
                <div>
                  <div className="text-muted-foreground">Notas de Entrega</div>
                  <div className="font-medium whitespace-pre-wrap">{selectedAssignment.deliveryNotes || '-'}</div>
                </div>
              )}
              {selectedAssignment.returnDate && (
                <>
                  {selectedAssignment.returnCondition && (
                    <div>
                      <div className="text-muted-foreground">Condición de Devolución</div>
                      <div className="font-medium whitespace-pre-wrap">{(() => {
                        const map: Record<string, string> = { good: 'Bueno', fair: 'Regular', poor: 'Malo', excellent: 'Excelente', damaged: 'Dañado' };
                        const key = String(selectedAssignment.returnCondition || '').toLowerCase();
                        return map[key] || selectedAssignment.returnCondition;
                      })()}</div>
                    </div>
                  )}
                  {selectedAssignment.returnNotes && String(selectedAssignment.returnNotes).trim() !== '' && (
                    <div>
                      <div className="text-muted-foreground">Notas de Devolución</div>
                      <div className="font-medium whitespace-pre-wrap">{selectedAssignment.returnNotes}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
};

export default UserDashboard;
