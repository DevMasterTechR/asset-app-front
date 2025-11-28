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
// Select primitive replaced by SearchableSelect for consistency
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
import { sortAssetsByName, sortBranchesByName, sortByString } from '@/lib/sort'

interface AssignmentFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: CreateAssignmentDto) => Promise<void>
  assignment?: Assignment | null
  mode: "create" | "edit"
  assets: Array<{ id: string; code: string; name: string }>
  people: Array<{ id: string; firstName: string; lastName: string }>
  branches: Array<{ id: number; name: string }>
}

function getLocalDateTimeString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function AssignmentFormModal({
  open,
  onOpenChange,
  onSave,
  assignment,
  mode,
  assets,
  people,
  branches,
}: AssignmentFormModalProps) {
  const [loading, setLoading] = useState(false)
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
      let localDateTime = assignment.assignmentDate
      if (assignment.assignmentDate.includes("T")) {
        // Si tiene hora, extraer solo YYYY-MM-DDTHH:mm
        localDateTime = assignment.assignmentDate.substring(0, 16)
      } else {
        // Si solo tiene fecha, agregar hora actual
        localDateTime = assignment.assignmentDate + "T" + new Date().toTimeString().substring(0, 5)
      }

      setFormData({
        assetId: assignment.assetId,
        personId: assignment.personId,
        branchId: String(assignment.branchId ?? ''),
        assignmentDate: localDateTime,
        deliveryCondition: assignment.deliveryCondition,
        deliveryNotes: assignment.deliveryNotes || "",
      })
    } else if (mode === "create") {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error al guardar:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof CreateAssignmentDto, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const sortedPeople = useMemo(() => sortByString(people || [], (p: any) => `${p.firstName || ''} ${p.lastName || ''}`.trim()), [people])
  const sortedAssets = useMemo(() => sortByString(assets || [], (a: any) => `${a.code ? a.code + ' - ' : ''}${a.name || ''}`.trim()), [assets])
  const sortedBranches = useMemo(() => sortBranchesByName(branches || []), [branches])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nueva Asignación" : "Editar Asignación"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Completa los datos de la nueva asignación" : "Modifica los datos de la asignación"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assetId">
              Activo <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={formData.assetId}
              onValueChange={(value) => handleChange('assetId', value)}
              placeholder="Selecciona activo"
              searchPlaceholder="Buscar activo (por código, marca o modelo)"
              options={sortedAssets.map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))}
              onSearch={async (q) => {
                try {
                  const res = await devicesApi.getAll(q, 1, 20);
                  const list = Array.isArray(res) ? res : res.data;
                  return (list as any[])
                    .filter(a => (a.status || '') === 'available')
                    .map(a => ({ label: `${a.assetCode || a.assetCode} - ${((a.brand || '') + ' ' + (a.model || '')).trim()}`, value: String(a.id) }));
                } catch (err) {
                  return [];
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personId">
              Persona <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={formData.personId}
              onValueChange={(value) => handleChange('personId', value)}
              placeholder="Selecciona persona"
              searchPlaceholder="Buscar persona..."
              options={sortedPeople.map(p => ({ label: `${p.firstName} ${p.lastName}`, value: p.id }))}
              onSearch={async (q) => {
                try {
                  const res = await peopleApi.getAll(undefined, 10, q);
                  const list = Array.isArray(res) ? res : res.data;
                  return (list as any[]).map(p => ({ label: `${p.firstName} ${p.lastName}`, value: String(p.id) }));
                } catch (err) {
                  return [];
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">
              Sucursal <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={formData.branchId}
              onValueChange={(value) => handleChange('branchId', value)}
              placeholder="Selecciona sucursal"
              options={sortedBranches.map(b => ({ label: b.name, value: String(b.id) }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignmentDate">
                Fecha de Asignación <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assignmentDate"
                type="datetime-local"
                value={formData.assignmentDate}
                onChange={(e) => handleChange("assignmentDate", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryCondition">
                Condición <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                value={formData.deliveryCondition}
                onValueChange={(value: "excellent" | "good" | "fair" | "poor") => handleChange('deliveryCondition', value)}
                placeholder="Selecciona condición"
                options={[
                  { label: 'Excelente', value: 'excellent' },
                  { label: 'Bueno', value: 'good' },
                  { label: 'Regular', value: 'fair' },
                  { label: 'Malo', value: 'poor' },
                ]}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryNotes">Observaciones de Entrega</Label>
            <Textarea
              id="deliveryNotes"
              value={formData.deliveryNotes}
              onChange={(e) => handleChange("deliveryNotes", e.target.value)}
              placeholder="Ingresa observaciones adicionales"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : mode === "create" ? (
                "Crear"
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
