import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from '@/components/ui/searchable-select';
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

// Tipo para las categorías de cable UTP
type CableCategory = '' | 'Cat5' | 'Cat5e' | 'Cat6' | 'Cat6a' | 'Cat7' | 'Cat8';

// Tipo para el formulario interno
interface UTPCableFormData {
  brand: string;
  type: CableCategory;
  material: string;
  lengthMeters: number;
  color: string;
  quantity: number;
  purchaseDate: string;
  usageDate: string;
  notes: string;
}

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

// Función para convertir ISO string a formato datetime-local
function formatDateTimeLocal(isoString?: string): string {
  if (!isoString) return getCurrentDateTimeLocal();
  
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return getCurrentDateTimeLocal();
  }
}

export default function UTPCableFormModal({
  open,
  onOpenChange,
  onSave,
  cable,
  mode,
}: UTPCableFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UTPCableFormData>({
    brand: '',
    type: '',
    material: '',
    lengthMeters: 0,
    color: '',
    quantity: 1,
    purchaseDate: getCurrentDateTimeLocal(),
    usageDate: getCurrentDateTimeLocal(),
    notes: '',
  });

  useEffect(() => {
    if (cable && mode === 'edit') {
      setFormData({
        brand: cable.brand,
        type: (cable.type || '') as CableCategory,
        material: cable.material || '',
        lengthMeters: cable.lengthMeters || 0,
        color: cable.color || '',
        quantity: 1,
        purchaseDate: formatDateTimeLocal(cable.purchaseDate),
        usageDate: formatDateTimeLocal(cable.usageDate),
        notes: cable.notes || '',
      });
    } else if (mode === 'create') {
      setFormData({
        brand: '',
        type: '',
        material: '',
        lengthMeters: 0,
        color: '',
        quantity: 1,
        purchaseDate: getCurrentDateTimeLocal(),
        usageDate: getCurrentDateTimeLocal(),
        notes: '',
      });
    }
  }, [cable, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.type === '') {
      alert('Por favor selecciona una categoría válida de cable.');
      return;
    }

    if (mode === 'create' && (!formData.quantity || formData.quantity < 1)) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      // Construir objeto solo con campos obligatorios primero
      const qty = mode === 'create' ? formData.quantity : 1;
      
      for (let i = 0; i < qty; i++) {
        const cleanedData: CreateUTPCableDto = {
          brand: formData.brand.trim(),
          type: formData.type,
        };

        // Agregar campos opcionales solo si tienen valor válido
        if (formData.material && formData.material.trim() !== '') {
          cleanedData.material = formData.material.trim();
        }
        
        if (formData.lengthMeters && formData.lengthMeters > 0) {
          cleanedData.lengthMeters = formData.lengthMeters;
        }
        
        if (formData.color && formData.color.trim() !== '') {
          cleanedData.color = formData.color.trim();
        }
        
        if (formData.purchaseDate && formData.purchaseDate.trim() !== '') {
          cleanedData.purchaseDate = formData.purchaseDate;
        }
        
        if (formData.usageDate && formData.usageDate.trim() !== '') {
          cleanedData.usageDate = formData.usageDate;
        }
        
        if (formData.notes && formData.notes.trim() !== '') {
          cleanedData.notes = formData.notes.trim();
        }

        await onSave(cleanedData);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar el cable. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UTPCableFormData, value: string | number) => {
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
              Categoría <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={formData.type}
              onValueChange={(value) => handleChange('type', value)}
              placeholder="Selecciona una categoría"
              options={[
                { label: 'Cat5', value: 'Cat5' },
                { label: 'Cat5e', value: 'Cat5e' },
                { label: 'Cat6', value: 'Cat6' },
                { label: 'Cat6a', value: 'Cat6a' },
                { label: 'Cat7', value: 'Cat7' },
                { label: 'Cat8', value: 'Cat8' },
              ]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Input
              id="material"
              value={formData.material}
              onChange={(e) => handleChange('material', e.target.value)}
              placeholder="Cobre"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lengthMeters">Longitud (metros)</Label>
            <Input
              id="lengthMeters"
              type="number"
              min="0"
              step="0.01"
              value={formData.lengthMeters}
              onChange={(e) => handleChange('lengthMeters', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="Azul"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Cantidad de Equipos <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="1000"
              value={formData.quantity || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                handleChange('quantity', val > 0 ? val : 0);
              }}
              placeholder="1"
              required
            />
            <p className="text-xs text-muted-foreground">
              {mode === 'create' ? 'Si ingresas más de 1, se crearán múltiples elementos' : 'Cantidad'}
            </p>
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