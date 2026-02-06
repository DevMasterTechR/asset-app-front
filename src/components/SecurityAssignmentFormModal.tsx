"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import SearchableSelect from '@/components/ui/searchable-select'
import { peopleApi } from '@/api/people'
import { devicesApi } from '@/api/devices'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Assignment } from "@/data/mockDataExtended"
import type { CreateAssignmentDto } from "@/api/assignments"
import { Loader2 } from "lucide-react"
import { useMemo } from 'react'
import { sortByString } from '@/lib/sort'

interface SecurityAssignmentFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: CreateAssignmentDto) => Promise<void>
  assignment?: Assignment | null
  mode: "create" | "edit"
  assets: Array<{ id: string; code: string; name: string; brand?: string; model?: string; assetCode?: string; purchaseDate?: string; attributesJson?: Record<string, any> }>
  people: Array<{ id: string; firstName: string; lastName: string }>
  branches: Array<{ id: number; name: string }>
}

function getLocalDateTimeString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  // Retorna formato compatible con datetime-local input
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function convertLocalToUTCISOString(localDateTime: string): string {
  if (!localDateTime || !localDateTime.trim()) return new Date().toISOString();
  if (/[zZ]$/.test(localDateTime) || /[+-]\d{2}:\d{2}$/.test(localDateTime)) return localDateTime;

  const hasTime = localDateTime.includes('T');
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;

  if (hasTime) {
    const [datePart, timePart] = localDateTime.split('T');
    [year, month, day] = datePart.split('-').map(Number);
    [hour, minute] = timePart.split(':').map(Number);
  } else {
    [year, month, day] = localDateTime.split('-').map(Number);
  }

  const localDate = new Date(year, month - 1, day, hour, minute);
  const utcMillis = localDate.getTime() - localDate.getTimezoneOffset() * 60000;
  return new Date(utcMillis).toISOString();
}

