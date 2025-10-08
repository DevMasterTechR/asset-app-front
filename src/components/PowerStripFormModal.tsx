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

export default function PowerStripFormModal({
  open,
  onOpenChange,
  onSave,
  powerStrip,
  mode
}: PowerStripFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePowerStripDto>({
    brand: '',
    model: '',
    outletCount: 0,
    lengthMeters: 0,
    color: '',
    capacity: 0,
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
        purchaseDate: powerStrip.purchaseDate || getCurrentDateTimeLocal(),
        usageDate: powerStrip.usageDate || getCurrentDateTimeLocal(),
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
        purchaseDate: getCurrentDateTimeLocal(),
        usageDate: getCurrentDateTimeLocal(),
        notes: ''
      });
    }
  }, [powerStrip, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleChange = (field: keyof CreatePowerStripDto, value: string | number) => {
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
            <Label htmlFor="brand">
              Marca <span className="text-destructive">*</span>
            </Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="Tripp Lite"
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
              placeholder="TLP606"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outletCount">
              Número de Tomas <span className="text-destructive">*</span>
            </Label>
            <Input
              id="outletCount"
              type="number"
              min="1"
              value={formData.outletCount}
              onChange={(e) => handleChange('outletCount', parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lengthMeters">
              Longitud del Cable (m) <span className="text-destructive">*</span>
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
            <Label htmlFor="capacity">
              Capacidad (W) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              min="0"
              value={formData.capacity}
              onChange={(e) => handleChange('capacity', parseInt(e.target.value) || 0)}
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
