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
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    __availableMice?: Array<any>;
    __availableTeclados?: Array<any>;
    __availableMonitores?: Array<any>;
    __availableStands?: Array<any>;
    __availableMemoryAdapters?: Array<any>;
    __availableNetworkAdapters?: Array<any>;
    __availableHubs?: Array<any>;
    __availableMousepads?: Array<any>;
  }
}

async function reloadAvailableAccessories() {
  try {
    const res = await devicesApi.getAll(undefined, 1, 2000);
    const all = extractArray<any>(res) || [];
    window.__availableMice = all.filter(d => d.assetType === 'mouse' && d.status === 'available' && !d.assignedPersonId);
    window.__availableTeclados = all.filter(d => d.assetType === 'teclado' && d.status === 'available' && !d.assignedPersonId);
    window.__availableMonitores = all.filter(d => d.assetType === 'monitor' && d.status === 'available' && !d.assignedPersonId);
    window.__availableStands = all.filter(d => d.assetType === 'soporte' && d.status === 'available' && !d.assignedPersonId);
    window.__availableMemoryAdapters = all.filter(d => d.assetType === 'adaptador-memoria' && d.status === 'available' && !d.assignedPersonId);
    window.__availableNetworkAdapters = all.filter(d => d.assetType === 'adaptador-red' && d.status === 'available' && !d.assignedPersonId);
    window.__availableHubs = all.filter(d => d.assetType === 'hub' && d.status === 'available' && !d.assignedPersonId);
    window.__availableMousepads = all.filter(d => d.assetType === 'mousepad' && d.status === 'available' && !d.assignedPersonId);
  } catch (e) {
    console.error('Error cargando accesorios:', e);
  }
}

interface DeviceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateDeviceDto) => Promise<void>;
  device?: Device | null;
  mode: 'create' | 'edit';
  branches: Array<{ id: number; name: string }>;
  fixedType?: string;
}

const deviceTypes = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'desktop', label: 'PC/Sobremesa' },
  { value: 'smartphone', label: 'Smartphone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'mousepad', label: 'Mousepad' },
  { value: 'soporte', label: 'Soporte' },
  { value: 'hub', label: 'HUB' },
  { value: 'adaptador-memoria', label: 'Adaptador Memoria' },
  { value: 'adaptador-red', label: 'Adaptador Red' },
  { value: 'teclado', label: 'Teclado' },
  { value: 'server', label: 'Servidor' },
  { value: 'printer', label: 'Impresora' },
  { value: 'ip-phone', label: 'Teléfono IP' },
];

const statusOptions: Array<{ value: DeviceStatus; label: string }> = [
  { value: 'available', label: 'Disponible' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'decommissioned', label: 'Dado de baja' },
];

