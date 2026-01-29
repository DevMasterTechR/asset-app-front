import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { devicesApi } from "@/api/devices";

interface BulkCreateDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BulkCreateDeviceModal = ({ open, onOpenChange, onSuccess }: BulkCreateDeviceModalProps) => {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState<string>("1");
  const [assetCode, setAssetCode] = useState<string>("");
  const [assetType, setAssetType] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [status, setStatus] = useState<string>("available");
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmWarning, setConfirmWarning] = useState(false);

  const assetTypeOptions = [
    "Laptop",
    "Desktop",
    "Celular",
    "Tablet",
    "Monitor",
    "Teclado",
    "Mouse",
    "Mouse Pad",
    "HUB",
    "Cable UTP",
    "Conector RJ45",
    "Regleta de Poder",
    "Cargador",
    "Maletín",
    "IP-Phone",
    "Impresora",
    "Otro",
  ];

  const handleCreateBulk = async () => {
    // Validaciones
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 1000) {
      toast({
        title: "Error",
        description: "La cantidad debe estar entre 1 y 1000",
        variant: "destructive",
      });
      return;
    }

    if (!assetCode.trim()) {
      toast({
        title: "Error",
        description: "El código de activo es requerido",
        variant: "destructive",
      });
      return;
    }

    if (!assetType.trim()) {
      toast({
        title: "Error",
        description: "El tipo de activo es requerido",
        variant: "destructive",
      });
      return;
    }

    if (!confirmWarning) {
      setConfirmWarning(true);
      return;
    }

    setIsLoading(true);
    try {
      const result = await devicesApi.createBulk(qty, {
        assetCode,
        assetType,
        brand: brand || undefined,
        model: model || undefined,
        serialNumber: serialNumber || undefined,
        status: (status as any) || "available",
        purchaseDate: purchaseDate || undefined,
      });

      toast({
        title: "Éxito",
        description: result.message,
      });

      // Limpiar formulario
      setQuantity("1");
      setAssetCode("");
      setAssetType("");
      setBrand("");
      setModel("");
      setSerialNumber("");
      setStatus("available");
      setPurchaseDate("");
      setConfirmWarning(false);

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating bulk devices:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear los dispositivos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ingreso Masivo de Dispositivos</DialogTitle>
          <DialogDescription>
            Crea múltiples dispositivos con las mismas características
          </DialogDescription>
        </DialogHeader>

        {!confirmWarning ? (
          <div className="space-y-4">
            {/* Cantidad */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad de dispositivos</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="1000"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 5"
              />
              <p className="text-xs text-muted-foreground">
                Máximo 1000 dispositivos por ingreso
              </p>
            </div>

            {/* Código de activo */}
            <div className="space-y-2">
              <Label htmlFor="assetCode">Código de activo *</Label>
              <Input
                id="assetCode"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                placeholder="Ej: LAPTOP-001"
              />
              <p className="text-xs text-muted-foreground">
                Se agregará numeración automática (ej: LAPTOP-001-001, LAPTOP-001-002, etc)
              </p>
            </div>

            {/* Tipo de activo */}
            <div className="space-y-2">
              <Label htmlFor="assetType">Tipo de activo *</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger id="assetType">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marca */}
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ej: Dell"
              />
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej: XPS 13"
              />
            </div>

            {/* Número de serie */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Número de serie</Label>
              <Input
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Ej: SN1234567890"
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="assigned">Asignado</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="decommissioned">Dado de baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha de compra */}
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Fecha de compra</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleCreateBulk} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-orange-900">Confirmación de ingreso masivo</p>
                <p className="text-sm text-orange-800">
                  ¿Estás seguro de que deseas crear <strong>{quantity} dispositivos</strong> con el código base <strong>{assetCode}</strong>?
                </p>
                <p className="text-sm text-orange-700">
                  Esta acción no se puede deshacer. Se crearán los siguientes códigos:
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-orange-700 font-mono">
                    {assetCode}-001
                  </p>
                  {parseInt(quantity) > 1 && (
                    <p className="text-xs text-orange-700 font-mono">
                      {assetCode}-002
                    </p>
                  )}
                  {parseInt(quantity) > 2 && (
                    <p className="text-xs text-orange-700 font-mono">
                      {assetCode}-003
                    </p>
                  )}
                  {parseInt(quantity) > 3 && (
                    <p className="text-xs text-orange-700 font-mono">
                      ...
                    </p>
                  )}
                  {parseInt(quantity) > 1 && (
                    <p className="text-xs text-orange-700 font-mono">
                      {assetCode}-{String(parseInt(quantity)).padStart(3, "0")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setConfirmWarning(false)}
                disabled={isLoading}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={handleCreateBulk}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Aceptar y crear {quantity} dispositivos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkCreateDeviceModal;
