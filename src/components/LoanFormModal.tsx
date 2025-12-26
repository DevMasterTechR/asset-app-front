import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreateLoanDto } from "@/api/loans";

interface LoanFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLoanDto) => Promise<void>;
  assets: Array<{ id: string; code: string; name: string; assetCode?: string }>;
  people: Array<{ id: string; firstName: string; lastName: string }>;
  branches: Array<{ id: number; name: string }>;
  loading?: boolean;
}

export default function LoanFormModal({
  open,
  onClose,
  onSubmit,
  assets,
  people,
  branches,
  loading,
}: LoanFormModalProps) {
  const [formData, setFormData] = useState<CreateLoanDto>({
    assetId: "",
    personId: "",
    branchId: undefined,
    loanDays: 7,
    deliveryCondition: "good",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.assetId || !formData.personId || !formData.loanDays) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        assetId: "",
        personId: "",
        branchId: undefined,
        loanDays: 7,
        deliveryCondition: "good",
      });
      onClose();
    } catch (error) {
      console.error("Error al crear préstamo:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Préstamo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Activo *</label>
            <Select value={String(formData.assetId)} onValueChange={(v) => handleChange("assetId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona activo" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={String(asset.id)}>
                    {asset.code || asset.assetCode} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Persona *</label>
            <Select value={String(formData.personId)} onValueChange={(v) => handleChange("personId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona persona" />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person.id} value={String(person.id)}>
                    {person.firstName} {person.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Sucursal</label>
            <Select value={String(formData.branchId || "")} onValueChange={(v) => handleChange("branchId", v ? Number(v) : undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona sucursal (opcional)" />
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

          <div>
            <label className="text-sm font-medium">Días de Préstamo *</label>
            <Input
              type="number"
              min="1"
              value={formData.loanDays}
              onChange={(e) => handleChange("loanDays", parseInt(e.target.value) || 0)}
              placeholder="Ej: 7"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Condición</label>
            <Select value={formData.deliveryCondition || "good"} onValueChange={(v) => handleChange("deliveryCondition", v)}>
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
              value={formData.deliveryNotes || ""}
              onChange={(e) => handleChange("deliveryNotes", e.target.value)}
              placeholder="Notas adicionales sobre el préstamo"
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
            disabled={
              !formData.assetId ||
              !formData.personId ||
              !formData.loanDays ||
              isSubmitting ||
              loading
            }
          >
            {isSubmitting ? "Creando..." : "Crear Préstamo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
