// src/pages/Security.tsx
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
  Shield,
  Download,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { devicesApi, Device, CreateDeviceDto } from '@/api/devices';
import { peopleApi } from '@/api/people';
import * as catalogsApi from '@/api/catalogs';
import { sortByString, sortPeopleByName, sortBranchesByName } from '@/lib/sort';
import { extractArray } from '@/lib/extractData';
import { useSort } from '@/lib/useSort';
import DeviceFormModal from '@/components/DeviceFormModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import PreviewSecurityReportModal from '@/components/PreviewSecurityReportModal';
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

function SecurityPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        devicesApi.getAll(searchTerm || undefined, 1, 1000),
        peopleApi.getAll(),
        catalogsApi.getBranches(),
      ]);

      const [devicesRes, peopleRes, branchesRes] = results;

      if (devicesRes.status === 'fulfilled') {
        const payload: any = devicesRes.value;
        const devicesList = extractArray<Device>(payload || []);
        
        const securityDevices = devicesList.filter(d => d.assetType === 'security');
        const sorted = sortByString(securityDevices, (d: any) => (d.assetCode || '').toString());
        setDevices(sorted);
        setTotalPages(Math.max(1, Math.ceil(sorted.length / limit)));
      } else {
        throw devicesRes.reason ?? new Error('Error cargando dispositivos de seguridad');
      }

      if (peopleRes.status === 'fulfilled') {
        const peopleList = extractArray<Person>(peopleRes.value);
        setPeople(sortPeopleByName(peopleList));
      } else {
        setPeople([]);
      }

      if (branchesRes.status === 'fulfilled') {
        const branchesList = extractArray<{ id: number; name: string }>(branchesRes.value);
        setBranches(sortBranchesByName(branchesList.map(b => ({ id: Number(b.id), name: b.name }))));
      } else {
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
      (device.attributesJson as any)?.location?.toLowerCase().includes(search)
    );
  });

  const sort = useSort();

  const sortedDevices = sort.apply(filteredDevices, {
    code: (d: any) => d.assetCode ?? '',
    brand: (d: any) => `${d.brand || ''} ${d.model || ''}`.trim(),
    status: (d: any) => d.status ?? '',
    branch: (d: any) => (branches.find(b => b.id === d.branchId)?.name) ?? '',
    location: (d: any) => (d.attributesJson as any)?.location ?? '',
    category: (d: any) => (d.attributesJson as any)?.category ?? '',
  });

  const displayedDevices = sortedDevices.slice((page - 1) * limit, page * limit);

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
      const securityData = { ...data, assetType: 'security' };
      
      if (formMode === 'create') {
        await devicesApi.create(securityData);
        toast({
          title: 'Éxito',
          description: 'Dispositivo de seguridad creado correctamente',
        });
      } else if (selectedDevice) {
        await devicesApi.update(selectedDevice.id, securityData);
        toast({
          title: 'Éxito',
          description: 'Dispositivo de seguridad actualizado correctamente',
        });
      }

      await loadData();
      setFormModalOpen(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error',
        description: msg || 'No se pudo guardar el dispositivo',
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
        description: 'Dispositivo de seguridad eliminado correctamente',
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
      <div className="p-6 md:pl-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Seguridad
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestión de dispositivos de seguridad (cámaras, alarmas, sensores, etc.)
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
                placeholder="Buscar por código, marca, modelo, ubicación..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center bg-muted rounded-lg p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{devices.length}</p>
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
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('code')}>
                    Código {sort.key === 'code' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('brand')}>
                    Marca / Modelo {sort.key === 'brand' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('category')}>
                    Categoría {sort.key === 'category' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('location')}>
                    Ubicación {sort.key === 'location' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('status')}>
                    Estado {sort.key === 'status' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('branch')}>
                    Sucursal {sort.key === 'branch' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead>Imagen</TableHead>
                  <TableHead>Observación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedDevices.length > 0 ? (
                  displayedDevices.map((device) => {
                    const attrs = (device.attributesJson || {}) as any;
                    return (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.assetCode}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{device.brand}</p>
                            <p className="text-sm text-muted-foreground">{device.model}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{attrs.category || '-'}</TableCell>
                        <TableCell className="text-sm">{attrs.quantity || '-'}</TableCell>
                        <TableCell className="text-sm">{attrs.location || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariantMap[device.status]}>
                            {statusLabelMap[device.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{getBranchName(device.branchId)}</TableCell>
                        <TableCell className="align-middle">
                          {attrs.imageUrl ? (
                            <button
                              onClick={() => setImageModalUrl(attrs.imageUrl)}
                              className="p-2 hover:bg-blue-100 rounded-full transition-colors mx-auto block"
                              title="Ver imagen"
                            >
                              <Eye className="h-5 w-5 text-blue-600" />
                            </button>
                          ) : (
                            <EyeOff className="h-5 w-5 text-gray-400 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs break-words">{device.notes || '-'}</TableCell>
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
                    <TableCell colSpan={10} className="text-center py-12">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No se encontraron dispositivos de seguridad
                      </h3>
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? 'Intenta con otros términos de búsqueda'
                          : 'Comienza agregando un dispositivo de seguridad'}
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
              limits={[5, 10, 15, 20]}
            />
          </div>
        </div>
      </div>

      <DeviceFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSave={handleSave}
        device={selectedDevice ? { ...selectedDevice, assetType: 'security' } : null}
        mode={formMode}
        branches={branches}
        people={people}
        fixedType="security"
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="¿Eliminar dispositivo de seguridad?"
        description="Esta acción no se puede deshacer. El dispositivo será eliminado permanentemente."
        itemName={selectedDevice ? `${selectedDevice.brand} ${selectedDevice.model} (${selectedDevice.assetCode})` : undefined}
      />

      {previewOpen && (
        <PreviewSecurityReportModal
          devices={devices}
          branches={branches}
          onClose={() => setPreviewOpen(false)}
          toast={toast}
        />
      )}

      {/* Modal de Imagen */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setImageModalUrl(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute -top-2 -right-2 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors shadow-lg z-10"
              title="Cerrar"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
            <img 
              src={imageModalUrl} 
              alt="Dispositivo de seguridad" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '';
                (e.target as HTMLImageElement).alt = 'Error al cargar imagen';
              }}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default SecurityPage;
