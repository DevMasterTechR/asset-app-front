import { useMemo } from "react";
import jsPDF from "jspdf";
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
  purchaseDate?: string;
  attributesJson?: any;
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
    doc.text("ACTA DE ENTREGA DE EQUIPOS TECNOLÓGICOS", pageWidth / 2, 40, { align: "center" });

    // Datos del suscrito
    const subscriberName = "MORETA PAEZ GALO ANIBAL";
    const subscriberCI = "1723563480";

    // Párrafo introductorio usando el mismo estilo del acta individual
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const introText = `En la ciudad de Quito, en fecha ${formattedDate}, el suscrito ${subscriberName}, portador de la cédula de identidad N.° ${subscriberCI}, procede a entregar los siguientes equipos tecnológicos de propiedad de TechResources conforme al siguiente detalle:`;
    const introLines = doc.splitTextToSize(introText, pageWidth - 30);
    doc.text(introLines, 15, 47);

    let introY = 47 + introLines.length * 4;
    allParticipants.forEach((participant) => {
      const participantText = `A ${String(participant.userName || "DESCONOCIDO").toUpperCase()} con cédula de identidad N.° ${participant.nationalId || "No especificado"}.`;
      const participantLines = doc.splitTextToSize(participantText, pageWidth - 30);
      doc.text(participantLines, 15, introY);
      introY += participantLines.length * 4;
    });

    // Detalle específico por equipo (mismo enfoque que acta individual)
    let currentY = introY + 7;

    const resolveField = (obj: any, keys: string[], yesNo = false, skipSerialNumber = false) => {
      const tryVal = (v: any) => {
        if (v === undefined || v === null) return undefined;
        if (Array.isArray(v)) {
          const filtered = v.filter((item: any) => item !== null && item !== undefined && String(item).trim() !== "");
          if (filtered.length === 0) return undefined;
          return filtered.join(", ");
        }
        if (typeof v === "object") return JSON.stringify(v);
        const s = String(v).trim();
        if (!s) return undefined;
        if (yesNo) {
          const low = s.toLowerCase();
          if (v === true || low === "si" || low === "sí" || low === "true" || low === "yes") return "Sí";
          if (v === false || low === "no" || low === "false") return "No";
          return s;
        }
        return s;
      };

      const attrs = obj?.attributesJson || obj?.attributes || {};
      for (const k of keys) {
        const val = tryVal(attrs?.[k]);
        if (val !== undefined) return val;
      }

      for (const k of keys) {
        if (skipSerialNumber && k === "serialNumber") continue;
        const val = tryVal(obj?.[k]);
        if (val !== undefined) return val;
      }

      const storage = attrs?.storage || obj?.storage;
      if (storage && keys.some((k) => ["storage", "almacenamiento", "disk", "ssd", "hdd"].includes(k))) {
        const capacity = storage.capacity ?? storage.size ?? storage.total;
        const type = storage.type ?? storage.kind;
        const capStr = capacity !== undefined ? String(capacity) : undefined;
        const typeStr = type !== undefined ? String(type) : undefined;
        if (capStr || typeStr) {
          return [typeStr, capStr].filter(Boolean).join(" ");
        }
      }

      return "-";
    };

    const getDeviceLines = (d: any) => {
      const typeLabel = d.type || d.assetType || "-";
      const baseLines = [
        `Tipo: ${typeLabel}`,
        `Marca: ${d.brand || "-"}`,
        `Modelo: ${d.model || "-"}`,
        `Serial: ${d.serialNumber || "-"}`,
      ];

      const isLaptop = /laptop|notebook|ultrabook/i.test(typeLabel);
      const isCelular = /celular|cellphone|móvil|movil|tablet/i.test(typeLabel);
      const isDesktop = /desktop|pc|computadora/i.test(typeLabel);
      const isIPPhone = /ip-phone|ipphone|teléfono ip|telefono ip/i.test(typeLabel);
      const isPrinter = /printer|impresora/i.test(typeLabel);
      const isMonitor = /monitor/i.test(typeLabel);
      const isTablet = /tablet/i.test(typeLabel);

      const getPurchaseYear = () => {
        if (!d?.purchaseDate) return "-";
        try {
          const date = new Date(d.purchaseDate);
          const year = date.getFullYear();
          if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) return "-";
          return String(year);
        } catch {
          return "-";
        }
      };
      const purchaseYear = getPurchaseYear();

      const laptopLines = isLaptop
        ? [
            `Procesador: ${resolveField(d, ["cpu", "processor", "procesador"])} - ${purchaseYear}`,
            `Memoria RAM (GB): ${resolveField(d, ["ram", "memory", "memoria"])}`,
            `Almacenamiento (GB): ${resolveField(d, ["storage", "almacenamiento", "ssd", "hdd", "disk"])}`,
            `Cargador: ${resolveField(d, ["hasCharger", "chargerIncluded", "charger", "cargador"], true)}`,
            `Maletín/Bolso: ${resolveField(d, ["hasBag", "bagIncluded", "bag", "maletin"], true)}`,
          ]
        : [];

      const phoneLines = isCelular
        ? [
            `Número Celular: ${resolveField(d, ["chipNumber", "phoneNumber", "phone", "number", "telefono", "numeroCelular", "celular"])}`,
            `Operadora: ${resolveField(d, ["operator", "operadora", "carrier"])}`,
            `Memoria RAM (GB): ${resolveField(d, ["ram", "memory", "memoria"])}`,
            `Almacenamiento (GB): ${resolveField(d, ["storage", "almacenamiento", "internalStorage"])}`,
            `Código IMEI: ${resolveField(d, ["imeis", "imei", "imei1"], false, true)}`,
            `Procesador: ${resolveField(d, ["cpu", "processor", "procesador"])} - ${purchaseYear}`,
            `Color: ${resolveField(d, ["color"])}`,
            `Cargador Cel: ${resolveField(d, ["hasCellCharger", "hasCharger", "chargerIncluded", "charger", "cargador"], true)}`,
            `Cable de Carga: ${resolveField(d, ["hasChargingCable", "chargingCable"], true)}`,
            `Funda/Estuche: ${resolveField(d, ["hasCase", "case", "funda", "estuche"], true)}`,
            `Protector Pantalla: ${resolveField(d, ["hasMicas", "hasMica", "hasScreenProtector", "screenProtector", "mica"], true)}`,
            `Chip Telefónico: ${resolveField(d, ["hasChip", "chip"], true)}`,
          ]
        : [];

      const desktopLines = isDesktop
        ? [
            `Mouse: ${resolveField(d, ["hasMouse", "mouse"], true)}`,
            `Teclado: ${resolveField(d, ["hasKeyboard", "keyboard"], true)}`,
            `Mouse Pad: ${resolveField(d, ["hasMousePad", "mousePad"], true)}`,
            `Tarjeta WiFi: ${resolveField(d, ["hasWifiCard", "wifiCard"], true)}`,
            `Adaptador de Memoria: ${resolveField(d, ["hasMemoryAdapter", "memoryAdapter"], true)}`,
            `Pantalla(s): ${resolveField(d, ["hasScreen", "screen"], true)}`,
            `HUB: ${resolveField(d, ["hasHub", "hub"], true)}`,
            `Cable de Poder: ${resolveField(d, ["hasPowerCable", "powerCable"], true)}`,
          ]
        : [];

      const ipPhoneLines = isIPPhone
        ? [
            `Extensión Telefónica: ${resolveField(d, ["extension"])}`,
            `Número Telefónico: ${resolveField(d, ["phoneNumber", "number"])}`,
            `Cargador Incluido: ${resolveField(d, ["hasCharger", "chargerIncluded", "charger"], true)}`,
          ]
        : [];

      const printerLines = isPrinter
        ? [
            `Tipo de Impresora: ${resolveField(d, ["printerType", "tipo"])}`,
            `Tipo de Conexión: ${resolveField(d, ["connectionType", "connection"])}`,
            `Dirección IP: ${resolveField(d, ["ipAddress", "ip"])}`,
            `Función Escáner: ${resolveField(d, ["hasScanner", "scanner"], true)}`,
            `Impresión a Color: ${resolveField(d, ["colorPrinting", "color"], true)}`,
            `Cable de Poder: ${resolveField(d, ["hasPowerCable", "powerCable"], true)}`,
            `Cable USB: ${resolveField(d, ["hasUSBCable", "usbCable"], true)}`,
          ]
        : [];

      const monitorLines = isMonitor
        ? [
            `Tamaño de Pantalla (pulgadas): ${resolveField(d, ["screenSize"])}`,
            `Resolución: ${resolveField(d, ["resolution"])}`,
            `Tipo de Panel: ${resolveField(d, ["panelType"])}`,
            `Puerto HDMI: ${resolveField(d, ["hasHDMI"], true)}`,
            `Puerto VGA: ${resolveField(d, ["hasVGA"], true)}`,
            `Cable de Poder: ${resolveField(d, ["hasPowerCable"], true)}`,
          ]
        : [];

      const tabletLines = isTablet && !isCelular
        ? [
            `Procesador: ${resolveField(d, ["cpu", "processor", "procesador"])} - ${purchaseYear}`,
            `Memoria RAM (GB): ${resolveField(d, ["ram", "memory", "memoria"])}`,
            `Almacenamiento (GB): ${resolveField(d, ["storage", "almacenamiento", "internalStorage"])}`,
            `Color: ${resolveField(d, ["color"])}`,
            `Cargador: ${resolveField(d, ["hasCellCharger", "hasCharger", "chargerIncluded", "charger", "cargador"], true)}`,
            `Cable de Carga: ${resolveField(d, ["hasChargingCable", "chargingCable"], true)}`,
            `Funda/Estuche: ${resolveField(d, ["hasCase", "case", "funda", "estuche"], true)}`,
          ]
        : [];

      const allLines = [...baseLines, ...laptopLines, ...phoneLines, ...desktopLines, ...ipPhoneLines, ...printerLines, ...monitorLines, ...tabletLines];
      const displayLines = allLines.filter((line) => !line.includes(": -") && !line.endsWith(": No"));
      return { displayLines: displayLines.length ? displayLines : baseLines, typeLabel };
    };

    const boxWidth = (pageWidth - 30) / 2;
    const boxMargin = 6;

    const drawDeviceDetailBox = (d: any, xOffset: number, boxH: number) => {
      const { displayLines, typeLabel } = getDeviceLines(d);
      const detailLineHeight = 2.8;

      doc.setFillColor(248, 250, 252);
      doc.rect(xOffset, currentY, boxWidth, boxH, "F");

      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.8);
      doc.rect(xOffset, currentY, boxWidth, boxH);

      doc.setFillColor(31, 110, 170);
      doc.rect(xOffset, currentY, boxWidth, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      const titleText = `${d.code || "SIN-CODIGO"} | ${String(typeLabel).toUpperCase()}`;
      doc.text(titleText, xOffset + 2, currentY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(40, 40, 40);

      let ly = currentY + 10;
      const contentWidth = boxWidth - 4;
      for (let i = 0; i < displayLines.length; i++) {
        const wrapped = doc.splitTextToSize(displayLines[i], contentWidth);
        doc.text(wrapped, xOffset + 2, ly);
        ly += detailLineHeight * wrapped.length;
      }
    };

    const calculateBoxHeight = (d: any): number => {
      const { displayLines } = getDeviceLines(d);
      const detailLineHeight = 2.8;
      const calculatedHeight = 8 + displayLines.length * detailLineHeight + 3;
      return Math.max(calculatedHeight, 35);
    };

    for (let i = 0; i < sharedAssets.length; i += 2) {
      const d1 = sharedAssets[i];
      const d2 = sharedAssets[i + 1];

      const height1 = calculateBoxHeight(d1);
      const height2 = d2 ? calculateBoxHeight(d2) : 0;
      const rowHeight = Math.max(height1, height2);

      if (currentY + rowHeight > pageHeight - 35) {
        doc.addPage();
        addHeader();
        currentY = 30;
      }

      drawDeviceDetailBox(d1, 12, rowHeight);
      if (d2) {
        drawDeviceDetailBox(d2, 12 + boxWidth + boxMargin, rowHeight);
      }

      currentY += rowHeight + 4;
    }

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
    currentY += 5;
    doc.text("Ninguna", 15, currentY);
    currentY += 7;

    const legalText1 = `El receptor de los equipos tecnológicos (en adelante, el/la/los/las colaboradores) es responsable de su uso adecuado y del mantenimiento en condiciones óptimas, conforme a las instrucciones y políticas establecidas por la empresa.`;
    const splitLegal1 = doc.splitTextToSize(legalText1, 180);
    if (currentY + splitLegal1.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    doc.text(splitLegal1, 15, currentY);
    currentY += splitLegal1.length * 4;

    const legalText2 = `Será responsabilidad de el/la/los/las colaborador/es/as reportar de manera inmediata cualquier daño, falla, pérdida o incidente que afecte el funcionamiento del equipo, mediante correo electrónico dirigido al Departamento de Tecnología a la dirección`;
    const splitLegal2 = doc.splitTextToSize(legalText2, 180);
    if (currentY + splitLegal2.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    doc.text(splitLegal2, 15, currentY);
    currentY += splitLegal2.length * 4;

    doc.setFont("helvetica", "bold");
    doc.text("dep-sistemas@recursos-tecnologicos.com.", 15, currentY);
    doc.setFont("helvetica", "normal");
    currentY += 4;

    const malUsoText = `Se considera mal uso:\na) Manipulación indebida de componentes internos.\nb) Instalación de software no autorizado.\nc) Uso en condiciones ambientales inadecuadas.\nd) Derrame de líquidos.\ne) Uso de fuerza excesiva.\nf) Golpes, caídas o impactos por descuido.\ng) Modificación física sin autorización.`;
    const splitMalUso = doc.splitTextToSize(malUsoText, 180);
    if (currentY + splitMalUso.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    doc.text(splitMalUso, 15, currentY);
    currentY += splitMalUso.length * 4 + 2;

    const roboText = `En caso de robo, el colaborador deberá presentar denuncia ante las autoridades:\n• Si la denuncia es presentada y el procesador del equipo tiene hasta 5 años de vigencia, el costo de reposición será 50% colaborador y 50% empresa.\n• Si el procesador del equipo tiene más de 5 años de vigencia, la empresa asume el 100% del costo.\n• Si el usuario no presenta denuncia, el colaborador asume el 100% del costo de reposición.`;
    const splitRobo = doc.splitTextToSize(roboText, 180);
    if (currentY + splitRobo.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    doc.text(splitRobo, 15, currentY);
    currentY += splitRobo.length * 4 + 4;

    if (currentY > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    doc.setFont("helvetica", "bold");
    const notaLabel = "Nota: ";
    doc.text(notaLabel, 15, currentY);
    const notaLabelWidth = doc.getTextWidth(notaLabel);
    doc.setFont("helvetica", "normal");
    const notaPart1 = "El mouse y el teclado se entregan nuevos, en óptimas condiciones y debidamente probados. Cualquier daño o pérdida será responsabilidad del colaborador, quien deberá asumir el ";
    const notaPart2Bold = "100% del costo de reposición.";
    const notaAvailableWidth = pageWidth - 15 - notaLabelWidth - 15;
    const notaPart1Lines = doc.splitTextToSize(notaPart1, notaAvailableWidth);
    doc.text(notaPart1Lines[0], 15 + notaLabelWidth, currentY);
    let notaY = currentY + 4;
    for (let i = 1; i < notaPart1Lines.length; i++) {
      doc.text(notaPart1Lines[i], 15, notaY);
      notaY += 4;
    }
    const lastLineText = notaPart1Lines[notaPart1Lines.length - 1] || "";
    const lastLineWidth = doc.getTextWidth(lastLineText);
    doc.setFont("helvetica", "bold");
    const boldPartWidth = doc.getTextWidth(notaPart2Bold);
    const startX = notaPart1Lines.length === 1 ? 15 + notaLabelWidth + lastLineWidth : 15 + lastLineWidth;
    if (startX + boldPartWidth < pageWidth - 15) {
      doc.text(notaPart2Bold, startX + 1, notaY - 4);
    } else {
      doc.text(notaPart2Bold, 15, notaY);
      notaY += 4;
    }
    doc.setFont("helvetica", "normal");
    currentY = notaY + 6;

    const costoText = `El costo de reposición se calculará en función del valor comercial actual de un equipo de características equivalentes al entregado.`;
    const splitCosto = doc.splitTextToSize(costoText, 180);
    if (currentY + splitCosto.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    doc.text(splitCosto, 15, currentY);
    currentY += splitCosto.length * 4 + 2;

    const valoresText = `El costo se calcula según el valor comercial actual de un equipo equivalente. Los valores de reposición o reparación serán descontados del rol de pagos o de la liquidación final.`;
    const splitValores = doc.splitTextToSize(valoresText, 180);
    if (currentY + splitValores.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    doc.text(splitValores, 15, currentY);
    currentY += splitValores.length * 4 + 3;

    // Sección de participantes con el mismo formato de acta individual
    currentY += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ACEPTACIÓN EXPRESA", 15, currentY);

    currentY += 5;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const acceptanceText = `Yo, __________________________________________________________________________________, con C.I. No. ________________________, declaro haber recibido a conformidad los equipos tecnológicos detallados. Me comprometo a hacer uso adecuado de los mismos y acepto que, en caso de pérdida, daño o robo atribuible a mi responsabilidad, se realicen los descuentos correspondientes a través de mi rol de pagos o liquidación final.`;
    const acceptanceLines = doc.splitTextToSize(acceptanceText, pageWidth - 30);
    doc.text(acceptanceLines, 15, currentY);
    currentY += acceptanceLines.length * 3.2 + 8;

    const leftColX = 15;
    const colWidth = (pageWidth - 30) / 2;
    const midColX = leftColX + colWidth + 10;

    // Crear una sección de firma "Aceptado por" - 2 por fila
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);

    for (let i = 0; i < allParticipants.length; i += 2) {
      const participant1 = allParticipants[i];
      const participant2 = allParticipants[i + 1];

      if (currentY > pageHeight - 50) {
        doc.addPage();
        addHeader();
        currentY = 35;
      }

      // Columna izquierda: Aceptado por (Participante 1)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Aceptado por:", leftColX, currentY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const lineY1 = currentY + 10;
      doc.line(leftColX, lineY1, leftColX + colWidth - 5, lineY1);
      doc.text(participant1.userName || "Nombre del colaborador", leftColX, lineY1 + 3);

      const lineY2 = currentY + 18;
      doc.text("C.I.: ", leftColX, lineY2);
      doc.line(leftColX + 8, lineY2, leftColX + colWidth - 5, lineY2);
      doc.text(participant1.nationalId || "No especificado", leftColX + 10, lineY2 - 0.8);

      const lineY3 = currentY + 26;
      doc.setFontSize(8);
      doc.text("Firma: ", leftColX, lineY3);
      doc.line(leftColX + 10, lineY3, leftColX + colWidth - 5, lineY3);

      const lineY4 = currentY + 34;
      doc.text("Fecha: ____ / ____ / _______", leftColX, lineY4);

      // Columna derecha: Aceptado por (Participante 2) - si existe
      if (participant2) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Aceptado por:", midColX, currentY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.line(midColX, lineY1, midColX + colWidth - 5, lineY1);
        doc.text(participant2.userName || "Nombre del colaborador", midColX, lineY1 + 3);

        doc.text("C.I.: ", midColX, lineY2);
        doc.line(midColX + 8, lineY2, midColX + colWidth - 5, lineY2);
        doc.text(participant2.nationalId || "No especificado", midColX + 10, lineY2 - 0.8);

        doc.setFontSize(8);
        doc.text("Firma: ", midColX, lineY3);
        doc.line(midColX + 10, lineY3, midColX + colWidth - 5, lineY3);

        doc.text("Fecha: ____ / ____ / _______", midColX, lineY4);
      }

      currentY += 42;
    }

    // "Entregado por" solo una vez - media fila
    if (currentY > pageHeight - 40) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Entregado por:", leftColX, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const deliveryLine1 = currentY + 10;
    const deliveryLine2 = currentY + 18;
    const deliveryLine3 = currentY + 26;
    const deliveryLine4 = currentY + 34;

    doc.text(subscriberName, leftColX, deliveryLine1 - 2);
    doc.text("Nombre completo del responsable de entrega", leftColX, deliveryLine1 + 3);
    doc.text(`C.I.: ${subscriberCI}`, leftColX, deliveryLine2);
    doc.text("Firma: ", leftColX, deliveryLine3);
    doc.line(leftColX + 10, deliveryLine3, leftColX + colWidth - 5, deliveryLine3);
    doc.text(`Fecha: ${today.toLocaleDateString("es-ES")}`, leftColX, deliveryLine4);

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
