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
import { PowerStrip } from '@/data/mockDataExtended';
import { CreatePowerStripDto } from '@/api/consumables';
import { Loader2 } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

interface PowerStripFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreatePowerStripDto) => Promise<void>;
  powerStrip?: PowerStrip | null;
  mode: 'create' | 'edit';
}

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

export default function PowerStripFormModal({
  open,
  onOpenChange,
  onSave,
  powerStrip,
  mode
}: PowerStripFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState<CreatePowerStripDto>({
    brand: '',
    model: '',
    outletCount: 0,
    lengthMeters: 0,
    color: '',
    capacity: 0,
    purchasePrice: undefined,
    purchaseDate: getCurrentDateTimeLocal(),
    usageDate: getCurrentDateTimeLocal(),
    notes: ''
  });

  useEffect(() => {
    if (powerStrip && mode === 'edit') {
      setFormData({
        brand: powerStrip.brand,
        model: powerStrip.model,
        outletCount: powerStrip.outletCount,
        lengthMeters: powerStrip.lengthMeters,
        color: powerStrip.color,
        capacity: powerStrip.capacity,
        purchasePrice: (powerStrip as any).purchasePrice ?? undefined,
        purchaseDate: formatDateTimeLocal(powerStrip.purchaseDate),
        usageDate: formatDateTimeLocal(powerStrip.usageDate),
        notes: powerStrip.notes || ''
      });
    } else if (mode === 'create') {
      setFormData({
        brand: '',
        model: '',
        outletCount: 0,
        lengthMeters: 0,
        color: '',
        capacity: 0,
        purchasePrice: undefined,
        purchaseDate: getCurrentDateTimeLocal(),
        usageDate: getCurrentDateTimeLocal(),
        notes: ''
      });
    }
  }, [powerStrip, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create' && (!quantity || quantity < 1)) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);

    try {
      const iterations = mode === 'create' ? quantity : 1;
      
      for (let i = 0; i < iterations; i++) {
        // Solo model es obligatorio
        const cleanedData: CreatePowerStripDto = {
          model: formData.model.trim(),
        };

        // Agregar campos opcionales solo si tienen valor válido
        if (formData.brand && formData.brand.trim() !== '') {
          cleanedData.brand = formData.brand.trim();
        }
        
        if (formData.outletCount && formData.outletCount > 0) {
          cleanedData.outletCount = Number(formData.outletCount);
        }
        
        if (formData.lengthMeters && formData.lengthMeters > 0) {
          cleanedData.lengthMeters = Number(formData.lengthMeters);
        }
        
        if (formData.color && formData.color.trim() !== '') {
          cleanedData.color = formData.color.trim();
        }
        
        if (formData.capacity && formData.capacity > 0) {
          cleanedData.capacity = Number(formData.capacity);
        }

        if (formData.purchasePrice !== undefined && !Number.isNaN(formData.purchasePrice)) {
          cleanedData.purchasePrice = Number(formData.purchasePrice);
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

        console.log('Datos preparados en el modal:', cleanedData);

        await onSave(cleanedData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar la regleta. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreatePowerStripDto, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Regleta' : 'Editar Regleta'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Completa los datos de la nueva regleta'
              : 'Modifica los datos de la regleta'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="Tripp Lite"
              maxLength={100}
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
              placeholder="TLP606"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outletCount">Número de Tomas</Label>
            <Input
              id="outletCount"
              type="number"
              min="1"
              value={formData.outletCount}
              onChange={(e) => handleChange('outletCount', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lengthMeters">Longitud del Cable (m)</Label>
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
            <Label htmlFor="capacity">Capacidad (W)</Label>
            <Input
              id="capacity"
              type="number"
              min="0"
              value={formData.capacity}
              onChange={(e) => handleChange('capacity', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="Negro"
              maxLength={50}
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
            <Label htmlFor="purchasePrice">Precio de Compra</Label>
            <Input
              id="purchasePrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.purchasePrice ?? ''}
              onChange={(e) => handleChange('purchasePrice', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="0.00"
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

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad a Crear *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="1000"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          )}

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