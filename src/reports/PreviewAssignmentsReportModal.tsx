import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { generateAssignmentsReportPDF, type AssignmentSummary, type AssignmentReport } from '@/reports/pdfGenerator';
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

interface Assignment {
  id: string;
  assetId: string | number;
  personId: string | number;
  branchId: number | string;
  assignmentDate: string;
  returnDate?: string;
  deliveryCondition: string;
  returnCondition?: string;
}

export default function PreviewAssignmentsReportModal({
  assignments, 
  assets, 
  people, 
  branches, 
  onClose,
  toast 
}: {
  assignments: Assignment[];
  assets: Array<{ id: string; code: string; name: string; brand?: string; model?: string; purchaseDate?: string; assetCode?: string; procesador?: string; mica?: string }>;
  people: Array<{ id: string; firstName: string; lastName: string }>;
  branches: Array<{ id: number; name: string }>;
  onClose: () => void;
  toast: any;
}) {
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

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
      const assetFromList = assets.find(x => String(x.id) === String(a.assetId));
      const person = people.find(p => String(p.id) === String(a.personId));
      const branch = branches.find(b => b.id === Number(a.branchId));

      const assetType = assetFromList?.name ? assetFromList.name.split(' ')[0] : 'Dispositivo';

      return {
        id: a.id,
        assetCode: assetFromList?.assetCode || assetFromList?.code || 'N/A',
        assetType: assetType,
        assetBrand: assetFromList?.brand || '',
        assetModel: assetFromList?.model || '',
        personName: person ? `${person.firstName} ${person.lastName}` : 'N/A',
        branchName: branch?.name || 'N/A',
        assignmentDate: a.assignmentDate,
        returnDate: a.returnDate,
        deliveryCondition: a.deliveryCondition,
        returnCondition: a.returnCondition,
        isActive: !a.returnDate,
        // Agregar procesador solo para laptop
        procesador: assetType.toLowerCase().includes('laptop') ? assetFromList?.procesador || '' : undefined,
        // Agregar mica solo para celular
        mica: assetType.toLowerCase().includes('celular') ? assetFromList?.mica || '' : undefined,
        // Agregar año de compra solo para laptop
        anioCompra: assetType.toLowerCase().includes('laptop') && assetFromList?.purchaseDate ? new Date(assetFromList.purchaseDate).getFullYear() : undefined,
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
      setIsGenerating(true);
      setProgress(0);
      await generateAssignmentsReportPDF(
        previewData.assignmentsForReport,
        previewData.summary,
        'Departamento de Sistemas',
        previewData.filterBranchName,
        filterStartDate ? new Date(filterStartDate).toLocaleDateString('es-ES') : undefined,
        filterEndDate ? new Date(filterEndDate).toLocaleDateString('es-ES') : undefined,
        (p) => setProgress(Math.round(p * 100))
      );

      setIsGenerating(false);
      onClose();
      toast({
        title: "Éxito",
        description: "Reporte generado correctamente"
      });
    } catch (error) {
      setIsGenerating(false);
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

        <div className="p-6 max-h-[70vh] overflow-y-auto">
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

        <div className="border-t px-6 py-4 bg-gray-50 rounded-b-lg">
          {isGenerating ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={progress} />
              </div>
              <span className="w-16 text-sm text-gray-600 text-right">{progress}%</span>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
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
          )}
        </div>
      </div>
    </div>
  );
}