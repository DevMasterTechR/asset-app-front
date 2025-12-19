import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, EyeOff, X } from "lucide-react";
import { generateSecurityReportPDF, type SecuritySummary, type SecurityReport } from '@/lib/pdfGenerator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface SecurityDevice {
  id: number;
  assetCode: string;
  assetType: string;
  brand?: string;
  model?: string;
  status: string;
  branchId?: number;
  notes?: string;
  attributesJson?: any;
}

interface Branch {
  id: number;
  name: string;
}

export default function PreviewSecurityReportModal({
  devices,
  branches,
  onClose,
  toast,
}: {
  devices: SecurityDevice[];
  branches: Branch[];
  onClose: () => void;
  toast: any;
}) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  // Obtener categorías únicas de dispositivos
  const uniqueCategories = Array.from(
    new Set(devices.map(d => d.attributesJson?.category).filter(Boolean))
  ).sort();

  // Calcular datos filtrados
  const getFilteredData = () => {
    let filtered = [...devices];

    if (filterCategory !== 'all') {
      filtered = filtered.filter(d => d.attributesJson?.category === filterCategory);
    }

    if (filterBranchId !== 'all') {
      filtered = filtered.filter(d => String(d.branchId) === filterBranchId);
    }

    const devicesForReport: SecurityReport[] = filtered.map(d => {
      const branch = branches.find(b => b.id === d.branchId);
      const attrs = d.attributesJson || {};
      return {
        id: d.id,
        assetCode: d.assetCode,
        brand: d.brand,
        model: d.model,
        category: attrs.category || '-',
        quantity: attrs.quantity || 0,
        location: attrs.location || '-',
        status: d.status,
        branchName: branch?.name || 'N/A',
        notes: d.notes || '-',
        imageUrl: attrs.imageUrl || undefined,
      };
    });

    const summary: SecuritySummary = {
      total: filtered.length,
      available: filtered.filter(d => d.status === 'available').length,
      assigned: filtered.filter(d => d.status === 'assigned').length,
      maintenance: filtered.filter(d => d.status === 'maintenance').length,
      decommissioned: filtered.filter(d => d.status === 'decommissioned').length,
    };

    return { devicesForReport, summary };
  };

  const previewData = getFilteredData();

  const downloadReport = async () => {
    try {
      await generateSecurityReportPDF(
        previewData.devicesForReport,
        previewData.summary,
        'Departamento de Seguridad',
        filterCategory !== 'all' ? filterCategory : undefined,
        filterBranchId !== 'all' ? branches.find(b => String(b.id) === filterBranchId)?.name : undefined
      );

      onClose();
      toast({
        title: "Éxito",
        description: "Reporte de seguridad generado correctamente"
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
            <h2 className="text-xl font-bold">Previsualización del Reporte de Seguridad</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-blue-900 mb-2 block">
                  Categoría
                </label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-md">
              <p className="text-xs font-semibold opacity-90 mb-1">Total</p>
              <p className="text-3xl font-bold">{previewData.summary.total}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg shadow-md">
              <p className="text-xs font-semibold opacity-90 mb-1">Disponible</p>
              <p className="text-3xl font-bold">{previewData.summary.available}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-500 to-gray-600 text-white p-4 rounded-lg shadow-md">
              <p className="text-xs font-semibold opacity-90 mb-1">Asignado</p>
              <p className="text-3xl font-bold">{previewData.summary.assigned}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded-lg shadow-md">
              <p className="text-xs font-semibold opacity-90 mb-1">Mantenimiento</p>
              <p className="text-3xl font-bold">{previewData.summary.maintenance}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-lg shadow-md">
              <p className="text-xs font-semibold opacity-90 mb-1">Dado de baja</p>
              <p className="text-3xl font-bold">{previewData.summary.decommissioned}</p>
            </div>
          </div>

          {/* Tabla de vista previa */}
          <div className="border-2 border-blue-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-3 border-b-2 border-blue-200">
              <h3 className="text-sm font-bold text-blue-900">
                Vista Previa de Dispositivos ({previewData.devicesForReport.length} registros)
              </h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-blue-900 border-b">Código</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-900 border-b">Marca/Modelo</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-900 border-b">Categoría</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-900 border-b">Cantidad</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-900 border-b">Ubicación</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-900 border-b">Estado</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-900 border-b">Sucursal</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-900 border-b">Imagen</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.devicesForReport.length > 0 ? (
                    previewData.devicesForReport.map((device, idx) => (
                      <tr
                        key={device.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}
                      >
                        <td className="px-3 py-2 border-b font-medium">{device.assetCode}</td>
                        <td className="px-3 py-2 border-b">
                          <div>
                            <p className="font-medium">{device.brand}</p>
                            <p className="text-xs text-gray-600">{device.model}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b">{device.category}</td>
                        <td className="px-3 py-2 border-b text-center">{device.quantity}</td>
                        <td className="px-3 py-2 border-b break-words max-w-xs">{device.location}</td>
                        <td className="px-3 py-2 border-b">
                          <Badge variant={statusVariantMap[device.status as keyof typeof statusVariantMap]}>
                            {statusLabelMap[device.status as keyof typeof statusLabelMap]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 border-b">{device.branchName}</td>
                        <td className="px-3 py-2 border-b align-middle">
                          {device.imageUrl ? (
                            <button
                              onClick={() => setImageModalUrl(device.imageUrl!)}
                              className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                              title="Ver imagen"
                            >
                              <Eye className="h-5 w-5 text-blue-600" />
                            </button>
                          ) : (
                            <EyeOff className="h-5 w-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                        No hay dispositivos que coincidan con los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={downloadReport}
            disabled={previewData.devicesForReport.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Modal de Imagen */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]"
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
    </div>
  );
}
