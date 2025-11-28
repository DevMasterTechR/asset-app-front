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
import { peopleApi } from '@/api/people';
import { Textarea } from '@/components/ui/textarea';
import { sortByString } from '@/lib/sort';
import { Credential, CreateCredentialDto, SystemType } from '@/api/credentials';
import { Person } from '@/data/mockDataExtended';
import { Loader2, Eye, EyeOff } from 'lucide-react';

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
  { value: 'glpi', label: 'GLPI - Gestión de Inventario' },
];

export default function CredentialFormModal({
  open,
  onOpenChange,
  onSave,
  credential,
  mode,
  people
}: CredentialFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<CreateCredentialDto>({
    personId: 0,
    username: '',
    password: '',
    system: 'erp',
    notes: ''
  });

  useEffect(() => {
    if (credential && mode === 'edit') {
      setFormData({
        personId: credential.personId,
        username: credential.username,
        password: credential.password,
        system: credential.system,
        notes: credential.notes || ''
      });
    } else if (mode === 'create') {
      setFormData({
        personId: 0,
        username: '',
        password: '',
        system: 'erp',
        notes: ''
      });
    }
    setShowPassword(false);
  }, [credential, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.personId || formData.personId === 0) {
      alert('Por favor selecciona una persona');
      return;
    }

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

  const handleChange = (field: keyof CreateCredentialDto, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Memoize people options so hooks order stays stable and rendering is efficient
  // initial option when editing (show selected person label even before search)
  const [initialPersonOption, setInitialPersonOption] = useState<{ label: string; value: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const pid = credential?.personId ?? formData.personId;
    if (pid && pid !== 0) {
      (async () => {
        try {
          const person = await peopleApi.getOne(String(pid));
          if (!mounted) return;
          setInitialPersonOption({ label: `${person.firstName} ${person.lastName} (${person.username || ''})`, value: String(person.id) });
        } catch (err) {
          // ignore
        }
      })();
    } else {
      setInitialPersonOption(null);
    }
    return () => {
      mounted = false;
    };
  }, [credential, formData.personId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Credencial' : 'Editar Credencial'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Registra las credenciales de acceso del usuario'
              : 'Modifica los datos de la credencial'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Persona */}
          <div className="space-y-2">
            <Label htmlFor="personId">
              Persona <span className="text-destructive">*</span>
            </Label>
              <SearchableSelect
                value={formData.personId ? formData.personId.toString() : ''}
                onValueChange={(value) => handleChange('personId', Number(value))}
                placeholder="Selecciona una persona"
                searchPlaceholder="Buscar persona..."
                // initial option to show when editing
                options={initialPersonOption ? [initialPersonOption] : []}
                onSearch={async (q) => {
                  // call people API with search query, return mapped options
                  try {
                    const res = await peopleApi.getAll(undefined, 10, q);
                    const list = Array.isArray(res) ? res : res.data;
                    return (list as any[]).map((p) => ({ label: `${p.firstName} ${p.lastName} (${p.username || ''})`, value: String(p.id) }));
                  } catch (err) {
                    return [];
                  }
                }}
              />
          </div>

          {/* Sistema */}
          <div className="space-y-2">
            <Label htmlFor="system">
              Sistema <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={formData.system}
              onValueChange={(value) => handleChange('system', value as SystemType)}
              placeholder="Selecciona sistema"
              options={systemOptions.map(s => ({ label: s.label, value: s.value }))}
            />
          </div>

          {/* Usuario */}
          <div className="space-y-2">
            <Label htmlFor="username">
              Usuario <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="nombre.usuario o usuario@email.com"
              required
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Observaciones adicionales sobre esta credencial..."
              rows={3}
            />
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
                mode === 'create' ? 'Crear Credencial' : 'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}