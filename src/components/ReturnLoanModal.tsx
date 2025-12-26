import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ReturnLoanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (returnCondition: string, returnNotes?: string) => Promise<void>;
  loading?: boolean;
}

export default function ReturnLoanModal({
  open,
  onClose,
  onSubmit,
  loading,
}: ReturnLoanModalProps) {
  const [returnCondition, setReturnCondition] = useState<string>("good");
  const [returnNotes, setReturnNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(returnCondition, returnNotes || undefined);
      setReturnCondition("good");
      setReturnNotes("");
      onClose();
    } catch (error) {
      console.error("Error al registrar devolución:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Devolución de Préstamo</DialogTitle>
          <DialogDescription>
            Completa los datos de la devolución del equipo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Condición al devolver *</label>
            <Select value={returnCondition} onValueChange={setReturnCondition}>
              <SelectTrigger>
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

          <div>
            <label className="text-sm font-medium">Observaciones</label>
            <Textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Notas sobre la devolución (daños, faltantes, etc.)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? "Registrando..." : "Registrar Devolución"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
