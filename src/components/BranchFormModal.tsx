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
  <label htmlFor="region-select">Elige una Región:</label>
  <select
    id="region-select"
    name="region"
    value={formData.region}
    onChange={(e) => handleChange('region', e.target.value)}
    required
    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
    <option value="">Selecciona región</option>
    <option value="Costa">Costa</option>
    <option value="Sierra">Sierra</option>
    <option value="Oriente">Oriente</option>
  </select>
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
