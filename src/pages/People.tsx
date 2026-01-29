import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Pagination from '@/components/Pagination';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, Download } from "lucide-react";
import { type Person } from "@/data/mockDataExtended";
import { peopleApi, type CreatePersonDto } from "@/api/people";
import * as catalogsApi from "@/api/catalogs";
import PersonFormModal from "@/components/PeopleFormModal";
import { useToast } from "@/hooks/use-toast";
import { sortPeopleByName, sortBranchesByName, sortByString } from '@/lib/sort';
import { useSort } from '@/lib/useSort';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PreviewPeopleReportModal from '@/reports/PreviewPeopleReportModal';

const statusVariantMap = {
  active: 'success' as const,
  inactive: 'default' as const,
  suspended: 'destructive' as const,
};

const statusLabelMap = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
};

export default function People() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadData(page, limit);
  }, [page, limit]);

  const loadData = async (pageParam = 1, limitParam = 10) => {
    try {
      const [peopleRes, branchesData, departmentsData, rolesData] = await Promise.all([
        peopleApi.getAll(pageParam, limitParam),
        catalogsApi.getBranches(),
        catalogsApi.getDepartments(),
        catalogsApi.getRoles(),
      ]);

      // peopleRes can be either array or paginated object
      if (Array.isArray(peopleRes)) {
        setPeople(sortPeopleByName(peopleRes));
        setTotalItems(peopleRes.length);
        setTotalPages(1);
      } else {
        setPeople(sortPeopleByName(peopleRes.data));
        setTotalItems(Number(peopleRes.total) || 0);
        setTotalPages(Number(peopleRes.totalPages) || 1);
        setPage(Number(peopleRes.page) || pageParam);
        setLimit(Number(peopleRes.limit) || limitParam);
      }

      setBranches(sortBranchesByName(branchesData.map(b => ({ id: Number(b.id), name: b.name }))));
      setDepartments(sortByString(departmentsData.map(d => ({ id: Number(d.id), name: d.name })), d => d.name));
      setRoles(sortByString(rolesData.map(r => ({ id: Number(r.id), name: r.name })), r => r.name));
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    }
  };

  const handleCreate = async (data: CreatePersonDto) => {
    try {
      await peopleApi.create(data);
      await loadData();
      toast({
        title: "Éxito",
        description: "Persona creada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la persona",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleUpdate = async (data: CreatePersonDto) => {
    if (!selectedPerson) return;
    try {
      await peopleApi.update(selectedPerson.id, data);
      await loadData();
      toast({
        title: "Éxito",
        description: "Persona actualizada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la persona",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!personToDelete) return;
    try {
      await peopleApi.delete(personToDelete);
      await loadData();
      toast({
        title: "Éxito",
        description: "Persona eliminada correctamente"
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      // Detectar errores comunes y mostrar mensajes amigables
      const isFk = /foreign key constraint|violates foreign key constraint/i.test(msg);
      const isAssignment = /assignment|assignmenthistory|AssignmentHistory|AssignmentHistory_personId_fkey|assignment_history/i.test(msg);
      const isCredential = /credential|credentials|Credential|Credentials_personId_fkey|credentials_personid_fkey/i.test(msg);

      if (isFk && isAssignment) {
        toast({
          title: "No se puede eliminar",
          description:
            "La persona tiene asignaciones activas. Finaliza o devuelve las asignaciones antes de eliminarla.",
          variant: "destructive",
        });
      } else if (isFk && isCredential) {
        toast({
          title: "No se puede eliminar",
          description:
            "La persona tiene credenciales activas. Elimina o desactiva las credenciales antes de eliminar este usuario.",
          variant: "destructive",
        });
      } else if (isFk) {
        toast({
          title: "No se puede eliminar",
          description:
            "La persona está relacionada con otros registros y no se puede eliminar actualmente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar la persona",
          variant: "destructive",
        });
      }
    } finally {
      setDeleteDialogOpen(false);
      setPersonToDelete(null);
    }
  };

  const openCreateModal = () => {
    setSelectedPerson(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (person: Person) => {
    setSelectedPerson(person);
    setModalMode('edit');
    setModalOpen(true);
  };

  const openDeleteDialog = (personId: string) => {
    setPersonToDelete(personId);
    setDeleteDialogOpen(true);
  };

  const openPreview = () => {
    setPreviewOpen(true);
  };

  const filteredPeople = people.filter((person) => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    const departmentName = departments.find(d => d.id === person.departmentId)?.name || '';
    const roleName = roles.find(r => r.id === person.roleId)?.name || '';
    const branchName = branches.find(b => b.id === person.branchId)?.name || '';
    const statusKey = person.status || '';
    const statusLabel = statusLabelMap[person.status] || '';

    return (
      (person.firstName || '').toLowerCase().includes(search) ||
      (person.lastName || '').toLowerCase().includes(search) ||
      (person.nationalId || '').toLowerCase().includes(search) ||
      (person.username || '').toLowerCase().includes(search) ||
      departmentName.toLowerCase().includes(search) ||
      roleName.toLowerCase().includes(search) ||
      branchName.toLowerCase().includes(search) ||
      statusKey.toLowerCase().includes(search) ||
      statusLabel.toLowerCase().includes(search)
    );
  });

  const sort = useSort();

  const displayedPeople = sort.apply(filteredPeople, {
    name: (p: any) => `${p.lastName || ''} ${p.firstName || ''}`.trim(),
    nationalId: (p: any) => p.nationalId || '',
    username: (p: any) => p.username || '',
    department: (p: any) => getDepartmentName(p.departmentId),
    role: (p: any) => getRoleName(p.roleId),
    branch: (p: any) => getBranchName(p.branchId),
    status: (p: any) => p.status || '',
  });

  // If backend returned paginated results totalPages>1, we use server pagination.
  // Otherwise (backend returned full array), apply client-side slicing.
  const effectiveTotalPages = totalPages > 1 ? totalPages : Math.max(1, Math.ceil(displayedPeople.length / limit));
  const paginatedPeople = totalPages > 1 ? displayedPeople : displayedPeople.slice((page - 1) * limit, page * limit);

  // Ensure current page is valid when filters or limits change
  useEffect(() => {
    if (page > effectiveTotalPages) setPage(1);
  }, [effectiveTotalPages, page]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getBranchName = (id?: number) => {
    if (!id) return '-';
    const branch = branches.find(b => b.id === id);
    return branch?.name || '-';
  };

  const getDepartmentName = (id?: number) => {
    if (!id) return '-';
    const dept = departments.find(d => d.id === id);
    return dept?.name || '-';
  };

  const getRoleName = (id?: number) => {
    if (!id) return '-';
    const role = roles.find(r => r.id === id);
    return role?.name || '-';
  };

  return (
    <>
      <Layout>
        <div className="p-6 md:pl-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Personas</h1>
              <p className="text-muted-foreground mt-1">
                Gestión de usuarios y empleados
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={openPreview} 
                variant="destructive"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Generar Reporte PDF
              </Button>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                Agregar Persona
              </Button>
            </div>
          </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, cédula, usuario, estado..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="flex items-center justify-center bg-muted rounded-lg p-4">
                <div className="text-center">
                <p className="text-2xl font-bold">{displayedPeople.length}</p>
                <p className="text-sm text-muted-foreground">Personas</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('name')}>Persona {sort.key === 'name' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('nationalId')}>Cédula {sort.key === 'nationalId' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('username')}>Usuario {sort.key === 'username' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('department')}>Departamento {sort.key === 'department' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('role')}>Rol {sort.key === 'role' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('branch')}>Sucursal {sort.key === 'branch' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('status')}>Estado {sort.key === 'status' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPeople.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(person.firstName, person.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {person.firstName} {person.lastName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{person.nationalId}</TableCell>
                    <TableCell className="text-sm">{person.username || '-'}</TableCell>
                    <TableCell className="text-sm">{getDepartmentName(person.departmentId)}</TableCell>
                    <TableCell className="text-sm">{getRoleName(person.roleId)}</TableCell>
                    <TableCell className="text-sm">{getBranchName(person.branchId)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariantMap[person.status]}>
                        {statusLabelMap[person.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditModal(person)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(person.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
            <span className="text-sm text-muted-foreground text-center">Página {page} / {effectiveTotalPages}</span>
            <div className="flex-1 flex justify-end">
              <Pagination
                page={page}
                totalPages={effectiveTotalPages}
                onPageChange={(p) => setPage(p)}
                limit={limit}
                onLimitChange={(l) => { setLimit(l); setPage(1); }}
                limits={[5,10,15,20]}
              />
            </div>
          </div>

          {filteredPeople.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No se encontraron personas</h3>
              <p className="text-muted-foreground">
                Intenta con otros términos de búsqueda
              </p>
            </div>
          )}
        </div>
      </Layout>

      <PersonFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={modalMode === 'create' ? handleCreate : handleUpdate}
        person={selectedPerson}
        mode={modalMode}
        departments={departments}
        roles={roles}
        branches={branches}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la persona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Previsualización del Reporte */}
      {previewOpen && (
        <PreviewPeopleReportModal
          people={people}
          branches={branches}
          departments={departments}
          roles={roles}
          onClose={() => setPreviewOpen(false)}
          toast={toast}
        />
      )}
    </>
  );
}