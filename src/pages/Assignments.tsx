import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, PackageCheck, Pencil, Trash2 } from "lucide-react";
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
import { type Assignment } from "@/data/mockDataExtended";
import { assignmentsApi, type CreateAssignmentDto } from "@/api/assignments";
import { peopleApi } from '@/api/people';
import { devicesApi } from '@/api/devices';
import { getBranches } from '@/api/catalogs';
import { sortPeopleByName, sortAssetsByName, sortBranchesByName } from '@/lib/sort';
import { useSort } from '@/lib/useSort';
import AssignmentFormModal from "@/components/AssignmentFormModal";
import ReturnAssignmentModal from "@/components/ReturnAssignmentModal";
import { useToast } from "@/hooks/use-toast";

const conditionVariantMap = {
  excellent: 'success' as const,
  good: 'default' as const,
  fair: 'warning' as const,
  poor: 'destructive' as const,
};
const conditionLabelMap = {
  excellent: 'Excelente',
  good: 'Bueno',
  fair: 'Regular',
  poor: 'Malo',
};

/**
 * Convierte una cadena local "YYYY-MM-DDTHH:mm" o "YYYY-MM-DD" en un string ISO UTC correctamente,
 * para que al guardarla no se descuadre respecto a tu zona local.
 */
function convertLocalToUTCISOString(localDateTime: string): string {
  // Verificar si tiene hora o solo fecha
  const hasTime = localDateTime.includes("T")

  let year: number, month: number, day: number, hour: number, minute: number

  if (hasTime) {
    // Formato: "2025-10-08T10:58"
    const [datePart, timePart] = localDateTime.split("T")
    ;[year, month, day] = datePart.split("-").map(Number)
    ;[hour, minute] = timePart.split(":").map(Number)
  } else {
    // Formato: "2025-10-08" (solo fecha, asumir medianoche)
    ;[year, month, day] = localDateTime.split("-").map(Number)
    hour = 0
    minute = 0
  }

  // Crear la fecha en hora local explícita:
  const localDate = new Date(year, month - 1, day, hour, minute)
  // Restar el offset local para obtener UTC en milisegundos
  const utcMillis = localDate.getTime() - localDate.getTimezoneOffset() * 60000
  return new Date(utcMillis).toISOString()
}

