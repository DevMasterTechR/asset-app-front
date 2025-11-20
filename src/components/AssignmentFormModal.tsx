"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
            <Select value={formData.assetId} onValueChange={(value) => handleChange("assetId", value)} required>
              <SelectTrigger id="assetId">
                <SelectValue placeholder="Selecciona activo" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.code} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personId">
              Persona <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.personId} onValueChange={(value) => handleChange("personId", value)} required>
              <SelectTrigger id="personId">
                <SelectValue placeholder="Selecciona persona" />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.firstName} {person.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">
              Sucursal <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.branchId} onValueChange={(value) => handleChange("branchId", value)} required>
              <SelectTrigger id="branchId">
                <SelectValue placeholder="Selecciona sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Select
                value={formData.deliveryCondition}
                onValueChange={(value: "excellent" | "good" | "fair" | "poor") =>
                  handleChange("deliveryCondition", value)
                }
                required
              >
                <SelectTrigger id="deliveryCondition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excelente</SelectItem>
                  <SelectItem value="good">Bueno</SelectItem>
                  <SelectItem value="fair">Regular</SelectItem>
                  <SelectItem value="poor">Malo</SelectItem>
                </SelectContent>
              </Select>
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
