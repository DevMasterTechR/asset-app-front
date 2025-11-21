// src/pages/Devices.tsx
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
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
} from 'lucide-react';
import { devicesApi, Device, CreateDeviceDto } from '@/api/devices';
import { peopleApi } from '@/api/people';
import * as catalogsApi from '@/api/catalogs';
import { sortByString, sortPeopleByName, sortBranchesByName } from '@/lib/sort';
import { useSort } from '@/lib/useSort';
import DeviceFormModal from '@/components/DeviceFormModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { Person } from '@/data/mockDataExtended';

const statusVariantMap = {
  available: 'success' as const,
  assigned: 'default' as const,
  maintenance: 'warning' as const,
  decommissioned: 'destructive' as const,
};

const statusLabelMap = {
  available: 'Disponible',
  assigned: 'Asignado',
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
};

function DevicesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadData();
  }, []);

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
      // Hacemos las 3 llamadas en paralelo pero tolerantes a fallos: si una falla
      // no bloqueamos las demás. Así por ejemplo si /people falla (role missing)
      // seguimos mostrando dispositivos y sucursales.
      const results = await Promise.allSettled([
        devicesApi.getAll(),
        peopleApi.getAll(),
        catalogsApi.getBranches(),
      ]);

      const [devicesRes, peopleRes, branchesRes] = results;

      if (devicesRes.status === 'fulfilled') {
        // Ordenar por código del activo para facilitar búsqueda alfabética
        setDevices(sortByString(devicesRes.value, (d: any) => (d.assetCode || '').toString()));
      } else {
        // Si no cargan dispositivos, lanzamos para que el catch muestre toast
        throw devicesRes.reason ?? new Error('Error cargando dispositivos');
      }

      if (peopleRes.status === 'fulfilled') {
        setPeople(sortPeopleByName(peopleRes.value));
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
        setBranches(sortBranchesByName(branchesRes.value.map(b => ({ id: Number(b.id), name: b.name }))));
      } else {
        toast({
          title: 'Advertencia',
          description: branchesRes.reason instanceof Error ? branchesRes.reason.message : 'No se pudieron cargar las sucursales',
          variant: 'destructive',
        });
        setBranches([]);
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

  const displayedDevices = sort.apply(filteredDevices, {
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
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar el dispositivo',
        variant: 'destructive',
      });
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
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dispositivos</h1>
            <p className="text-muted-foreground mt-1">
              Gestión de dispositivos tecnológicos
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Dispositivo
          </Button>
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
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
              <div className="flex items-center justify-center bg-muted rounded-lg p-4">
            <div className="text-center">
                <p className="text-2xl font-bold">{displayedDevices.length}</p>
              <p className="text-sm text-muted-foreground">Dispositivos</p>
            </div>
          </div>
        </div>

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
                  displayedDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
                        <Badge variant={statusVariantMap[device.status]}>
                          {statusLabelMap[device.status]}
                        </Badge>
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
                  ))
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
      </div>

      <DeviceFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSave={handleSave}
        device={selectedDevice}
        mode={formMode}
        branches={branches}
        people={people}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="¿Eliminar dispositivo?"
        description="Esta acción no se puede deshacer. El dispositivo será eliminado permanentemente."
        itemName={selectedDevice ? `${selectedDevice.brand} ${selectedDevice.model} (${selectedDevice.assetCode})` : undefined}
      />
    </Layout>
  );
}

export default DevicesPage;