export default function DeviceFormModal({
  open,
  onOpenChange,
  onSave,
  device,
  mode,
  branches,
  fixedType,
}: DeviceFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [showAccessoryModal, setShowAccessoryModal] = useState(false);
  const [pendingNewAccessory, setPendingNewAccessory] = useState<string | null>(null);

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
  const [deliveryDateAuto, setDeliveryDateAuto] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) reloadAvailableAccessories();
  }, [open]);

  useEffect(() => {
    const pending = getAttrValue('pendingNewAccessory');
    if (pending && typeof pending === 'string') {
      setPendingNewAccessory(pending);
      setShowAccessoryModal(true);
      handleAttributeChange('pendingNewAccessory', undefined);
    }
  }, [formData.attributesJson?.pendingNewAccessory]);

  useEffect(() => {
    if (device && mode === 'edit') {
      setFormData({
        assetCode: device.assetCode,
        assetType: device.assetType,
        brand: device.brand || '',
        model: device.model || '',
        serialNumber: device.serialNumber || '',
        status: device.status || 'available',
        branchId: device.branchId,
        assignedPersonId: device.assignedPersonId,
        purchaseDate: device.purchaseDate?.substring(0, 16) || '',
        deliveryDate: device.deliveryDate?.substring(0, 16) || '',
        receivedDate: device.receivedDate?.substring(0, 16) || '',
        notes: device.notes || '',
        attributesJson: device.attributesJson || {},
      });

      (async () => {
        try {
          const all = await assignmentsApi.getAll();
          const related = all.filter(a => String(a.assetId) === String(device.id))
            .sort((a, b) => (a.assignmentDate > b.assignmentDate ? -1 : 1));
          const latest = related[0];
          if (latest && !latest.returnDate) {
            const d = new Date(latest.assignmentDate);
            const iso = isNaN(d.getTime())
              ? ''
              : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            setDeliveryDateAuto(iso);
          } else {
            setDeliveryDateAuto('');
          }
        } catch (e) {
          setDeliveryDateAuto('');
        }
      })();
    } else if (mode === 'create') {
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
      setDeliveryDateAuto('');
    }
  }, [device, mode, open, fixedType]);

  const hasActiveAssignment = Boolean(device && (device.assignedPersonId || deliveryDateAuto));

  useEffect(() => {
    setPendingReceived(!formData.receivedDate);
  }, [formData.receivedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError(null);

    try {
      const phoneRaw = String(getAttrValue('phoneNumber') || '').trim();
      const phoneNormalized = phoneRaw.replace(/\s+/g, '').replace(/[^+0-9]/g, '');
      if ((formData.assetType === 'smartphone' || formData.assetType === 'tablet') && phoneNormalized) {
        try {
          const check = await devicesApi.checkPhone(phoneNormalized);
          if (check?.exists && !(mode === 'edit' && String(check.deviceId) === String(device?.id))) {
            setServerError('El número telefónico ya está registrado en otro dispositivo.');
            setLoading(false);
            return;
          }
        } catch (err) {
          const res = await devicesApi.getAll(undefined, 1, 1000);
          const allDevices = extractArray<any>(res) || [];
          const conflict = allDevices.find((d: any) => {
            const pn = d.attributesJson?.phoneNumber || d.attributesJson?.phone || '';
            const pnn = String(pn).trim().replace(/\s+/g, '').replace(/[^+0-9]/g, '');
            if (!pnn) return false;
            if (mode === 'edit' && String(d.id) === String(device?.id)) return false;
            return pnn === phoneNormalized;
          });
          if (conflict) {
            setServerError('El número telefónico ya está registrado en otro dispositivo.');
            setLoading(false);
            return;
          }
        }
      }

      const cleanData: CreateDeviceDto = {
        assetCode: formData.assetType,
        assetType: formData.assetType,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        serialNumber: formData.serialNumber || undefined,
        status: formData.status || 'available',
        branchId: formData.branchId || undefined,
        assignedPersonId: formData.assignedPersonId || undefined,
        purchaseDate: formData.purchaseDate || undefined,
        deliveryDate: deliveryDateAuto || formData.deliveryDate || undefined,
        receivedDate: formData.receivedDate || undefined,
        notes: formData.notes || undefined,
        attributesJson: Object.keys(formData.attributesJson || {}).length > 0 ? formData.attributesJson : undefined,
      };

      await onSave(cleanData);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error al guardar:', error);
      const rawMessage = error?.response?.data?.message || error?.message || 'Error desconocido';
      const normalized = rawMessage.includes('asignación activa')
        ? 'No puedes editar este dispositivo hasta que deje de tener una asignación activa'
        : rawMessage;
      setServerError(normalized);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateDeviceDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttributeChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attributesJson: { ...(prev.attributesJson || {}), [key]: value },
    }));
  };

  const getAttrValue = (key: string): any => formData.attributesJson?.[key];

  const branchOptions = useMemo(() => sortBranchesByName(branches).map(b => ({ label: b.name, value: b.id.toString() })), [branches]);

  const renderAccessoryBlock = (
    checkboxKey: string,
    labelText: string,
    radioKey: string,
    selectIdKey: string,
    assetType: string,
    availableList: any[]
  ) => {
    const hasAccessory = Boolean(getAttrValue(checkboxKey));

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={checkboxKey}
            checked={hasAccessory}
            onCheckedChange={(checked) => {
              handleAttributeChange(checkboxKey, checked === true);
              if (!checked) {
                handleAttributeChange(radioKey, undefined);
                handleAttributeChange(selectIdKey, undefined);
              }
            }}
          />
          <Label htmlFor={checkboxKey} className="cursor-pointer font-medium">
            {labelText}
          </Label>
        </div>

        {hasAccessory && (
          <>
            <div className="ml-8 flex flex-col gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={radioKey}
                  value="yes"
                  checked={getAttrValue(radioKey) === 'yes'}
                  onChange={() => {
                    handleAttributeChange(radioKey, 'yes');
                    handleAttributeChange(selectIdKey, undefined);
                    handleAttributeChange('pendingNewAccessory', assetType);
                  }}
                />
                <span>Agregar nuevo {labelText.toLowerCase().replace('¿tiene ', '').replace('?', '')}</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={radioKey}
                  value="no"
                  checked={getAttrValue(radioKey) === 'no'}
                  onChange={() => {
                    handleAttributeChange(radioKey, 'no');
                    setShowAccessoryModal(false);
                  }}
                />
                <span>Asignar uno existente</span>
              </label>
            </div>

            {getAttrValue(radioKey) === 'no' && (
              <div className="ml-8 mt-3 w-full max-w-md">
                <Label>Selecciona uno disponible</Label>
                <SearchableSelect
                  value={getAttrValue(selectIdKey) ? String(getAttrValue(selectIdKey)) : ''}
                  onValueChange={(value) => handleAttributeChange(selectIdKey, value)}
                  placeholder="Buscar..."
                  options={availableList.map(item => ({
                    label: `${item.assetCode ?? item.id} - ${item.brand ?? ''} ${item.model ?? ''}`.trim(),
                    value: String(item.id),
                  }))}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderDynamicAttributes = () => {
    switch (formData.assetType) {
      case 'laptop':
      case 'server':
        return (
          <>
            <div className="space-y-2">
              <Label>CPU/Procesador</Label>
              <Input value={String(getAttrValue('cpu') || '')} onChange={e => handleAttributeChange('cpu', e.target.value)} placeholder="Intel Core i5-1135G7" />
            </div>
            <div className="space-y-2">
              <Label>RAM (GB)</Label>
              <Input type="number" value={Number(getAttrValue('ram')) || ''} onChange={e => handleAttributeChange('ram', e.target.value ? Number(e.target.value) : 0)} placeholder="16" />
            </div>
            <div className="space-y-2">
              <Label>Almacenamiento</Label>
              <Input value={String(getAttrValue('storage') || '')} onChange={e => handleAttributeChange('storage', e.target.value)} placeholder="512GB SSD" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasCharger" checked={Boolean(getAttrValue('hasCharger'))} onCheckedChange={c => handleAttributeChange('hasCharger', c === true)} />
              <Label htmlFor="hasCharger">¿Tiene cargador?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasBag" checked={Boolean(getAttrValue('hasBag'))} onCheckedChange={c => handleAttributeChange('hasBag', c === true)} />
              <Label htmlFor="hasBag">¿Tiene maletín/bolso?</Label>
            </div>

            {renderAccessoryBlock('hasMouse', '¿Tiene mouse?', 'hasMouseRadio', 'selectedMouseId', 'mouse', window.__availableMice ?? [])}
            {renderAccessoryBlock('hasTeclado', '¿Tiene teclado?', 'hasTecladoRadio', 'selectedTecladoId', 'teclado', window.__availableTeclados ?? [])}
            {renderAccessoryBlock('hasMonitor', '¿Tiene monitor?', 'hasMonitorRadio', 'selectedMonitorId', 'monitor', window.__availableMonitores ?? [])}
            {renderAccessoryBlock('hasStand', '¿Tiene soporte?', 'hasStandRadio', 'selectedStandId', 'soporte', window.__availableStands ?? [])}
            {renderAccessoryBlock('hasMemoryAdapter', '¿Tiene adaptador de memoria?', 'hasMemoryAdapterRadio', 'selectedMemoryAdapterId', 'adaptador-memoria', window.__availableMemoryAdapters ?? [])}
            {renderAccessoryBlock('hasNetworkAdapter', '¿Tiene adaptador de red?', 'hasNetworkAdapterRadio', 'selectedNetworkAdapterId', 'adaptador-red', window.__availableNetworkAdapters ?? [])}
            {renderAccessoryBlock('hasHub', '¿Tiene HUB?', 'hasHubRadio', 'selectedHubId', 'hub', window.__availableHubs ?? [])}
            {renderAccessoryBlock('hasMousepad', '¿Tiene mousepad?', 'hasMousepadRadio', 'selectedMousepadId', 'mousepad', window.__availableMousepads ?? [])}
          </>
        );

      case 'monitor':
        return (
          <>
            <div className="space-y-2">
              <Label>Tamaño (pulgadas)</Label>
              <Input type="number" value={Number(getAttrValue('screenSize')) || ''} onChange={e => handleAttributeChange('screenSize', e.target.value ? Number(e.target.value) : 0)} placeholder="24" />
            </div>
            <div className="space-y-2">
              <Label>Resolución (px)</Label>
              <Input value={String(getAttrValue('resolution') || '')} onChange={e => handleAttributeChange('resolution', e.target.value)} placeholder="1920x1080" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de panel</Label>
              <Input value={String(getAttrValue('panelType') || '')} onChange={e => handleAttributeChange('panelType', e.target.value)} placeholder="IPS, TN, VA..." />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasHDMI" checked={Boolean(getAttrValue('hasHDMI'))} onCheckedChange={c => handleAttributeChange('hasHDMI', c === true)} />
              <Label htmlFor="hasHDMI">¿Tiene HDMI?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasVGA" checked={Boolean(getAttrValue('hasVGA'))} onCheckedChange={c => handleAttributeChange('hasVGA', c === true)} />
              <Label htmlFor="hasVGA">¿Tiene VGA?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasPowerCable" checked={Boolean(getAttrValue('hasPowerCable'))} onCheckedChange={c => handleAttributeChange('hasPowerCable', c === true)} />
              <Label htmlFor="hasPowerCable">¿Tiene cable de poder?</Label>
            </div>
          </>
        );

      case 'teclado':
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de conexión</Label>
              <SearchableSelect
                value={String(getAttrValue('connectionType') || 'none')}
                onValueChange={value => handleAttributeChange('connectionType', value === 'none' ? '' : value)}
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
              <Input value={String(getAttrValue('color') || '')} onChange={e => handleAttributeChange('color', e.target.value)} placeholder="Negro, Blanco..." />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasBatteries" checked={Boolean(getAttrValue('hasBatteries'))} onCheckedChange={c => handleAttributeChange('hasBatteries', c === true)} />
              <Label htmlFor="hasBatteries">¿Requiere baterías?</Label>
            </div>
          </>
        );

      case 'mouse':
        return (
          <>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input value={String(getAttrValue('color') || '')} onChange={e => handleAttributeChange('color', e.target.value)} placeholder="Negro, Blanco, Azul..." />
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox id="isWireless" checked={Boolean(getAttrValue('isWireless'))} onCheckedChange={c => handleAttributeChange('isWireless', c === true)} />
              <Label htmlFor="isWireless">¿Es inalámbrico?</Label>
            </div>
            {getAttrValue('isWireless') === true && (
              <>
                <div className="space-y-2 mt-2">
                  <Label>Tipo de batería</Label>
                  <select className="w-full border rounded px-2 py-1" value={String(getAttrValue('batteryType') || '')} onChange={e => handleAttributeChange('batteryType', e.target.value)}>
                    <option value="">Seleccione</option>
                    <option value="interna">Interna</option>
                    <option value="externa">Externa</option>
                  </select>
                </div>
                {getAttrValue('batteryType') === 'interna' && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="hasChargeCable" checked={Boolean(getAttrValue('hasChargeCable'))} onCheckedChange={c => handleAttributeChange('hasChargeCable', c === true)} />
                    <Label htmlFor="hasChargeCable">¿Se entrega con cable de carga?</Label>
                  </div>
                )}
                {getAttrValue('batteryType') === 'externa' && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="hasBatteryIncluded" checked={Boolean(getAttrValue('hasBatteryIncluded'))} onCheckedChange={c => handleAttributeChange('hasBatteryIncluded', c === true)} />
                    <Label htmlFor="hasBatteryIncluded">¿Se entrega con batería?</Label>
                  </div>
                )}
              </>
            )}
          </>
        );

      case 'mousepad':
        return (
          <>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={String(getAttrValue('brand') || '')}
                onChange={e => handleAttributeChange('brand', e.target.value)}
                placeholder="Razer, Logitech, HyperX..."
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                value={String(getAttrValue('color') || '')}
                onChange={e => handleAttributeChange('color', e.target.value)}
                placeholder="Negro, RGB, Gris, etc."
              />
            </div>
          </>
        );

      case 'soporte':
        return (
          <>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input value={String(getAttrValue('color') || '')} onChange={e => handleAttributeChange('color', e.target.value)} placeholder="Negro, Gris, etc." />
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Input value={String(getAttrValue('material') || '')} onChange={e => handleAttributeChange('material', e.target.value)} placeholder="Metal, Plástico, etc." />
            </div>
          </>
        );

      case 'adaptador-memoria':
        return (
          <>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input value={String(getAttrValue('color') || '')} onChange={e => handleAttributeChange('color', e.target.value)} placeholder="Negro, Blanco..." />
            </div>
            <div className="space-y-2">
              <Label>Tipo de conexión</Label>
              <SearchableSelect
                value={String(getAttrValue('connectionType') || 'none')}
                onValueChange={value => handleAttributeChange('connectionType', value === 'none' ? '' : value)}
                placeholder="Selecciona tipo"
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'USB-A', value: 'USB-A' },
                  { label: 'USB-C', value: 'USB-C' },
                ]}
              />
            </div>
          </>
        );

      case 'adaptador-red':
        return (
          <>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input value={String(getAttrValue('color') || '')} onChange={e => handleAttributeChange('color', e.target.value)} placeholder="Negro, Blanco..." />
            </div>
            <div className="space-y-2">
              <Label>Tipo de conexión</Label>
              <SearchableSelect
                value={String(getAttrValue('connectionType') || 'none')}
                onValueChange={value => handleAttributeChange('connectionType', value === 'none' ? '' : value)}
                placeholder="Selecciona tipo"
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'USB-A', value: 'USB-A' },
                  { label: 'USB-C', value: 'USB-C' },
                  { label: 'RJ45', value: 'RJ45' },
                ]}
              />
            </div>
          </>
        );

      case 'hub':
        return (
          <>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={String(getAttrValue('model') || '')} onChange={e => handleAttributeChange('model', e.target.value)} placeholder="Ej: UH400" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de conexión</Label>
              <SearchableSelect
                value={String(getAttrValue('connectionType') || 'none')}
                onValueChange={value => handleAttributeChange('connectionType', value === 'none' ? '' : value)}
                placeholder="Selecciona tipo"
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'USB-A', value: 'USB-A' },
                  { label: 'USB-C', value: 'USB-C' },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Número de puertos</Label>
              <Input type="number" value={Number(getAttrValue('portCount')) || ''} onChange={e => handleAttributeChange('portCount', e.target.value ? Number(e.target.value) : 0)} placeholder="4" />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Agregar Dispositivo' : 'Editar Dispositivo'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Completa los datos del nuevo dispositivo' : 'Modifica los datos del dispositivo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código <span className="text-destructive">*</span></Label>
              <Input value={formData.assetCode} onChange={e => handleChange('assetCode', e.target.value)} placeholder="LAPTOP-001" required />
            </div>

            {fixedType ? (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={fixedType.charAt(0).toUpperCase() + fixedType.slice(1)} disabled className="bg-muted" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <SearchableSelect
                  value={formData.assetType}
                  onValueChange={value => handleChange('assetType', value)}
                  placeholder="Selecciona tipo"
                  options={deviceTypes.map(t => ({ label: t.label, value: t.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={formData.brand} onChange={e => handleChange('brand', e.target.value)} placeholder="Dell, HP..." />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={formData.model} onChange={e => handleChange('model', e.target.value)} placeholder="Latitude 5420" />
            </div>
            <div className="space-y-2">
              <Label>Número de Serie</Label>
              <Input value={formData.serialNumber} onChange={e => handleChange('serialNumber', e.target.value)} placeholder="SN123456" />
            </div>
            <div className="space-y-2">
              <Label>Estado <span className="text-destructive">*</span></Label>
              <SearchableSelect
                value={formData.status || ''}
                onValueChange={value => handleChange('status', value as DeviceStatus)}
                placeholder="Selecciona estado"
                options={statusOptions.map(s => ({ label: s.label, value: s.value }))}
                disabled={hasActiveAssignment}
              />
              {hasActiveAssignment && <div className="text-sm text-rose-600 mt-1">No puedes editar este dispositivo hasta que deje de tener una asignación activa</div>}
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <SearchableSelect
                value={formData.branchId?.toString() || ''}
                onValueChange={value => handleChange('branchId', value === '' ? undefined : Number(value))}
                placeholder="Sin sucursal"
                options={branchOptions}
              />
            </div>
          </div>

          {renderDynamicAttributes() && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Atributos específicos</h3>
              <div className="space-y-6">{renderDynamicAttributes()}</div>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Fechas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de compra</Label>
                <DateTimePicker value={formData.purchaseDate} onChange={value => handleChange('purchaseDate', value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de entrega</Label>
                <div className="text-sm text-muted-foreground">
                  {deliveryDateAuto ? deliveryDateAuto.replace('T', ' ') : 'Sin fecha'}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Fecha de recepción</Label>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1">
                    <DateTimePicker value={formData.receivedDate} onChange={value => handleChange('receivedDate', value)} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={pendingReceived}
                      onChange={e => {
                        setPendingReceived(e.target.checked);
                        if (e.target.checked) handleChange('receivedDate', '');
                      }}
                      disabled={hasActiveAssignment}
                    />
                    <Label className="cursor-pointer">Recepción pendiente</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Observaciones adicionales..." rows={3} />
          </div>

          <DialogFooter>
            {serverError && <div className="w-full text-center text-sm text-rose-700 mb-2">{serverError}</div>}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando... </> : mode === 'create' ? 'Crear Dispositivo' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>

        <DeviceFormModal
          open={showAccessoryModal}
          onOpenChange={(isOpen) => {
            setShowAccessoryModal(isOpen);
            if (!isOpen) setPendingNewAccessory(null);
          }}
          onSave={async (data) => {
            const created = await devicesApi.create(data);
            const map: Record<string, string> = {
              mouse: 'selectedMouseId',
              teclado: 'selectedTecladoId',
              monitor: 'selectedMonitorId',
              soporte: 'selectedStandId',
              'adaptador-memoria': 'selectedMemoryAdapterId',
              'adaptador-red': 'selectedNetworkAdapterId',
              hub: 'selectedHubId',
              mousepad: 'selectedMousepadId',
            };
            const key = map[pendingNewAccessory || ''];
            if (key) handleAttributeChange(key, created.id);
            setShowAccessoryModal(false);
            setPendingNewAccessory(null);
            await reloadAvailableAccessories();
          }}
          mode="create"
          branches={branches}
          fixedType={pendingNewAccessory ?? undefined}
        />
      </DialogContent>
    </Dialog>
  );
}