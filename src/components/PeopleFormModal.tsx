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
import { CreatePersonDto, UpdatePersonDto } from '@/api/people';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface PersonFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreatePersonDto | UpdatePersonDto) => Promise<void>;
  person?: Person | null;
  mode: 'create' | 'edit';
  departments: Array<{ id: number; name: string }>;
  roles: Array<{ id: number; name: string }>;
  branches: Array<{ id: number; name: string }>;
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
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<CreatePersonDto>({
    firstName: '',
    lastName: '',
    nationalId: '',
    username: '',
    password: '',
    departmentId: undefined,
    roleId: undefined,
    branchId: undefined,
    status: 'active'
  });

  useEffect(() => {
    if (person && mode === 'edit') {
      setFormData({
        firstName: person.firstName,
        lastName: person.lastName,
        nationalId: person.nationalId,
        username: person.username || '',
        password: '',
        departmentId: person.departmentId ? Number(person.departmentId) : undefined,
        roleId: person.roleId ? Number(person.roleId) : undefined,
        branchId: person.branchId ? Number(person.branchId) : undefined,
        status: person.status
      });
    } else if (mode === 'create') {
      setFormData({
        firstName: '',
        lastName: '',
        nationalId: '',
        username: '',
        password: '',
        departmentId: undefined,
        roleId: undefined,
        branchId: undefined,
        status: 'active'
      });
    }
  }, [person, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'create' && formData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const cleanedData: Partial<CreatePersonDto> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        nationalId: formData.nationalId.trim(),
        username: formData.username?.trim() || undefined,
        status: formData.status,
      };

      // Agregar contraseña si aplica
      if (mode === 'create' || (mode === 'edit' && formData.password.trim().length > 0)) {
        cleanedData.password = formData.password;
      }

      // Agregar IDs solo si tienen valor
      if (formData.departmentId !== undefined && formData.departmentId !== null) {
        cleanedData.departmentId = Number(formData.departmentId);
      }
      if (formData.roleId !== undefined && formData.roleId !== null) {
        cleanedData.roleId = Number(formData.roleId);
      }
      if (formData.branchId !== undefined && formData.branchId !== null) {
        cleanedData.branchId = Number(formData.branchId);
      }

      console.log('📦 Datos del formulario antes de enviar:', cleanedData);

      if (mode === 'create') {
        await onSave(cleanedData as CreatePersonDto);
      } else {
        await onSave(cleanedData as UpdatePersonDto);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'No se pudo guardar'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreatePersonDto, value: string | number | undefined) => {
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
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre <span className="text-destructive">*</span></Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Juan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido <span className="text-destructive">*</span></Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Pérez"
                required
              />
            </div>
          </div>

          {/* Cédula y Usuario */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nationalId">Cédula <span className="text-destructive">*</span></Label>
              <Input
                id="nationalId"
                value={formData.nationalId}
                onChange={(e) => handleChange('nationalId', e.target.value)}
                placeholder="1234567890"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="juan.perez"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-2 relative">
            <Label htmlFor="password">
              Contraseña {mode === 'create' && <span className="text-destructive">*</span>}
              {mode === 'edit' && (
                <span className="text-muted-foreground text-xs"> (dejar vacío para no cambiar)</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required={mode === 'create'}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Departamento y Rol */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departmentId">Departamento</Label>
              <Select
                value={formData.departmentId?.toString() || ''}
                onValueChange={(value) => {
                  handleChange('departmentId', value ? Number(value) : undefined);
                }}
              >
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="Selecciona departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleId">Rol</Label>
              <Select
                value={formData.roleId?.toString() || ''}
                onValueChange={(value) => {
                  handleChange('roleId', value ? Number(value) : undefined);
                }}
              >
                <SelectTrigger id="roleId">
                  <SelectValue placeholder="Selecciona rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sucursal y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal</Label>
              <Select
                value={formData.branchId?.toString() || ''}
                onValueChange={(value) => {
                  handleChange('branchId', value ? Number(value) : undefined);
                }}
              >
                <SelectTrigger id="branchId">
                  <SelectValue placeholder="Selecciona sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado <span className="text-destructive">*</span></Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive' | 'suspended') =>
                  handleChange('status', value)
                }
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

          {/* Botones */}
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