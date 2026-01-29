import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Ink } from '@/data/mockDataExtended';
import { CreateInkDto } from '@/api/consumables';
import { Loader2 } from 'lucide-react';

interface InkFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateInkDto) => Promise<void>;
  ink?: Ink | null;
  mode: 'create' | 'edit';
}

// Función para obtener la fecha y hora actual en formato ISO corto (YYYY-MM-DDTHH:mm)
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

export default function InkFormModal({
  open,
  onOpenChange,
  onSave,
  ink,
  mode
}: InkFormModalProps) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CreateInkDto>({
    brand: '',
    model: '',
    color: '',
    quantity: 0,
    inkType: '',
    purchaseDate: getCurrentDateTimeLocal(),
    usageDate: getCurrentDateTimeLocal(),
    notes: ''
  });

  useEffect(() => {
    if (ink && mode === 'edit') {
      setFormData({
        brand: ink.brand,
        model: ink.model,
        color: ink.color,
        quantity: ink.quantity,
        inkType: ink.inkType,
        purchaseDate: formatDateTimeLocal(ink.purchaseDate),
        usageDate: formatDateTimeLocal(ink.usageDate),
        notes: ink.notes || ''
      });
    } else if (mode === 'create') {
      setFormData({
        brand: '',
        model: '',
        color: '',
        quantity: 0,
        inkType: '',
        purchaseDate: getCurrentDateTimeLocal(),
        usageDate: getCurrentDateTimeLocal(),
        notes: ''
      });
    }
  }, [ink, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar cantidad solo en modo create
    if (mode === 'create' && (!formData.quantity || formData.quantity < 1)) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);

    try {
      // Crear múltiples elementos si quantity > 1 y modo create
      const qty = mode === 'create' ? formData.quantity : 1;
      
      for (let i = 0; i < qty; i++) {
        await onSave({
          ...formData,
          quantity: 1
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateInkDto, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Tinta' : 'Editar Tinta'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Completa los datos de la nueva tinta'
              : 'Modifica los datos de la tinta'}
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
              placeholder="HP"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">
              Modelo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              placeholder="664XL"
              maxLength={100}
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
              placeholder="Negro"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inkType">
              Tipo de Tinta
            </Label>
            <Input
              id="inkType"
              value={formData.inkType}
              onChange={(e) => handleChange('inkType', e.target.value)}
              placeholder="Original"
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
              {mode === 'create' ? 'Si ingresas más de 1, se crearán múltiples elementos' : 'Cantidad de esta tinta'}
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
              ) : mode === 'create' ? (
                'Crear'
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}