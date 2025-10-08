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
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Branch, Department, Role } from '@/data/mockDataExtended';
import * as catalogsApi from '@/api/catalogs';
import BranchFormModal from '@/components/BranchFormModal';
import DepartmentFormModal from '@/components/DepartmentFormModal';
import RoleFormModal from '@/components/RoleFormModal';

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
      setBranches(branchesData);
      setDepartments(departmentsData);
      setRoles(rolesData);
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
      await catalogsApi.updateBranch(branchModal.data.id, data);
      await loadData();
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
      await catalogsApi.updateDepartment(departmentModal.data.id, data);
      await loadData();
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
      await catalogsApi.updateRole(roleModal.data.id, data);
      await loadData();
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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Catálogos</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de sucursales, departamentos y roles
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="branches" className="space-y-6">
          <TabsList>
            <TabsTrigger value="branches">Sucursales</TabsTrigger>
            <TabsTrigger value="departments">Departamentos</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          {/* Sucursales */}
          <TabsContent value="branches" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sucursales</h2>
              <Button onClick={() => setBranchModal({ open: true, mode: 'create', data: null })}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Sucursal
              </Button>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Región</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => (
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
          </TabsContent>

          {/* Departamentos */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Departamentos</h2>
              <Button onClick={() => setDepartmentModal({ open: true, mode: 'create', data: null })}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Departamento
              </Button>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead> {/* ← Nuevo */}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.description}</TableCell> {/* ← Nuevo */}
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
          </TabsContent>

          {/* Roles */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Roles</h2>
              <Button onClick={() => setRoleModal({ open: true, mode: 'create', data: null })}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Rol
              </Button>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
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
      </div>
    </Layout>
  );
}
