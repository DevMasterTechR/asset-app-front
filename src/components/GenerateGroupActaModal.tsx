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

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoUrl = "/images/techinformeencabezado.png";
    const today = new Date();
    const formattedDate = today.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Función para agregar encabezado en cada página
    const addHeader = () => {
      const logoWidth = 100;
      const logoHeight = 16;
      doc.addImage(logoUrl, "PNG", (pageWidth - logoWidth) / 2, 8, logoWidth, logoHeight);
    };

    const addFooterToAllPages = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Pie de página
        const footerText = `QUITO – QUITO SUR – GUAYAQUIL – CUENCA – MANTA – MACHALA – AMBATO - STO. DOMINGO – LOJA – IBARRA - EXPRESS SANGOLQUI – CARAPUNGO – PORTOVIEJO\nwww.recursos-tecnologicos.com\nTeléfono: PBX 593 – 02 5133453`;
        const splitFooter = doc.splitTextToSize(footerText, 180);
        doc.text(splitFooter, pageWidth / 2, pageHeight - 15, { align: "center" });
        doc.setTextColor(200, 200, 200);
        doc.setFont("helvetica", "italic");
        doc.text(`Generado por: Administrador`, 15, pageHeight - 8);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7);
        doc.text(`${i}/${totalPages}`, pageWidth - 15, pageHeight - 8, { align: "right" });
      }
    };

    // Recopilar todos los participantes únicos
    const allParticipants: GroupActaParticipant[] = [];
    const participantMap = new Map<string, GroupActaParticipant>();
    sharedAssets.forEach((asset) => {
      (asset.participants || []).forEach((p) => {
        const key = String(p.personId);
        if (!participantMap.has(key)) {
          participantMap.set(key, p);
          allParticipants.push(p);
        }
      });
    });

    // PÁGINA 1: Encabezado, introducción y detalle
    addHeader();

    // Fecha a la derecha debajo del logo
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Quito, ${formattedDate}`, pageWidth - 15, 32, { align: "right" });

    // Título
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ACTA GRUPAL DE ENTREGA DE EQUIPOS TECNOLÓGICOS", pageWidth / 2, 40, { align: "center" });

    // Datos del suscrito
    const subscriberName = "MORETA PAEZ GALO ANIBAL";
    const subscriberCI = "1723563480";

    // Párrafo introductorio usando el mismo estilo del acta individual
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const introText = `En la ciudad de Quito, en fecha ${formattedDate}, el suscrito ${subscriberName}, portador de la cédula de identidad N.° ${subscriberCI}, procede a entregar los siguientes equipos tecnológicos de propiedad de TechResources para uso compartido de ${allParticipants.length} persona(s), conforme al siguiente detalle:`;
    const introLines = doc.splitTextToSize(introText, pageWidth - 30);
    doc.text(introLines, 15, 47);

    // Tabla de equipos a entregar
    const equipoRows = sharedAssets.map((asset) => [
      asset.code || "-",
      asset.type || "-",
      `${asset.brand || ""} ${asset.model || ""}`.trim() || "-",
      asset.serialNumber || "-",
    ]);

    autoTable(doc, {
      startY: 47 + introLines.length * 4 + 3,
      head: [["Código", "Tipo", "Marca/Modelo", "Serial"]],
      body: equipoRows,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    });

    let currentY = (doc as any).lastAutoTable?.finalY || 100;

    // Espacio para observaciones
    if (currentY > pageHeight - 60) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }

    currentY += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES:", 15, currentY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    currentY += 6;
    doc.line(15, currentY, pageWidth - 15, currentY);
    currentY += 6;
    doc.line(15, currentY, pageWidth - 15, currentY);

    // Sección de participantes con el mismo formato de acta individual
    currentY += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ACEPTACIÓN EXPRESA", 15, currentY);

    currentY += 5;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const acceptanceText = "Cada persona detallada a continuación declara haber recibido a conformidad los equipos tecnológicos asignados en modalidad compartida, comprometiéndose a su correcto uso y custodia.";
    const acceptanceLines = doc.splitTextToSize(acceptanceText, pageWidth - 30);
    doc.text(acceptanceLines, 15, currentY);
    currentY += acceptanceLines.length * 3.5 + 5;

    const colWidth = (pageWidth - 30) / 2;
    const leftColX = 15;
    const rightColX = leftColX + colWidth + 10;

    // Crear una sección de firma por cada participante
    allParticipants.forEach((participant, index) => {
      if (currentY > pageHeight - 58) {
        doc.addPage();
        addHeader();
        currentY = 35;
      }

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      // Columna izquierda: Aceptado por (persona receptora)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Aceptado por (Persona ${index + 1}):`, leftColX, currentY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const lineY1 = currentY + 10;
      doc.line(leftColX, lineY1, leftColX + colWidth, lineY1);
      doc.setFontSize(7);
      doc.text(participant.userName || "Nombre del colaborador", leftColX, lineY1 + 3);

      const lineY2 = currentY + 18;
      doc.text("C.I.: ", leftColX, lineY2);
      doc.line(leftColX + 8, lineY2, leftColX + colWidth, lineY2);
      doc.setFontSize(7);
      doc.text(participant.nationalId || "No especificado", leftColX + 10, lineY2 - 0.8);

      const lineY2B = currentY + 24;
      doc.text("Sucursal: ", leftColX, lineY2B);
      doc.line(leftColX + 14, lineY2B, leftColX + colWidth, lineY2B);
      doc.setFontSize(7);
      doc.text(participant.branch || "No especificado", leftColX + 16, lineY2B - 0.8);

      const lineY3 = currentY + 30;
      doc.setFontSize(8);
      doc.text("Firma: ", leftColX, lineY3);
      doc.line(leftColX + 10, lineY3, leftColX + colWidth, lineY3);

      const lineY4 = currentY + 38;
      doc.text("Fecha: ____ / ____ / _______", leftColX, lineY4);

      // Columna derecha: Entregado por (responsable TechResources)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Entregado por:", rightColX, currentY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(subscriberName, rightColX, lineY1 - 2);
      doc.text("Nombre completo del responsable de entrega", rightColX, lineY1 + 3);
      doc.text(`C.I.: ${subscriberCI}`, rightColX, lineY2);
      doc.text("Firma: ", rightColX, lineY3);
      doc.line(rightColX + 10, lineY3, rightColX + colWidth, lineY3);
      doc.text(`Fecha: ${today.toLocaleDateString("es-ES")}`, rightColX, lineY4);

      currentY += 48;
    });

    // Pie de página
    addFooterToAllPages();

    // Formato del nombre del archivo
    const userSafe = (user?.userName || "grupo").replace(/\s+/g, "_");
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");
    const fileName = `Acta_Grupal_${userSafe}_${day}${month}${year}_${hours}${minutes}.pdf`;

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
