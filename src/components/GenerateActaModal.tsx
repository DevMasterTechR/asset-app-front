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
import { Download } from "lucide-react";
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
      if (user?.devices) {
        console.log("Dispositivos:", user.devices);
        user.devices.forEach((d: any, idx: number) => {
          console.log(`Device ${idx}:`, {
            code: d.code,
            type: d.assetType,
            attributesJson: d.attributesJson,
            attributes: d.attributes,
            allKeys: Object.keys(d),
          });
        });
      }
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

  const formatDateShort = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    const day = `${d.getDate()}`.padStart(2, "0");
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const resolveField = (obj: any, keys: string[], yesNo = false, skipSerialNumber = false) => {
    const tryVal = (v: any) => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === 'object') return JSON.stringify(v);
      const s = String(v).trim();
      if (!s) return undefined;
      if (yesNo) {
        const low = s.toLowerCase();
        if (v === true || low === 'si' || low === 'sí' || low === 'true' || low === 'yes') return 'Sí';
        if (v === false || low === 'no' || low === 'false') return 'No';
        return s;
      }
      return s;
    };

    // 1) revisar en attributesJson primero (más importante)
    const attrs = obj?.attributesJson || obj?.attributes || {};
    console.log(`[resolveField] Looking for ${keys.join(', ')} in attrs:`, attrs);
    for (const k of keys) {
      const val = tryVal(attrs?.[k]);
      if (val !== undefined) {
        console.debug(`Found ${k} in attributesJson:`, val);
        return val;
      }
    }
    
    // 2) revisar en el objeto plano (pero evitar serialNumber para IMEI si se indica)
    for (const k of keys) {
      if (skipSerialNumber && k === 'serialNumber') continue;
      const val = tryVal(obj?.[k]);
      if (val !== undefined) {
        console.debug(`Found ${k} in object:`, val);
        return val;
      }
    }
    
    // 3) casos anidados comunes (storage.capacity)
    const storage = attrs?.storage || obj?.storage;
    if (storage && keys.some((k) => ['storage', 'almacenamiento', 'disk', 'ssd', 'hdd'].includes(k))) {
      const capacity = storage.capacity ?? storage.size ?? storage.total;
      const type = storage.type ?? storage.kind;
      const capStr = capacity !== undefined ? String(capacity) : undefined;
      const typeStr = type !== undefined ? String(type) : undefined;
      if (capStr || typeStr) {
        const result = [typeStr, capStr].filter(Boolean).join(' ');
        console.debug(`Found storage nested:`, result);
        return result;
      }
    }
    
    console.debug(`Not found: ${keys.join(', ')} - returning "-"`);
    return '-';
  };

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
      const logoHeight = 16;
      doc.addImage(logoUrl, "PNG", (pageWidth - logoWidth) / 2, 8, logoWidth, logoHeight);
    };

    const addFooterToAllPages = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        const footerText = `QUITO – QUITO SUR – GUAYAQUIL – CUENCA – MANTA – MACHALA – AMBATO - STO. DOMINGO – LOJA – IBARRA - EXPRESS SANGOLQUI – CARAPUNGO – PORTOVIEJO\nwww.recursos-tecnologicos.com\nTeléfono: PBX 593 – 02 5133453`;
        const splitFooter = doc.splitTextToSize(footerText, 180);
        doc.text(splitFooter, pageWidth / 2, pageHeight - 15, { align: "center" });

        doc.setTextColor(200, 200, 200);
        doc.setFont("helvetica", "italic");
        doc.text(`Generado por: ${generatedBy}`, 15, pageHeight - 8);
        doc.setTextColor(0, 0, 0);

        doc.setFontSize(7);
        doc.text(`${i}/${totalPages}`, pageWidth - 15, pageHeight - 8, { align: "right" });
      }
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

    // Tabla de equipos (más compacta)
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

    let currentY = 75;

    // Cuadros de detalles por dispositivo (AQUI, ANTES DE OBSERVACIONES)
    const drawDeviceDetailBox = (d: any, idx: number) => {
      const typeLabel = d.assetType || d.type || "-";
      const detailLineHeight = 3.5;
      const baseLines = [
        `Tipo: ${typeLabel}`,
        `Marca: ${d.brand || "-"}`,
        `Modelo: ${d.model || "-"}`,
        `Serial: ${d.serialNumber || "-"}`,
      ];

      const isLaptop = /laptop|notebook|ultrabook/i.test(typeLabel);
      const isSmartphone = /smartphone|cellphone|phone|celular/i.test(typeLabel);
      const isDesktop = /desktop|pc|computadora/i.test(typeLabel);
      const isIPPhone = /ip-phone|ipphone|teléfono ip|telefono ip/i.test(typeLabel);
      const isPrinter = /printer|impresora/i.test(typeLabel);
      const laptopLines = isLaptop
        ? [
            `Procesador: ${resolveField(d, ["cpu", "processor", "procesador"])}`,
            `RAM (GB): ${resolveField(d, ["ram", "memory", "memoria"])}`,
            `Almacenamiento (GB): ${resolveField(d, ["storage", "almacenamiento", "ssd", "hdd", "disk"])}`,
            `Cargador: ${resolveField(d, ["hasCharger", "chargerIncluded", "charger", "cargador"], true)}`,
            `Maletín: ${resolveField(d, ["hasBag", "bagIncluded", "bag", "maletin"], true)}`,
            `Mouse: ${resolveField(d, ["hasMouse", "mouse"], true)}`,
            `Mouse Pad: ${resolveField(d, ["hasMousePad", "mousePad"], true)}`,
            `Teclado: ${resolveField(d, ["hasKeyboard", "keyboard"], true)}`,
            `Soporte: ${resolveField(d, ["hasStand", "stand", "soporte"], true)}`,
            `Adaptador de Red: ${resolveField(d, ["hasNetworkAdapter", "networkAdapter"], true)}`,
            `Adaptador de Memoria: ${resolveField(d, ["hasMemoryAdapter", "memoryAdapter"], true)}`,
            `Pantalla(s) Externa(s): ${resolveField(d, ["hasScreen", "screen", "pantalla"], true)}`,
            ...(resolveField(d, ["hasScreen", "screen"], true) === 'Sí' ? [`Cantidad de Pantallas: ${resolveField(d, ["screenCount", "screens"])}`] : []),
            `HUB: ${resolveField(d, ["hasHub", "hub"], true)}`,
          ]
        : [];

      const phoneLines = isSmartphone
        ? [
            `Procesador: ${resolveField(d, ["cpu", "processor", "chip"])}`,
            `RAM (GB): ${resolveField(d, ["ram", "memory"])}`,
            `Almacenamiento (GB): ${resolveField(d, ["storage", "almacenamiento"])}`,
            `IMEI: ${resolveField(d, ["imei", "imei1"], false, true)}`,
            `Cargador: ${resolveField(d, ["hasCharger", "chargerIncluded", "charger"], true)}`,
            `Funda/Case: ${resolveField(d, ["hasCase", "case", "hasBag", "bagIncluded"], true)}`,
            `Mica/Protector: ${resolveField(d, ["hasScreenProtector", "screenProtector", "mica"], true)}`,
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
            ...(resolveField(d, ["hasScreen", "screen"], true) === 'Sí' ? [`Cantidad de Pantallas: ${resolveField(d, ["screenCount", "screens"])}`] : []),
            `HUB: ${resolveField(d, ["hasHub", "hub"], true)}`,
            `Cable de Poder: ${resolveField(d, ["hasPowerCable", "powerCable"], true)}`,
          ]
        : [];

      const ipPhoneLines = isIPPhone
        ? [
            `Número: ${resolveField(d, ["phoneNumber", "number", "extension"])}`,
            `Cargador: ${resolveField(d, ["hasCharger", "chargerIncluded", "charger"], true)}`,
          ]
        : [];

      const printerLines = isPrinter
        ? [
            `Tipo: ${resolveField(d, ["printerType", "tipo"])}`,
            `Conexión: ${resolveField(d, ["connectionType", "connection"])}`,
            `IP: ${resolveField(d, ["ipAddress", "ip"])}`,
            `Escáner: ${resolveField(d, ["hasScanner", "scanner"], true)}`,
            `Imprime a Color: ${resolveField(d, ["colorPrinting", "color"], true)}`,
            `Cable de Poder: ${resolveField(d, ["hasPowerCable", "powerCable"], true)}`,
            `Cable USB: ${resolveField(d, ["hasUSBCable", "usbCable"], true)}`,
          ]
        : [];

      const allLines = [...baseLines, ...laptopLines, ...phoneLines, ...desktopLines, ...ipPhoneLines, ...printerLines];
      
      // Filtrar solo las líneas que tienen datos (no vacías ni "No")
      const filteredLines = allLines.filter(line => {
        // Eliminar líneas que terminan en ": -" o que son ": No"
        if (line.includes(': -')) return false;
        if (line.endsWith(': No')) return false;
        return true;
      });
      
      // Si no hay atributos específicos (solo quedan las baseLines), mostrar mensaje
      let displayLines = filteredLines;
      if (filteredLines.length <= 5) {
        displayLines = [
          ...baseLines.filter(l => !l.includes(': -')),
          `[Sin atributos específicos registrados]`
        ];
      }
      
      // Dividir en dos columnas para mejor presentación
      const itemsPerCol = Math.ceil(displayLines.length / 2);
      const leftCol = displayLines.slice(0, itemsPerCol);
      const rightCol = displayLines.slice(itemsPerCol);
      
      const maxRows = Math.max(leftCol.length, rightCol.length);
      const boxHeight = 11 + maxRows * detailLineHeight + 5;
      
      if (currentY + boxHeight > pageHeight - 50) {
        doc.addPage();
        addHeader();
        currentY = 40;
      }
      
      // Caja con fondo y bordes mejorados
      doc.setFillColor(248, 250, 252);
      doc.rect(12, currentY, pageWidth - 24, boxHeight, 'F');
      
      // Borde principal azul más grueso
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(1.2);
      doc.rect(12, currentY, pageWidth - 24, boxHeight);
      
      // Título con fondo azul más oscuro
      doc.setFillColor(31, 110, 170);
      doc.rect(12, currentY, pageWidth - 24, 10, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      const titleText = `DISPOSITIVO #${idx + 1} — ${d.code || "SIN-CODIGO"} | ${typeLabel.toUpperCase()}`;
      doc.text(titleText, 16, currentY + 6.5);
      
      // Línea separadora debajo del título
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.5);
      doc.line(12, currentY + 10, pageWidth - 12, currentY + 10);
      
      // Contenido en dos columnas
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      
      const colWidth = (pageWidth - 48) / 2;
      const midPageX = 12 + colWidth + 12;
      let ly = currentY + 13;
      
      for (let i = 0; i < maxRows; i++) {
        // Columna izquierda
        if (leftCol[i]) {
          const wrapped = doc.splitTextToSize(leftCol[i], colWidth - 2);
          doc.text(wrapped, 16, ly);
        }
        // Línea separadora vertical
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(midPageX - 6, currentY + 10, midPageX - 6, ly + 2);
        
        // Columna derecha
        if (rightCol[i]) {
          const wrapped = doc.splitTextToSize(rightCol[i], colWidth - 2);
          doc.text(wrapped, midPageX, ly);
        }
        ly += detailLineHeight;
      }
      
      currentY += boxHeight + 6;
    };

    (user.devices || []).forEach((d: any, idx: number) => drawDeviceDetailBox(d, idx));

    // Observaciones después de los cuadros
    if (currentY > pageHeight - 60) {
      doc.addPage();
      addHeader();
      currentY = 40;
    }
    
    currentY += 2;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones:", 15, currentY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitObs = doc.splitTextToSize(observations, 180);
    doc.text(splitObs, 15, currentY + 5);
    currentY += splitObs.length * 4 + 6;

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
        currentY += 4;
      }
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(section.content, 180);
      doc.text(splitText, 15, currentY);
      currentY += splitText.length * 4 + 3;
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
      currentY += splitItem.length * 4 + 2;
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
    currentY += splitRobo.length * 4 + 4;

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
      currentY += splitItem.length * 4 + 3;
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
      currentY += splitText.length * 4 + 4;
    });

    // ===== PÁGINA FINAL: Logo, ACEPTACION EXPRESA y firmas =====
    if (currentY > pageHeight - 120) {
      doc.addPage();
      addHeader();
      currentY = 55;
    } else {
      currentY += 10;
    }

    // Título ACEPTACION EXPRESA - Tamaño mediano en negrita
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ACEPTACION EXPRESA", 15, currentY);
    currentY += 8;

    // Texto de aceptación
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const acceptanceText = `Yo, ___________________________________________, portador(a) de la cédula de identidad No. ________________________, declaro haber recibido a conformidad los equipos tecnológicos detallados anteriormente. Me comprometo a hacer uso adecuado de los mismos, conforme a las políticas y directrices establecidas por la empresa, y acepto expresamente que, en caso de pérdida, daño o robo atribuible a mi responsabilidad, se realicen los descuentos correspondientes a través de mi rol de pagos, o en su defecto, de mi liquidación final en caso de terminación de la relación laboral.`;
    
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
    
    // Nombre dinámico del usuario que generó el reporte
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const generatedUserName = currentUser?.firstName && currentUser?.lastName 
      ? `${currentUser.firstName} ${currentUser.lastName}`.toUpperCase() 
      : "ADMINISTRADOR";
    const generatedUserCI = currentUser?.nationalId || "N/A";
    doc.text(generatedUserName, rightColX, lineY1 - 2);
    doc.text("Nombre completo del responsable de entrega", rightColX, lineY1 + 4);
    
    // C.I. del usuario que generó el reporte
    doc.text(`C.I.: ${generatedUserCI}`, rightColX, lineY2);
    
    // Línea para Firma (vacía)
    doc.text("Firma: ", rightColX, lineY3);
    doc.line(rightColX + 12, lineY3, rightColX + colWidth, lineY3);
    
    // Fecha actual (se llena automáticamente)
    doc.text(`Fecha: ${today.toLocaleDateString("es-ES")}`, rightColX, lineY4);

    // Pie de página en todas las páginas
    addFooterToAllPages();

    doc.save(`Acta_${user.userName?.replace(/\s+/g, "_")}_${today.getFullYear()}.pdf`);
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
