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
import {
  type Assignment,
  getPersonName,
  getAssetInfo,
  getBranchName,
  mockAssets,
  mockBranches,
  mockPeople
} from "@/data/mockDataExtended";
import { assignmentsApi, type CreateAssignmentDto } from "@/api/assignments";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [assignmentToReturn, setAssignmentToReturn] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const data = await assignmentsApi.getAll();
      setAssignments(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las asignaciones",
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
      await assignmentsApi.create(converted);
      await loadAssignments();
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
      await assignmentsApi.registerReturn(assignmentToReturn, returnCondition, returnNotes);
      await loadAssignments();
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

  const filteredAssignments = assignments.filter((assignment) => {
    //const personName = getPersonName(assignment.personId).toLowerCase();
    const assetInfo = getAssetInfo(assignment.assetId);
    const assetCode = assetInfo?.assetCode.toLowerCase() || '';
    return (
      //personName.includes(searchTerm.toLowerCase()) ||
      assetCode.includes(searchTerm.toLowerCase())
    );
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

          {/* Table */}
          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activo</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Fecha Asignación</TableHead>
                  <TableHead>Condición Entrega</TableHead>
                  <TableHead>Fecha Devolución</TableHead>
                  <TableHead>Condición Devolución</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => {
                  const asset = getAssetInfo(assignment.assetId);
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{asset?.assetCode}</p>
                          <p className="text-sm text-muted-foreground">
                            {asset?.brand} {asset?.model}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        // {getPersonName(assignment.personId)}
                      </TableCell>
                      <TableCell className="text-sm">{getBranchName(assignment.branchId)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(assignment.assignmentDate), 'PPpp', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={conditionVariantMap[assignment.deliveryCondition]}>
                          {conditionLabelMap[assignment.deliveryCondition]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignment.returnDate
                          ? format(new Date(assignment.returnDate), 'PPpp', { locale: es })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {assignment.returnCondition ? (
                          <Badge variant={conditionVariantMap[assignment.returnCondition]}>
                            {conditionLabelMap[assignment.returnCondition]}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditModal(assignment)}
                            disabled={!!assignment.returnDate}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!assignment.returnDate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              onClick={() => openReturnModal(assignment.id)}
                            >
                              <PackageCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredAssignments.length === 0 && (
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
        assets={mockAssets.map(a => ({ id: a.id, code: a.assetCode, name: `${a.brand} ${a.model}` }))}
        people={mockPeople.map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName }))}
        branches={mockBranches}
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
