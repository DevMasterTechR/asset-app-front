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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Edit, Trash2, Users as UsersIcon } from 'lucide-react';
import {
  mockPeople,
  getDepartmentName,
  getRoleName,
  getBranchName,
  type Person,
} from '@/data/mockDataExtended';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [people] = useState<Person[]>(mockPeople);

  const filteredPeople = people.filter(
    (person) =>
      person.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.nationalId.includes(searchTerm) ||
      person.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
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
                  <TableCell className="text-sm">{person.username}</TableCell>
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
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
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
            <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron personas</h3>
            <p className="text-muted-foreground">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
