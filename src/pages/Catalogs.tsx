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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Plus, Edit, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Branch, Department, Role } from '@/data/mockDataExtended';
import * as catalogsApi from '@/api/catalogs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sortByString } from '@/lib/sort';
import { useSort } from '@/lib/useSort';
import BranchFormModal from '@/components/BranchFormModal';
import DepartmentFormModal from '@/components/DepartmentFormModal';
import RoleFormModal from '@/components/RoleFormModal';
import Pagination, { DEFAULT_PAGE_SIZE } from '@/components/Pagination';

export default function Catalogs() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Modal states
  const [branchModal, setBranchModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: Branch | null }>({
    open: false,
    mode: 'create',
    data: null
  });
  const [departmentModal, setDepartmentModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: Department | null }>({
    open: false,
    mode: 'create',
    data: null
  });
  const [roleModal, setRoleModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: Role | null }>({
    open: false,
    mode: 'create',
    data: null
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'branch' | 'department' | 'role';
    id: string;
    name: string;
  } | null>(null);

  // Report preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'branches' | 'departments' | 'roles'>('all');

  // Control de pestaña actual para botón dinámico de agregar
  const [currentTab, setCurrentTab] = useState<'branches' | 'departments' | 'roles'>('branches');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [branchesData, departmentsData, rolesData] = await Promise.all([
        catalogsApi.getBranches(),
        catalogsApi.getDepartments(),
        catalogsApi.getRoles()
      ]);
      setBranches(sortByString(branchesData, b => b.name));
      setDepartments(sortByString(departmentsData, d => d.name));
      setRoles(sortByString(rolesData, r => r.name));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // CRUD Handlers - Branches
  const handleCreateBranch = async (data: catalogsApi.CreateBranchDto) => {
    try {
      await catalogsApi.createBranch(data);
      await loadData();
      toast({ title: 'Sucursal creada exitosamente' });
    } catch (error) {
      toast({ title: 'Error al crear sucursal', variant: 'destructive' });
    }
  };

  const handleUpdateBranch = async (data: catalogsApi.CreateBranchDto) => {
    if (!branchModal.data?.id) return;
    try {
      await catalogsApi.updateBranch(String(branchModal.data.id), data);
      await loadData();
      setBranchModal({ open: false, mode: 'create', data: null });
      toast({ title: 'Sucursal actualizada exitosamente' });
    } catch (error) {
      toast({ title: 'Error al actualizar sucursal', variant: 'destructive' });
    }
  };

  // CRUD Handlers - Departments
  const handleCreateDepartment = async (data: catalogsApi.CreateDepartmentDto) => {
    try {
      await catalogsApi.createDepartment(data);
      await loadData();
      toast({ title: 'Departamento creado exitosamente' });
    } catch (error) {
      toast({ title: 'Error al crear departamento', variant: 'destructive' });
    }
  };

  const handleUpdateDepartment = async (data: catalogsApi.CreateDepartmentDto) => {
    if (!departmentModal.data?.id) return;
    try {
      await catalogsApi.updateDepartment(String(departmentModal.data.id), data);
      await loadData();
      setDepartmentModal({ open: false, mode: 'create', data: null });
      toast({ title: 'Departamento actualizado exitosamente' });
    } catch (error) {
      toast({ title: 'Error al actualizar departamento', variant: 'destructive' });
    }
  };

  // CRUD Handlers - Roles
  const handleCreateRole = async (data: catalogsApi.CreateRoleDto) => {
    try {
      await catalogsApi.createRole(data);
      await loadData();
      toast({ title: 'Rol creado exitosamente' });
    } catch (error) {
      toast({ title: 'Error al crear rol', variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (data: catalogsApi.CreateRoleDto) => {
    if (!roleModal.data?.id) return;
    try {
      await catalogsApi.updateRole(String(roleModal.data.id), data);
      await loadData();
      setRoleModal({ open: false, mode: 'create', data: null });
      toast({ title: 'Rol actualizado exitosamente' });
    } catch (error) {
      toast({ title: 'Error al actualizar rol', variant: 'destructive' });
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      switch (deleteDialog.type) {
        case 'branch':
          await catalogsApi.deleteBranch(deleteDialog.id);
          break;
        case 'department':
          await catalogsApi.deleteDepartment(deleteDialog.id);
          break;
        case 'role':
          await catalogsApi.deleteRole(deleteDialog.id);
          break;
      }
      await loadData();
      toast({ title: 'Eliminado exitosamente' });
      setDeleteDialog(null);
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  // Filter data
  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sort = useSort();

  const displayedBranches = sort.apply(filteredBranches, {
    name: (b: any) => b.name || '',
    address: (b: any) => b.address || '',
    region: (b: any) => b.region || '',
  });

  const displayedDepartments = sort.apply(filteredDepartments, {
    name: (d: any) => d.name || '',
    description: (d: any) => d.description || '',
  });

  const displayedRoles = sort.apply(filteredRoles, {
    name: (r: any) => r.name || '',
    description: (r: any) => r.description || '',
  });

  // Pagination (client-side) for each table
  const [branchesPage, setBranchesPage] = useState(1);
  const [branchesLimit, setBranchesLimit] = useState(DEFAULT_PAGE_SIZE);
  const branchesTotalPages = Math.max(1, Math.ceil(displayedBranches.length / branchesLimit));
  const paginatedBranches = displayedBranches.slice((branchesPage - 1) * branchesLimit, branchesPage * branchesLimit);

  const [departmentsPage, setDepartmentsPage] = useState(1);
  const [departmentsLimit, setDepartmentsLimit] = useState(DEFAULT_PAGE_SIZE);
  const departmentsTotalPages = Math.max(1, Math.ceil(displayedDepartments.length / departmentsLimit));
  const paginatedDepartments = displayedDepartments.slice((departmentsPage - 1) * departmentsLimit, departmentsPage * departmentsLimit);

  const [rolesPage, setRolesPage] = useState(1);
  const [rolesLimit, setRolesLimit] = useState(DEFAULT_PAGE_SIZE);
  const rolesTotalPages = Math.max(1, Math.ceil(displayedRoles.length / rolesLimit));
  const paginatedRoles = displayedRoles.slice((rolesPage - 1) * rolesLimit, rolesPage * rolesLimit);

  // Report data based on filters
  const getReportData = () => {
    switch (filterType) {
      case 'branches':
        return { branches, departments: [], roles: [] };
      case 'departments':
        return { branches: [], departments, roles: [] };
      case 'roles':
        return { branches: [], departments: [], roles };
      default:
        return { branches, departments, roles };
    }
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    const reportData = getReportData();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.text('Reporte de Catálogos', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, yPosition);
    yPosition += 5;
    doc.text(`Filtro: ${filterType === 'all' ? 'Todos los catálogos' : filterType === 'branches' ? 'Sucursales' : filterType === 'departments' ? 'Departamentos' : 'Roles'}`, 14, yPosition);
    yPosition += 10;

    // Branches
    if (reportData.branches.length > 0) {
      doc.setFontSize(14);
      doc.text('Sucursales', 14, yPosition);
      yPosition += 7;

      autoTable(doc, {
        startY: yPosition,
        head: [['Nombre', 'Dirección', 'Región']],
        body: reportData.branches.map((b) => [b.name, b.address, b.region]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Departments
    if (reportData.departments.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(14);
      doc.text('Departamentos', 14, yPosition);
      yPosition += 7;

      autoTable(doc, {
        startY: yPosition,
        head: [['Nombre', 'Descripción']],
        body: reportData.departments.map((d) => [d.name, d.description]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Roles
    if (reportData.roles.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(14);
      doc.text('Roles', 14, yPosition);
      yPosition += 7;

      autoTable(doc, {
        startY: yPosition,
        head: [['Nombre', 'Descripción']],
        body: reportData.roles.map((r) => [r.name, r.description]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`Reporte_Catalogos_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: 'Reporte descargado exitosamente' });
  };

  return (
    <Layout>
      <div className="p-6 md:pl-0 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Catálogos</h1>
            <p className="text-muted-foreground mt-1">
              Gestión de sucursales, departamentos y roles
            </p>
          </div>
        </div>

        {/* Acciones y buscador */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-end gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (currentTab === 'branches') {
                  setBranchModal({ open: true, mode: 'create', data: null });
                } else if (currentTab === 'departments') {
                  setDepartmentModal({ open: true, mode: 'create', data: null });
                } else {
                  setRoleModal({ open: true, mode: 'create', data: null });
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {currentTab === 'branches'
                ? 'Agregar Sucursal'
                : currentTab === 'departments'
                  ? 'Agregar Departamento'
                  : 'Agregar Rol'}
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => setPreviewOpen(true)}>
              <Download className="h-4 w-4" />
              Generar Reporte PDF
            </Button>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setBranchesPage(1);
                setDepartmentsPage(1);
                setRolesPage(1);
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as 'branches' | 'departments' | 'roles')} className="space-y-6">
          <TabsList>
            <TabsTrigger value="branches">Sucursales</TabsTrigger>
            <TabsTrigger value="departments">Departamentos</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          {/* Sucursales */}
          <TabsContent value="branches" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sucursales</h2>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => sort.toggle('name')}>Nombre {sort.key === 'name' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => sort.toggle('address')}>Dirección {sort.key === 'address' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => sort.toggle('region')}>Región {sort.key === 'region' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>{branch.address}</TableCell>
                      <TableCell>{branch.region}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setBranchModal({ open: true, mode: 'edit', data: branch })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDialog({ open: true, type: 'branch', id: branch.id, name: branch.name })}
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
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {branchesPage} / {branchesTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={branchesPage} totalPages={branchesTotalPages} onPageChange={setBranchesPage} limit={branchesLimit} onLimitChange={(l) => { setBranchesLimit(l); setBranchesPage(1); }} />
              </div>
            </div>
          </TabsContent>

          {/* Departamentos */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Departamentos</h2>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => sort.toggle('name')}>Nombre {sort.key === 'name' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => sort.toggle('description')}>Descripción {sort.key === 'description' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDepartments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDepartmentModal({ open: true, mode: 'edit', data: dept })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: 'department',
                                id: dept.id,
                                name: dept.name,
                              })
                            }
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
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {departmentsPage} / {departmentsTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={departmentsPage} totalPages={departmentsTotalPages} onPageChange={setDepartmentsPage} limit={departmentsLimit} onLimitChange={(l) => { setDepartmentsLimit(l); setDepartmentsPage(1); }} />
              </div>
            </div>
          </TabsContent>

          {/* Roles */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Roles</h2>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => sort.toggle('name')}>Nombre {sort.key === 'name' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => sort.toggle('description')}>Descripción {sort.key === 'description' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRoleModal({ open: true, mode: 'edit', data: role })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDialog({ open: true, type: 'role', id: role.id, name: role.name })}
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
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {rolesPage} / {rolesTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={rolesPage} totalPages={rolesTotalPages} onPageChange={setRolesPage} limit={rolesLimit} onLimitChange={(l) => { setRolesLimit(l); setRolesPage(1); }} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <BranchFormModal
          open={branchModal.open}
          onOpenChange={(open) => setBranchModal({ ...branchModal, open })}
          onSave={branchModal.mode === 'create' ? handleCreateBranch : handleUpdateBranch}
          branch={branchModal.data}
          mode={branchModal.mode}
        />

        <DepartmentFormModal
          open={departmentModal.open}
          onOpenChange={(open) => setDepartmentModal({ ...departmentModal, open })}
          onSave={departmentModal.mode === 'create' ? handleCreateDepartment : handleUpdateDepartment}
          department={departmentModal.data}
          mode={departmentModal.mode}
        />

        <RoleFormModal
          open={roleModal.open}
          onOpenChange={(open) => setRoleModal({ ...roleModal, open })}
          onSave={roleModal.mode === 'create' ? handleCreateRole : handleUpdateRole}
          role={roleModal.data}
          mode={roleModal.mode}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialog?.open} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente <strong>{deleteDialog?.name}</strong>.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Report Preview Modal */}
        {previewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="w-full max-w-6xl rounded-lg bg-white shadow-xl my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Previsualización del Reporte de Catálogos</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    Ajusta los filtros y verifica los datos antes de descargar
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPreviewOpen(false)}
                  className="text-white hover:bg-blue-800"
                >
                  ✕
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Filtros */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-sm">
                  <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filtros del Reporte
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-blue-900 mb-2 block">
                        Tipo de Catálogo
                      </label>
                      <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Todos los catálogos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los catálogos</SelectItem>
                          <SelectItem value="branches">Sucursales</SelectItem>
                          <SelectItem value="departments">Departamentos</SelectItem>
                          <SelectItem value="roles">Roles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Resumen de estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {(filterType === 'all' || filterType === 'branches') && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center transform transition hover:scale-105">
                      <div className="text-3xl font-bold text-blue-700">{branches.length}</div>
                      <div className="text-sm text-blue-600 font-medium mt-1">Sucursales</div>
                    </div>
                  )}
                  {(filterType === 'all' || filterType === 'departments') && (
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 text-center transform transition hover:scale-105">
                      <div className="text-3xl font-bold text-indigo-700">{departments.length}</div>
                      <div className="text-sm text-indigo-600 font-medium mt-1">Departamentos</div>
                    </div>
                  )}
                  {(filterType === 'all' || filterType === 'roles') && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-center transform transition hover:scale-105">
                      <div className="text-3xl font-bold text-purple-700">{roles.length}</div>
                      <div className="text-sm text-purple-600 font-medium mt-1">Roles</div>
                    </div>
                  )}
                </div>

                {/* Vista previa de datos */}
                {(filterType === 'all' || filterType === 'branches') && branches.length > 0 && (
                  <div className="border rounded-lg overflow-hidden shadow-sm mb-6">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Sucursales ({branches.length} registros)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-600 text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Dirección</th>
                            <th className="px-3 py-2 text-left">Región</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branches.slice(0, 5).map((branch, idx) => (
                            <tr key={branch.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="px-3 py-2 border-t font-medium">{branch.name}</td>
                              <td className="px-3 py-2 border-t">{branch.address}</td>
                              <td className="px-3 py-2 border-t">{branch.region}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {branches.length > 5 && (
                      <div className="bg-gray-50 px-4 py-3 border-t text-center">
                        <p className="text-xs text-gray-600">
                          ... y {branches.length - 5} sucursales más en el reporte completo
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {(filterType === 'all' || filterType === 'departments') && departments.length > 0 && (
                  <div className="border rounded-lg overflow-hidden shadow-sm mb-6">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Departamentos ({departments.length} registros)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-600 text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departments.slice(0, 5).map((dept, idx) => (
                            <tr key={dept.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="px-3 py-2 border-t font-medium">{dept.name}</td>
                              <td className="px-3 py-2 border-t">{dept.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {departments.length > 5 && (
                      <div className="bg-gray-50 px-4 py-3 border-t text-center">
                        <p className="text-xs text-gray-600">
                          ... y {departments.length - 5} departamentos más en el reporte completo
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {(filterType === 'all' || filterType === 'roles') && roles.length > 0 && (
                  <div className="border rounded-lg overflow-hidden shadow-sm mb-6">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Roles ({roles.length} registros)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-600 text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roles.slice(0, 5).map((role, idx) => (
                            <tr key={role.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="px-3 py-2 border-t font-medium">{role.name}</td>
                              <td className="px-3 py-2 border-t">{role.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {roles.length > 5 && (
                      <div className="bg-gray-50 px-4 py-3 border-t text-center">
                        <p className="text-xs text-gray-600">
                          ... y {roles.length - 5} roles más en el reporte completo
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setPreviewOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    downloadReport();
                    setPreviewOpen(false);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
