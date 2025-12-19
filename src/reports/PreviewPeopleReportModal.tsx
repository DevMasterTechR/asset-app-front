import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { generatePeopleReportPDF, type PersonSummary, type PersonReport } from '@/reports/pdfGenerator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface Person {
  id: string | number;
  firstName: string;
  lastName: string;
  nationalId: string;
  username: string;
  email?: string;
  phone?: string;
  status: string;
  branchId?: number;
  departmentId?: number;
  roleId?: number;
}

export default function PreviewPeopleReportModal({
  people,
  branches,
  departments,
  roles,
  onClose,
  toast
}: {
  people: Person[];
  branches: Array<{ id: number; name: string }>;
  departments: Array<{ id: number; name: string }>;
  roles: Array<{ id: number; name: string }>;
  onClose: () => void;
  toast: any;
}) {
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('all');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterRoleId, setFilterRoleId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const getBranchName = (branchId?: number) => {
    return branches.find(b => b.id === branchId)?.name || 'N/A';
  };

  const getDepartmentName = (departmentId?: number) => {
    return departments.find(d => d.id === departmentId)?.name || 'N/A';
  };

  const getRoleName = (roleId?: number) => {
    return roles.find(r => r.id === roleId)?.name || 'N/A';
  };

  const getFilteredData = () => {
    let filtered = [...people];

    if (filterDepartmentId !== 'all') {
      filtered = filtered.filter(p => String(p.departmentId) === filterDepartmentId);
    }

    if (filterBranchId !== 'all') {
      filtered = filtered.filter(p => String(p.branchId) === filterBranchId);
    }

    if (filterRoleId !== 'all') {
      filtered = filtered.filter(p => String(p.roleId) === filterRoleId);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    const peopleForReport: PersonReport[] = filtered.map(person => ({
      id: typeof person.id === 'string' ? parseInt(person.id) || 0 : person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      nationalId: person.nationalId,
      username: person.username,
      email: undefined,
      phone: undefined,
      status: person.status,
      branchName: getBranchName(person.branchId),
      departmentName: getDepartmentName(person.departmentId),
      roleName: getRoleName(person.roleId),
    }));

    const summary: PersonSummary = {
      total: filtered.length,
      active: filtered.filter(p => p.status === 'active').length,
      inactive: filtered.filter(p => p.status === 'inactive').length,
      suspended: filtered.filter(p => p.status === 'suspended').length,
    };

    return { peopleForReport, summary };
  };

  const previewData = getFilteredData();

  const downloadReport = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      await generatePeopleReportPDF(
        previewData.peopleForReport,
        previewData.summary,
        'Departamento de Recursos Humanos',
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
            <h2 className="text-xl font-bold">Previsualización del Reporte de Personal</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-blue-900 mb-2 block">
                  Departamento
                </label>
                <Select value={filterDepartmentId} onValueChange={setFilterDepartmentId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
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
                    <SelectValue placeholder="Todas" />
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
                  Rol
                </label>
                <Select value={filterRoleId} onValueChange={setFilterRoleId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
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
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="suspended">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-blue-700">{previewData.summary.total}</div>
              <div className="text-sm text-blue-600 font-medium mt-1">Total</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-green-700">{previewData.summary.active}</div>
              <div className="text-sm text-green-600 font-medium mt-1">Activos</div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-gray-700">{previewData.summary.inactive}</div>
              <div className="text-sm text-gray-600 font-medium mt-1">Inactivos</div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center transform transition hover:scale-105">
              <div className="text-3xl font-bold text-red-700">{previewData.summary.suspended}</div>
              <div className="text-sm text-red-600 font-medium mt-1">Suspendidos</div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-700">
                Vista previa de personal ({previewData.peopleForReport.length} registros)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Mostrando las primeras 10 personas del reporte
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Cédula</th>
                    <th className="px-3 py-2 text-left">Usuario</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Teléfono</th>
                    <th className="px-3 py-2 text-left">Sucursal</th>
                    <th className="px-3 py-2 text-left">Departamento</th>
                    <th className="px-3 py-2 text-left">Rol</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.peopleForReport.slice(0, 10).map((person, idx) => (
                    <tr key={person.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-3 py-2 border-t font-medium">{`${person.firstName} ${person.lastName}`}</td>
                      <td className="px-3 py-2 border-t">{person.nationalId}</td>
                      <td className="px-3 py-2 border-t">{person.username}</td>
                      <td className="px-3 py-2 border-t">{person.email}</td>
                      <td className="px-3 py-2 border-t">{person.phone}</td>
                      <td className="px-3 py-2 border-t">{person.branchName}</td>
                      <td className="px-3 py-2 border-t">{person.departmentName}</td>
                      <td className="px-3 py-2 border-t">{person.roleName}</td>
                      <td className="px-3 py-2 border-t text-center">
                        <Badge variant={statusVariantMap[person.status as keyof typeof statusVariantMap]}>
                          {statusLabelMap[person.status as keyof typeof statusLabelMap]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.peopleForReport.length > 10 && (
              <div className="bg-gray-50 px-4 py-3 border-t text-center">
                <p className="text-xs text-gray-600">
                  ... y {previewData.peopleForReport.length - 10} personas más en el reporte completo
                </p>
              </div>
            )}
            {previewData.peopleForReport.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">No hay personas que cumplan con los filtros seleccionados</p>
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
                disabled={!previewData.peopleForReport.length}
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
