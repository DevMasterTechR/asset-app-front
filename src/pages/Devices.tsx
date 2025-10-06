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
import { Search, Plus, Edit, Trash2, Laptop, Smartphone, Mouse, Keyboard, Loader2, Monitor, Server, Tablet } from 'lucide-react';
import { mockAssets, getBranchName, getPersonName, type Asset } from '@/data/mockDataExtended';
import { devicesApi, initializeMockData, CreateDeviceDto, UpdateDeviceDto } from '@/api/devices';
import DeviceFormModal from '@/components/DeviceFormModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

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

const typeIconMap: Record<string, React.ComponentType<object>> = {
  laptop: Laptop,
  smartphone: Smartphone,
  mouse: Mouse,
  keyboard: Keyboard,
  monitor: Monitor,
  server: Server,
  tablet: Tablet,
};


export default function Devices() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Asset | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Cargar dispositivos al montar el componente
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    // Inicializar datos mock (solo la primera vez)
    initializeMockData(mockAssets);
    
    const response = await devicesApi.getAll();
    if (response.success && response.data) {
      setDevices(response.data);
    } else {
      toast({
        title: 'Error',
        description: response.error || 'No se pudieron cargar los dispositivos',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const filteredDevices = devices.filter(
    (device) =>
      device.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    const Icon = typeIconMap[type] || Laptop;
    return <Icon className="h-4 w-4" />;
  };

  // ========== CRUD HANDLERS ==========

  const handleCreate = () => {
    setFormMode('create');
    setSelectedDevice(null);
    setFormModalOpen(true);
  };

  const handleEdit = (device: Asset) => {
    setFormMode('edit');
    setSelectedDevice(device);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (device: Asset) => {
    setSelectedDevice(device);
    setDeleteModalOpen(true);
  };

  const handleSave = async (data: CreateDeviceDto) => {
    let response;
    
    if (formMode === 'create') {
      response = await devicesApi.create(data);
    } else if (selectedDevice) {
      const updateData: UpdateDeviceDto = { ...data, id: selectedDevice.id };
      response = await devicesApi.update(updateData);
    }

    if (response?.success) {
      toast({
        title: 'Éxito',
        description: formMode === 'create' 
          ? 'Dispositivo creado correctamente'
          : 'Dispositivo actualizado correctamente',
      });
      await loadDevices();
      setFormModalOpen(false);
    } else {
      toast({
        title: 'Error',
        description: response?.error || 'No se pudo guardar el dispositivo',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedDevice) return;

    const response = await devicesApi.delete(selectedDevice.id);

    if (response.success) {
      toast({
        title: 'Éxito',
        description: 'Dispositivo eliminado correctamente',
      });
      await loadDevices();
    } else {
      toast({
        title: 'Error',
        description: response.error || 'No se pudo eliminar el dispositivo',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dispositivos</h1>
            <p className="text-muted-foreground mt-1">
              Gestión de activos tecnológicos
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Dispositivo
          </Button>
        </div>

        {/* Search and Stats */}
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

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
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
                  {filteredDevices.map((device) => (
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
                      <TableCell className="text-sm">{device.serialNumber}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[device.status]}>
                          {statusLabelMap[device.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getBranchName(device.branchId)}</TableCell>
                      <TableCell className="text-sm">
                        {device.assignedPersonId ? getPersonName(device.assignedPersonId) : '-'}
                      </TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredDevices.length === 0 && (
              <div className="text-center py-12">
                <Laptop className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron dispositivos</h3>
                <p className="text-muted-foreground">
                  Intenta con otros términos de búsqueda
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      <DeviceFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSave={handleSave}
        device={selectedDevice}
        mode={formMode}
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