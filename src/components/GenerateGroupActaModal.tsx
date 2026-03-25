import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface GroupActaParticipant {
  personId: string;
  userName: string;
  nationalId?: string;
  branch?: string;
  assignmentDate?: string;
}

export interface GroupActaAsset {
  assetId: string;
  code: string;
  type?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  participants: GroupActaParticipant[];
}

interface GenerateGroupActaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  sharedAssets: GroupActaAsset[];
}

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const GenerateGroupActaModal = ({
  open,
  onOpenChange,
  user,
  sharedAssets,
}: GenerateGroupActaModalProps) => {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (sharedAssets.length > 0) {
      setSelectedAssetId(sharedAssets[0].assetId);
    } else {
      setSelectedAssetId("");
    }
  }, [open, sharedAssets]);

  const selectedAsset = useMemo(
    () => sharedAssets.find((a) => String(a.assetId) === String(selectedAssetId)),
    [sharedAssets, selectedAssetId],
  );

  const generatePdf = () => {
    if (!selectedAsset) {
      toast({
        title: "Error",
        description: "Selecciona un equipo para generar el acta grupal",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const now = new Date();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ACTA GRUPAL DE ENTREGA DE EQUIPO", pageWidth / 2, 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Fecha de emisión: ${now.toLocaleDateString("es-ES")}`, 14, 30);
    doc.text(`Responsable principal: ${user?.userName || "-"}`, 14, 37);

    doc.setFont("helvetica", "bold");
    doc.text("Datos del equipo", 14, 48);

    doc.setFont("helvetica", "normal");
    const typeLabel = selectedAsset.type || "-";
    const brandModel = `${selectedAsset.brand || ""} ${selectedAsset.model || ""}`.trim() || "-";
    doc.text(`Codigo: ${selectedAsset.code || "-"}`, 14, 56);
    doc.text(`Tipo: ${typeLabel}`, 14, 63);
    doc.text(`Marca/Modelo: ${brandModel}`, 14, 70);
    doc.text(`Serial: ${selectedAsset.serialNumber || "-"}`, 14, 77);

    doc.setFont("helvetica", "bold");
    doc.text("Personas asignadas al equipo", 14, 89);

    autoTable(doc, {
      startY: 94,
      head: [["#", "Nombre completo", "Cedula", "Sucursal", "Fecha asignacion"]],
      body: selectedAsset.participants.map((p, idx) => [
        String(idx + 1),
        p.userName || "-",
        p.nationalId || "No registrada",
        p.branch || "-",
        formatDate(p.assignmentDate),
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    const legalTop = finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.text("Clausula de responsabilidad grupal", 14, legalTop);

    doc.setFont("helvetica", "normal");
    const legalText =
      "Las personas listadas en esta acta reconocen que el equipo descrito se encuentra bajo una asignacion grupal. " +
      "Cada persona asume responsabilidad individual y solidaria sobre el cuidado, uso adecuado y devolucion del equipo.";
    const wrapped = doc.splitTextToSize(legalText, 180);
    doc.text(wrapped, 14, legalTop + 7);

    const userSafe = (user?.userName || "grupo").replace(/\s+/g, "_");
    const codeSafe = (selectedAsset.code || "equipo").replace(/\s+/g, "_");
    const fileName = `Acta_Grupal_${userSafe}_${codeSafe}_${now
      .toISOString()
      .slice(0, 10)}.pdf`;

    doc.save(fileName);

    toast({
      title: "Exito",
      description: "Acta grupal generada correctamente",
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generar Acta Grupal</DialogTitle>
          <DialogDescription>
            Selecciona el equipo compartido para generar un acta con todas las personas asignadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Equipo compartido</p>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar equipo" />
              </SelectTrigger>
              <SelectContent>
                {sharedAssets.map((asset) => (
                  <SelectItem key={asset.assetId} value={asset.assetId}>
                    {asset.code} - {asset.brand || ""} {asset.model || ""} ({asset.participants.length} personas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAsset && (
            <div className="rounded border bg-muted/30 p-3 text-sm">
              <p className="font-medium mb-1">Participantes del equipo:</p>
              <ul className="space-y-1">
                {selectedAsset.participants.map((p) => (
                  <li key={`${selectedAsset.assetId}-${p.personId}`}>
                    {p.userName} - CI: {p.nationalId || "No registrada"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={generatePdf} disabled={!selectedAsset}>
              Generar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateGroupActaModal;
