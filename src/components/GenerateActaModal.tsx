import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface GenerateActaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

const GenerateActaModal = ({ open, onOpenChange, user }: GenerateActaModalProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (open) {
      setObservations("");
      console.log("Usuario en GenerateActaModal:", user);
    }
  }, [open, user]);

  const generatedBy = currentUser?.firstName && currentUser?.lastName 
    ? `${currentUser.firstName} ${currentUser.lastName}` 
    : "Administrador";

  if (!user) return null;

  const today = new Date();
  const formattedDate = today.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleGeneratePDF = () => {
    if (!observations.trim()) {
      toast({
        title: "Error",
        description: "Las observaciones son obligatorias",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoUrl = "/images/techinformeencabezado.png";

    // Función para agregar encabezado en cada página
    const addHeader = () => {
      const logoWidth = 100;
      const logoHeight = 20;
      doc.addImage(logoUrl, "PNG", (pageWidth - logoWidth) / 2, 8, logoWidth, logoHeight);
    };

    // ===== PÁGINA 1: Encabezado, tabla y observaciones =====
    
    // Logo centrado
    addHeader();

    // Fecha a la derecha debajo del logo
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Quito, ${formattedDate}`, pageWidth - 15, 40, { align: "right" });

    // Título (más cerca del logo)
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("ACTA DE ENTREGA DE EQUIPOS TECNOLÓGICOS", pageWidth / 2, 50, { align: "center" });

    // Párrafo introductorio (más cerca del título)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const introText = `En la ciudad de QUITO se llevó a cabo la entrega formal de los equipos tecnológicos pertenecientes a la empresa TechResources a ${user.userName || "Desconocido"} con CI: ${user.nationalId || "No especificado"}.`;
    const splitIntro = doc.splitTextToSize(introText, 180);
    doc.text(splitIntro, 15, 58);

    // Tabla de equipos
    const equipmentData = user.devices
      ? user.devices.map((d: any, idx: number) => [
          String(idx + 1),
          d.code || "SIN-CODIGO",
          d.assetType || d.type || "-",
          d.brand || "-",
          d.model || "-",
          d.serialNumber || "-",
        ])
      : [];

    const tableStartY = 75;
    autoTable(doc, {
      head: [["#", "Código", "Tipo", "Marca", "Modelo", "Serial"]],
      body: equipmentData,
      startY: tableStartY,
      margin: 15,
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        halign: "center",
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Observaciones
    let finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones:", 15, finalY + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitObs = doc.splitTextToSize(observations, 180);
    doc.text(splitObs, 15, finalY + 14);

    // Calcular posición después de observaciones
    let currentY = finalY + 14 + (splitObs.length * 4.5) + 10;

    // Solo agregar nueva página si no hay suficiente espacio para el siguiente contenido
    if (currentY > pageHeight - 60) {
      doc.addPage();
      addHeader();
      currentY = 40;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const sections = [
      {
        title: "",
        content: `El receptor de los equipos tecnológicos (en adelante, el/la/los/las colaboradores) es responsable de su uso adecuado y del mantenimiento en condiciones óptimas, conforme a las instrucciones y políticas establecidas por la empresa.`,
      },
      {
        title: "",
        content: `Será responsabilidad de el/la/los/las colaboradores reportar de manera inmediata cualquier daño, falla, pérdida o incidente que afecte el funcionamiento del equipo, mediante correo electrónico dirigido al Departamento de Tecnología a la dirección dep-sistemas@recursos-tecnologicos.com.`,
      },
      {
        title: "",
        content: `Se considera mal uso del equipo cualquier conducta que cause daño intencional, pérdida o deterioro en su funcionamiento. A título ejemplificativo, se considera mal uso:`,
      },
    ];

    // Agregar secciones iniciales
    sections.forEach((section) => {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        addHeader();
        currentY = 55;
      }
      if (section.title) {
        doc.setFont("helvetica", "bold");
        doc.text(section.title, 15, currentY);
        currentY += 6;
      }
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(section.content, 180);
      doc.text(splitText, 15, currentY);
      currentY += splitText.length * 4.5 + 5;
    });

    // Lista de mal uso
    const badUsageItems = [
      "a) La manipulación indebida de componentes internos.",
      "b) La instalación o utilización de software no autorizado.",
      "c) El uso del equipo en condiciones ambientales inadecuadas (temperatura, humedad, etc.).",
      "d) El derrame de líquidos sobre el equipo.",
      "e) El uso de fuerza excesiva sobre teclados, pantallas o conexiones.",
      "f) Los golpes, caídas o impactos accidentales atribuibles a descuido del Usuario.",
      "g) La modificación física del dispositivo sin la debida autorización técnica por parte del Departamento de Tecnología.",
    ];

    badUsageItems.forEach((item) => {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        addHeader();
        currentY = 55;
      }
      const splitItem = doc.splitTextToSize(item, 170);
      doc.text(splitItem, 20, currentY);
      currentY += splitItem.length * 4.5 + 4;
    });

    // Resto del texto
    if (currentY > pageHeight - 80) {
      doc.addPage();
      addHeader();
      currentY = 45;
    }

    // Párrafo sobre robo
    const roboText = `En caso de robo del equipo, el/la/los/las colaboradores deberá presentar la denuncia correspondiente ante las autoridades competentes.`;
    const splitRobo = doc.splitTextToSize(roboText, 180);
    doc.text(splitRobo, 15, currentY);
    currentY += splitRobo.length * 4.5 + 7;

    // Viñetas de costos
    const costItems = [
      "• Si la denuncia es presentada y el procesador del equipo tiene una vigencia de hasta cinco (5) años en el mercado, el costo de reposición será asumido en un cincuenta por ciento (50%) por el Usuario y un cincuenta por ciento (50%) por la empresa.",
      "• Si el procesador del equipo tiene una vigencia superior a cinco (5) años, la empresa asumirá el cien por ciento (100%) del costo de reposición presentando la denuncia respectiva.",
      "• Si el Usuario no presenta la denuncia, asumirá el cien por ciento (100%) del costo del equipo, independientemente de su antigüedad.",
    ];

    costItems.forEach((item) => {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        addHeader();
        currentY = 55;
      }
      const splitItem = doc.splitTextToSize(item, 170);
      doc.text(splitItem, 20, currentY);
      currentY += splitItem.length * 4.5 + 5;
    });

    if (currentY > pageHeight - 60) {
      doc.addPage();
      addHeader();
      currentY = 55;
    }

    const finalSections = [
      `El costo de reposición se calculará en función del valor comercial actual de un equipo de características equivalentes al entregado.`,
      `Cualquier valor derivado de la reposición o reparación de equipos, en los casos antes descritos, será descontado automáticamente del rol de pagos de el/la/los/las colaboradores. En caso de terminación de la relación laboral, por cualquier causa, dichos valores serán deducidos del monto correspondiente a la liquidación final.`,
    ];

    finalSections.forEach((text) => {
      if (currentY > pageHeight - 60) {
        doc.addPage();
        addHeader();
        currentY = 55;
      }
      const splitText = doc.splitTextToSize(text, 180);
      doc.text(splitText, 15, currentY);
      currentY += splitText.length * 4.5 + 7;
    });

    // ===== PÁGINA FINAL: Logo, ACEPTACION EXPRESA y firmas =====
    if (currentY > pageHeight - 120) {
      doc.addPage();
      addHeader();
      currentY = 55;
    } else {
      currentY += 10;
    }

    // Título ACEPTACION EXPRESA (más pequeño)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ACEPTACION EXPRESA:", 15, currentY);
    currentY += 8;

    // Texto de aceptación
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const acceptanceText = `Yo, __________________, portador(a) de la cédula de identidad No. __________________, declaro haber recibido a conformidad los equipos tecnológicos detallados anteriormente. Me comprometo a hacer uso adecuado de los mismos, conforme a las políticas y directrices establecidas por la empresa, y acepto expresamente que, en caso de pérdida, daño o robo atribuible a mi responsabilidad, se realicen los descuentos correspondientes a través de mi rol de pagos, o en su defecto, de mi liquidación final en caso de terminación de la relación laboral.`;
    
    const splitAcceptance = doc.splitTextToSize(acceptanceText, 180);
    doc.text(splitAcceptance, 15, currentY);
    currentY += splitAcceptance.length * 4 + 15;

    // Sección de firmas en dos columnas
    const colWidth = (pageWidth - 30) / 2;
    const leftColX = 15;
    const rightColX = 15 + colWidth + 10;
    
    // Columna izquierda: Aceptado por
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Aceptado por:", leftColX, currentY);
    
    // Línea para nombre
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lineY1 = currentY + 15;
    doc.line(leftColX, lineY1, leftColX + colWidth, lineY1);
    doc.text("Nombre completo del colaborador", leftColX, lineY1 + 4);
    
    // Línea para C.I.
    const lineY2 = currentY + 28;
    doc.text("C.I.: ", leftColX, lineY2);
    doc.line(leftColX + 10, lineY2, leftColX + colWidth, lineY2);
    
    // Línea para Firma
    const lineY3 = currentY + 41;
    doc.text("Firma: ", leftColX, lineY3);
    doc.line(leftColX + 12, lineY3, leftColX + colWidth, lineY3);
    
    // Línea para Fecha
    const lineY4 = currentY + 54;
    doc.text("Fecha: ____ / ____ / _______", leftColX, lineY4);
    
    // Columna derecha: Entregado por
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Entregado por:", rightColX, currentY);
    
    // Nombre fijo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("MORETA PAEZ GALO ANIBAL", rightColX, lineY1 - 2);
    doc.text("Nombre completo del responsable de entrega", rightColX, lineY1 + 4);
    
    // C.I. fijo
    doc.text("C.I.: 1723563480", rightColX, lineY2);
    
    // Línea para Firma (vacía)
    doc.text("Firma: ", rightColX, lineY3);
    doc.line(rightColX + 12, lineY3, rightColX + colWidth, lineY3);
    
    // Fecha actual (se llena automáticamente)
    doc.text(`Fecha: ${today.toLocaleDateString("es-ES")}`, rightColX, lineY4);

    // Pie de página con información de contacto
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const footerText = `QUITO – QUITO SUR – GUAYAQUIL – CUENCA – MANTA – MACHALA – AMBATO - STO. DOMINGO – LOJA – IBARRA - EXPRESS SANGOLQUI – CARAPUNGO – PORTOVIEJO
www.recursos-tecnologicos.com
Teléfono: PBX 593 – 02 5133453`;
    const splitFooter = doc.splitTextToSize(footerText, 180);
    doc.text(splitFooter, pageWidth / 2, pageHeight - 15, { align: "center" });

    // Watermark "Generado por" al pie
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "italic");
    doc.text(`Generado por: ${generatedBy}`, 15, pageHeight - 8);
    doc.setTextColor(0, 0, 0);

    doc.save(`Acta_${user.userName?.replace(/\s+/g, "_")}_${today.getFullYear()}.pdf`);
  };

  const handlePrint = () => {
    if (!observations.trim()) {
      toast({
        title: "Error",
        description: "Las observaciones son obligatorias",
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open("", "", "width=1000,height=800");
    if (!printWindow) return;

    const equipmentRows = (user.devices || [])
      .map(
        (d: any, idx: number) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${d.code || "SIN-CODIGO"}</td>
          <td>${d.assetType || d.type || "-"}</td>
          <td>${d.brand || "-"}</td>
          <td>${d.model || "-"}</td>
          <td>${d.serialNumber || "-"}</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Acta de Entrega</title>
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; padding: 20px; }
            .page { page-break-after: always; margin-bottom: 40px; }
            .page:last-child { page-break-after: avoid; }
            
            /* Header común para todas las páginas */
            .page-header { text-align: center; margin-bottom: 25px; }
            .page-header img { width: 150px; height: auto; margin: 0 auto; display: block; }
            
            /* Página 1 específica */
            .page1-header { display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 15px; }
            .page1-header .date { text-align: right; font-size: 11px; }
            
            .title { font-size: 14px; font-weight: bold; text-align: center; margin: 20px 0; }
            .intro { font-size: 10px; text-align: justify; margin: 20px 0; line-height: 1.6; }
            
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: center; }
            th { background-color: #2980b9; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f5f5f5; }
            
            .observations { margin: 20px 0; }
            .observations-title { font-weight: bold; font-size: 10px; margin-bottom: 5px; }
            .observations-text { font-size: 10px; }
            
            /* Contenido general */
            .content { font-size: 9px; line-height: 1.6; text-align: justify; margin-top: 6px; }
            .content p { margin: 10px 0; }
            
            .item-list { margin-left: 20px; }
            .item-list p { margin: 5px 0; }
            
            .bullet-list { margin-left: 20px; }
            .bullet-list p { margin: 8px 0; }
            
            /* Última página */
            .page-final-header { text-align: center; margin-bottom: 20px; }
            
            .acceptance { margin: 20px 0; }
            .acceptance-title { font-weight: bold; font-size: 9px; margin-bottom: 10px; }
            .acceptance-text { font-size: 9px; text-align: justify; line-height: 1.6; margin-bottom: 20px; }
            
            .signatures-container { display: flex; justify-content: space-between; margin-top: 30px; gap: 20px; }
            .signature-column { flex: 1; }
            .signature-column h4 { font-weight: bold; font-size: 9px; margin-bottom: 15px; }
            .signature-field { margin-bottom: 13px; }
            .signature-field label { font-size: 8px; display: block; margin-bottom: 2px; }
            .signature-field .line { border-bottom: 1px solid #000; padding-bottom: 2px; min-height: 12px; font-size: 8px; }
            .signature-field .sublabel { font-size: 8px; color: #666; margin-top: 2px; }
            
            .footer { font-size: 7px; color: #999; text-align: center; margin-top: 30px; line-height: 1.4; }
            
            .watermark { font-size: 7px; color: #ccc; font-style: italic; margin-top: 20px; }
            
            @media print {
              .page { page-break-after: always; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <!-- PÁGINA 1 -->
          <div class="page">
            <div class="page-header">
              <img src="/images/techinformeencabezado.png" alt="Logo">
            </div>
            
            <div class="page1-header">
              <div class="date"><strong>Quito, ${formattedDate}</strong></div>
            </div>
            
            <div class="title">ACTA DE ENTREGA DE EQUIPOS TECNOLÓGICOS</div>
            
            <div class="intro">
              En la ciudad de QUITO se llevó a cabo la entrega formal de los equipos tecnológicos pertenecientes a la empresa TechResources a <strong>${user.userName || "Desconocido"}</strong> con CI: <strong>${user.nationalId || "No especificado"}</strong>.
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Serial</th>
                </tr>
              </thead>
              <tbody>
                ${equipmentRows}
              </tbody>
            </table>
            
            <div class="observations">
              <div class="observations-title">Observaciones:</div>
              <div class="observations-text">${observations || "Ninguna"}</div>
            </div>
          </div>
          
          <!-- PÁGINA 2+ -->
          <div class="page">
            <div class="content">
              <p>El receptor de los equipos tecnológicos (en adelante, el/la/los/las colaboradores) es responsable de su uso adecuado y del mantenimiento en condiciones óptimas, conforme a las instrucciones y políticas establecidas por la empresa.</p>
              
              <p>Será responsabilidad de el/la/los/las colaboradores reportar de manera inmediata cualquier daño, falla, pérdida o incidente que afecte el funcionamiento del equipo, mediante correo electrónico dirigido al Departamento de Tecnología a la dirección dep-sistemas@recursos-tecnologicos.com.</p>
              
              <p>Se considera mal uso del equipo cualquier conducta que cause daño intencional, pérdida o deterioro en su funcionamiento. A título ejemplificativo, se considera mal uso:</p>
              
              <div class="item-list">
                <p>a) La manipulación indebida de componentes internos.</p>
                <p>b) La instalación o utilización de software no autorizado.</p>
                <p>c) El uso del equipo en condiciones ambientales inadecuadas (temperatura, humedad, etc.).</p>
                <p>d) El derrame de líquidos sobre el equipo.</p>
                <p>e) El uso de fuerza excesiva sobre teclados, pantallas o conexiones.</p>
                <p>f) Los golpes, caídas o impactos accidentales atribuibles a descuido del Usuario.</p>
                <p>g) La modificación física del dispositivo sin la debida autorización técnica por parte del Departamento de Tecnología.</p>
              </div>
              
              <p style="margin-top: 15px;">En caso de robo del equipo, el/la/los/las colaboradores deberá presentar la denuncia correspondiente ante las autoridades competentes.</p>
              
              <div class="bullet-list">
                <p>• Si la denuncia es presentada y el procesador del equipo tiene una vigencia de hasta cinco (5) años en el mercado, el costo de reposición será asumido en un cincuenta por ciento (50%) por el Usuario y un cincuenta por ciento (50%) por la empresa.</p>
                <p>• Si el procesador del equipo tiene una vigencia superior a cinco (5) años, la empresa asumirá el cien por ciento (100%) del costo de reposición presentando la denuncia respectiva.</p>
                <p>• Si el Usuario no presenta la denuncia, asumirá el cien por ciento (100%) del costo del equipo, independientemente de su antigüedad.</p>
              </div>
              
              <p style="margin-top: 15px;">El costo de reposición se calculará en función del valor comercial actual de un equipo de características equivalentes al entregado.</p>
              
              <p>Cualquier valor derivado de la reposición o reparación de equipos, en los casos antes descritos, será descontado automáticamente del rol de pagos de el/la/los/las colaboradores. En caso de terminación de la relación laboral, por cualquier causa, dichos valores serán deducidos del monto correspondiente a la liquidación final.</p>
            </div>
          </div>
          
          <!-- PÁGINA FINAL -->
          <div class="page">
            <div class="acceptance">
              <div class="acceptance-title">ACEPTACION EXPRESA:</div>
              <div class="acceptance-text">
                Yo, __________________, portador(a) de la cédula de identidad No. __________________, declaro haber recibido a conformidad los equipos tecnológicos detallados anteriormente. Me comprometo a hacer uso adecuado de los mismos, conforme a las políticas y directrices establecidas por la empresa, y acepto expresamente que, en caso de pérdida, daño o robo atribuible a mi responsabilidad, se realicen los descuentos correspondientes a través de mi rol de pagos, o en su defecto, de mi liquidación final en caso de terminación de la relación laboral.
              </div>
              
              <div class="signatures-container">
                <div class="signature-column">
                  <h4>Aceptado por:</h4>
                  <div class="signature-field">
                    <div class="line"></div>
                    <div class="sublabel">Nombre completo del colaborador</div>
                  </div>
                  <div class="signature-field">
                    <label>C.I.: ____________________</label>
                  </div>
                  <div class="signature-field">
                    <label>Firma: ____________________</label>
                  </div>
                  <div class="signature-field">
                    <label>Fecha: ____ / ____ / _______</label>
                  </div>
                </div>
                
                <div class="signature-column">
                  <h4>Entregado por:</h4>
                  <div class="signature-field">
                    <div class="line">MORETA PAEZ GALO ANIBAL</div>
                    <div class="sublabel">Nombre completo del responsable de entrega</div>
                  </div>
                  <div class="signature-field">
                    <label>C.I.: 1723563480</label>
                  </div>
                  <div class="signature-field">
                    <label>Firma: ____________________</label>
                  </div>
                  <div class="signature-field">
                    <label>Fecha: ${today.toLocaleDateString("es-ES")}</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              QUITO – QUITO SUR – GUAYAQUIL – CUENCA – MANTA – MACHALA – AMBATO - STO. DOMINGO – LOJA – IBARRA - EXPRESS SANGOLQUI – CARAPUNGO – PORTOVIEJO<br>
              www.recursos-tecnologicos.com<br>
              Teléfono: PBX 593 – 02 5133453
            </div>
            
            <div class="watermark">Generado por: ${generatedBy}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar Acta de Entrega</DialogTitle>
          <DialogDescription>
            Completa la información y genera el acta para {user?.userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del usuario */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2">Información de la Persona</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p className="font-medium">{user?.userName || "Desconocido"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">CI:</span>
                <p className="font-medium">{user?.nationalId || "No especificado"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Sucursal:</span>
                <p className="font-medium">{user?.branch || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Equipos:</span>
                <p className="font-medium">{user?.devices?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Tabla de equipos */}
          <div>
            <h3 className="font-semibold mb-2">Equipos a Entregar</h3>
            <div className="border rounded-lg overflow-auto max-h-48">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Marca</th>
                    <th className="px-3 py-2 text-left">Modelo</th>
                    <th className="px-3 py-2 text-left">Serial</th>
                  </tr>
                </thead>
                <tbody>
                  {user?.devices && user.devices.length > 0 ? (
                    user.devices.map((d: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs">{d.code || "SIN-CODIGO"}</td>
                        <td className="px-3 py-2">{d.assetType || d.type || "-"}</td>
                        <td className="px-3 py-2">{d.brand || "-"}</td>
                        <td className="px-3 py-2">{d.model || "-"}</td>
                        <td className="px-3 py-2 text-xs">{d.serialNumber || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-center text-muted-foreground">
                        Sin equipos asignados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observations">
              Observaciones <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="observations"
              placeholder="Ingresa observaciones sobre la entrega..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="min-h-20"
            />
          </div>

          {/* Generado por */}
          <div className="space-y-2">
            <Label htmlFor="generatedBy">Generado por (Nombre de quien firma)</Label>
            <input
              id="generatedBy"
              type="text"
              disabled
              value={generatedBy}
              className="w-full px-3 py-2 border rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Vista Previa / Imprimir
            </Button>
            <Button onClick={handleGeneratePDF} className="gap-2">
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateActaModal;
