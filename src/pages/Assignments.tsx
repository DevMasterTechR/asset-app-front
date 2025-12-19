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
import { Search, Plus, PackageCheck, Pencil, Trash2, Download } from "lucide-react";
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
import { sortAssetsByName, sortBranchesByName, sortByString } from '@/lib/sort';
import { extractArray } from '@/lib/extractData';
import { useSort } from '@/lib/useSort';
import AssignmentFormModal from "@/components/AssignmentFormModal";
import ReturnAssignmentModal from "@/components/ReturnAssignmentModal";
import { useToast } from "@/hooks/use-toast";
import Pagination, { DEFAULT_PAGE_SIZE } from '@/components/Pagination';
import { generateAssignmentsReportPDF, type AssignmentSummary, type AssignmentReport } from '@/lib/pdfGenerator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Componente del Modal de Previsualización - Definido antes del componente principal
const PreviewReportModal = ({
  assignments, 
  assets, 
  people, 
  branches, 
  onClose,
  toast 
}: {
  assignments: Assignment[];
  assets: Array<{ id: string; code: string; name: string; brand?: string; model?: string; purchaseDate?: string; assetCode?: string }>;
  people: Array<{ id: string; firstName: string; lastName: string }>;
  branches: Array<{ id: number; name: string }>;
  onClose: () => void;
  toast: any;
}) => {
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calcular datos filtrados
  const getFilteredData = () => {
    let filtered = [...assignments];

    if (filterBranchId !== 'all') {
      filtered = filtered.filter(a => String(a.branchId) === filterBranchId);
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate);
      filtered = filtered.filter(a => new Date(a.assignmentDate) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(a => new Date(a.assignmentDate) <= end);
    }

    const assignmentsForReport: AssignmentReport[] = filtered.map(a => {
      const assetFromAssignment = (a as any).asset;
      const assetFromList = assets.find(x => String(x.id) === String(a.assetId));
      const asset = assetFromAssignment || assetFromList;
      const person = (a as any).person || people.find(p => String(p.id) === String(a.personId));
      const branch = branches.find(b => b.id === Number(a.branchId));

      // Obtener el tipo de asset correctamente desde múltiples fuentes
      const assetType = assetFromAssignment?.assetType || 
                        assetFromAssignment?.type || 
                        (assetFromList?.name ? assetFromList.name.split(' ')[0] : null) ||
                        'Dispositivo';

      return {
        id: a.id,
        assetCode: asset?.assetCode || asset?.code || 'N/A',
        assetType: assetType,
        assetBrand: asset?.brand || '',
        assetModel: asset?.model || '',
        personName: person ? `${person.firstName} ${person.lastName}` : 'N/A',
        branchName: branch?.name || 'N/A',
        assignmentDate: a.assignmentDate,
        returnDate: a.returnDate,
        deliveryCondition: a.deliveryCondition,
        returnCondition: a.returnCondition,
        isActive: !a.returnDate,
      };
    });

    const summary: AssignmentSummary = {
      totalActive: filtered.filter(a => !a.returnDate).length,
      totalHistory: filtered.filter(a => a.returnDate).length,
      totalGlobal: filtered.length,
    };

    const filterBranchName = filterBranchId === 'all' 
      ? 'Todas' 
      : branches.find(b => String(b.id) === filterBranchId)?.name || 'N/A';

    return { assignmentsForReport, summary, filterBranchName };
  };

  const previewData = getFilteredData();

  const downloadReport = async () => {
    try {
      await generateAssignmentsReportPDF(
        previewData.assignmentsForReport,
        previewData.summary,
        'Departamento de Sistemas',
        previewData.filterBranchName,
        filterStartDate ? new Date(filterStartDate).toLocaleDateString('es-ES') : undefined,
        filterEndDate ? new Date(filterEndDate).toLocaleDateString('es-ES') : undefined
      );

      onClose();
      toast({
        title: "Éxito",
        description: "Reporte generado correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-6xl rounded-lg bg-white shadow-xl my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Previsualización del Reporte</h2>
            <p className="text-sm text-blue-100 mt-1">
              Ajusta los filtros y verifica los datos antes de descargar
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-blue-900 mb-2 block">
                  Sucursal
                </label>
                <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-900 mb-2 block">
                  Fecha inicio
                </label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-900 mb-2 block">
                  Fecha fin
                </label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          {/* Resumen de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-blue-700">{previewData.summary.totalGlobal}</div>
              <div className="text-sm text-blue-600 font-medium mt-1">Total Global</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-green-700">{previewData.summary.totalActive}</div>
              <div className="text-sm text-green-600 font-medium mt-1">Asignaciones Activas</div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-gray-700">{previewData.summary.totalHistory}</div>
              <div className="text-sm text-gray-600 font-medium mt-1">Historial (Devueltas)</div>
            </div>
          </div>

          {/* Tabla de previsualización */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-700">
                Vista previa de asignaciones ({previewData.assignmentsForReport.length} registros)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Mostrando las primeras 10 asignaciones del reporte
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Activo</th>
                    <th className="px-3 py-2 text-left">Persona</th>
                    <th className="px-3 py-2 text-left">Sucursal</th>
                    <th className="px-3 py-2 text-left">F. Asignación</th>
                    <th className="px-3 py-2 text-left">F. Devolución</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2 text-center">C. Entrega</th>
                    <th className="px-3 py-2 text-center">C. Devolución</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.assignmentsForReport.slice(0, 10).map((assignment, idx) => (
                    <tr key={assignment.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-3 py-2 border-t">{assignment.assetType}</td>
                      <td className="px-3 py-2 border-t font-medium">{assignment.assetCode}</td>
                      <td className="px-3 py-2 border-t">{`${assignment.assetBrand || ''} ${assignment.assetModel || ''}`.trim()}</td>
                      <td className="px-3 py-2 border-t">{assignment.personName}</td>
                      <td className="px-3 py-2 border-t">{assignment.branchName}</td>
                      <td className="px-3 py-2 border-t">{new Date(assignment.assignmentDate).toLocaleDateString('es-ES')}</td>
                      <td className="px-3 py-2 border-t">
                        {assignment.returnDate ? new Date(assignment.returnDate).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td className="px-3 py-2 border-t text-center">
                        <Badge variant={assignment.isActive ? 'default' : 'secondary'}>
                          {assignment.isActive ? 'ACTIVA' : 'DEVUELTA'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 border-t text-center">
                        <Badge variant={conditionVariantMap[assignment.deliveryCondition as keyof typeof conditionVariantMap]}>
                          {conditionLabelMap[assignment.deliveryCondition as keyof typeof conditionLabelMap]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 border-t text-center">
                        {assignment.returnCondition ? (
                          <Badge variant={conditionVariantMap[assignment.returnCondition as keyof typeof conditionVariantMap]}>
                            {conditionLabelMap[assignment.returnCondition as keyof typeof conditionLabelMap]}
                          </Badge>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.assignmentsForReport.length > 10 && (
              <div className="bg-gray-50 px-4 py-3 border-t text-center">
                <p className="text-xs text-gray-600">
                  ... y {previewData.assignmentsForReport.length - 10} asignaciones más en el reporte completo
                </p>
              </div>
            )}
            {previewData.assignmentsForReport.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">No hay asignaciones que cumplan con los filtros seleccionados</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={downloadReport}
            disabled={!previewData.assignmentsForReport.length}
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

const isOlderThanFiveYears = (purchaseDate?: string) => {
  if (!purchaseDate) return false;
  const date = new Date(purchaseDate);
  if (Number.isNaN(date.getTime())) return false;
  const threshold = new Date();
  threshold.setFullYear(threshold.getFullYear() - 5);
  return date <= threshold;
};

const oldAssetClass = "text-red-700 font-semibold animate-[pulse_0.9s_ease-in-out_infinite]";

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
  const [assets, setAssets] = useState<Array<{ id: string; code: string; name: string; brand?: string; model?: string; purchaseDate?: string; assetCode?: string }>>([]);
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
      // Normalizar respuestas: pueden venir como array o como { data, total, ... }
      const assignmentsList = extractArray<any>(data);
      const peopleArray = extractArray<any>(peopleList);
      const assetsArray = extractArray<any>(assetList);
      const branchesArray = extractArray<any>(branchList);

      setAssignments(assignmentsList as Assignment[]);

      setPeople(sortByString((peopleArray || []).map((p: any) => ({ id: String(p.id), firstName: p.firstName, lastName: p.lastName })), (p: any) => `${p.firstName || ''} ${p.lastName || ''}`.trim()));
      // Mostrar únicamente activos disponibles para asignación, excluyendo dispositivos de seguridad
      setAssets(sortAssetsByName((assetsArray || [])
        .filter((a: any) => (a.status || '').toString() === 'available' && a.assetType !== 'security')
        .map((a: any) => ({ id: String(a.id), code: a.assetCode || a.assetCode, name: `${a.brand || ''} ${a.model || ''}`.trim(), brand: a.brand, model: a.model, purchaseDate: a.purchaseDate, assetCode: a.assetCode })),
      ));
      setBranches(sortBranchesByName((branchesArray || []).map((b: any) => ({ id: Number(b.id), name: b.name }))));
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
      
      // Liberar el equipo anterior a disponible
      const previousAssetId = selectedAssignment.assetId;
      if (previousAssetId) {
        try {
          await devicesApi.update(parseInt(previousAssetId), { status: 'available' });
          window.dispatchEvent(new CustomEvent('asset-updated', { detail: { id: previousAssetId, status: 'available' } }));
        } catch (e) {
          console.warn('No se pudo liberar el equipo anterior:', e);
        }
      }
      
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
            return sortAssetsByName([{ id: String(result.asset.id), code: result.asset.assetCode || result.asset.assetCode, name: `${result.asset.brand || ''} ${result.asset.model || ''}`.trim(), brand: result.asset.brand, model: result.asset.model, purchaseDate: result.asset.purchaseDate, assetCode: result.asset.assetCode }, ...prev]);
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
      // Obtener la asignación a eliminar para acceder al assetId
      const assignmentToRemove = assignments.find(a => a.id === assignmentToDelete);
      
      await assignmentsApi.delete(assignmentToDelete);
      
      // Liberar el equipo a disponible
      if (assignmentToRemove?.assetId) {
        try {
          await devicesApi.update(parseInt(assignmentToRemove.assetId), { status: 'available' });
          window.dispatchEvent(new CustomEvent('asset-updated', { detail: { id: assignmentToRemove.assetId, status: 'available' } }));
        } catch (e) {
          console.warn('No se pudo liberar el equipo:', e);
        }
      }
      
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

  // Pagination for active and history tables (client-side)
  const [activePage, setActivePage] = useState(1);
  const [activeLimit, setActiveLimit] = useState(DEFAULT_PAGE_SIZE);
  const activeTotalPages = Math.max(1, Math.ceil(displayedActive.length / activeLimit));
  const paginatedActive = displayedActive.slice((activePage - 1) * activeLimit, activePage * activeLimit);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(DEFAULT_PAGE_SIZE);
  const historyTotalPages = Math.max(1, Math.ceil(displayedHistory.length / historyLimit));
  const paginatedHistory = displayedHistory.slice((historyPage - 1) * historyLimit, historyPage * historyLimit);

  // Estado para previsualización del reporte
  const [previewOpen, setPreviewOpen] = useState(false);

  const openPreview = () => {
    setPreviewOpen(true);
  };

  return (
    <>
      <Layout>
        <div className="p-6 md:pl-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Asignaciones</h1>
              <p className="text-muted-foreground mt-1">
                Historial de asignaciones de equipos
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" className="gap-2" onClick={openPreview}>
                <Download className="h-4 w-4" />
                Generar Reporte PDF
              </Button>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                Nueva Asignación
              </Button>
            </div>
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
                  onChange={(e) => { setSearchTerm(e.target.value); setActivePage(1); setHistoryPage(1); }}
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
                  paginatedActive.map((assignment) => {
                  const asset = (assignment as any).asset || assets.find(a => a.id === String(assignment.assetId));
                  const person = (assignment as any).person || people.find(p => p.id === String(assignment.personId));
                  const branch = branches.find(b => b.id === Number(assignment.branchId));
                  const isOld = isOlderThanFiveYears((asset as any)?.purchaseDate || (asset as any)?.purchase_date);
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className={isOld ? oldAssetClass : ''}>
                          <p className="font-medium">{asset?.assetCode ?? asset?.code}</p>
                          <p className={`text-sm ${isOld ? 'text-red-600' : 'text-muted-foreground'}`}>{(asset?.brand || '') + ' ' + (asset?.model || '')}</p>
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
          {/* Pagination for active */}
          {viewMode === 'active' && (
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {activePage} / {activeTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={activePage} totalPages={activeTotalPages} onPageChange={setActivePage} limit={activeLimit} onLimitChange={(l) => { setActiveLimit(l); setActivePage(1); }} />
              </div>
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
                  paginatedHistory.map((assignment) => {
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
          {/* Pagination for history */}
          {viewMode === 'history' && (
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {historyPage} / {historyTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} limit={historyLimit} onLimitChange={(l) => { setHistoryLimit(l); setHistoryPage(1); }} />
              </div>
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

      {/* Modal de Previsualización del Reporte */}
      {previewOpen && (
        <PreviewReportModal
          assignments={assignments}
          assets={assets}
          people={people}
          branches={branches}
          onClose={() => setPreviewOpen(false)}
          toast={toast}
        />
      )}
    </>
  );
}
