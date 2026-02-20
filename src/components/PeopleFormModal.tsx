import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableSelect from '@/components/ui/searchable-select';
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
import { assignmentsApi } from '@/api/assignments';
import { sortByString, sortBranchesByName } from '@/lib/sort';
import { useMemo } from 'react';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

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
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [showStatusWarning, setShowStatusWarning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [finalizingAssignments, setFinalizingAssignments] = useState(false);

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

    // Autogenerar username cuando se escriben nombre y apellido (solo en modo 'create')
    useEffect(() => {
      if (mode === 'create' || mode === 'edit') {
        const firstNamePart = formData.firstName.trim().split(' ')[0];
        const lastNamePart = formData.lastName.trim().split(' ')[0];
        // Username: primera letra del primer nombre + todo el primer apellido, minúsculas
        const autoUsername = firstNamePart && lastNamePart ? `${firstNamePart.charAt(0).toLowerCase()}${lastNamePart.toLowerCase()}` : '';

        // Password: igual al username
        const autoPassword = autoUsername;

        setFormData(prev => {
          let updated = { ...prev };
          if (prev.username !== autoUsername) updated.username = autoUsername;
          if (prev.password !== autoPassword) updated.password = autoPassword;
          return updated;
        });
      }
    }, [formData.firstName, formData.lastName, mode]);

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
      // Cargar asignaciones activas de la persona
      const loadActiveAssignments = async () => {
        try {
          const allAssignments = await assignmentsApi.getAll();
          const assignmentsList = Array.isArray(allAssignments) ? allAssignments : (allAssignments as any)?.data || [];
          const active = assignmentsList.filter(
            (a: any) => String(a.personId) === String(person.id) && !a.returnDate
          );
          setActiveAssignments(active);
        } catch (err) {
          console.error('Error cargando asignaciones activas:', err);
          setActiveAssignments([]);
        }
      };
      loadActiveAssignments();
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
      setActiveAssignments([]);
    }
    // Reset warning states when modal opens/closes
    setShowStatusWarning(false);
    setPendingStatus(null);
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
        firstName: formData.firstName.trim().toUpperCase(),
        lastName: formData.lastName.trim().toUpperCase(),
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

  // Manejar cambio de estado con verificación de asignaciones activas
  const handleStatusChange = (newStatus: string) => {
    // Si el nuevo estado no es 'active' y hay asignaciones activas, mostrar alerta
    if (newStatus !== 'active' && activeAssignments.length > 0) {
      setPendingStatus(newStatus);
      setShowStatusWarning(true);
    } else {
      // Si el estado es 'active' o no hay asignaciones activas, aplicar directamente
      handleChange('status', newStatus as any);
    }
  };

  // Confirmar cambio de estado y finalizar asignaciones
  const confirmStatusChange = async () => {
    if (!pendingStatus) return;

    setFinalizingAssignments(true);
    try {
      const now = new Date().toISOString();
      // Finalizar todas las asignaciones activas
      const finishPromises = activeAssignments.map((a: any) =>
        assignmentsApi.update(String(a.id), {
          returnDate: now,
          returnCondition: 'good',
          returnNotes: `Asignación finalizada por cambio de estado de persona a ${pendingStatus === 'inactive' ? 'Inactivo' : 'Suspendido'}`,
        })
      );
      await Promise.all(finishPromises);

      // Aplicar el cambio de estado
      handleChange('status', pendingStatus as any);
      setActiveAssignments([]); // Limpiar las asignaciones activas
      setShowStatusWarning(false);
      setPendingStatus(null);
    } catch (error) {
      console.error('Error finalizando asignaciones:', error);
      alert('Error al finalizar las asignaciones. Por favor intente de nuevo.');
    } finally {
      setFinalizingAssignments(false);
    }
  };

  // Cancelar cambio de estado
  const cancelStatusChange = () => {
    setShowStatusWarning(false);
    setPendingStatus(null);
  };

  const departmentOptions = useMemo(() => sortByString(departments, d => d.name).map((dept) => ({ label: dept.name, value: dept.id.toString() })), [departments]);
  const roleOptions = useMemo(() => sortByString(roles, r => r.name).map((role) => ({ label: role.name, value: role.id.toString() })), [roles]);
  const branchOptions = useMemo(() => sortBranchesByName(branches).map((branch) => ({ label: branch.name, value: branch.id.toString() })), [branches]);
  const statusOptions = [
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
    { label: 'Suspendido', value: 'suspended' },
  ];

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
                onChange={(e) => handleChange('firstName', e.target.value.toUpperCase())}
                placeholder="JUAN"
                required
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido <span className="text-destructive">*</span></Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value.toUpperCase())}
                placeholder="PÉREZ"
                required
                style={{ textTransform: 'uppercase' }}
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
                <SearchableSelect
                  value={formData.departmentId?.toString() || ''}
                  onValueChange={(value) => handleChange('departmentId', value ? Number(value) : undefined)}
                  placeholder="Selecciona departamento"
                  options={departmentOptions}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleId">Rol</Label>
              <SearchableSelect
                value={formData.roleId?.toString() || ''}
                onValueChange={(value) => handleChange('roleId', value ? Number(value) : undefined)}
                placeholder="Selecciona rol"
                options={roleOptions}
              />
            </div>
          </div>

          {/* Sucursal y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal</Label>
              <SearchableSelect
                value={formData.branchId?.toString() || ''}
                onValueChange={(value) => handleChange('branchId', value ? Number(value) : undefined)}
                placeholder="Selecciona sucursal"
                options={branchOptions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado <span className="text-destructive">*</span></Label>
              <SearchableSelect
                value={formData.status}
                onValueChange={(value) => handleStatusChange(value)}
                placeholder="Selecciona estado"
                options={statusOptions}
              />
              {mode === 'edit' && activeAssignments.length > 0 && (
                <p className="text-xs text-amber-600">
                  ⚠️ Esta persona tiene {activeAssignments.length} asignación(es) activa(s)
                </p>
              )}
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

      {/* Modal de confirmación para cambio de estado con asignaciones activas */}
      {showStatusWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-t-lg border-b border-amber-100 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              ADVERTENCIA: Asignaciones Activas
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                <p className="font-semibold mb-2">Esta persona tiene {activeAssignments.length} asignación(es) activa(s):</p>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto mb-3">
                  {activeAssignments.map((a: any, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                    >
                      {a.asset?.assetCode || a.assetId || 'Dispositivo'}
                    </span>
                  ))}
                </div>
                <p className="font-bold text-red-700">
                  Si cambia el estado a "{pendingStatus === 'inactive' ? 'Inactivo' : 'Suspendido'}", todas las asignaciones serán FINALIZADAS automáticamente y los equipos quedarán disponibles.
                </p>
              </div>

              <p className="text-sm text-center font-medium">¿Está de acuerdo con esto?</p>

              <div className="flex justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={cancelStatusChange}
                  disabled={finalizingAssignments}
                >
                  No, cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmStatusChange}
                  disabled={finalizingAssignments}
                >
                  {finalizingAssignments ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    'Sí, finalizar asignaciones'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}