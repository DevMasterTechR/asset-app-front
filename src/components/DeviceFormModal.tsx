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
import SearchableSelect from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Device, CreateDeviceDto, DeviceStatus, devicesApi } from '@/api/devices';
import { extractArray } from '@/lib/extractData';
import { assignmentsApi } from '@/api/assignments';
import { sortBranchesByName } from '@/lib/sort';
import { useMemo } from 'react';
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
  fixedType?: string; // Tipo fijo (ej: 'security') - oculta el selector
}

const deviceTypes = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'smartphone', label: 'Smartphone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'server', label: 'Servidor' },
  { value: 'printer', label: 'Impresora' },
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
  fixedType,
}: DeviceFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDeviceDto>({
    assetCode: '',
    assetType: fixedType || 'laptop',
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
  const [serverError, setServerError] = useState<string | null>(null);

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
        assetType: fixedType || 'laptop',
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
  }, [device, mode, open, fixedType]);

  const hasActiveAssignment = Boolean(device && (device.assignedPersonId || deliveryDateAuto));

  // Sincronizar checkbox de recepción pendiente con el formData
  useEffect(() => {
    setPendingReceived(!formData.receivedDate);
  }, [formData.receivedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError(null);

    try {
      // Validate phone number uniqueness for smartphones/tablets
      const phoneRaw = String(getAttrValue('phoneNumber') || '').trim();
      const phoneNormalized = phoneRaw.replace(/\s+/g, '').replace(/[^+0-9]/g, '');
      if ((formData.assetType === 'smartphone' || formData.assetType === 'tablet') && phoneNormalized) {
        // Prefer server-side fast check if available
        try {
          const check = await devicesApi.checkPhone(phoneNormalized);
          if (check && check.exists) {
            // if editing, allow if the existing device is the same
            if (!(mode === 'edit' && String(check.deviceId) === String(device?.id))) {
              setServerError('El número telefónico ya está registrado en otro dispositivo.');
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          // fallback: if checkPhone fails (endpoint missing or network), do the client-side scan
          try {
            const res = await devicesApi.getAll(undefined, 1, 1000);
            const allDevices = extractArray<any>(res) || [];
            const conflict = allDevices.find((d: any) => {
              const pn = d.attributesJson?.phoneNumber || d.attributesJson?.phone || '';
              const pnn = String(pn || '').trim().replace(/\s+/g, '').replace(/[^+0-9]/g, '');
              if (!pnn) return false;
              if (mode === 'edit' && String(d.id) === String(device?.id)) return false;
              return pnn === phoneNormalized;
            });
            if (conflict) {
              setServerError('El número telefónico ya está registrado en otro dispositivo.');
              setLoading(false);
              return;
            }
          } catch (err2) {
            console.warn('No se pudo validar número telefónico (fallback):', err2);
            // allow save if both checks fail — server should enforce uniqueness ideally
          }
        }
      }

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
      // Mostrar mensaje del servidor si existe
      const rawMessage = (error as any)?.response?.data?.message || (error as any)?.message || 'Error desconocido al guardar';
      // Normalizar mensajes antiguos a la nueva redacción solicitada
      const normalized = (() => {
        const m = String(rawMessage);
        const variants = [
          'No puedes editar el campo "status": el activo tiene una asignación activa',
          'No puedes editar el campo \"status\": el activo tiene una asignación activa',
          'No puedes editar la fecha de recepción: el activo tiene una asignación activa',
          'No puedes editar el dispositivo hasta que no tenga una asignación activa',
        ];
        if (variants.includes(m)) {
          return 'No puedes editar este dispositivo hasta que deje de tener una asignación activa';
        }
        return m;
      })();
      setServerError(normalized);
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

  const branchOptions = useMemo(() => sortBranchesByName(branches).map(b => ({ label: b.name, value: b.id.toString() })), [branches]);

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
              <SearchableSelect
                value={String(getAttrValue('connectionType') || 'none')}
                onValueChange={(value) => handleAttributeChange('connectionType', value === 'none' ? '' : value)}
                placeholder="Selecciona tipo"
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'USB', value: 'USB' },
                  { label: 'Bluetooth', value: 'Bluetooth' },
                  { label: 'Inalámbrico (2.4GHz)', value: 'Wireless' },
                  { label: 'Cable', value: 'Wired' },
                ]}
              />
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

      case 'printer':
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de impresora</Label>
              <SearchableSelect
                value={String(getAttrValue('printerType') || 'none')}
                onValueChange={(value) => handleAttributeChange('printerType', value === 'none' ? '' : value)}
                placeholder="Selecciona tipo"
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'Láser', value: 'laser' },
                  { label: 'Inyección de tinta', value: 'inkjet' },
                  { label: 'Térmica', value: 'thermal' },
                  { label: 'Matricial', value: 'dot-matrix' },
                  { label: 'Multifuncional', value: 'multifunction' },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de conexión</Label>
              <SearchableSelect
                value={String(getAttrValue('connectionType') || 'none')}
                onValueChange={(value) => handleAttributeChange('connectionType', value === 'none' ? '' : value)}
                placeholder="Selecciona tipo"
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'USB', value: 'USB' },
                  { label: 'Ethernet (Red)', value: 'Ethernet' },
                  { label: 'WiFi', value: 'WiFi' },
                  { label: 'Bluetooth', value: 'Bluetooth' },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Dirección IP (si aplica)</Label>
              <Input
                value={String(getAttrValue('ipAddress') || '')}
                onChange={(e) => handleAttributeChange('ipAddress', e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasScanner"
                checked={Boolean(getAttrValue('hasScanner'))}
                onCheckedChange={(checked) => handleAttributeChange('hasScanner', checked === true)}
              />
              <Label htmlFor="hasScanner" className="cursor-pointer">¿Tiene escáner?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="colorPrinting"
                checked={Boolean(getAttrValue('colorPrinting'))}
                onCheckedChange={(checked) => handleAttributeChange('colorPrinting', checked === true)}
              />
              <Label htmlFor="colorPrinting" className="cursor-pointer">¿Imprime a color?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPowerCable"
                checked={Boolean(getAttrValue('hasPowerCable'))}
                onCheckedChange={(checked) => handleAttributeChange('hasPowerCable', checked === true)}
              />
              <Label htmlFor="hasPowerCable" className="cursor-pointer">¿Tiene cable de poder?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasUSBCable"
                checked={Boolean(getAttrValue('hasUSBCable'))}
                onCheckedChange={(checked) => handleAttributeChange('hasUSBCable', checked === true)}
              />
              <Label htmlFor="hasUSBCable" className="cursor-pointer">¿Tiene cable USB?</Label>
            </div>
          </>
        );

      case 'security':
        return (
          <>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Input
                value={String(getAttrValue('category') || '')}
                onChange={(e) => handleAttributeChange('category', e.target.value)}
                placeholder="Cámara, Alarma, Sensor, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                value={Number(getAttrValue('quantity')) || ''}
                onChange={(e) => handleAttributeChange('quantity', e.target.value ? Number(e.target.value) : 0)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input
                value={String(getAttrValue('location') || '')}
                onChange={(e) => handleAttributeChange('location', e.target.value)}
                placeholder="Entrada principal, Piso 2, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>URL de imagen</Label>
              <Input
                value={String(getAttrValue('imageUrl') || '')}
                onChange={(e) => handleAttributeChange('imageUrl', e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
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

            {fixedType ? (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input
                  value="Seguridad"
                  disabled
                  className="bg-muted"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <SearchableSelect
                  value={formData.assetType}
                  onValueChange={(value) => handleChange('assetType', value)}
                  placeholder="Selecciona tipo"
                  options={deviceTypes.map(t => ({ label: t.label, value: t.value }))}
                />
              </div>
            )}

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
              <SearchableSelect
                value={formData.status || ''}
                onValueChange={(value) => handleChange('status', value as DeviceStatus)}
                placeholder="Selecciona estado"
                options={statusOptions.filter((s) => (mode === 'create' ? s.value !== 'assigned' : true)).map(s => ({ label: s.label, value: s.value }))}
                disabled={hasActiveAssignment}
              />
                {hasActiveAssignment && (
                  <div className="text-sm text-rose-600 mt-1">No puedes editar este dispositivo hasta que no tenga una asignación activa</div>
                )}
            </div>

            <div className="space-y-2">
              <Label>Sucursal</Label>
              <SearchableSelect
                value={formData.branchId?.toString() || ''}
                onValueChange={(value) => handleChange('branchId', value === '' ? undefined : Number(value))}
                placeholder="Sin sucursal"
                options={branchOptions}
              />
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
                <Label>Fecha de compra/procesador</Label>
                
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
                        disabled={hasActiveAssignment}
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
            {serverError && (
              <div className="w-full text-center text-sm text-rose-700 mb-2">{serverError}</div>
            )}
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