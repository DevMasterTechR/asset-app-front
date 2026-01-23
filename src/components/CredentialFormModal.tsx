// src/components/CredentialFormModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SearchableSelect from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Credential, CreateCredentialDto, type SystemType } from '@/api/credentials';
import { Person } from '@/data/mockDataExtended';

interface CredentialFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateCredentialDto) => Promise<void>;
  credential?: Credential | null;
  mode: 'create' | 'edit';
  people?: Person[];
}

const systemOptions: { value: SystemType; label: string }[] = [
  { value: 'erp', label: 'ERP - Sistema de Planificación' },
  { value: 'crm', label: 'CRM - Gestión de Clientes' },
  { value: 'email', label: 'Email - Correo Electrónico' },
  { value: 'tefl', label: 'TEFL - Número telefónico' },
];

export default function CredentialFormModal({
  open,
  onOpenChange,
  onSave,
  credential,
  mode,
  people = [],
}: CredentialFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<CreateCredentialDto>({
    personId: 0,
    username: '',
    password: '',
    system: 'erp',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      if (credential && mode === 'edit') {
        setFormData({
          personId: credential.personId,
          username: credential.username || '',
          password: credential.password || '',
          system: credential.system,
          phone: credential.phone || '',
          notes: credential.notes || '',
        });
      } else {
        setFormData({
          personId: 0,
          username: '',
          password: '',
          system: 'erp',
          phone: '',
          notes: '',
        });
      }
      setShowPassword(false);
    }
  }, [credential, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.personId || formData.personId === 0) {
      alert('Por favor selecciona una persona');
      return;
    }

    // Validación extra en frontend (opcional pero recomendado)
    if (formData.system === 'tefl' && !formData.phone?.trim()) {
      alert('El número telefónico es obligatorio para TEFL');
      return;
    }

    if (formData.system !== 'tefl') {
      if (!formData.username?.trim()) {
        alert('El usuario es obligatorio para este sistema');
        return;
      }
      if (!formData.password?.trim()) {
        alert('La contraseña es obligatoria para este sistema');
        return;
      }
    }

    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error al guardar credencial:', error);
      alert(error.message || 'Error al guardar. Revisa los datos e inténtalo de nuevo');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateCredentialDto, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const personOptions = useMemo(
    () =>
      people
        .map((person) => ({
          value: String(person.id),
          label: `${person.firstName || ''} ${person.lastName || ''}`.trim() || `ID: ${person.id}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [people],
  );

  const personValue = formData.personId ? String(formData.personId) : null;

  const isTefl = formData.system === 'tefl';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nueva Credencial' : 'Editar Credencial'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Registra las credenciales de acceso del usuario.'
              : 'Modifica los datos de la credencial existente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Persona */}
          <div className="space-y-2">
            <Label htmlFor="person">
              Persona <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={personOptions}
              value={personValue}
              onValueChange={(value) => handleChange('personId', Number(value))}
              placeholder="Busca y selecciona una persona..."
            />
          </div>

          {/* Sistema */}
          <div className="space-y-2">
            <Label htmlFor="system">
              Sistema <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={systemOptions}
              value={formData.system}
              onValueChange={(value) => {
                const newSystem = value as SystemType;
                handleChange('system', newSystem);
                // Limpiar campos no relevantes
                if (newSystem === 'tefl') {
                  handleChange('username', '');
                  handleChange('password', '');
                } else {
                  handleChange('phone', '');
                }
              }}
              placeholder="Selecciona el sistema..."
            />
          </div>

          {/* Teléfono - solo TEFL */}
          {isTefl && (
            <div className="space-y-2">
              <Label htmlFor="phone">
                Número telefónico <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Ej: +593991234567 o 0962598491"
                className="w-full"
                type="tel"
                maxLength={20}
              />
            </div>
          )}

          {/* Usuario y Contraseña - NO TEFL */}
          {!isTefl && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">
                  Usuario / Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="usuario@empresa.com o nombredeusuario"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Contraseña <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Ingresa la contraseña segura"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-10 w-10 p-0"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas adicionales, instrucciones especiales, fecha de vencimiento, etc..."
              rows={3}
              className="w-full"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.personId}
              className="flex-1 sm:flex-none"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Creando...' : 'Guardando...'}
                </>
              ) : mode === 'create' ? (
                'Crear Credencial'
              ) : (
                'Actualizar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}