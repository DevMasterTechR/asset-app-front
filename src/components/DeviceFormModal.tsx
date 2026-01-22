import { useState, useEffect, useMemo } from 'react';
import React from 'react';
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
    __availableLaptopChargers?: Array<any>;
    __availableCellChargers?: Array<any>;
    __availableChargingCables?: Array<any>;
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
    window.__availableLaptopChargers = all.filter(d => d.assetType === 'cargador-laptop' && d.status === 'available' && !d.assignedPersonId);
    window.__availableCellChargers = all.filter(d => d.assetType === 'cargador-celular' && d.status === 'available' && !d.assignedPersonId);
    window.__availableChargingCables = all.filter(d => d.assetType === 'cable-carga' && d.status === 'available' && !d.assignedPersonId);
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
  // Eliminamos 'seguridad' del listado visual
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
  { value: 'cargador-laptop', label: 'Cargador de Lapt' },
  { value: 'cargador-celular', label: 'Cargador de Celular' },
  { value: 'cable-carga', label: 'Cable de Cargador Cel' },
  { value: 'server', label: 'Servidor' },
  { value: 'printer', label: 'Impresora' },
  { value: 'ip-phone', label: 'Teléfono IP' },
];

const statusOptions: Array<{ value: DeviceStatus; label: string }> = [
  { value: 'available', label: 'Disponible' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'decommissioned', label: 'Dado de baja' },
];

// Prefijos estandarizados para assetCode
const CODE_PREFIXES: Record<string, string> = {
  laptop: 'LAPT - ',
  smartphone: 'CEL - ',
  mouse: 'MOSE - ',
  mousepad: 'MPAD - ',
  soporte: 'SPLP - ',
  monitor: 'MONI - ',
  'ip-phone': 'TELFIP - ',
  'cargador-laptop': 'CARGL - ',
  'cargador-celular': 'CARG - ',
  'cable-carga': 'CARGC - ',
  // Agrega más aquí cuando necesites
} as const;

