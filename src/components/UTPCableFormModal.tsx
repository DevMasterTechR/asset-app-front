import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UTPCable } from '@/data/mockDataExtended';
import { CreateUTPCableDto } from '@/api/consumables';
import { Loader2 } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

interface UTPCableFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateUTPCableDto) => Promise<void>;
  cable?: UTPCable | null;
  mode: 'create' | 'edit';
}

// Tipo extendido solo para el estado local del formulario
type UTPFormType = '' | 'indoor' | 'outdoor';

// Función para obtener fecha y hora actual en formato YYYY-MM-DDTHH:mm
function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}


export default function UTPCableFormModal({
  open,
  onOpenChange,
  onSave,
  cable,
  mode,
}: UTPCableFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateUTPCableDto, 'type'> & { type: UTPFormType }>({
    brand: '',
    type: '',
    material: '',
    lengthMeters: 0,
    color: '',
    purchaseDate: getCurrentDateTimeLocal(),
    usageDate: getCurrentDateTimeLocal(),
    notes: '',
  });

  useEffect(() => {
    if (cable && mode === 'edit') {
      setFormData({
        brand: cable.brand,
        type: cable.type,
        material: cable.material,
        lengthMeters: cable.lengthMeters,
        color: cable.color,
        purchaseDate: cable.purchaseDate || getCurrentDateTimeLocal(),
        usageDate: cable.usageDate || getCurrentDateTimeLocal(),
        notes: cable.notes || '',
      });
    } else if (mode === 'create') {
      setFormData({
        brand: '',
        type: '',
        material: '',
        lengthMeters: 0,
        color: '',
        purchaseDate: getCurrentDateTimeLocal(),
        usageDate: getCurrentDateTimeLocal(),
        notes: '',
      });
    }
  }, [cable, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.type === '') {
      alert('Por favor selecciona un tipo válido (INTERIOR o EXTERIOR).');
      return;
    }

    setLoading(true);
    try {
      // Convertimos a CreateUTPCableDto eliminando la posibilidad de ''
      const cleanedData: CreateUTPCableDto = {
        ...formData,
        type: formData.type as 'indoor' | 'outdoor',
      };

      await onSave(cleanedData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Cable UTP' : 'Editar Cable UTP'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Completa los datos del nuevo cable'
              : 'Modifica los datos del cable'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">
              Marca <span className="text-destructive">*</span>
            </Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="Panduit"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              required
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Selecciona una opción</option>
              <option value="indoor">INTERIOR</option>
              <option value="outdoor">EXTERIOR</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="material">
              Material <span className="text-destructive">*</span>
            </Label>
            <Input
              id="material"
              value={formData.material}
              onChange={(e) => handleChange('material', e.target.value)}
              placeholder="Cobre"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lengthMeters">
              Longitud (metros) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lengthMeters"
              type="number"
              min="0"
              step="0.1"
              value={formData.lengthMeters}
              onChange={(e) => handleChange('lengthMeters', parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">
              Color <span className="text-destructive">*</span>
            </Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="Azul"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Fecha de Compra</Label>
            <DateTimePicker
              value={formData.purchaseDate}
              onChange={(value) => handleChange('purchaseDate', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usageDate">Fecha de Uso</Label>
            <DateTimePicker
              value={formData.usageDate}
              onChange={(value) => handleChange('usageDate', value)}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <DialogFooter className="col-span-2 mt-4">
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
              ) : mode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
