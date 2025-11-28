import { useState, useEffect } from 'react';
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
import { Branch } from '@/data/mockDataExtended';
import { CreateBranchDto } from '@/api/catalogs';
import { Loader2 } from 'lucide-react';

interface BranchFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateBranchDto) => Promise<void>;
  branch?: Branch | null;
  mode: 'create' | 'edit';
}

export default function BranchFormModal({
  open,
  onOpenChange,
  onSave,
  branch,
  mode
}: BranchFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateBranchDto>({
    name: '',
    address: '',
    region: ''
  });

  const normalizeRegion = (r: string | undefined) => {
    if (!r) return '';
    const s = String(r).trim();
    if (!s) return '';
    // Capitalize first letter and lowercase the rest to match options
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  useEffect(() => {
    if (branch && mode === 'edit') {
      setFormData({
        name: branch.name,
        address: branch.address,
        region: normalizeRegion(branch.region)
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        address: '',
        region: ''
      });
    }
  }, [branch, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Ensure region matches expected capitalization before sending
      const payload = { ...formData, region: normalizeRegion(formData.region) };
      await onSave(payload);
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateBranchDto, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Sucursal' : 'Editar Sucursal'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Completa los datos de la nueva sucursal'
              : 'Modifica los datos de la sucursal'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Oficina Principal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Dirección <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Av. Principal 123"
              required
            />
          </div>

                  <div className="space-y-2">
                    <Label htmlFor="region">Región <span className="text-destructive">*</span></Label>
                    <SearchableSelect
                      value={formData.region}
                      onValueChange={(value) => handleChange('region', value)}
                      placeholder="Selecciona región"
                      options={[
                        { label: 'Costa', value: 'Costa' },
                        { label: 'Sierra', value: 'Sierra' },
                        { label: 'Oriente', value: 'Oriente' },
                      ]}
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
                mode === 'create' ? 'Crear' : 'Guardar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
