import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { generateDeviceReportPDF, type DeviceSummary, type DeviceReport } from '@/lib/pdfGenerator';
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

interface Device {
  id: number;
  assetCode: string;
  assetType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: string;
  assignedTo?: string;
  purchaseDate?: string;
  branchId?: number;
}

interface Branch {
  id: number;
  name: string;
}

export default function PreviewDevicesReportModal({
  devices,
  branches,
  onClose,
  toast,
}: {
  devices: Device[];
  branches: Branch[];
  onClose: () => void;
  toast: any;
}) {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');

  // Obtener tipos únicos de dispositivos
  const uniqueTypes = Array.from(new Set(devices.map(d => d.assetType))).filter(Boolean).sort();

  // Calcular datos filtrados
  const getFilteredData = () => {
    let filtered = [...devices];

    if (filterType !== 'all') {
      filtered = filtered.filter(d => d.assetType === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    if (filterBranchId !== 'all') {
      filtered = filtered.filter(d => String(d.branchId) === filterBranchId);
    }

    const devicesForReport: DeviceReport[] = filtered.map(d => {
      const branch = branches.find(b => b.id === d.branchId);
      return {
        id: d.id,
        assetCode: d.assetCode,
        assetType: d.assetType,
        brand: d.brand,
        model: d.model,
        serialNumber: d.serialNumber,
        status: d.status,
        assignedTo: d.assignedTo,
        purchaseDate: d.purchaseDate,
        branchName: branch?.name || 'N/A',
      };
    });

    const summary: DeviceSummary = {
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
      await generateDeviceReportPDF(
        previewData.devicesForReport,
        previewData.summary,
        'Departamento de Sistemas',
        filterType !== 'all' ? filterType : undefined,
        filterStatus !== 'all' ? statusLabelMap[filterStatus as keyof typeof statusLabelMap] : undefined,
        filterBranchId !== 'all' ? branches.find(b => String(b.id) === filterBranchId)?.name : undefined
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
                  Tipo de Dispositivo
                </label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-900 mb-2 block">
                  Estado
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="assigned">Asignado</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="decommissioned">Dado de baja</SelectItem>
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

          {/* Resumen de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-blue-700">{previewData.summary.total}</div>
              <div className="text-sm text-blue-600 font-medium mt-1">Total</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-green-700">{previewData.summary.available}</div>
              <div className="text-sm text-green-600 font-medium mt-1">Disponibles</div>
            </div>
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-indigo-700">{previewData.summary.assigned}</div>
              <div className="text-sm text-indigo-600 font-medium mt-1">Asignados</div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-yellow-700">{previewData.summary.maintenance}</div>
              <div className="text-sm text-yellow-600 font-medium mt-1">Mantenimiento</div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-red-700">{previewData.summary.decommissioned}</div>
              <div className="text-sm text-red-600 font-medium mt-1">Baja</div>
            </div>
          </div>

          {/* Tabla de previsualización */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-700">
                Vista previa de dispositivos ({previewData.devicesForReport.length} registros)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Mostrando los primeros 10 dispositivos del reporte
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Marca</th>
                    <th className="px-3 py-2 text-left">Modelo</th>
                    <th className="px-3 py-2 text-left">Serie</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2 text-left">Asignado a</th>
                    <th className="px-3 py-2 text-left">F. Compra</th>
                    <th className="px-3 py-2 text-left">Sucursal</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.devicesForReport.slice(0, 10).map((device, idx) => (
                    <tr key={device.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-3 py-2 border-t font-medium">{device.assetCode}</td>
                      <td className="px-3 py-2 border-t">{device.assetType}</td>
                      <td className="px-3 py-2 border-t">{device.brand || '-'}</td>
                      <td className="px-3 py-2 border-t">{device.model || '-'}</td>
                      <td className="px-3 py-2 border-t">{device.serialNumber || '-'}</td>
                      <td className="px-3 py-2 border-t text-center">
                        <Badge variant={statusVariantMap[device.status as keyof typeof statusVariantMap] || 'default'}>
                          {statusLabelMap[device.status as keyof typeof statusLabelMap] || device.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 border-t">{device.assignedTo || '-'}</td>
                      <td className="px-3 py-2 border-t">
                        {device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td className="px-3 py-2 border-t">{device.branchName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.devicesForReport.length > 10 && (
              <div className="bg-gray-50 px-4 py-3 border-t text-center">
                <p className="text-xs text-gray-600">
                  ... y {previewData.devicesForReport.length - 10} dispositivos más en el reporte completo
                </p>
              </div>
            )}
            {previewData.devicesForReport.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">No hay dispositivos que cumplan con los filtros seleccionados</p>
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
            disabled={!previewData.devicesForReport.length}
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
