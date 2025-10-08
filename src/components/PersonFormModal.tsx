import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Person } from '@/data/mockDataExtended';
import { CreatePersonDto } from '@/api/people';
import { Loader2 } from 'lucide-react';

interface PersonFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreatePersonDto) => Promise<void>;
  person?: Person | null;
  mode: 'create' | 'edit';
  departments: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
}

export default function PersonFormModal({
  open,
  onOpenChange,
  onSave,
  person,
  mode,
  departments,
  roles,
  branches
}: PersonFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePersonDto>({
    firstName: '',
    lastName: '',
    nationalId: '',
    username: '',
    departmentId: '',
    roleId: '',
    branchId: '',
    status: 'active'
  });

  useEffect(() => {
    if (person && mode === 'edit') {
      setFormData({
        firstName: person.firstName,
        lastName: person.lastName,
        nationalId: person.nationalId,
        username: person.username,
        departmentId: person.departmentId,
        roleId: person.roleId,
        branchId: person.branchId,
        status: person.status
      });
    } else if (mode === 'create') {
      setFormData({
        firstName: '',
        lastName: '',
        nationalId: '',
        username: '',
        departmentId: '',
        roleId: '',
        branchId: '',
        status: 'active'
      });
    }
  }, [person, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreatePersonDto, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Persona' : 'Editar Persona'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Completa los datos de la nueva persona'
              : 'Modifica los datos de la persona'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Juan"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Apellido <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Pérez"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nationalId">
                Cédula <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nationalId"
                value={formData.nationalId}
                onChange={(e) => handleChange('nationalId', e.target.value)}
                placeholder="1234567890"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">
                Usuario <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="juan.perez"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departmentId">
                Departamento <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => handleChange('departmentId', value)}
                required
              >
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="Selecciona departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleId">
                Rol <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => handleChange('roleId', value)}
                required
              >
                <SelectTrigger id="roleId">
                  <SelectValue placeholder="Selecciona rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branchId">
                Sucursal <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => handleChange('branchId', value)}
                required
              >
                <SelectTrigger id="branchId">
                  <SelectValue placeholder="Selecciona sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Estado <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive' | 'suspended') => handleChange('status', value)}
                required
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="suspended">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                mode === 'create' ? 'Crear' : 'Guardar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
