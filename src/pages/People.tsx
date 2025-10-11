import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
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
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { type Person } from "@/data/mockDataExtended";
import { peopleApi, type CreatePersonDto } from "@/api/people";
import * as catalogsApi from "@/api/catalogs";
import PersonFormModal from "@/components/PeopleFormModal";
import { useToast } from "@/hooks/use-toast";

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
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [peopleData, branchesData, departmentsData, rolesData] = await Promise.all([
        peopleApi.getAll(),
        catalogsApi.getBranches(),
        catalogsApi.getDepartments(),
        catalogsApi.getRoles(),
      ]);
      
      setPeople(peopleData);
      setBranches(branchesData.map(b => ({ id: b.id, name: b.name })));
      setDepartments(departmentsData.map(d => ({ id: d.id, name: d.name })));
      setRoles(rolesData.map(r => ({ id: r.id, name: r.name })));
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
      toast({
        title: "Error",
        description: "No se pudo eliminar la persona",
        variant: "destructive"
      });
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

  const filteredPeople = people.filter(
    (person) =>
      person.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.nationalId.includes(searchTerm) ||
      person.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getBranchName = (id?: string | number) => {
    if (!id) return '-';
    const branch = branches.find(b => b.id === String(id));
    return branch?.name || '-';
  };

  const getDepartmentName = (id?: string | number) => {
    if (!id) return '-';
    const dept = departments.find(d => d.id === String(id));
    return dept?.name || '-';
  };

  const getRoleName = (id?: string | number) => {
    if (!id) return '-';
    const role = roles.find(r => r.id === String(id));
    return role?.name || '-';
  };

  return (
    <>
      <Layout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Personas</h1>
              <p className="text-muted-foreground mt-1">
                Gestión de usuarios y empleados
              </p>
            </div>
            <Button className="gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Agregar Persona
            </Button>
          </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre, cédula, usuario..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-center bg-muted rounded-lg p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{filteredPeople.length}</p>
              <p className="text-sm text-muted-foreground">Personas</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeople.map((person) => (
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
    </>
  );
}