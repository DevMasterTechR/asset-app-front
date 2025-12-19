import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, EyeOff, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { generateSecurityReportPDF, type SecuritySummary, type SecurityReport } from '@/reports/pdfGenerator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Función para convertir URLs de galería de Imgur a URLs directas de imagen
const convertImgurUrl = (url: string): string => {
  if (!url) return url;
  
  // Si ya es una URL directa de imagen de Imgur, devolverla tal cual
  if (url.includes('i.imgur.com')) return url;
  
  // Convertir URLs de galería de Imgur a URLs directas de imagen
  if (url.includes('imgur.com/gallery/') || url.includes('imgur.com/a/')) {
    // Extraer el ID de la imagen del hash o del path
    const hashMatch = url.match(/#(\w+)/);
    const pathMatch = url.match(/imgur\.com\/(?:gallery|a)\/([^#\s]+)/);
    
    if (hashMatch) {
      // Si hay un hash, usar ese ID
      return `https://i.imgur.com/${hashMatch[1]}.jpg`;
    } else if (pathMatch) {
      // Si no hay hash, intentar con el ID del path
      return `https://i.imgur.com/${pathMatch[1]}.jpg`;
    }
  }
  
  return url;
};

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
  brand?: string;
  model?: string;
  attributesJson?: any;
  status: string;
  branchName?: string;
}

export default function PreviewSecurityReportModal({
  devices,
  branches,
  onClose,
  toast
}: {
  devices: Device[];
  branches: Array<{ id: number; name: string }>;
  onClose: () => void;
  toast: any;
}) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const categories = [...new Set(devices.map(d => d.attributesJson?.category).filter(Boolean))];

  const getFilteredData = () => {
    let filtered = [...devices];

    if (filterCategory !== 'all') {
      filtered = filtered.filter(d => d.attributesJson?.category === filterCategory);
    }
    if (filterBranch !== 'all') {
      filtered = filtered.filter(d => d.branchName === filterBranch);
    }

    const securityDevices: SecurityReport[] = filtered.map(d => ({
      id: d.id,
      assetCode: d.assetCode,
      brand: d.brand,
      model: d.model,
      category: d.attributesJson?.category || '-',
      quantity: d.attributesJson?.quantity || 0,
      location: d.attributesJson?.location || '-',
      status: d.status,
      branchName: d.branch?.name || d.branchName || '-',
      notes: d.notes || d.attributesJson?.notes || '-',
      imageUrl: d.attributesJson?.imageUrl,
    }));

    const summary: SecuritySummary = {
      total: filtered.length,
      available: filtered.filter(d => d.status === 'available').length,
      assigned: filtered.filter(d => d.status === 'assigned').length,
      maintenance: filtered.filter(d => d.status === 'maintenance').length,
      decommissioned: filtered.filter(d => d.status === 'decommissioned').length,
    };

    return { securityDevices, summary };
  };

  const previewData = getFilteredData();

  const downloadReport = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      await generateSecurityReportPDF(
        previewData.securityDevices,
        previewData.summary,
        'Departamento de Seguridad',
        filterCategory !== 'all' ? filterCategory : undefined,
        filterBranch !== 'all' ? filterBranch : undefined,
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

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-sm">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros del Reporte
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-blue-900 mb-2 block">Categoría</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-900 mb-2 block">Sucursal</label>
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-gray-700">{previewData.summary.total}</div>
              <div className="text-sm text-gray-600 font-medium mt-1">Total</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-green-700">{previewData.summary.available}</div>
              <div className="text-sm text-green-600 font-medium mt-1">Disponibles</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-blue-700">{previewData.summary.assigned}</div>
              <div className="text-sm text-blue-600 font-medium mt-1">Asignados</div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-yellow-700">{previewData.summary.maintenance}</div>
              <div className="text-sm text-yellow-600 font-medium mt-1">Mantenimiento</div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-red-700">{previewData.summary.decommissioned}</div>
              <div className="text-sm text-red-600 font-medium mt-1">Dados de baja</div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-700">
                Vista previa de dispositivos de seguridad ({previewData.securityDevices.length} registros)
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
                    <th className="px-3 py-2 text-left">Marca/Modelo</th>
                    <th className="px-3 py-2 text-left">Categoría</th>
                    <th className="px-3 py-2 text-center">Cantidad</th>
                    <th className="px-3 py-2 text-left">Ubicación</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2 text-left">Sucursal</th>
                    <th className="px-3 py-2 text-left">Observación</th>
                    <th className="px-3 py-2 text-center">Imagen</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.securityDevices.slice(0, 10).map((device, idx) => (
                    <tr key={device.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-3 py-2 border-t font-medium">{device.assetCode}</td>
                      <td className="px-3 py-2 border-t">{`${device.brand || ''} ${device.model || ''}`.trim() || '-'}</td>
                      <td className="px-3 py-2 border-t">{device.category}</td>
                      <td className="px-3 py-2 border-t text-center">{device.quantity}</td>
                      <td className="px-3 py-2 border-t">{device.location}</td>
                      <td className="px-3 py-2 border-t text-center">
                        <Badge variant={statusVariantMap[device.status as keyof typeof statusVariantMap]}>
                          {statusLabelMap[device.status as keyof typeof statusLabelMap]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 border-t">{device.branchName || '-'}</td>
                      <td className="px-3 py-2 border-t">{device.notes || '-'}</td>
                      <td className="px-3 py-2 border-t text-center">
                        {device.imageUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedImage(device.imageUrl!)}
                            className="p-1 h-auto text-blue-600 hover:text-blue-700"
                            title="Ver imagen"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-[11px] flex items-center justify-center gap-1" title="Imagen no asignada">
                            <EyeOff className="h-4 w-4" />
                            Imagen no asignada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.securityDevices.length > 10 && (
              <div className="bg-gray-50 px-4 py-3 border-t text-center">
                <p className="text-xs text-gray-600">
                  ... y {previewData.securityDevices.length - 10} dispositivos más en el reporte completo
                </p>
              </div>
            )}
            {previewData.securityDevices.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">No hay dispositivos que cumplan con los filtros seleccionados</p>
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
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={downloadReport}
                disabled={!previewData.securityDevices.length}
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
            <img 
              src={convertImgurUrl(selectedImage)} 
              alt="Dispositivo" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              crossOrigin="anonymous"
            />
          </div>
        </div>
      )}
    </div>
  );
}
