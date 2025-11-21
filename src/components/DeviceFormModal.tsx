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
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Device, CreateDeviceDto, DeviceStatus } from '@/api/devices';
import { assignmentsApi } from '@/api/assignments';
import { Person } from '@/data/mockDataExtended';
import { Loader2 } from 'lucide-react';

interface DeviceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateDeviceDto) => Promise<void>;
  device?: Device | null;
  mode: 'create' | 'edit';
  branches: Array<{ id: number; name: string }>;
  people?: Person[];
}

const deviceTypes = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'smartphone', label: 'Smartphone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'server', label: 'Servidor' },
];

const statusOptions: Array<{ value: DeviceStatus; label: string }> = [
  { value: 'available', label: 'Disponible' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'decommissioned', label: 'Dado de baja' },
];

// Función helper para obtener fecha/hora actual en formato ISO
const getCurrentDateTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function DeviceFormModal({
  open,
  onOpenChange,
  onSave,
  device,
  mode,
  branches,
  people = [],
}: DeviceFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDeviceDto>({
    assetCode: '',
    assetType: 'laptop',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'available',
    branchId: undefined,
    assignedPersonId: undefined,
    purchaseDate: '',
    deliveryDate: '',
    receivedDate: '',
    notes: '',
    attributesJson: {},
  });
  const [pendingReceived, setPendingReceived] = useState(false);
  // Fecha de entrega calculada automáticamente a partir de la última asignación
  const [deliveryDateAuto, setDeliveryDateAuto] = useState<string>('');

  useEffect(() => {
    if (device && mode === 'edit') {
      setFormData({
        assetCode: device.assetCode,
        assetType: device.assetType,
        brand: device.brand || '',
        model: device.model || '',
        serialNumber: device.serialNumber || '',
        // Si el dispositivo no tiene estado definido en BDD, usar 'available'
        status: device.status || 'available',
        branchId: device.branchId,
        assignedPersonId: device.assignedPersonId,
        purchaseDate: device.purchaseDate?.substring(0, 16) || '',
        deliveryDate: device.deliveryDate?.substring(0, 16) || '',
        receivedDate: device.receivedDate?.substring(0, 16) || '',
        notes: device.notes || '',
        attributesJson: device.attributesJson || {},
      });
      // Obtener la última asignación relacionada con este activo
      (async () => {
        try {
          const all = await assignmentsApi.getAll();
          const related = all
            .filter(a => String(a.assetId) === String(device.id))
            .sort((a, b) => (a.assignmentDate > b.assignmentDate ? -1 : 1));
          const latest = related[0];
          if (latest) {
            // Si la asignación todavía no tiene returnDate, usamos la fecha de asignación
            if (!latest.returnDate) {
              // Convertir ISO a formato 'YYYY-MM-DDTHH:mm' si viene en ISO
              const d = new Date(latest.assignmentDate);
              const iso = isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
              setDeliveryDateAuto(iso);
            } else {
              // Asignación completada -> fecha de entrega vacía
              setDeliveryDateAuto('');
            }
          } else {
            setDeliveryDateAuto('');
          }
        } catch (e) {
          setDeliveryDateAuto('');
        }
      })();
    } else if (mode === 'create') {
      // En modo crear permitimos que las fechas queden vacías por defecto
      setFormData({
        assetCode: '',
        assetType: 'laptop',
        brand: '',
        model: '',
        serialNumber: '',
        status: 'available',
        branchId: undefined,
        assignedPersonId: undefined,
        purchaseDate: '',
        deliveryDate: '',
        receivedDate: '',
        notes: '',
        attributesJson: {},
      });
    }
  }, [device, mode, open]);

  // Sincronizar checkbox de recepción pendiente con el formData
  useEffect(() => {
    setPendingReceived(!formData.receivedDate);
  }, [formData.receivedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Limpiar campos vacíos para enviar al backend
      const cleanData: CreateDeviceDto = {
        assetCode: formData.assetCode,
        assetType: formData.assetType,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        serialNumber: formData.serialNumber || undefined,
        // Garantizar un estado válido por defecto para evitar enviar cadena vacía
        status: formData.status || 'available',
        branchId: formData.branchId || undefined,
        assignedPersonId: formData.assignedPersonId || undefined,
        purchaseDate: formData.purchaseDate || undefined,
        // Priorizar la fecha de entrega automática calculada por última asignación
        deliveryDate: deliveryDateAuto || formData.deliveryDate || undefined,
        receivedDate: formData.receivedDate || undefined,
        notes: formData.notes || undefined,
        attributesJson: Object.keys(formData.attributesJson || {}).length > 0 ? formData.attributesJson : undefined,
      };

      await onSave(cleanData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateDeviceDto, value: string | number | DeviceStatus | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttributeChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      attributesJson: { ...(prev.attributesJson || {}), [key]: value },
    }));
  };

  const getAttrValue = (key: string): string | number | boolean | undefined => {
    const attrs = formData.attributesJson;
    if (!attrs) return undefined;
    return attrs[key];
  };

  const renderDynamicAttributes = () => {
    switch (formData.assetType) {
      case 'laptop':
      case 'server':
        return (
          <>
            <div className="space-y-2">
              <Label>CPU/Procesador</Label>
              <Input
                value={String(getAttrValue('cpu') || '')}
                onChange={(e) => handleAttributeChange('cpu', e.target.value)}
                placeholder="Intel Core i5-1135G7"
              />
            </div>
            <div className="space-y-2">
              <Label>RAM (GB)</Label>
              <Input
                type="number"
                value={Number(getAttrValue('ram')) || ''}
                onChange={(e) => handleAttributeChange('ram', e.target.value ? Number(e.target.value) : 0)}
                placeholder="16"
              />
            </div>
            <div className="space-y-2">
              <Label>Almacenamiento (GB)</Label>
              <Input
                value={String(getAttrValue('storage') || '')}
                onChange={(e) => handleAttributeChange('storage', e.target.value)}
                placeholder="512GB SSD"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasCharger"
                checked={Boolean(getAttrValue('hasCharger'))}
                onCheckedChange={(checked) => handleAttributeChange('hasCharger', checked === true)}
              />
              <Label htmlFor="hasCharger" className="cursor-pointer">¿Tiene cargador?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasBag"
                checked={Boolean(getAttrValue('hasBag'))}
                onCheckedChange={(checked) => handleAttributeChange('hasBag', checked === true)}
              />
              <Label htmlFor="hasBag" className="cursor-pointer">¿Tiene maletín/bolso?</Label>
            </div>
          </>
        );

      case 'smartphone':
      case 'tablet':
        return (
          <>
            <div className="space-y-2">
              <Label>Procesador</Label>
              <Input
                value={String(getAttrValue('cpu') || '')}
                onChange={(e) => handleAttributeChange('cpu', e.target.value)}
                placeholder="Snapdragon 8 Gen 2"
              />
            </div>
            <div className="space-y-2">
              <Label>RAM (GB)</Label>
              <Input
                type="number"
                value={Number(getAttrValue('ram')) || ''}
                onChange={(e) => handleAttributeChange('ram', e.target.value ? Number(e.target.value) : 0)}
                placeholder="8"
              />
            </div>
            <div className="space-y-2">
              <Label>Almacenamiento (GB)</Label>
              <Input
                value={String(getAttrValue('storage') || '')}
                onChange={(e) => handleAttributeChange('storage', e.target.value)}
                placeholder="256GB"
              />
            </div>
            <div className="space-y-2">
              <Label>Tamaño de pantalla (pulgadas)</Label>
              <Input
                type="number"
                step="0.1"
                value={Number(getAttrValue('screenSize')) || ''}
                onChange={(e) => handleAttributeChange('screenSize', e.target.value ? parseFloat(e.target.value) : 0)}
                placeholder="6.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Operador (SIM)</Label>
              <Input
                value={String(getAttrValue('carrier') || '')}
                onChange={(e) => handleAttributeChange('carrier', e.target.value)}
                placeholder="Claro, Movistar, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Número telefónico</Label>
              <Input
                value={String(getAttrValue('phoneNumber') || '')}
                onChange={(e) => handleAttributeChange('phoneNumber', e.target.value)}
                placeholder="+593 99 123 4567"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasCharger"
                checked={Boolean(getAttrValue('hasCharger'))}
                onCheckedChange={(checked) => handleAttributeChange('hasCharger', checked === true)}
              />
              <Label htmlFor="hasCharger" className="cursor-pointer">¿Tiene cargador?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasCase"
                checked={Boolean(getAttrValue('hasCase'))}
                onCheckedChange={(checked) => handleAttributeChange('hasCase', checked === true)}
              />
              <Label htmlFor="hasCase" className="cursor-pointer">¿Tiene funda/case?</Label>
            </div>
          </>
        );

      case 'monitor':
        return (
          <>
            <div className="space-y-2">
              <Label>Tamaño (pulgadas)</Label>
              <Input
                type="number"
                value={Number(getAttrValue('screenSize')) || ''}
                onChange={(e) => handleAttributeChange('screenSize', e.target.value ? Number(e.target.value) : 0)}
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <Label>Resolución (px)</Label>
              <Input
                value={String(getAttrValue('resolution') || '')}
                onChange={(e) => handleAttributeChange('resolution', e.target.value)}
                placeholder="1920x1080"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de panel</Label>
              <Input
                value={String(getAttrValue('panelType') || '')}
                onChange={(e) => handleAttributeChange('panelType', e.target.value)}
                placeholder="IPS, TN, VA..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasHDMI"
                checked={Boolean(getAttrValue('hasHDMI'))}
                onCheckedChange={(checked) => handleAttributeChange('hasHDMI', checked === true)}
              />
              <Label htmlFor="hasHDMI" className="cursor-pointer">¿Tiene HDMI?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasVGA"
                checked={Boolean(getAttrValue('hasVGA'))}
                onCheckedChange={(checked) => handleAttributeChange('hasVGA', checked === true)}
              />
              <Label htmlFor="hasVGA" className="cursor-pointer">¿Tiene VGA?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPowerCable"
                checked={Boolean(getAttrValue('hasPowerCable'))}
                onCheckedChange={(checked) => handleAttributeChange('hasPowerCable', checked === true)}
              />
              <Label htmlFor="hasPowerCable" className="cursor-pointer">¿Tiene cable de poder?</Label>
            </div>
          </>
        );

      case 'mouse':
      case 'keyboard':
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de conexión</Label>
              <Select
                value={String(getAttrValue('connectionType') || 'none')}
                onValueChange={(value) => handleAttributeChange('connectionType', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  <SelectItem value="USB">USB</SelectItem>
                  <SelectItem value="Bluetooth">Bluetooth</SelectItem>
                  <SelectItem value="Wireless">Inalámbrico (2.4GHz)</SelectItem>
                  <SelectItem value="Wired">Cable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                value={String(getAttrValue('color') || '')}
                onChange={(e) => handleAttributeChange('color', e.target.value)}
                placeholder="Negro, Blanco..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasBatteries"
                checked={Boolean(getAttrValue('hasBatteries'))}
                onCheckedChange={(checked) => handleAttributeChange('hasBatteries', checked === true)}
              />
              <Label htmlFor="hasBatteries" className="cursor-pointer">¿Requiere baterías?</Label>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código <span className="text-destructive">*</span></Label>
              <Input
                value={formData.assetCode}
                onChange={(e) => handleChange('assetCode', e.target.value)}
                placeholder="LAPTOP-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo <span className="text-destructive">*</span></Label>
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

            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Dell, HP, Logitech..."
              />
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="Latitude 5420"
              />
            </div>

            <div className="space-y-2">
              <Label>Número de Serie</Label>
              <Input
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                placeholder="SN123456"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Estado <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status || ''}
                onValueChange={(value: DeviceStatus) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                  <SelectContent>
                    {statusOptions
                      .filter((s) => (mode === 'create' ? s.value !== 'assigned' : true))
                      .map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select
                value={formData.branchId?.toString() || ''}
                onValueChange={(value) =>
                  handleChange('branchId', value === '' ? undefined : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo 'Asignado a' eliminado: se rellena automáticamente al crear una asignación */}

          </div>

          {/* Atributos dinámicos según tipo */}
          {renderDynamicAttributes() && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Atributos específicos</h3>
                <div className="grid grid-cols-2 gap-4">
                  {renderDynamicAttributes()}
                </div>
              </div>
            </>
          )}

          {/* Fechas */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Fechas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:pr-4 md:border-r md:border-muted">
                <Label>Fecha de compra</Label>
                <DateTimePicker
                  value={formData.purchaseDate}
                  onChange={(value) => handleChange('purchaseDate', value)}
                />
              </div>

              <div className="space-y-2 md:pl-4">
                <Label>Fecha de entrega</Label>
                <div className="text-sm text-muted-foreground">
                  {deliveryDateAuto
                    ? deliveryDateAuto.replace('T', ' ')
                    : 'Sin fecha (pendiente o asignación completada)'}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2 flex justify-center items-center">
                <div className="w-full max-w-xl">
                  <Label className="text-center">Fecha de recepción</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1">
                      <DateTimePicker
                        value={formData.receivedDate}
                        onChange={(value) => handleChange('receivedDate', value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="pendingReceived"
                        type="checkbox"
                        checked={pendingReceived}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPendingReceived(checked);
                          if (checked) {
                            handleChange('receivedDate', '');
                          }
                        }}
                      />
                      <Label htmlFor="pendingReceived" className="cursor-pointer">Recepción pendiente</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
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