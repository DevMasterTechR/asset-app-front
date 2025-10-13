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

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesData, peopleData, branchesData] = await Promise.all([
        devicesApi.getAll(),
        peopleApi.getAll(),
        catalogsApi.getBranches(),
      ]);

      console.log('✅ Dispositivos cargados:', devicesData);
      console.log('✅ Personas cargadas:', peopleData);
      console.log('✅ Sucursales cargadas:', branchesData);

      setDevices(devicesData);
      setPeople(peopleData);
      setBranches(branchesData.map(b => ({ id: Number(b.id), name: b.name })));
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
              <p className="text-2xl font-bold">{filteredDevices.length}</p>
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
                  <TableHead>Código</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.length > 0 ? (
                  filteredDevices.map((device) => (
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