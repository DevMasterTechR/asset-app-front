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
  PackageCheck,
} from 'lucide-react';
import { devicesApi, Device, CreateDeviceDto } from '@/api/devices';
import { peopleApi } from '@/api/people';
import * as catalogsApi from '@/api/catalogs';
import { sortByString, sortPeopleByName, sortBranchesByName } from '@/lib/sort';
import { extractArray } from '@/lib/extractData';
import { useSort } from '@/lib/useSort';
import DeviceFormModal from '@/components/DeviceFormModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import PreviewSecurityReportModal from '@/reports/PreviewSecurityReportModal';
import PreviewAssignmentsReportModal from '@/reports/PreviewAssignmentsReportModal';
import AssignmentFormModal from '@/components/AssignmentFormModal';
import SecurityAssignmentFormModal from '@/components/SecurityAssignmentFormModal';
import ReturnAssignmentModal from '@/components/ReturnAssignmentModal';
import { Person } from '@/data/mockDataExtended';
import { assignmentsApi, type CreateAssignmentDto } from '@/api/assignments';
import type { Assignment } from '@/data/mockDataExtended';

// Función para convertir URLs de galería de Imgur a URLs directas de imagen
const convertImgurUrl = (url: string): string => {
  if (!url) return url;
  
  // Si ya es una URL directa de imagen de Imgur, devolverla tal cual
  if (url.includes('i.imgur.com')) return url;
  
  // Convertir URLs de galería de Imgur a URLs directas de imagen
  if (url.includes('imgur.com/gallery/') || url.includes('imgur.com/a/')) {
    // Extraer el ID de la imagen del hash o del path
    const hashMatch = url.match(/#(\w+)/);
    const pathMatch = url.match(/imgur\.com\/(?:gallery|a)\/([^#\s]+)/);
    
    if (hashMatch) {
      // Si hay un hash, usar ese ID
      return `https://i.imgur.com/${hashMatch[1]}.jpg`;
    } else if (pathMatch) {
      // Si no hay hash, intentar con el ID del path
      return `https://i.imgur.com/${pathMatch[1]}.jpg`;
    }
  }
  
  return url;
};

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
  const [previewAssignmentsOpen, setPreviewAssignmentsOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  // Estados para asignaciones de seguridad
  const [securityAssignments, setSecurityAssignments] = useState<Assignment[]>([]);
  const [securityFormOpen, setSecurityFormOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'create' | 'edit'>('create');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [assignmentToReturn, setAssignmentToReturn] = useState<string | null>(null);
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');
  const [assignmentViewMode, setAssignmentViewMode] = useState<'active' | 'history'>('active');
  const [currentTab, setCurrentTab] = useState<'devices' | 'assignments'>('devices');

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
        assignmentsApi.getAll(),
      ]);

      const [devicesRes, peopleRes, branchesRes, assignmentsRes] = results;

      if (devicesRes.status === 'fulfilled') {
        const payload: any = devicesRes.value;
        const devicesList = extractArray<Device>(payload || []);
        
        const securityDevices = devicesList.filter(d => d.assetType === 'security');
        const sorted = sortByString(securityDevices, (d: any) => (d.assetCode || '').toString());
        setDevices(sorted);
        setTotalPages(Math.max(1, Math.ceil(sorted.length / limit)));

        // Filtrar asignaciones sólo para dispositivos de seguridad usando devicesList para garantizar disponibilidad
        if (assignmentsRes.status === 'fulfilled') {
          const assignmentsList = extractArray<Assignment>(assignmentsRes.value);
          const securityAssignmentsList = assignmentsList.filter((a: any) => {
            const device = devicesList.find(d => String(d.id) === String(a.assetId));
            return device?.assetType === 'security';
          });
          setSecurityAssignments(securityAssignmentsList);
        } else {
          setSecurityAssignments([]);
        }
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

  const filteredAssignments = securityAssignments.filter((assignment) => {
    const hasReturn = !!assignment.returnDate;
    const matchesView = assignmentViewMode === 'active' ? !hasReturn : hasReturn;
    const device = devices.find(d => String(d.id) === String(assignment.assetId));
    const person = people.find(p => p.id === assignment.personId);
    const search = assignmentSearchTerm.toLowerCase();
    const matchesSearch = search === '' ||
      (device?.assetCode?.toLowerCase().includes(search)) ||
      (`${person?.firstName || ''} ${person?.lastName || ''}`.toLowerCase().includes(search));
    return matchesView && matchesSearch;
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
            {currentTab === 'devices' ? (
              <>
                <Button variant="destructive" className="gap-2" onClick={() => setPreviewOpen(true)}>
                  <Download className="h-4 w-4" />
                  Generar Reporte PDF
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Dispositivo
                </Button>
              </>
            ) : (
              <>
                <Button variant="destructive" className="gap-2" onClick={() => setPreviewAssignmentsOpen(true)}>
                  <Download className="h-4 w-4" />
                  Generar Reporte PDF
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setSecurityFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Asignación
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Pestañas de sección */}
        <div className="border-b flex gap-4">
          <button
            onClick={() => {
              setCurrentTab('devices');
              setSearchTerm('');
              setPage(1);
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              currentTab === 'devices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Dispositivos
          </button>
          <button
            onClick={() => {
              setCurrentTab('assignments');
              setAssignmentViewMode('active');
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              currentTab === 'assignments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Asignaciones
          </button>
        </div>

        {/* SECCIÓN DE DISPOSITIVOS */}
        {currentTab === 'devices' && (
        <>
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
                          {attrs.imagen ? (
                            <button
                              onClick={() => setImageModalUrl(attrs.imagen)}
                              className="p-2 hover:bg-blue-100 rounded-full transition-colors mx-auto block"
                              title="Ver imagen"
                            >
                              <Eye className="h-5 w-5 text-blue-600" />
                            </button>
                          ) : (
                            <div className="flex flex-col items-center text-gray-400 text-xs" title="Imagen no asignada">
                              <EyeOff className="h-5 w-5" />
                              <span className="mt-1">Imagen no asignada</span>
                            </div>
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
        </>
        )}

        {/* SECCIÓN DE ASIGNACIONES */}
        {currentTab === 'assignments' && (
        <>
          {/* Pestañas internas de asignaciones */}
          <div className="border-b flex gap-4 ml-4">
            <button
              onClick={() => setAssignmentViewMode('active')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                assignmentViewMode === 'active'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Asignaciones Activas
            </button>
            <button
              onClick={() => setAssignmentViewMode('history')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                assignmentViewMode === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Historial de Asignaciones
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por código, persona, estado..."
                  className="pl-10"
                  value={assignmentSearchTerm}
                  onChange={(e) => setAssignmentSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-center bg-muted rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{filteredAssignments.length}</p>
                <p className="text-sm text-muted-foreground">
                  {assignmentViewMode === 'active' ? 'Asignaciones activas' : 'Asignaciones en historial'}
                </p>
              </div>
            </div>
          </div>

          {/* Botón de 'Nueva Asignación' eliminado según solicitud */}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Asignado a</TableHead>
                    <TableHead>Fecha de Asignación</TableHead>
                    {assignmentViewMode === 'active' && <TableHead>Fecha de Entrega Esperada</TableHead>}
                    {assignmentViewMode === 'history' && <TableHead>Fecha de Devolución</TableHead>}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                         <TableCell className="font-medium">{devices.find(d => String(d.id) === String(assignment.assetId))?.assetCode || '-'}</TableCell>
                         <TableCell>{`${people.find(p => String(p.id) === String(assignment.personId))?.firstName || ''} ${people.find(p => String(p.id) === String(assignment.personId))?.lastName || ''}`.trim() || '-'}</TableCell>
                        <TableCell>{new Date(assignment.assignmentDate).toLocaleDateString('es-ES')}</TableCell>
                        {assignmentViewMode === 'active' && (
                          <TableCell>{assignment.expectedReturnDate ? new Date(assignment.expectedReturnDate).toLocaleDateString('es-ES') : '-'}</TableCell>
                        )}
                        {assignmentViewMode === 'history' && (
                          <TableCell>{assignment.returnDate ? new Date(assignment.returnDate).toLocaleDateString('es-ES') : '-'}</TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {assignmentViewMode === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setAssignmentToReturn(String(assignment.id));
                                    setReturnModalOpen(true);
                                  }}
                                  title="Devolver"
                                >
                                  <PackageCheck className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAssignmentMode('edit');
                                setSelectedAssignment(assignment);
                                setSecurityFormOpen(true);
                              }}
                              title="Editar asignación"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                const ok = window.confirm('¿Eliminar esta asignación? Esta acción no se puede deshacer.');
                                if (!ok) return;
                                try {
                                  await assignmentsApi.delete(String(assignment.id));
                                  toast({ title: 'Éxito', description: 'Asignación eliminada correctamente' });
                                  await loadData();
                                } catch (error) {
                                  const msg = error instanceof Error ? error.message : String(error);
                                  toast({ title: 'Error', description: msg || 'No se pudo eliminar la asignación', variant: 'destructive' });
                                }
                              }}
                              title="Eliminar asignación"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No se encontraron asignaciones
                        </h3>
                        <p className="text-muted-foreground">
                          {assignmentViewMode === 'active'
                            ? 'No hay asignaciones activas de seguridad'
                            : 'No hay historial de asignaciones'}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
        )}
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

      {previewAssignmentsOpen && (
        <PreviewAssignmentsReportModal
          assignments={securityAssignments}
          assets={devices.map(d => ({
            id: String(d.id),
            code: d.assetCode || '',
            name: `${d.brand || ''} ${d.model || ''}`.trim() || d.assetCode || '',
            brand: d.brand,
            model: d.model,
            purchaseDate: d.purchaseDate,
            assetCode: d.assetCode,
          }))}
          people={people}
          branches={branches}
          onClose={() => setPreviewAssignmentsOpen(false)}
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
              src={convertImgurUrl(imageModalUrl)} 
              alt="Dispositivo de seguridad" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              crossOrigin="anonymous"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '';
                (e.target as HTMLImageElement).alt = 'Error al cargar imagen';
              }}
            />
          </div>
        </div>
      )}

      {/* Modales de Asignación */}
      <SecurityAssignmentFormModal
        open={securityFormOpen}
        onOpenChange={setSecurityFormOpen}
        onSave={async (data: CreateAssignmentDto) => {
          try {
            if (assignmentMode === 'create') {
              await assignmentsApi.create(data);
              toast({
                title: 'Éxito',
                description: 'Asignación creada correctamente',
              });
            } else if (selectedAssignment) {
              await assignmentsApi.update(selectedAssignment.id, data);
              toast({
                title: 'Éxito',
                description: 'Asignación actualizada correctamente',
              });
            }
            await loadData();
            setSecurityFormOpen(false);
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            toast({
              title: 'Error',
              description: msg || 'No se pudo guardar la asignación',
              variant: 'destructive',
            });
            throw error;
          }
        }}
        assignment={selectedAssignment || undefined}
        mode={assignmentMode}
        assets={devices.filter(d => d.assetType === 'security').map(d => ({
          id: String(d.id),
          code: d.assetCode,
          name: `${d.brand || ''} ${d.model || ''}`.trim(),
          brand: d.brand,
          model: d.model,
          purchaseDate: d.purchaseDate,
          assetCode: d.assetCode,
        }))}
        people={people}
        branches={branches}
      />

      <ReturnAssignmentModal
        open={returnModalOpen}
        onOpenChange={setReturnModalOpen}
        onSave={async (returnCondition, returnNotes) => {
          try {
            if (assignmentToReturn) {
              await assignmentsApi.registerReturn(assignmentToReturn, returnCondition, returnNotes);
              toast({
                title: 'Éxito',
                description: 'Asignación devuelta correctamente',
              });
              await loadData();
              setReturnModalOpen(false);
              setAssignmentToReturn(null);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            toast({
              title: 'Error',
              description: msg || 'No se pudo procesar la devolución',
              variant: 'destructive',
            });
          }
        }}
        assignmentId={assignmentToReturn as string}
      />
    </Layout>
  );
}

export default SecurityPage;