export default function DeviceFormModal({
  open,
  onOpenChange,
  onSave,
  device,
  mode,
  branches,
  fixedType,
}: DeviceFormModalProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
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

  // Prefijo automático al abrir el modal de agregar dispositivo, agrega los nuevos prefijos para Monitor y Teléfono IP
  useEffect(() => {
    if (mode !== 'create') return;
    const prefix = CODE_PREFIXES[formData.assetType as keyof typeof CODE_PREFIXES];
    setFormData(prev => {
      const current = prev.assetCode?.trim() || '';

      // Si ya tiene el prefijo correcto → no tocamos
      if (prefix && current.startsWith(prefix.trim())) {
        return prev;
      }

      // Si hay prefijo definido → lo ponemos
      if (prefix) {
        return {
          ...prev,
          assetCode: prefix,
        };
      }

      // Si no hay prefijo para este tipo → limpiamos
      return {
        ...prev,
        assetCode: '',
      };
    });
  }, [formData.assetType, mode, open]);

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
        assetCode: formData.assetCode,
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
    // Cargador de Laptop independiente
    if (formData.assetType === 'cargador-laptop') {
      return (
        <>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input value={String(getAttrValue('color') || '')} onChange={e => handleAttributeChange('color', e.target.value)} placeholder="Negro, Blanco..." />
          </div>
          <div className="space-y-2">
            <Label>Potencia (W)</Label>
            <Input type="number" value={String(getAttrValue('wattage') || '')} onChange={e => handleAttributeChange('wattage', e.target.value)} placeholder="65" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de conector</Label>
            <Input value={String(getAttrValue('connectorType') || '')} onChange={e => handleAttributeChange('connectorType', e.target.value)} placeholder="USB-C, Barrel..." />
          </div>
        </>
      );
    }
    // Cargador de Celular independiente
    if (formData.assetType === 'cargador-celular') {
      return (
        <>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input value={String(getAttrValue('color') || '')} onChange={e => handleAttributeChange('color', e.target.value)} placeholder="Negro, Blanco..." />
          </div>
          <div className="space-y-2">
            <Label>Potencia (W)</Label>
            <Input type="number" value={String(getAttrValue('wattage') || '')} onChange={e => handleAttributeChange('wattage', e.target.value)} placeholder="20" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de conector</Label>
            <Input value={String(getAttrValue('connectorType') || '')} onChange={e => handleAttributeChange('connectorType', e.target.value)} placeholder="USB-C, USB-A..." />
          </div>
        </>
      );
    }
    // Cable de cargador cel independiente
    if (formData.assetType === 'cable-carga') {
      return (
        <>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input value={String(getAttrValue('color') || '')} onChange={e => handleAttributeChange('color', e.target.value)} placeholder="Negro, Blanco..." />
          </div>
          <div className="space-y-2">
            <Label>Longitud (cm)</Label>
            <Input type="number" value={String(getAttrValue('length') || '')} onChange={e => handleAttributeChange('length', e.target.value)} placeholder="100" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de conector</Label>
            <Input value={String(getAttrValue('connectorType') || '')} onChange={e => handleAttributeChange('connectorType', e.target.value)} placeholder="USB-C, Lightning..." />
          </div>
        </>
      );
    }
    switch (formData.assetType) {
      case 'seguridad':
        return (
          <>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Input value={String(getAttrValue('categoria') || '')} onChange={e => handleAttributeChange('categoria', e.target.value)} placeholder="Ej: Cámara, Sensor, Alarma..." />
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" value={String(getAttrValue('cantidad') || '')} onChange={e => handleAttributeChange('cantidad', e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input value={String(getAttrValue('ubicacion') || '')} onChange={e => handleAttributeChange('ubicacion', e.target.value)} placeholder="Ej: Oficina, Bodega, Entrada..." />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={String(getAttrValue('estado') || '')} onChange={e => handleAttributeChange('estado', e.target.value)} placeholder="Operativo, Dañado, En revisión..." />
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Input value={String(getAttrValue('sucursal') || '')} onChange={e => handleAttributeChange('sucursal', e.target.value)} placeholder="Nombre de la sucursal" />
            </div>
            <div className="space-y-2">
              <Label>Imagen (link)</Label>
              <Input value={String(getAttrValue('imagen') || '')} onChange={e => handleAttributeChange('imagen', e.target.value)} placeholder="https://..." />
              {getAttrValue('imagen') && getAttrValue('imagen').match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i) && (
                <div className="mt-2">
                  <img
                    src={getAttrValue('imagen')}
                    alt="Vista previa"
                    style={{ maxWidth: '180px', maxHeight: '120px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                    onClick={() => setExpandedImage(getAttrValue('imagen'))}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea value={String(getAttrValue('observacion') || '')} onChange={e => handleAttributeChange('observacion', e.target.value)} placeholder="Observaciones adicionales..." rows={2} />
            </div>
          </>
        );
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
            {/* ...eliminar el checkbox de cargador al inicio... */}
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
            {renderAccessoryBlock('hasLaptopCharger', '¿Tiene cargador?', 'hasLaptopChargerRadio', 'selectedLaptopChargerId', 'cargador-laptop', window.__availableLaptopChargers ?? [])}
          </>
        );

      case 'smartphone':
      case 'tablet': {
        // IMEIs dinámicos
        const imeis: string[] = Array.isArray(getAttrValue('imeis')) ? getAttrValue('imeis') : (getAttrValue('imeis') ? [getAttrValue('imeis')] : ['']);
        const handleImeiChange = (idx: number, value: string) => {
          const newImeis = [...imeis];
          newImeis[idx] = value;
          handleAttributeChange('imeis', newImeis.filter(i => i.trim() !== ''));
        };
        const addImei = () => {
          handleAttributeChange('imeis', [...imeis, '']);
        };
        const removeImei = (idx: number) => {
          const newImeis = imeis.filter((_, i) => i !== idx);
          handleAttributeChange('imeis', newImeis);
        };
        return (
          <>
            <div className="space-y-2">
              <Label>IMEI</Label>
              {imeis.map((imei, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    value={imei}
                    onChange={e => handleImeiChange(idx, e.target.value)}
                    placeholder={`IMEI ${idx + 1}`}
                  />
                  {imeis.length > 1 && (
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeImei(idx)} title="Eliminar IMEI">
                      –
                    </Button>
                  )}
                  {idx === imeis.length - 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={addImei} title="Agregar IMEI">
                      +
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Procesador</Label>
              <Input value={String(getAttrValue('cpu') || '')} onChange={e => handleAttributeChange('cpu', e.target.value)} placeholder="A14 Bionic" />
            </div>
            <div className="space-y-2">
              <Label>RAM (GB)</Label>
              <Input type="number" value={Number(getAttrValue('ram')) || ''} onChange={e => handleAttributeChange('ram', e.target.value ? Number(e.target.value) : 0)} placeholder="4" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasMicas" checked={Boolean(getAttrValue('hasMicas'))} onCheckedChange={c => handleAttributeChange('hasMicas', c === true)} />
              <Label htmlFor="hasMicas">¿Tiene mica?</Label>
            </div>
            {renderAccessoryBlock('hasCellCharger', '¿Tiene cargador cel?', 'hasCellChargerRadio', 'selectedCellChargerId', 'cargador-celular', window.__availableCellChargers ?? [])}
            {renderAccessoryBlock('hasChargingCable', '¿Tiene cable de cargador cel?', 'hasChargingCableRadio', 'selectedChargingCableId', 'cable-carga', window.__availableChargingCables ?? [])}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="hasChip" checked={Boolean(getAttrValue('hasChip'))} onCheckedChange={c => handleAttributeChange('hasChip', c === true)} />
                <Label htmlFor="hasChip">¿Tiene chip?</Label>
              </div>
              {getAttrValue('hasChip') && (
                <div className="ml-8 space-y-2">
                  <Label>Operadora</Label>
                  <Input value={String(getAttrValue('operator') || '')} onChange={e => handleAttributeChange('operator', e.target.value)} placeholder="Movistar, Claro..." />
                  <Label>Número del chip</Label>
                  <Input value={String(getAttrValue('chipNumber') || '')} onChange={e => handleAttributeChange('chipNumber', e.target.value)} placeholder="+593..." />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasCase" checked={Boolean(getAttrValue('hasCase'))} onCheckedChange={c => handleAttributeChange('hasCase', c === true)} />
              <Label htmlFor="hasCase">¿Tiene estuche?</Label>
            </div>
          </>
        );
      }

      case 'ip-phone':
        return (
          <>
            <div className="space-y-2">
              <Label>Extensión</Label>
              <Input value={String(getAttrValue('extension') || '')} onChange={e => handleAttributeChange('extension', e.target.value)} placeholder="101" />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={String(getAttrValue('phoneNumber') || '')} onChange={e => handleAttributeChange('phoneNumber', e.target.value)} placeholder="+593..." />
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
                onValueChange={value => handleAttributeChange('printerType', value === 'none' ? '' : value)}
                placeholder="Selecciona tipo"
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'Láser', value: 'laser' },
                  { label: 'Inyección de tinta', value: 'inkjet' },
                  { label: 'Matricial', value: 'dot-matrix' },
                  { label: 'Térmica', value: 'thermal' },
                ]}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="isColor" checked={Boolean(getAttrValue('isColor'))} onCheckedChange={c => handleAttributeChange('isColor', c === true)} />
              <Label htmlFor="isColor">¿Imprime en color?</Label>
            </div>
            <div className="space-y-2">
              <Label>Conectividad</Label>
              <SearchableSelect
                value={String(getAttrValue('connectivity') || 'none')}
                onValueChange={value => handleAttributeChange('connectivity', value === 'none' ? '' : value)}
                placeholder="Selecciona conectividad"
                options={[
                  { label: 'Ninguno', value: 'none' },
                  { label: 'USB', value: 'usb' },
                  { label: 'WiFi', value: 'wifi' },
                  { label: 'Ethernet', value: 'ethernet' },
                  { label: 'Bluetooth', value: 'bluetooth' },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Velocidad de impresión (ppm)</Label>
              <Input type="number" value={Number(getAttrValue('printSpeed')) || ''} onChange={e => handleAttributeChange('printSpeed', e.target.value ? Number(e.target.value) : 0)} placeholder="20" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasScanner" checked={Boolean(getAttrValue('hasScanner'))} onCheckedChange={c => handleAttributeChange('hasScanner', c === true)} />
              <Label htmlFor="hasScanner">¿Tiene escáner?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasFax" checked={Boolean(getAttrValue('hasFax'))} onCheckedChange={c => handleAttributeChange('hasFax', c === true)} />
              <Label htmlFor="hasFax">¿Tiene fax?</Label>
            </div>
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
              <Input
                value={formData.assetCode}
                onChange={e => handleChange('assetCode', e.target.value)}
                placeholder="Ej: LAPT - 042"
                required
              />
              {mode === 'create' && formData.assetType in CODE_PREFIXES && (
                <p className="text-xs text-muted-foreground mt-1">
                  Prefijo automático: <strong>{CODE_PREFIXES[formData.assetType as keyof typeof CODE_PREFIXES]}</strong>
                  (agrega el número o identificador después)
                </p>
              )}
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
              {hasActiveAssignment && (
                <div className="text-sm text-rose-600 mt-1">
                  No puedes editar este dispositivo hasta que deje de tener una asignación activa
                </div>
              )}
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
            <Button type="button" onClick={() => onOpenChange(false)} disabled={loading} className="bg-white border border-gray-300 text-gray-900 hover:bg-gray-100">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : mode === 'create' ? (
                'Crear Dispositivo'
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Modal para crear accesorio nuevo */}
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
              'cargador-laptop': 'selectedLaptopChargerId',
              'cargador-celular': 'selectedCellChargerId',
              'cable-carga': 'selectedChargingCableId',
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

        {/* Modal de imagen ampliada */}
        {expandedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
            onClick={() => setExpandedImage(null)}
          >
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-200"
                onClick={() => setExpandedImage(null)}
                aria-label="Cerrar imagen"
              >
                <span style={{ fontSize: 24, fontWeight: 'bold', lineHeight: 1 }}>&times;</span>
              </button>
              <img
                src={expandedImage}
                alt="Imagen ampliada"
                className="max-w-[90vw] max-h-[80vh] rounded shadow-lg border bg-white"
                onError={e => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Sin+Imagen';
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}