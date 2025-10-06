// src/components/DeviceFormModal.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Asset, mockBranches } from '@/data/mockDataExtended';
import { CreateDeviceDto } from '@/api/devices';
import { Loader2 } from 'lucide-react';

interface DeviceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateDeviceDto) => Promise<void>;
  device?: Asset | null;
  mode: 'create' | 'edit';
}

const deviceTypes = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'smartphone', label: 'Smartphone' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'server', label: 'Servidor' },
];

const statusOptions = [
  { value: 'available', label: 'Disponible' },
  { value: 'assigned', label: 'Asignado' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'decommissioned', label: 'Dado de baja' },
];

function getCurrentDateTimeLocal() {
  return new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

export default function DeviceFormModal({
  open,
  onOpenChange,
  onSave,
  device,
  mode
}: DeviceFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDeviceDto>({
    assetCode: '',
    assetType: 'laptop',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'available',
    branchId: '1',
    assignedPersonId: undefined,
    purchaseDate: getCurrentDateTimeLocal(),
    deliveryDate: getCurrentDateTimeLocal(),
    receivedDate: getCurrentDateTimeLocal(),
    notes: ''
  });

  useEffect(() => {
    if (device && mode === 'edit') {
      setFormData({
        assetCode: device.assetCode,
        assetType: device.assetType,
        brand: device.brand,
        model: device.model,
        serialNumber: device.serialNumber || '',
        status: device.status,
        branchId: device.branchId,
        assignedPersonId: device.assignedPersonId,
        purchaseDate: device.purchaseDate || getCurrentDateTimeLocal(),
        deliveryDate: device.deliveryDate || getCurrentDateTimeLocal(),
        receivedDate: device.receivedDate || getCurrentDateTimeLocal(),
        notes: device.notes || ''
      });
    } else if (mode === 'create') {
      setFormData({
        assetCode: '',
        assetType: 'laptop',
        brand: '',
        model: '',
        serialNumber: '',
        status: 'available',
        branchId: '1',
        assignedPersonId: undefined,
        purchaseDate: getCurrentDateTimeLocal(),
        deliveryDate: getCurrentDateTimeLocal(),
        receivedDate: getCurrentDateTimeLocal(),
        notes: ''
      });
    }
  }, [device, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Guardando con fechas:', {
        purchaseDate: formData.purchaseDate,
        deliveryDate: formData.deliveryDate,
        receivedDate: formData.receivedDate,
      });

      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateDeviceDto, value: string | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Dispositivo' : 'Editar Dispositivo'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Completa los datos del nuevo dispositivo'
              : 'Modifica los datos del dispositivo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="assetCode">
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assetCode"
                value={formData.assetCode}
                onChange={(e) => handleChange('assetCode', e.target.value)}
                placeholder="LAPTOP-001"
                required
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="assetType">
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.assetType}
                onValueChange={(value) => handleChange('assetType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marca */}
            <div className="space-y-2">
              <Label htmlFor="brand">
                Marca <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Dell, HP, Logitech..."
                required
              />
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="model">
                Modelo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="Latitude 5420"
                required
              />
            </div>

            {/* Serial */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Número de Serie</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                placeholder="SN123456"
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="status">
                Estado <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  handleChange('status', value as 'available' | 'assigned' | 'maintenance' | 'decommissioned')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sucursal */}
            <div className="space-y-2">
              <Label htmlFor="branchId">
                Sucursal <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => handleChange('branchId', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockBranches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha de compra */}
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Fecha de Compra</Label>
              <Input
                id="purchaseDate"
                type="datetime-local"
                value={formData.purchaseDate}
                onChange={(e) => handleChange('purchaseDate', e.target.value)}
              />
            </div>

            {/* Fecha de entrega */}
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Fecha de Entrega</Label>
              <Input
                id="deliveryDate"
                type="datetime-local"
                value={formData.deliveryDate}
                onChange={(e) => handleChange('deliveryDate', e.target.value)}
              />
            </div>

            {/* Fecha de recepción */}
            <div className="space-y-2">
              <Label htmlFor="receivedDate">Fecha de Recepción</Label>
              <Input
                id="receivedDate"
                type="datetime-local"
                value={formData.receivedDate}
                onChange={(e) => handleChange('receivedDate', e.target.value)}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Observaciones adicionales..."
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
                mode === 'create' ? 'Crear Dispositivo' : 'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
