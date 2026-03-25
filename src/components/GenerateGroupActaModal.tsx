import { useMemo } from "react";
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
  const totalParticipants = useMemo(() => {
    const set = new Set<string>();
    sharedAssets.forEach((asset) => {
      (asset.participants || []).forEach((p) => set.add(String(p.personId)));
    });
    return set.size;
  }, [sharedAssets]);

  const generatePdf = () => {
    if (!sharedAssets || sharedAssets.length === 0) {
      toast({
        title: "Error",
        description: "No hay equipos compartidos para generar el acta grupal",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const now = new Date();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ACTA GRUPAL DE ENTREGA DE EQUIPOS", pageWidth / 2, 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Fecha de emisión: ${now.toLocaleDateString("es-ES")}`, 14, 30);
    doc.text(`Responsable principal: ${user?.userName || "-"}`, 14, 37);
    doc.text(`Equipos compartidos: ${sharedAssets.length}`, 14, 44);
    doc.text(`Participantes unicos: ${totalParticipants}`, 14, 51);

    let y = 60;

    sharedAssets.forEach((asset, index) => {
      if (index > 0) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`Equipo compartido ${index + 1} de ${sharedAssets.length}`, 14, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const typeLabel = asset.type || "-";
      const brandModel = `${asset.brand || ""} ${asset.model || ""}`.trim() || "-";
      doc.text(`Codigo: ${asset.code || "-"}`, 14, y + 8);
      doc.text(`Tipo: ${typeLabel}`, 14, y + 15);
      doc.text(`Marca/Modelo: ${brandModel}`, 14, y + 22);
      doc.text(`Serial: ${asset.serialNumber || "-"}`, 14, y + 29);

      doc.setFont("helvetica", "bold");
      doc.text("Personas asignadas al equipo", 14, y + 40);

      autoTable(doc, {
        startY: y + 45,
        head: [["#", "Nombre completo", "Cedula", "Sucursal", "Fecha asignacion"]],
        body: asset.participants.map((p, idx) => [
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
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    const legalTop = finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.text("Clausula de responsabilidad grupal", 14, legalTop);

    doc.setFont("helvetica", "normal");
    const legalText =
      "Las personas listadas en esta acta reconocen que los equipos descritos se encuentran bajo una asignacion grupal. " +
      "Cada persona asume responsabilidad individual y solidaria sobre el cuidado, uso adecuado y devolucion de los equipos.";
    const wrapped = doc.splitTextToSize(legalText, 180);
    doc.text(wrapped, 14, legalTop + 7);

    const userSafe = (user?.userName || "grupo").replace(/\s+/g, "_");
    const fileName = `Acta_Grupal_${userSafe}_${now
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
            Esta acta incluira todos los equipos compartidos y sus participantes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded border bg-muted/30 p-3 text-sm">
            <p className="font-medium mb-2">Equipos compartidos incluidos: {sharedAssets.length}</p>
            <ul className="space-y-1 max-h-56 overflow-y-auto">
              {sharedAssets.map((asset) => (
                <li key={asset.assetId}>
                  {asset.code} - {asset.brand || ""} {asset.model || ""} ({asset.participants.length} personas)
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={generatePdf} disabled={sharedAssets.length === 0}>
              Generar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateGroupActaModal;
