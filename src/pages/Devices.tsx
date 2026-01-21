// src/pages/Devices.tsx
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Laptop,
  Smartphone,
  Mouse,
  Keyboard,
  Monitor,
  Server,
  Tablet,
  Download,
  Printer,
  Shield,
} from 'lucide-react';
import { devicesApi, Device, CreateDeviceDto } from '@/api/devices';
import { peopleApi } from '@/api/people';
import * as catalogsApi from '@/api/catalogs';
import { loansApi } from '@/api/loans';
import { sortByString, sortPeopleByName, sortBranchesByName } from '@/lib/sort';
import { extractArray } from '@/lib/extractData';
import { useSort } from '@/lib/useSort';
import DeviceFormModal from '@/components/DeviceFormModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import PreviewDevicesReportModal from '@/reports/PreviewDevicesReportModal';
import { Person } from '@/data/mockDataExtended';

// Calcula la diferencia en días entre dos fechas
const diffDays = (from: string, to: string) => {
  try {
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return 0;
  }
};

const statusVariantMap = {
  available: 'success' as const,
  assigned: 'default' as const,
  loaned: 'secondary' as const,
  maintenance: 'warning' as const,
  decommissioned: 'destructive' as const,
};

const statusLabelMap = {
  available: 'Disponible',
  assigned: 'Asignado',
  loaned: 'Prestado',
  maintenance: 'Mantenimiento',
  decommissioned: 'Dado de baja',
};

const typeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  laptop: Laptop,
  smartphone: Smartphone,
  tablet: Tablet,
  mouse: Mouse,
  keyboard: Keyboard,
  monitor: Monitor,
  server: Server,
  printer: Printer,
  security: Shield,
};

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

function DevicesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [previewOpen, setPreviewOpen] = useState(false);
  // Estado para mostrar alerta de préstamo próximo a caducar
  const [loanAlert, setLoanAlert] = useState<string | null>(null);

  // Helper para detectar si un equipo tiene préstamo activo
  const hasActiveLoan = (assetId: number) => {
    return loans.some(l => l.assetId === assetId && !l.returnDate);
  };

  // Helper para obtener el estado actual (asignado vs préstamo)
  const getStatus = (device: Device) => {
    if ((device.status as any) === 'loaned') {
      return 'loaned';
    }
    return device.status;
  };

  // Actualizar el mapa de etiquetas
  const getStatusLabel = (device: Device) => {
    const status = getStatus(device);
    return statusLabelMap[status as keyof typeof statusLabelMap] || status;
  };

  // Actualizar el mapa de variantes
  const getStatusVariant = (device: Device) => {
    const status = getStatus(device);
    return statusVariantMap[status as keyof typeof statusVariantMap] || 'default' as const;
  };

  useEffect(() => {
        // Verificar si hay algún dispositivo con préstamo próximo a caducar
        const now = new Date();
        const alertDevice = devices.find(device => {
          if ((device.status as any) === 'loaned' && device.deliveryDate) {
            const loan = loans.find(l => l.assetId === device.id && !l.returnDate);
            if (loan && loan.loanDays) {
              const endDate = new Date(new Date(device.deliveryDate).getTime() + loan.loanDays * 24 * 60 * 60 * 1000);
              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return daysLeft === 1;
            }
          }
          return false;
        });
        if (alertDevice) {
          setLoanAlert(`Equipo ${alertDevice.assetCode} próximo a caducar días de préstamo`);
        } else {
          setLoanAlert(null);
        }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, searchTerm]);

  // Escuchar eventos de asset actualizado para actualizar el listado local sin recargar
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      const asset = custom.detail;
      if (!asset) return;
      setDevices((prev) => {
        const exists = prev.some(d => String(d.id) === String(asset.id));
        if (!exists) return prev; // solo actualizamos si existe en la lista local
        return prev.map(d => String(d.id) === String(asset.id) ? { ...d, status: asset.status, assignedPersonId: asset.assignedPersonId ?? null, branchId: asset.branchId ?? d.branchId } : d);
      });
    };

    window.addEventListener('asset-updated', handler as EventListener);
    return () => window.removeEventListener('asset-updated', handler as EventListener);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Hacemos las llamadas en paralelo pero tolerantes a fallos: si una falla
      // no bloqueamos las demás. Así por ejemplo si /people falla (role missing)
      // seguimos mostrando dispositivos y sucursales.
      const results = await Promise.allSettled([
        // request devices with pagination & optional search (server-side)
        devicesApi.getAll(searchTerm || undefined, page, limit),
        peopleApi.getAll(),
        catalogsApi.getBranches(),
        loansApi.getAll(),
      ]);

      const [devicesRes, peopleRes, branchesRes, loansRes] = results;

      if (devicesRes.status === 'fulfilled') {
        // devicesRes.value may be paginated ({ data, total, ... }) or an array
        const payload: any = devicesRes.value;
        const devicesList = extractArray<Device>(payload || []);

        // If server returned paginated object, pick totals from it
        if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
          const total = Number(payload.total ?? devicesList.length);
          setTotalItems(total);
          setTotalPages(Math.max(1, Math.ceil(total / limit)));
        } else {
          // fallback: client-side totals
          setTotalItems(devicesList.length);
          setTotalPages(Math.max(1, Math.ceil(devicesList.length / limit)));
        }

        // devicesList may already be the current page (server-side) or full list
        const sorted = sortByString(devicesList, (d: any) => (d.assetCode || '').toString());
        setDevices(sorted);
      } else {
        // Si no cargan dispositivos, lanzamos para que el catch muestre toast
        throw devicesRes.reason ?? new Error('Error cargando dispositivos');
      }

      if (peopleRes.status === 'fulfilled') {
        const peopleList = extractArray<Person>(peopleRes.value);
        setPeople(sortPeopleByName(peopleList));
      } else {
        // Si falla la carga de personas, mostramos un toast y continuamos.
        toast({
          title: 'Advertencia',
          description: peopleRes.reason instanceof Error ? peopleRes.reason.message : 'No se pudieron cargar las personas',
          variant: 'destructive',
        });
        setPeople([]);
      }

      if (branchesRes.status === 'fulfilled') {
        const branchesList = extractArray<{ id: number; name: string }>(branchesRes.value);
        setBranches(sortBranchesByName(branchesList.map(b => ({ id: Number(b.id), name: b.name }))));
      } else {
        toast({
          title: 'Advertencia',
          description: branchesRes.reason instanceof Error ? branchesRes.reason.message : 'No se pudieron cargar las sucursales',
          variant: 'destructive',
        });
        setBranches([]);
      }

      if (loansRes.status === 'fulfilled') {
        const loansList = extractArray<any>(loansRes.value);
        setLoans(loansList);
      } else {
        setLoans([]);
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPersonName = (personId?: number): string => {
    if (!personId) return '-';
    const person = people.find(p => Number(p.id) === personId);
    return person ? `${person.firstName} ${person.lastName}` : 'Desconocido';
  };

  const getBranchName = (branchId?: number): string => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || '-';
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('es-ES');
    } catch (e) {
      return '-';
    }
  };

  const filteredDevices = devices.filter((device) => {
    const search = searchTerm.toLowerCase();
    return (
      device.assetCode.toLowerCase().includes(search) ||
      device.brand?.toLowerCase().includes(search) ||
      device.model?.toLowerCase().includes(search) ||
      device.serialNumber?.toLowerCase().includes(search) ||
      device.assetType.toLowerCase().includes(search)
    );
  });

  const sort = useSort();

  const prioritizedFiltered = [...filteredDevices].sort(
    (a, b) => Number(isOlderThanFiveYears(b.purchaseDate)) - Number(isOlderThanFiveYears(a.purchaseDate))
  );

  const hasOldInFiltered = prioritizedFiltered.some((d) => isOlderThanFiveYears(d.purchaseDate));

  const sortedByUi = sort.apply(prioritizedFiltered, {
    code: (d: any) => d.assetCode ?? '',
    brand: (d: any) => `${d.brand || ''} ${d.model || ''}`.trim(),
    purchaseDate: (d: any) => d.purchaseDate ?? '',
    deliveryDate: (d: any) => d.deliveryDate ?? '',
    receivedDate: (d: any) => d.receivedDate ?? '',
    status: (d: any) => d.status ?? '',
    branch: (d: any) => (branches.find(b => b.id === d.branchId)?.name) ?? '',
    person: (d: any) => {
      const p = people.find(p => Number(p.id) === d.assignedPersonId);
      return p ? `${p.lastName || ''} ${p.firstName || ''}`.trim() : '';
    },
  });


  // Si el backend ya devuelve la página paginada, no volver a paginar localmente
  // Si el total de devices es menor o igual al límite, o igual al total reportado, mostrar tal cual
  let displayedDevices = sortedByUi;
  if (devices.length > limit && devices.length === totalItems) {
    // Si el backend devuelve todos los dispositivos, paginar localmente
    displayedDevices = sortedByUi.slice((page - 1) * limit, page * limit);
  }

  const getTypeIcon = (type: string) => {
    const Icon = typeIconMap[type] || Laptop;
    return <Icon className="h-4 w-4" />;
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedDevice(null);
    setFormModalOpen(true);
  };

  const handleEdit = (device: Device) => {
    setFormMode('edit');
    setSelectedDevice(device);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (device: Device) => {
    setSelectedDevice(device);
    setDeleteModalOpen(true);
  };

  const handleSave = async (data: CreateDeviceDto) => {
    try {
      if (formMode === 'create') {
        await devicesApi.create(data);
        toast({
          title: 'Éxito',
          description: 'Dispositivo creado correctamente',
        });
      } else if (selectedDevice) {
        await devicesApi.update(selectedDevice.id, data);
        toast({
          title: 'Éxito',
          description: 'Dispositivo actualizado correctamente',
        });
      }

      await loadData();
      setFormModalOpen(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // Si el error corresponde a la regla de asignación activa, no mostrar el toast
      // porque ya mostramos el mensaje dentro del formulario modal.
      const suppressedVariants = [
        'No puedes editar el campo "status": el activo tiene una asignación activa',
        'No puedes editar la fecha de recepción: el activo tiene una asignación activa',
        'No puedes editar el dispositivo hasta que no tenga una asignación activa',
        'No puedes editar este dispositivo hasta que deje de tener una asignación activa',
      ];

      const shouldSuppress = suppressedVariants.some(v => msg.includes(v) || v.includes(msg));

      if (!shouldSuppress) {
        toast({
          title: 'Error',
          description: msg || 'No se pudo guardar el dispositivo',
          variant: 'destructive',
        });
      }
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!selectedDevice) return;

    try {
      await devicesApi.delete(selectedDevice.id);
      toast({
        title: 'Éxito',
        description: 'Dispositivo eliminado correctamente',
      });
      await loadData();
      setDeleteModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el dispositivo',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      {loanAlert && (
        <div className="mb-4 p-4 bg-rose-100 border border-rose-300 rounded-lg flex items-center justify-center animate-pulse">
          <span className="text-rose-700 font-bold text-lg">{loanAlert}</span>
        </div>
      )}
      <div className="p-6 md:pl-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dispositivos</h1>
            <p className="text-muted-foreground mt-1">
              Gestión de dispositivos tecnológicos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" className="gap-2" onClick={() => setPreviewOpen(true)}>
              <Download className="h-4 w-4" />
              Generar Reporte PDF
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Dispositivo
            </Button>
          </div>
        </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por código, marca, modelo, serial..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
          </div>
              <button
                type="button"
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent('stats-card-click', { detail: { type: 'devices' } })); } catch (e) {}
                }}
                className="flex items-center justify-center bg-muted rounded-lg p-4 cursor-pointer hover:scale-105 transform transition-all duration-200 hover:animate-pulse focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                aria-label="Resumen dispositivos"
              >
                <div className="text-center">
                  <p className="text-2xl font-bold">{displayedDevices.length}</p>
                  <p className="text-sm text-muted-foreground">Dispositivos</p>
                </div>
              </button>
        </div>

        {hasOldInFiltered && (
          <div className="flex items-center gap-2 text-sm">
            <span className={`inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 ${oldAssetClass}`}>
              Alerta: dispositivos con ≥5 años de compra titilan en rojo y se muestran primero en la tabla.
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('code')}>Código {sort.key === 'code' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('brand')}>Marca / Modelo {sort.key === 'brand' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('purchaseDate')}>Fecha Compra {sort.key === 'purchaseDate' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('deliveryDate')}>Fecha Entrega {sort.key === 'deliveryDate' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('receivedDate')}>Fecha Recepción {sort.key === 'receivedDate' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('status')}>Estado {sort.key === 'status' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('branch')}>Sucursal {sort.key === 'branch' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('person')}>Asignado a {sort.key === 'person' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedDevices.length > 0 ? (
                  displayedDevices.map((device) => {
                    const isOld = isOlderThanFiveYears(device.purchaseDate);
                    return (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${isOld ? oldAssetClass : ''}`}>
                          {getTypeIcon(device.assetType)}
                          <span className="capitalize text-sm">{device.assetType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{device.assetCode}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.brand}</p>
                          <p className="text-sm text-muted-foreground">{device.model}</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">{formatDate(device.purchaseDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(device.deliveryDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(device.receivedDate)}</TableCell>

                      <TableCell className="text-sm">{device.serialNumber || '-'}</TableCell>
                      <TableCell>
                        {device.status === 'loaned' && device.deliveryDate && (() => {
                          const loan = loans.find(l => l.assetId === device.id && !l.returnDate);
                          if (loan && loan.loanDays) {
                            const endDate = new Date(new Date(device.deliveryDate).getTime() + loan.loanDays * 24 * 60 * 60 * 1000);
                            const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            if (daysLeft === 1) {
                              return (
                                <Badge className="bg-rose-600 text-white animate-pulse">
                                  Prestado
                                </Badge>
                              );
                            }
                            return (
                              <Badge variant={getStatusVariant(device)}>
                                {getStatusLabel(device)}
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant={getStatusVariant(device)}>
                              {getStatusLabel(device)}
                            </Badge>
                          );
                        })()}
                        {/* Días de préstamo y restantes */}
                        {device.status === 'loaned' && device.deliveryDate && (() => {
                          const loan = loans.find(l => l.assetId === device.id && !l.returnDate);
                          if (loan && loan.loanDays) {
                            return (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Días préstamo: <span className="font-semibold">{loan.loanDays}</span><br />
                                Días restantes: <span className={diffDays(new Date().toISOString(), new Date(new Date(device.deliveryDate).getTime() + loan.loanDays * 24 * 60 * 60 * 1000).toISOString()) <= 1 ? 'text-rose-600 font-bold' : 'font-semibold'}>
                                  {diffDays(new Date().toISOString(), new Date(new Date(device.deliveryDate).getTime() + loan.loanDays * 24 * 60 * 60 * 1000).toISOString())}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">{getBranchName(device.branchId)}</TableCell>
                      <TableCell className="text-sm">{getPersonName(device.assignedPersonId)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(device)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(device)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Laptop className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No se encontraron dispositivos
                      </h3>
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? 'Intenta con otros términos de búsqueda'
                          : 'Comienza agregando un dispositivo'}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground text-center">Página {page} / {totalPages}</span>
          <div className="flex-1 flex justify-end">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              limit={limit}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
              limits={[5,10,15,20]}
            />
          </div>
        </div>
      </div>

      <DeviceFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSave={handleSave}
        device={selectedDevice}
        mode={formMode}
        branches={branches}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="¿Eliminar dispositivo?"
        description="Esta acción no se puede deshacer. El dispositivo será eliminado permanentemente."
        itemName={selectedDevice ? `${selectedDevice.brand} ${selectedDevice.model} (${selectedDevice.assetCode})` : undefined}
      />
      {previewOpen && (
        <PreviewDevicesReportModal
          devices={devices}
          branches={branches}
          onClose={() => setPreviewOpen(false)}
          toast={toast}
        />
      )}    </Layout>
  );
}

export default DevicesPage;