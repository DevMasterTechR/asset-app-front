"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Loader2 } from "lucide-react"

interface ReturnAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (returnCondition: "excellent" | "good" | "fair" | "poor", returnNotes?: string) => Promise<void>
  assignmentId: string
}

export default function ReturnAssignmentModal({
  open,
  onOpenChange,
  onSave,
  assignmentId,
}: ReturnAssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [returnCondition, setReturnCondition] = useState<"excellent" | "good" | "fair" | "poor">("good")
  const [returnNotes, setReturnNotes] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave(returnCondition, returnNotes)
      onOpenChange(false)
      setReturnNotes("")
      setReturnCondition("good")
    } catch (error) {
      console.error("Error al registrar devolución:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Devolución</DialogTitle>
          <DialogDescription>Completa los datos de la devolución del activo</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="returnCondition">
              Condición de Devolución <span className="text-destructive">*</span>
            </Label>
            <Select
              value={returnCondition}
              onValueChange={(value: "excellent" | "good" | "fair" | "poor") => setReturnCondition(value)}
              required
            >
              <SelectTrigger id="returnCondition">
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

          <div className="space-y-2">
            <Label htmlFor="returnNotes">Observaciones</Label>
            <Textarea
              id="returnNotes"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Ingresa observaciones de la devolución"
              rows={4}
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
                  Registrando...
                </>
              ) : (
                "Registrar Devolución"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