export default function Assignments() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assets, setAssets] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [people, setPeople] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [assignmentToReturn, setAssignmentToReturn] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const [data, peopleList, assetList, branchList] = await Promise.all([
        assignmentsApi.getAll(),
        peopleApi.getAll(),
        devicesApi.getAll(),
        getBranches(),
      ]);

      setAssignments(data);

      setPeople(sortPeopleByName(peopleList.map((p: any) => ({ id: String(p.id), firstName: p.firstName, lastName: p.lastName }))));
      // Mostrar únicamente activos disponibles para asignación
      setAssets(sortAssetsByName(assetList
        .filter((a: any) => a.status === 'available')
        .map((a: any) => ({ id: String(a.id), code: a.assetCode || a.assetCode, name: `${a.brand || ''} ${a.model || ''}`.trim() })),
      ));
      setBranches(sortBranchesByName(branchList.map((b: any) => ({ id: b.id, name: b.name }))));
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las asignaciones o datos relacionados",
        variant: "destructive"
      });
    }
  };

  const handleCreate = async (data: CreateAssignmentDto) => {
    try {
      const converted = {
        ...data,
        assignmentDate: convertLocalToUTCISOString(data.assignmentDate)
      };
      const result = await assignmentsApi.create(converted);

      // Insertar la nueva asignación en el estado local
      setAssignments((prev) => [result.assignment, ...prev]);

      // Si el backend devolvió el asset actualizado (ahora asignado), eliminarlo
      // de la lista de assets disponibles para asignación
      if (result.asset) {
        setAssets((prev) => prev.filter((a) => String(a.id) !== String(result.asset.id)));
        // Notificar a otras páginas (Devices) que el asset fue actualizado
        try {
          window.dispatchEvent(new CustomEvent('asset-updated', { detail: result.asset }));
        } catch (e) {
          // noop
        }
      }
      toast({
        title: "Éxito",
        description: "Asignación creada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la asignación",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleUpdate = async (data: CreateAssignmentDto) => {
    if (!selectedAssignment) return;
    try {
      const converted = {
        ...data,
        assignmentDate: convertLocalToUTCISOString(data.assignmentDate)
      };
      await assignmentsApi.update(selectedAssignment.id, converted);
      await loadAssignments();
      toast({
        title: "Éxito",
        description: "Asignación actualizada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la asignación",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleReturn = async (returnCondition: 'excellent' | 'good' | 'fair' | 'poor', returnNotes?: string) => {
    if (!assignmentToReturn) return;
    try {
      const result = await assignmentsApi.registerReturn(assignmentToReturn, returnCondition, returnNotes);

      // Actualizar estado local de assignments: reemplazar la asignación actualizada
      setAssignments((prev) => prev.map((a) => (String(a.id) === String(result.assignment.id) ? result.assignment : a)));

      // Si el backend devolvió el asset actualizado, agregar/actualizar en assets (solo si está disponible)
      if (result.asset) {
        const assetStatus = (result.asset.status as string) || '';
        setAssets((prev) => {
          // Si el asset ahora está disponible y no está en la lista, añadirlo
          const exists = prev.some((x) => String(x.id) === String(result.asset.id));
          if (assetStatus === 'available' && !exists) {
            return sortAssetsByName([{ id: String(result.asset.id), code: result.asset.assetCode || result.asset.assetCode, name: `${result.asset.brand || ''} ${result.asset.model || ''}`.trim() }, ...prev]);
          }
          // Si ya existe, devolver prev sin cambios (la UI de assets puede refrescarse donde aplique)
          return prev;
        });
        // Notificar a otras páginas (Devices) que el asset fue actualizado
        try {
          window.dispatchEvent(new CustomEvent('asset-updated', { detail: result.asset }));
        } catch (e) {
          // noop
        }
      }

      toast({
        title: "Éxito",
        description: "Devolución registrada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la devolución",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!assignmentToDelete) return;
    try {
      await assignmentsApi.delete(assignmentToDelete);
      await loadAssignments();
      toast({
        title: "Éxito",
        description: "Asignación eliminada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la asignación",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    }
  };

  const openCreateModal = () => {
    setSelectedAssignment(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setModalMode('edit');
    // Ensure the assigned asset is present in the assets list so the Select can show it
    const assignedAssetId = String(assignment.assetId);
    const assetFromAssignment = (assignment as any).asset;
    if (assetFromAssignment) {
      const exists = assets.some(a => String(a.id) === String(assetFromAssignment.id));
      if (!exists) {
        setAssets((prev) => sortAssetsByName([{ id: String(assetFromAssignment.id), code: assetFromAssignment.assetCode || assetFromAssignment.assetCode, name: `${assetFromAssignment.brand || ''} ${assetFromAssignment.model || ''}`.trim() }, ...prev]));
      }
    }
    setModalOpen(true);
  };

  const openReturnModal = (assignmentId: string) => {
    setAssignmentToReturn(assignmentId);
    setReturnModalOpen(true);
  };

  const openDeleteDialog = (assignmentId: string) => {
    setAssignmentToDelete(assignmentId);
    setDeleteDialogOpen(true);
  };

  const term = searchTerm.toLowerCase();

  const filteredActive = assignments.filter((assignment) => {
    if (assignment.returnDate) return false;
    const assetCode = (assignment as any).asset?.assetCode?.toLowerCase() || assets.find(a => a.id === String(assignment.assetId))?.code?.toLowerCase() || '';
    const personName = (assignment as any).person ? `${(assignment as any).person.firstName} ${(assignment as any).person.lastName}`.toLowerCase() : (people.find(p => p.id === String(assignment.personId)) ? `${people.find(p => p.id === String(assignment.personId))!.firstName} ${people.find(p => p.id === String(assignment.personId))!.lastName}`.toLowerCase() : '');
    return assetCode.includes(term) || personName.includes(term);
  });

  const filteredHistory = assignments.filter((assignment) => {
    if (!assignment.returnDate) return false;
    const assetCode = (assignment as any).asset?.assetCode?.toLowerCase() || assets.find(a => a.id === String(assignment.assetId))?.code?.toLowerCase() || '';
    const personName = (assignment as any).person ? `${(assignment as any).person.firstName} ${(assignment as any).person.lastName}`.toLowerCase() : (people.find(p => p.id === String(assignment.personId)) ? `${people.find(p => p.id === String(assignment.personId))!.firstName} ${people.find(p => p.id === String(assignment.personId))!.lastName}`.toLowerCase() : '');
    return assetCode.includes(term) || personName.includes(term);
  });

  const sort = useSort();

  const displayedActive = sort.apply(filteredActive, {
    asset: (a: any) => ((a as any).asset?.assetCode) || (assets.find(x => x.id === String(a.assetId))?.code) || '',
    person: (a: any) => ((a as any).person ? `${a.person.firstName} ${a.person.lastName}` : (people.find(p => p.id === String(a.personId)) ? `${people.find(p => p.id === String(a.personId))!.firstName} ${people.find(p => p.id === String(a.personId))!.lastName}` : '')),
    branch: (a: any) => (branches.find(b => b.id === Number(a.branchId))?.name) || '',
    assignmentDate: (a: any) => a.assignmentDate || '',
  });

  const displayedHistory = sort.apply(filteredHistory, {
    asset: (a: any) => ((a as any).asset?.assetCode) || (assets.find(x => x.id === String(a.assetId))?.code) || '',
    person: (a: any) => ((a as any).person ? `${a.person.firstName} ${a.person.lastName}` : (people.find(p => p.id === String(a.personId)) ? `${people.find(p => p.id === String(a.personId))!.firstName} ${people.find(p => p.id === String(a.personId))!.lastName}` : '')),
    branch: (a: any) => (branches.find(b => b.id === Number(a.branchId))?.name) || '',
    assignmentDate: (a: any) => a.assignmentDate || '',
  });

  return (
    <>
      <Layout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Asignaciones</h1>
              <p className="text-muted-foreground mt-1">
                Historial de asignaciones de equipos
              </p>
            </div>
            <Button className="gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Nueva Asignación
            </Button>
          </div>

          {/* Search & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por persona o código de activo..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-center bg-muted rounded-lg p-4">
                <div className="text-center">
                  <p className="text-xl font-bold">
                    {assignments.filter(a => !a.returnDate).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Activas</p>
                </div>
              </div>
              <div className="flex items-center justify-center bg-muted rounded-lg p-4">
                <div className="text-center">
                  <p className="text-xl font-bold">
                    {assignments.filter(a => a.returnDate).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Devueltas</p>
                </div>
              </div>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2 mt-4">
            <Button variant={viewMode === 'active' ? 'default' : 'outline'} onClick={() => setViewMode('active')}>Activos</Button>
            <Button variant={viewMode === 'history' ? 'default' : 'outline'} onClick={() => setViewMode('history')}>Historial</Button>
          </div>

          {/* Activos (asignados) */}
          {viewMode === 'active' && (
            <div className="border rounded-lg bg-card p-4 space-y-4">
              <h2 className="text-lg font-semibold">Activos</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('asset')}>Activo {sort.key === 'asset' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('person')}>Persona {sort.key === 'person' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('branch')}>Sucursal {sort.key === 'branch' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('assignmentDate')}>Fecha Asignación {sort.key === 'assignmentDate' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead>Condición Entrega</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedActive.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div>
                        <h3 className="text-lg font-semibold">No hay activos asignados</h3>
                        <p className="text-sm text-muted-foreground">No se encontraron asignaciones activas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedActive.map((assignment) => {
                  const asset = (assignment as any).asset || assets.find(a => a.id === String(assignment.assetId));
                  const person = (assignment as any).person || people.find(p => p.id === String(assignment.personId));
                  const branch = branches.find(b => b.id === Number(assignment.branchId));
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{asset?.assetCode ?? asset?.code}</p>
                          <p className="text-sm text-muted-foreground">{(asset?.brand || '') + ' ' + (asset?.model || '')}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{person ? `${person.firstName} ${person.lastName}` : 'N/A'}</TableCell>
                      <TableCell className="text-sm">{branch ? branch.name : 'N/A'}</TableCell>
                      <TableCell className="text-sm">{format(new Date(assignment.assignmentDate), 'PPpp', { locale: es })}</TableCell>
                      <TableCell><Badge variant={conditionVariantMap[assignment.deliveryCondition]}>{conditionLabelMap[assignment.deliveryCondition]}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditModal(assignment)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700" onClick={() => openReturnModal(assignment.id)}>
                            <PackageCheck className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(assignment.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                  })
                )}
              </TableBody>
            </Table>
            </div>
          )}

          {/* Historial (devueltas) */}
          {viewMode === 'history' && (
            <div className="border rounded-lg bg-card p-4 mt-6 space-y-4">
              <h2 className="text-lg font-semibold">Historial</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('asset')}>Activo {sort.key === 'asset' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('person')}>Persona {sort.key === 'person' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('branch')}>Sucursal {sort.key === 'branch' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('assignmentDate')}>Fecha Asignación {sort.key === 'assignmentDate' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('assignmentDate')}>Fecha Devolución {sort.key === 'assignmentDate' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead>Condición Devolución</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div>
                        <h3 className="text-lg font-semibold">No hay historial actual</h3>
                        <p className="text-sm text-muted-foreground">Aún no hay devoluciones registradas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedHistory.map((assignment) => {
                  const asset = (assignment as any).asset || assets.find(a => a.id === String(assignment.assetId));
                  const person = (assignment as any).person || people.find(p => p.id === String(assignment.personId));
                  const branch = branches.find(b => b.id === Number(assignment.branchId));
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{asset?.assetCode ?? asset?.code}</p>
                          <p className="text-sm text-muted-foreground">{(asset?.brand || '') + ' ' + (asset?.model || '')}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{person ? `${person.firstName} ${person.lastName}` : 'N/A'}</TableCell>
                      <TableCell className="text-sm">{branch ? branch.name : 'N/A'}</TableCell>
                      <TableCell className="text-sm">{format(new Date(assignment.assignmentDate), 'PPpp', { locale: es })}</TableCell>
                      <TableCell className="text-sm">{assignment.returnDate ? format(new Date(assignment.returnDate), 'PPpp', { locale: es }) : '-'}</TableCell>
                      <TableCell>{assignment.returnCondition ? <Badge variant={conditionVariantMap[assignment.returnCondition]}>{conditionLabelMap[assignment.returnCondition]}</Badge> : <span className="text-sm text-muted-foreground">-</span>}</TableCell>
                    </TableRow>
                  )
                  })
                )}
              </TableBody>
            </Table>
            </div>
          )}

          {(filteredActive.length === 0 && filteredHistory.length === 0) && (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No se encontraron asignaciones</h3>
              <p className="text-muted-foreground">
                Intenta con otros términos de búsqueda
              </p>
            </div>
          )}
        </div>
      </Layout>

      <AssignmentFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={modalMode === 'create' ? handleCreate : handleUpdate}
        assignment={selectedAssignment}
        mode={modalMode}
        assets={assets}
        people={people}
        branches={branches}
      />

      <ReturnAssignmentModal
        open={returnModalOpen}
        onOpenChange={setReturnModalOpen}
        onSave={handleReturn}
        assignmentId={assignmentToReturn || ""}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la asignación.
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
