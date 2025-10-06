import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Eye, RotateCcw } from 'lucide-react';
import {
  mockAssignments,
  getPersonName,
  getAssetInfo,
  getBranchName,
  type Assignment,
} from '@/data/mockDataExtended';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

export default function Assignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments] = useState<Assignment[]>(mockAssignments);

  const filteredAssignments = assignments.filter((assignment) => {
    const personName = getPersonName(assignment.personId).toLowerCase();
    const assetInfo = getAssetInfo(assignment.assetId);
    const assetCode = assetInfo?.assetCode.toLowerCase() || '';
    
    return (
      personName.includes(searchTerm.toLowerCase()) ||
      assetCode.includes(searchTerm.toLowerCase())
    );
  });

  return (
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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Asignación
          </Button>
        </div>

        {/* Search and Stats */}
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
                      {getPersonName(assignment.personId)}
                    </TableCell>
                    <TableCell className="text-sm">{getBranchName(assignment.branchId)}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(assignment.assignmentDate), 'PP', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={conditionVariantMap[assignment.deliveryCondition]}>
                        {conditionLabelMap[assignment.deliveryCondition]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {assignment.returnDate 
                        ? format(new Date(assignment.returnDate), 'PP', { locale: es })
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
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" title="Ver detalles">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!assignment.returnDate && (
                          <Button variant="ghost" size="icon" title="Registrar devolución">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
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
  );
}
