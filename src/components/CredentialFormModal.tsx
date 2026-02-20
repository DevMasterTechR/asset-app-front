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
import { Loader2, Eye, EyeOff, Plus, X } from 'lucide-react';
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
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);
  const [formData, setFormData] = useState<CreateCredentialDto>({
    personId: 0,
    username: '',
    password: '',
    system: 'erp',
    phone: '',
    notes: '',
  });

  // Función para parsear los números telefónicos desde el string guardado
  const parsePhoneNumbers = (phoneString: string): string[] => {
    if (!phoneString || !phoneString.trim()) return [''];
    // Separar por " / " o "/" y filtrar vacíos
    const numbers = phoneString.split(/\s*\/\s*/).map(n => n.trim()).filter(n => n);
    return numbers.length > 0 ? numbers : [''];
  };

  // Función para combinar los números en un string
  const combinePhoneNumbers = (numbers: string[]): string => {
    return numbers.filter(n => n.trim()).join(' / ');
  };

  useEffect(() => {
    if (open) {
      if (credential && mode === 'edit') {
        const parsedPhones = parsePhoneNumbers(credential.phone || '');
        setPhoneNumbers(parsedPhones);
        setFormData({
          personId: credential.personId,
          username: credential.username || '',
          password: credential.password || '',
          system: credential.system,
          phone: credential.phone || '',
          notes: credential.notes || '',
        });
      } else {
        setPhoneNumbers(['']);
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

  // Handlers para números telefónicos
  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phoneNumbers];
    newPhones[index] = value;
    setPhoneNumbers(newPhones);
    // Actualizar formData.phone con el string combinado
    setFormData(prev => ({ ...prev, phone: combinePhoneNumbers(newPhones) }));
  };

  const addPhoneNumber = () => {
    setPhoneNumbers(prev => [...prev, '']);
  };

  const removePhoneNumber = (index: number) => {
    const newPhones = phoneNumbers.filter((_, i) => i !== index);
    // Asegurar que al menos haya un campo vacío
    const finalPhones = newPhones.length > 0 ? newPhones : [''];
    setPhoneNumbers(finalPhones);
    setFormData(prev => ({ ...prev, phone: combinePhoneNumbers(finalPhones) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.personId || formData.personId === 0) {
      alert('Por favor selecciona una persona');
      return;
    }

    // Validación extra en frontend (opcional pero recomendado)
    if (formData.system === 'tefl') {
      const validPhones = phoneNumbers.filter(n => n.trim());
      if (validPhones.length === 0) {
        alert('Debes ingresar al menos un número telefónico para TEFL');
        return;
      }
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
                  setPhoneNumbers(['']); // Limpiar array de números
                }
              }}
              placeholder="Selecciona el sistema..."
            />
          </div>

          {/* Teléfono - solo TEFL */}
          {isTefl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Números telefónicos <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPhoneNumber}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar número
                </Button>
              </div>
              <div className="space-y-2">
                {phoneNumbers.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={phone}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      placeholder={`Número ${index + 1}: +593991234567`}
                      className="flex-1"
                      type="tel"
                      maxLength={20}
                    />
                    {phoneNumbers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePhoneNumber(index)}
                        className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {phoneNumbers.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  Los números se guardarán separados por " / "
                </p>
              )}
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