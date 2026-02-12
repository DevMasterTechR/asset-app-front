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
import { assignmentsApi } from "@/api/assignments";

interface GenerateActaRecepcionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onActaGenerated?: () => void;
}

const GenerateActaRecepcionModal = ({ open, onOpenChange, user, onActaGenerated }: GenerateActaRecepcionModalProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [observations, setObservations] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Las observaciones de recepción se ingresan manualmente
  // ya que describen el estado en que se recibe el equipo
  useEffect(() => {
    if (open) {
      setObservations("");
    }
  }, [open]);

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

  const resolveField = (obj: any, keys: string[], yesNo = false, skipSerialNumber = false) => {
    const tryVal = (v: any) => {
      if (v === undefined || v === null) return undefined;
      if (Array.isArray(v)) {
        const filtered = v.filter((item: any) => item !== null && item !== undefined && String(item).trim() !== '');
        if (filtered.length === 0) return undefined;
        return filtered.join(', ');
      }
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

    const attrs = obj?.attributesJson || obj?.attributes || {};
    for (const k of keys) {
      const val = tryVal(attrs?.[k]);
      if (val !== undefined) return val;
    }
    
    for (const k of keys) {
      if (skipSerialNumber && k === 'serialNumber') continue;
      const val = tryVal(obj?.[k]);
      if (val !== undefined) return val;
    }
    
    const storage = attrs?.storage || obj?.storage;
    if (storage && keys.some((k) => ['storage', 'almacenamiento', 'disk', 'ssd', 'hdd'].includes(k))) {
      const capacity = storage.capacity ?? storage.size ?? storage.total;
      const type = storage.type ?? storage.kind;
      const capStr = capacity !== undefined ? String(capacity) : undefined;
      const typeStr = type !== undefined ? String(type) : undefined;
      if (capStr || typeStr) {
        return [typeStr, capStr].filter(Boolean).join(' ');
      }
    }
    
    return '-';
  };

  const handleGeneratePDF = async () => {
    // Las observaciones ahora pueden estar vacías, se rellenarán con "Ninguna" automáticamente
    const finalObservations = observations && observations.trim() ? observations : "Ninguna";

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoUrl = "/images/techinformeencabezado.png";

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

    // Logo centrado
    addHeader();

    // Fecha a la derecha debajo del logo
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Quito, ${formattedDate}`, pageWidth - 15, 32, { align: "right" });

    // Título - ACTA DE RECEPCIÓN
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ACTA RECEPCIÓN DE EQUIPOS", pageWidth / 2, 40, { align: "center" });

    // Datos quemados del suscrito (responsable de TechResources)
    const subscriberName = "MORETA PAEZ GALO ANIBAL";
    const subscriberCI = "1723563480";
    
    // Datos del colaborador (quien entrega los equipos)
    const collaboratorName = user.userName?.toUpperCase() || "DESCONOCIDO";
    const collaboratorCI = user.nationalId || "No especificado";

    // Párrafo introductorio - usando splitTextToSize para respetar márgenes
    doc.setFontSize(8);
    const marginLeft = 15;
    const marginRight = 15;
    const maxWidth = pageWidth - marginLeft - marginRight;
    
    // Construir el párrafo completo como texto plano para calcular líneas
    const fullIntroText = `En la ciudad de Quito, en fecha ${formattedDate}, el suscrito ${subscriberName}, portador de la cédula de identidad N.° ${subscriberCI}, declara haber recibido a satisfacción los siguientes equipos tecnológicos de ${collaboratorName} con cédula de identidad N.° ${collaboratorCI}, propiedad de la empresa TechResources, conforme al acta de entrega emitida por la misma.`;
    
    // Dividir en líneas que respeten el margen
    doc.setFont("helvetica", "normal");
    const introLines = doc.splitTextToSize(fullIntroText, maxWidth);
    
    // Dibujar cada línea aplicando negritas donde corresponde
    let lineY = 47;
    for (const line of introLines) {
      let xPos = marginLeft;
      
      // Buscar patrones para aplicar negritas
      const patterns = [
        { text: subscriberName, bold: true },
        { text: subscriberCI, bold: true },
        { text: collaboratorName, bold: true },
      ];
      
      let remainingText = line;
      while (remainingText.length > 0) {
        let foundPattern = false;
        
        for (const pattern of patterns) {
          if (remainingText.startsWith(pattern.text)) {
            doc.setFont("helvetica", pattern.bold ? "bold" : "normal");
            doc.text(pattern.text, xPos, lineY);
            xPos += doc.getTextWidth(pattern.text);
            remainingText = remainingText.substring(pattern.text.length);
            foundPattern = true;
            break;
          }
        }
        
        if (!foundPattern) {
          // Buscar hasta el próximo patrón o fin de línea
          let nextPatternIndex = remainingText.length;
          for (const pattern of patterns) {
            const idx = remainingText.indexOf(pattern.text);
            if (idx > 0 && idx < nextPatternIndex) {
              nextPatternIndex = idx;
            }
          }
          
          const normalText = remainingText.substring(0, nextPatternIndex);
          doc.setFont("helvetica", "normal");
          doc.text(normalText, xPos, lineY);
          xPos += doc.getTextWidth(normalText);
          remainingText = remainingText.substring(nextPatternIndex);
        }
      }
      
      lineY += 4;
    }

    let currentY = lineY + 3;

    // Título "Detalle de los equipos:"
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de los equipos:", 15, currentY);
    currentY += 6;

    // Cuadros de detalles por dispositivo
    const boxWidth = (pageWidth - 30) / 2;
    const boxMargin = 6;

    const getDeviceLines = (d: any) => {
      const typeLabel = d.assetType || d.type || "-";
      const baseLines = [
        `Tipo: ${typeLabel}`,
        `Marca: ${d.brand || "-"}`,
        `Modelo: ${d.model || "-"}`,
        `Serial: ${d.serialNumber || "-"}`,
      ];

      const isLaptop = /laptop|notebook|ultrabook/i.test(typeLabel);
      const isCelular = /celular|cellphone|móvil|tablet/i.test(typeLabel);
      const isDesktop = /desktop|pc|computadora/i.test(typeLabel);
      const isIPPhone = /ip-phone|ipphone|teléfono ip|telefono ip/i.test(typeLabel);
      const isPrinter = /printer|impresora/i.test(typeLabel);
      const isMonitor = /monitor/i.test(typeLabel);
      const isTablet = /tablet/i.test(typeLabel);
      
      const purchaseDateValue = d?.purchaseDate || d?.attributesJson?.purchaseDate;
      const purchaseYear = purchaseDateValue ? new Date(purchaseDateValue).getFullYear() : '-';
      
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
            ...(resolveField(d, ["hasScreen", "screen"], true) === 'Sí' ? [`Cantidad de Pantallas: ${resolveField(d, ["screenCount", "screens"])}`] : []),
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

      // Cables de carga
      const isCargaCable = /cable-carga|cable carga|charging cable|charging.cable/i.test(typeLabel);
      const cableLines = isCargaCable
        ? [
            `Color: ${resolveField(d, ["color"])}`,
            `Longitud (cm): ${resolveField(d, ["length", "longitud"])}`,
            `Tipo de Conector: ${resolveField(d, ["connectorType", "connector", "tipoConector"])}`,
          ]
        : [];

      // Soportes
      const isSoporte = /soporte|stand|support/i.test(typeLabel);
      const soporteLines = isSoporte
        ? [
            `Material: ${resolveField(d, ["material"])}`,
            `Color: ${resolveField(d, ["color"])}`,
          ]
        : [];

      // Mousepad
      const isMousepad = /mousepad|mouse pad/i.test(typeLabel);
      const mousepadLines = isMousepad
        ? [
            `Color: ${resolveField(d, ["color"])}`,
          ]
        : [];

      // Hub
      const isHub = /hub/i.test(typeLabel);
      const hubLines = isHub
        ? [
            `Modelo: ${resolveField(d, ["model"])}`,
            `Tipo de Conexión: ${resolveField(d, ["connectionType", "connection"])}`,
          ]
        : [];

      // Adaptador de Memoria
      const isAdapterMemory = /adaptador-memoria|memory adapter|adaptador memoria/i.test(typeLabel);
      const adapterMemoryLines = isAdapterMemory
        ? [
            `Color: ${resolveField(d, ["color"])}`,
            `Tipo de Conexión: ${resolveField(d, ["connectionType", "connection"])}`,
          ]
        : [];

      // Adaptador de Red
      const isAdapterNetwork = /adaptador-red|network adapter|adaptador red/i.test(typeLabel);
      const adapterNetworkLines = isAdapterNetwork
        ? [
            `Color: ${resolveField(d, ["color"])}`,
            `Tipo de Conexión: ${resolveField(d, ["connectionType", "connection"])}`,
          ]
        : [];

      // Cargador Laptop
      const isChargerLaptop = /cargador-laptop|cargador laptop|laptop charger/i.test(typeLabel);
      const chargerLaptopLines = isChargerLaptop
        ? [
            `Potencia (W): ${resolveField(d, ["wattage"])}`,
            `Tipo de Conector: ${resolveField(d, ["connectorType", "connector"])}`,
          ]
        : [];

      // Cargador Celular
      const isChargerCell = /cargador-celular|cargador celular|cell charger|celular charger/i.test(typeLabel);
      const chargerCellLines = isChargerCell
        ? [
            `Potencia (W): ${resolveField(d, ["wattage"])}`,
            `Tipo de Conector: ${resolveField(d, ["connectorType", "connector"])}`,
          ]
        : [];
      // Mouse
      const isMouse = /mouse|ratón|raton/i.test(typeLabel);
      const mouseLines = isMouse
        ? [
            `Color: ${resolveField(d, ["color"])}`,
            `Tipo de Conexión: ${resolveField(d, ["connectionType", "connection"])}`,
          ]
        : [];

      // Teclado
      const isTeclado = /teclado|keyboard/i.test(typeLabel);
      const tecladoLines = isTeclado
        ? [
            `Color: ${resolveField(d, ["color"])}`,
            `Tipo de Conexión: ${resolveField(d, ["connectionType", "connection"])}`,
          ]
        : [];

      // Monitor
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

      // Tablet (similar a celular pero con menos campos)
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
      const allLines = [...baseLines, ...laptopLines, ...phoneLines, ...desktopLines, ...ipPhoneLines, ...printerLines, ...cableLines, ...soporteLines, ...mousepadLines, ...hubLines, ...adapterMemoryLines, ...adapterNetworkLines, ...chargerLaptopLines, ...chargerCellLines, ...mouseLines, ...tecladoLines, ...monitorLines, ...tabletLines];
      
      // Separar baseLines de atributos específicos
      const baseLineCount = baseLines.length;
      const specificAttributeLines = allLines.filter((_, idx) => idx >= baseLineCount);
      
      // Filtrar solo las líneas específicas que tienen datos (no vacías ni "No")
      const filteredSpecificLines = specificAttributeLines.filter(line => {
        // Eliminar líneas que terminan en ": -" o que son ": No"
        if (line.includes(': -')) return false;
        if (line.endsWith(': No')) return false;
        return true;
      });
      
      // Las baseLines siempre se muestran (sin filtrado)
      const baseLinesToShow = baseLines.filter(line => !line.includes(': -'));
      
      let displayLines = [...baseLinesToShow, ...filteredSpecificLines];
      
      // Si no hay atributos específicos después de baseLines, mostrar mensaje
      if (filteredSpecificLines.length === 0) {
        displayLines = [
          ...baseLinesToShow,
          `[Sin atributos específicos registrados]`
        ];
      }

      return { displayLines, typeLabel };
    };

    const drawDeviceDetailBox = (d: any, idx: number, xOffset: number, boxH: number) => {
      const { displayLines, typeLabel } = getDeviceLines(d);
      const detailLineHeight = 2.8;
      
      doc.setFillColor(248, 250, 252);
      doc.rect(xOffset, currentY, boxWidth, boxH, 'F');
      
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.8);
      doc.rect(xOffset, currentY, boxWidth, boxH);
      
      doc.setFillColor(31, 110, 170);
      doc.rect(xOffset, currentY, boxWidth, 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      const titleText = `${d.code || "SIN-CODIGO"} | ${typeLabel.toUpperCase()}`;
      doc.text(titleText, xOffset + 2, currentY + 4.5);
      
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.3);
      doc.line(xOffset, currentY + 7, xOffset + boxWidth, currentY + 7);
      
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
      return 8 + displayLines.length * detailLineHeight + 3;
    };

    // Dibujar dispositivos en pares
    // Orden: equipo general (laptop y accesorios) -> celular y accesorios -> otros (impresora, telefono IP, etc.)
    const devices = (() => {
      const original = Array.isArray(user.devices) ? [...user.devices] : [];
      const typeOf = (d: any) => String(d?.assetType || d?.type || '').toLowerCase();

      const isLaptop = (t: string) => /laptop|notebook|ultrabook|portatil|portátil/.test(t);
      const isLaptopCharger = (t: string) => /cargador-laptop|cargador laptop|laptop charger/.test(t);
      const isMouse = (t: string) => /mouse|ratón|raton/.test(t);
      const isTeclado = (t: string) => /teclado|keyboard/.test(t);
      const isMousepad = (t: string) => /mousepad|mouse pad/.test(t);
      const isAdapterMemory = (t: string) => /adaptador-memoria|memory adapter|adaptador memoria/.test(t);
      const isAdapterNetwork = (t: string) => /adaptador-red|network adapter|adaptador red/.test(t);
      const isHub = (t: string) => /hub/.test(t);
      const isSoporte = (t: string) => /soporte|stand|support/.test(t);

      const isCelular = (t: string) => /celular|cellphone|móvil|tablet/.test(t);
      const isCellCharger = (t: string) => /cargador-celular|cargador celular|cell charger/.test(t);
      const isChargingCable = (t: string) => /cable-carga|cable carga|charging cable/.test(t);

      const isPrinter = (t: string) => /printer|impresora/.test(t);
      const isIpPhone = (t: string) => /ip-phone|ipphone|teléfono ip|telefono ip/.test(t);

      const getPriority = (d: any) => {
        const t = typeOf(d);
        if (isLaptop(t)) return 10;
        if (isLaptopCharger(t)) return 20;
        if (isMouse(t)) return 30;
        if (isTeclado(t)) return 40;
        if (isMousepad(t)) return 50;
        if (isAdapterMemory(t)) return 60;
        if (isAdapterNetwork(t)) return 65;
        if (isHub(t)) return 70;
        if (isSoporte(t)) return 80;

        if (isCelular(t)) return 100;
        if (isCellCharger(t)) return 110;
        if (isChargingCable(t)) return 120;

        if (isPrinter(t)) return 200;
        if (isIpPhone(t)) return 210;

        return 900;
      };

      return original
        .map((d, idx) => ({ d, idx, priority: getPriority(d) }))
        .sort((a, b) => a.priority - b.priority || a.idx - b.idx)
        .map((item) => item.d);
    })();
    
    for (let i = 0; i < devices.length; i += 2) {
      const d1 = devices[i];
      const d2 = devices[i + 1];
      
      const height1 = calculateBoxHeight(d1);
      const height2 = d2 ? calculateBoxHeight(d2) : 0;
      const rowHeight = Math.max(height1, height2);
      
      if (currentY + rowHeight > pageHeight - 35) {
        doc.addPage();
        addHeader();
        currentY = 30;
      }
      
      drawDeviceDetailBox(d1, i, 12, rowHeight);
      
      if (d2) {
        drawDeviceDetailBox(d2, i + 1, 12 + boxWidth + boxMargin, rowHeight);
      }
      
      currentY += rowHeight + 4;
    }

    // Observaciones
    if (currentY > pageHeight - 40) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    
    currentY += 1;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones:", 15, currentY);
    
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const splitObs = doc.splitTextToSize(finalObservations, 180);
    doc.text(splitObs, 15, currentY + 4);
    currentY += splitObs.length * 4 + 10;

    // ===== SECCIÓN FINAL: firmas =====
    if (currentY > pageHeight - 50) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }

    // Sección de firmas - dos columnas
    const colWidth = (pageWidth - 30) / 2;
    const leftColX = 15;
    const rightColX = 15 + colWidth + 10;
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    
    // Columna izquierda: Aceptado por (el responsable de TechResources - datos quemados)
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Aceptado por:", leftColX, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const lineY1 = currentY + 10;
    
    // Nombre quemado del responsable de TechResources
    doc.text(subscriberName, leftColX, lineY1 - 2);
    doc.text("Nombre completo del responsable de entrega", leftColX, lineY1 + 3);
    
    // C.I. quemado del responsable
    const lineY2 = currentY + 18;
    doc.text(`C.I.: ${subscriberCI}`, leftColX, lineY2);
    
    // Línea para Firma
    const lineY3 = currentY + 28;
    doc.text("Firma: ", leftColX, lineY3);
    doc.line(leftColX + 10, lineY3, leftColX + colWidth, lineY3);
    
    // Fecha actual
    const lineY4 = currentY + 38;
    doc.text(`Fecha: ${today.toLocaleDateString("es-ES")}`, leftColX, lineY4);
    
    // Columna derecha: Entregado por (el colaborador - datos de la asignación con líneas)
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Entregado por:", rightColX, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    
    // Línea para nombre del colaborador
    doc.line(rightColX, lineY1, rightColX + colWidth, lineY1);
    doc.text("Nombre completo del colaborador", rightColX, lineY1 + 3);
    
    // C.I. del colaborador con línea
    doc.text("C.I.: ", rightColX, lineY2);
    doc.line(rightColX + 8, lineY2, rightColX + colWidth, lineY2);
    
    // Línea para Firma
    doc.text("Firma: ", rightColX, lineY3);
    doc.line(rightColX + 10, lineY3, rightColX + colWidth, lineY3);
    
    // Fecha vacía
    doc.text("Fecha: ____ / ____ / _______", rightColX, lineY4);

    addFooterToAllPages();

    // Nombre del archivo
    const userName = user.userName?.replace(/\s+/g, "_") || "Usuario";
    const userBranch = user.branch?.replace(/\s+/g, "_") || "SinSucursal";
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");
    const fileName = `Acta_Recepcion_${userName}_${userBranch}_${day}${month}${year}_${hours}${minutes}.pdf`;
    
    doc.save(fileName);

    // Actualizar el estado de acta recepción
    await updateDevicesActaRecepcionStatus();
  };

  const updateDevicesActaRecepcionStatus = async () => {
    if (!user?.devices || user.devices.length === 0) return;

    setIsUpdating(true);
    try {
      const updatePromises = user.devices.map((device: any) => {
        const assignmentId = device.assignmentId;
        if (!assignmentId) return Promise.resolve();
        return assignmentsApi.updateActaRecepcionStatus(String(assignmentId), 'acta_generada');
      });

      await Promise.all(updatePromises);

      toast({
        title: "Acta de recepción generada",
        description: "El estado de las asignaciones se actualizó a 'Acta generada'",
      });

      if (onActaGenerated) {
        onActaGenerated();
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error actualizando estado de acta de recepción:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el estado del acta de recepción",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar Acta de Recepción</DialogTitle>
          <DialogDescription>
            Completa la información y genera el acta de recepción para {user?.userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del usuario */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
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
            <h3 className="font-semibold mb-2">Equipos a Recibir</h3>
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
                    <th className="px-3 py-2 text-left">Observaciones</th>
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
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-[150px] truncate" title={d.deliveryNotes || "-"}>
                          {d.deliveryNotes || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-2 text-center text-muted-foreground">
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
              <span className="text-xs text-muted-foreground ml-2">(Describe el estado en que se reciben los equipos)</span>
            </Label>
            <Textarea
              id="observations"
              placeholder="Describe el estado en que se reciben los equipos, cualquier daño, faltante o novedad."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="min-h-20"
            />
          </div>

          {/* Generado por */}
          <div className="space-y-2">
            <Label htmlFor="generatedBy">Recibido por (Nombre de quien firma)</Label>
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

export default GenerateActaRecepcionModal;
