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
import { RJ45Connector } from '@/data/mockDataExtended';
import { CreateRJ45ConnectorDto } from '@/api/consumables';
import { Loader2 } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

interface RJ45ConnectorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateRJ45ConnectorDto) => Promise<void>;
  connector?: RJ45Connector | null;
  mode: 'create' | 'edit';
}

// Obtener fecha y hora actual en formato YYYY-MM-DDTHH:mm
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

export default function RJ45ConnectorFormModal({
  open,
  onOpenChange,
  onSave,
  connector,
  mode,
}: RJ45ConnectorFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const [formData, setFormData] = useState<CreateRJ45ConnectorDto>({
    model: '',
    quantityUnits: 0,
    material: '',
    type: '',
    purchaseDate: getCurrentDateTimeLocal(),
    usageDate: getCurrentDateTimeLocal(),
    notes: '',
  });

  useEffect(() => {
    if (connector && mode === 'edit') {
      setFormData({
        model: connector.model,
        quantityUnits: connector.quantityUnits,
        material: connector.material,
        type: connector.type,
        purchaseDate: formatDateTimeLocal(connector.purchaseDate),
        usageDate: formatDateTimeLocal(connector.usageDate),
        notes: connector.notes || '',
      });
    } else if (mode === 'create') {
      setFormData({
        model: '',
        quantityUnits: 0,
        material: '',
        type: '',
        purchaseDate: getCurrentDateTimeLocal(),
        usageDate: getCurrentDateTimeLocal(),
        notes: '',
      });
    }
  }, [connector, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.model || !formData.type || !formData.material) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (mode === 'create' && (!quantity || quantity < 1)) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const iterations = mode === 'create' ? quantity : 1;
      
      for (let i = 0; i < iterations; i++) {
        await onSave(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateRJ45ConnectorDto, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Conector RJ45' : 'Editar Conector RJ45'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Completa los datos del nuevo conector'
              : 'Modifica los datos del conector'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">
              Modelo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              placeholder="RJ45-CAT6"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              placeholder="CAT6"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material">
              Material <span className="text-destructive">*</span>
            </Label>
            <Input
              id="material"
              value={formData.material}
              onChange={(e) => handleChange('material', e.target.value)}
              placeholder="Plástico"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityUnits">
              Cantidad (unidades) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantityUnits"
              type="number"
              min="0"
              value={formData.quantityUnits}
              onChange={(e) =>
                handleChange('quantityUnits', parseInt(e.target.value) || 0)
              }
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

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Cantidad de Equipos <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="1000"
              value={quantity || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setQuantity(val > 0 ? val : 0);
              }}
              placeholder="1"
              required
            />
            <p className="text-xs text-muted-foreground">
              {mode === 'create' ? 'Si ingresas más de 1, se crearán múltiples elementos' : 'Cantidad'}
            </p>
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