export default function SecurityAssignmentFormModal({
  open,
  onOpenChange,
  onSave,
  assignment,
  mode,
  assets,
  people,
  branches,
}: SecurityAssignmentFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedAssetLabel, setSelectedAssetLabel] = useState<string | undefined>(undefined)
  const [formData, setFormData] = useState<CreateAssignmentDto>({
    assetId: "",
    personId: "",
    branchId: "",
    assignmentDate: getLocalDateTimeString(),
    deliveryCondition: "good",
    deliveryNotes: "",
  })

  useEffect(() => {
    if (assignment && mode === "edit") {
      setFormData({
        assetId: String(assignment.assetId),
        personId: String(assignment.personId),
        branchId: assignment.branchId ? String(assignment.branchId) : "",
        assignmentDate: assignment.assignmentDate || getLocalDateTimeString(),
        deliveryCondition: (assignment.deliveryCondition as any) || "good",
        deliveryNotes: assignment.deliveryNotes || "",
      })
    } else {
      setFormData({
        assetId: "",
        personId: "",
        branchId: "",
        assignmentDate: getLocalDateTimeString(),
        deliveryCondition: "good",
        deliveryNotes: "",
      })
    }
  }, [assignment, mode, open])

  const sortedAssets = useMemo(() => sortByString(assets || [], (a: any) => `${a.code ? a.code + ' - ' : ''}${a.name || ''}`.trim()), [assets])
  const sortedPeople = useMemo(() => sortByString(people || [], (p: any) => `${p.firstName || ''} ${p.lastName || ''}`.trim()), [people])

  // Calcular el label inicial del activo seleccionado dinámicamente
  const initialAssetLabel = useMemo(() => {
    // Si tenemos un label cacheado del activo seleccionado, usarlo
    if (selectedAssetLabel && formData.assetId) {
      return selectedAssetLabel;
    }
    
    if (assignment) {
      const a = (assignment as any).asset;
      if (a) return `${a.assetCode || a.code || ''} - ${((a.brand || '') + ' ' + (a.model || '')).trim()}`;
      const found = assets.find(x => x.id === String(assignment.assetId));
      if (found) return `${found.code || found.assetCode || ''} - ${found.name}`;
    }
    
    if (formData.assetId) {
      const found = assets.find(x => x.id === String(formData.assetId));
      if (found) {
        const codeDisplay = found.code && found.code.trim() ? found.code : found.assetCode || '';
        return codeDisplay && found.name 
          ? `${codeDisplay} - ${found.name}`
          : found.name || codeDisplay || String(found.id);
      }
    }
    
    return undefined;
  }, [selectedAssetLabel, assignment, assets, formData.assetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.assetId || !formData.personId) {
      alert("Por favor completa los campos obligatorios")
      return
    }

    setLoading(true)
    try {
      const dataToSend = {
        ...formData,
        assignmentDate: convertLocalToUTCISOString(formData.assignmentDate)
      }
      await onSave(dataToSend)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva Asignación de Seguridad" : "Editar Asignación de Seguridad"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Asigna un dispositivo de seguridad a una persona"
              : "Actualiza los datos de la asignación"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assetId">
              Dispositivo de Seguridad <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={String(formData.assetId)}
              onValueChange={(value, label) => {
                setFormData({ ...formData, assetId: value });
                if (label) setSelectedAssetLabel(label);
              }}
              placeholder="Selecciona dispositivo"
              searchPlaceholder="Buscar dispositivo (código, marca o modelo)"
              initialLabel={initialAssetLabel}
              options={(() => {
                const opts = sortedAssets.map(a => ({ label: `${a.code || a.assetCode || ''} - ${a.name}`, value: String(a.id) }));
                if (formData.assetId && !opts.find(o => o.value === String(formData.assetId))) {
                  opts.unshift({ label: initialAssetLabel || String(formData.assetId), value: String(formData.assetId) });
                }
                return opts;
              })()}
              onSearch={async (q) => {
                try {
                  const res = await devicesApi.getAll(q, 1, 20);
                  const list = Array.isArray(res) ? res : res.data;
                  const opts = (list as any[])
                    .filter(a => (a.status || '') === 'available' && (a.assetType === 'seguridad' || a.type === 'seguridad' || a.isSecurity))
                    .map(a => ({ label: `${a.assetCode || a.code || ''} - ${((a.brand || '') + ' ' + (a.model || '')).trim()}`, value: String(a.id) }));
                  if (formData.assetId && !opts.find(o => o.value === String(formData.assetId))) {
                    opts.unshift({ label: initialAssetLabel || String(formData.assetId), value: String(formData.assetId) });
                  }
                  return opts;
                } catch (err) {
                  return formData.assetId ? [{ label: initialAssetLabel || String(formData.assetId), value: String(formData.assetId) }] : [];
                }
              }}
            />
            {/* Mostrar atributos específicos del dispositivo de seguridad seleccionado */}
            {(() => {
              const selected = sortedAssets.find(a => String(a.id) === String(formData.assetId));
              const attrs = selected && selected.attributesJson ? selected.attributesJson : null;
              if (!selected || !attrs) return null;
              return (
                <div className="mt-2 border rounded p-3 bg-muted">
                  <div className="text-xs font-semibold mb-2 text-muted-foreground">Atributos del dispositivo</div>
                  <div className="grid grid-cols-1 gap-2">
                    {attrs.categoria && <div><b>Categoría:</b> {attrs.categoria}</div>}
                    {attrs.cantidad && <div><b>Cantidad:</b> {attrs.cantidad}</div>}
                    {attrs.ubicacion && <div><b>Ubicación:</b> {attrs.ubicacion}</div>}
                    {attrs.estado && <div><b>Estado:</b> {attrs.estado}</div>}
                    {attrs.sucursal && <div><b>Sucursal:</b> {attrs.sucursal}</div>}
                    {attrs.imagen && <div><b>Imagen:</b> <a href={attrs.imagen} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver imagen</a></div>}
                    {attrs.observacion && <div><b>Observación:</b> {attrs.observacion}</div>}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="space-y-2">
            <Label htmlFor="personId">
              Persona <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={String(formData.personId)}
              onValueChange={(value) => setFormData({ ...formData, personId: value })}
              placeholder="Selecciona persona"
              options={sortedPeople.map(p => ({ label: `${p.firstName} ${p.lastName}`, value: String(p.id) }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Sucursal</Label>
            <SearchableSelect
              value={String(formData.branchId || '')}
              onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              placeholder="Selecciona sucursal"
              options={branches.map(b => ({ label: b.name, value: String(b.id) }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignmentDate">Fecha de Entrega</Label>
            <Input
              id="assignmentDate"
              type="datetime-local"
              value={formData.assignmentDate}
              onChange={(e) => setFormData({ ...formData, assignmentDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryNotes">Observaciones</Label>
            <Textarea
              id="deliveryNotes"
              value={formData.deliveryNotes}
              onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
              placeholder="Notas adicionales sobre la asignación..."
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
                mode === "create" ? "Crear Asignación" : "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
