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

interface GenerateActaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onActaGenerated?: () => void;
}

const GenerateActaModal = ({ open, onOpenChange, user, onActaGenerated }: GenerateActaModalProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [observations, setObservations] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Generar observaciones dinámicas desde las notas de cada asignación
  const generateObservationsFromDevices = () => {
    if (!user?.devices || user.devices.length === 0) return "";
    
    // Filtrar solo las observaciones reales (no las automáticas)
    const notesPerDevice = user.devices
      .filter((d: any) => {
        const notes = d.deliveryNotes?.trim();
        if (!notes) return false;
        // Excluir notas automáticas
        const isAutomatic = /asignación automática/i.test(notes);
        return !isAutomatic;
      })
      .map((d: any) => d.deliveryNotes.trim());
    
    if (notesPerDevice.length === 0) return "";
    
    // Cada observación en una línea separada (sin código, sin espacio extra)
    return notesPerDevice.join("\n");
  };

  useEffect(() => {
    if (open) {
      // Generar observaciones dinámicas desde las notas de cada asignación
      const autoObservations = generateObservationsFromDevices();
      setObservations(autoObservations);
      
      console.log("Usuario en GenerateActaModal:", user);
      if (user?.devices) {
        console.log("Dispositivos:", user.devices);
        user.devices.forEach((d: any, idx: number) => {
          console.log(`Device ${idx}:`, {
            code: d.code,
            type: d.assetType,
            deliveryNotes: d.deliveryNotes,
            attributesJson: d.attributesJson,
            attributes: d.attributes,
            allKeys: Object.keys(d),
          });
        });
      }
    }
  }, [open, user]);

  const generatedBy = "MORETA PAEZ GALO ANIBAL";

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
      // Manejar arrays (como imeis)
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

  const handleGeneratePDF = async () => {
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
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Quito, ${formattedDate}`, pageWidth - 15, 32, { align: "right" });

    // Título (más cerca del logo)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ACTA DE ENTREGA DE EQUIPOS TECNOLÓGICOS", pageWidth / 2, 40, { align: "center" });

    // Datos dinámicos de quien genera la acta (el suscrito)
    const subscriberName = "MORETA PAEZ GALO ANIBAL";
    const subscriberCI = "1723563480";
    
    // Datos del colaborador (quien recibe)
    const collaboratorName = user.userName?.toUpperCase() || "DESCONOCIDO";
    const collaboratorCI = user.nationalId || "No especificado";

    // Párrafo introductorio completo con saltos de línea controlados
    doc.setFontSize(8);
    const maxWidth = pageWidth - 30; // Ancho máximo disponible
    let currentLineY = 47;
    let currentX = 15;
    
    // Función helper para escribir texto con control de ancho
    const writeText = (text: string, isBold: boolean = false) => {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const textWidth = doc.getTextWidth(text);
      
      // Si el texto se sale del margen, saltar a la siguiente línea
      if (currentX + textWidth > pageWidth - 15) {
        currentLineY += 4;
        currentX = 15;
      }
      
      doc.text(text, currentX, currentLineY);
      currentX += textWidth;
    };
    
    // Construir el párrafo parte por parte
    writeText(`En la ciudad de Quito, en fecha ${formattedDate}, el suscrito `);
    writeText(subscriberName, true);
    writeText(`, portador de la cédula de identidad N.° `);
    writeText(subscriberCI, true);
    writeText(` procede a entregar los siguientes equipos tecnológicos de propiedad de TechResources a  `);
    writeText(collaboratorName, true);
    writeText(` con cédula de identidad N.° `);
    writeText(collaboratorCI, true);
    writeText(` conforme al siguiente detalle:`);

    let currentY = currentLineY + 8;

    // Cuadros de detalles por dispositivo (AQUI, ANTES DE OBSERVACIONES)
    // Configuración para dos dispositivos por fila
    const boxWidth = (pageWidth - 30) / 2; // Ancho de cada caja (mitad de la página con margen)
    const boxMargin = 6; // Margen entre cajas

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
      // Obtener año de compra desde purchaseDate
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
      
      // Debug: mostrar en consola los datos del dispositivo
      console.log(`[getDeviceLines] Device ${d.code || d.assetCode}:`, {
        assetType: typeLabel,
        attributesJson: d.attributesJson,
        attributes: d.attributes,
        rawDevice: d,
        filteredSpecificLinesCount: filteredSpecificLines.length
      });
      
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
      
      // Caja con fondo y bordes mejorados
      doc.setFillColor(248, 250, 252);
      doc.rect(xOffset, currentY, boxWidth, boxH, 'F');
      
      // Borde principal azul más grueso
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.8);
      doc.rect(xOffset, currentY, boxWidth, boxH);
      
      // Título con fondo azul más oscuro
      doc.setFillColor(31, 110, 170);
      doc.rect(xOffset, currentY, boxWidth, 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      const titleText = `${d.code || "SIN-CODIGO"} | ${typeLabel.toUpperCase()}`;
      doc.text(titleText, xOffset + 2, currentY + 4.5);
      
      // Línea separadora debajo del título
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.3);
      doc.line(xOffset, currentY + 7, xOffset + boxWidth, currentY + 7);
      
      // Contenido en una sola columna (más compacto para el ancho reducido)
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

    // Calcular altura de cada caja basándose en su contenido
    const calculateBoxHeight = (d: any): number => {
      const { displayLines } = getDeviceLines(d);
      const detailLineHeight = 2.8;
      return 8 + displayLines.length * detailLineHeight + 3;
    };

    // Dibujar dispositivos en pares (dos por fila)
    // Laptop y Celular SIEMPRE en la primera fila (si existen), luego sus accesorios
    const devices = (() => {
      const original = Array.isArray(user.devices) ? [...user.devices] : [];
      const takeAndRemove = (arr: any[], predicate: (d: any) => boolean) => {
        const idx = arr.findIndex(predicate);
        if (idx === -1) return null;
        return arr.splice(idx, 1)[0];
      };

      const isLaptop = (d: any) => /laptop|notebook|ultrabook/i.test((d?.assetType || d?.type || '') as string);
      const isCelular = (d: any) => /celular|cellphone|móvil|tablet/i.test((d?.assetType || d?.type || '') as string);
      const isLaptopCharger = (d: any) => /cargador-laptop|cargador laptop|laptop charger/i.test((d?.assetType || d?.type || '') as string);
      const isMouse = (d: any) => /mouse|ratón|raton/i.test((d?.assetType || d?.type || '') as string);
      const isTeclado = (d: any) => /teclado|keyboard/i.test((d?.assetType || d?.type || '') as string);
      const isCellCharger = (d: any) => /cargador-celular|cargador celular|cell charger/i.test((d?.assetType || d?.type || '') as string);
      const isChargingCable = (d: any) => /cable-carga|cable carga|charging cable/i.test((d?.assetType || d?.type || '') as string);

      const laptop = takeAndRemove(original, isLaptop);
      const celular = takeAndRemove(original, isCelular);

      const result = [];
      // Agregar Laptop y Celular PRIMERO (para la primera fila)
      if (laptop) result.push(laptop);
      if (celular) result.push(celular);
      
      // Agregar accesorios del laptop DESPUÉS de la primera fila
      if (laptop) {
        while (true) {
          const charger = takeAndRemove(original, isLaptopCharger);
          if (charger) result.push(charger);
          else break;
        }
        while (true) {
          const mouse = takeAndRemove(original, isMouse);
          if (mouse) result.push(mouse);
          else break;
        }
        while (true) {
          const teclado = takeAndRemove(original, isTeclado);
          if (teclado) result.push(teclado);
          else break;
        }
      }
      
      // Agregar accesorios del celular DESPUÉS
      if (celular) {
        while (true) {
          const charger = takeAndRemove(original, isCellCharger);
          if (charger) result.push(charger);
          else break;
        }
        while (true) {
          const cable = takeAndRemove(original, isChargingCable);
          if (cable) result.push(cable);
          else break;
        }
      }

      return [...result, ...original];
    })();

    for (let i = 0; i < devices.length; i += 2) {
      const d1 = devices[i];
      const d2 = devices[i + 1];
      
      const height1 = calculateBoxHeight(d1);
      const height2 = d2 ? calculateBoxHeight(d2) : 0;
      const rowHeight = Math.max(height1, height2);
      
      // Verificar si cabe en la página
      if (currentY + rowHeight > pageHeight - 35) {
        doc.addPage();
        addHeader();
        currentY = 30;
      }
      
      // Dibujar primer dispositivo (columna izquierda)
      drawDeviceDetailBox(d1, i, 12, rowHeight);
      
      // Dibujar segundo dispositivo (columna derecha) si existe
      if (d2) {
        drawDeviceDetailBox(d2, i + 1, 12 + boxWidth + boxMargin, rowHeight);
      }
      
      currentY += rowHeight + 4;
    }

    // Observaciones después de los cuadros
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
    const splitObs = doc.splitTextToSize(observations, 180);
    doc.text(splitObs, 15, currentY + 4);
    currentY += splitObs.length * 4 + 6; // Separación de 6 puntos después de observaciones

    // Texto legal estructurado en múltiples párrafos
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");

    // Primer párrafo: responsabilidad y reporte
    const legalText1 = `El receptor de los equipos tecnológicos (en adelante, el/la/los/las colaboradores) es responsable de su uso adecuado y del mantenimiento en condiciones óptimas, conforme a las instrucciones y políticas establecidas por la empresa.`;

    const splitLegal1 = doc.splitTextToSize(legalText1, 180);
    
    if (currentY + splitLegal1.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    
    doc.text(splitLegal1, 15, currentY);
    currentY += splitLegal1.length * 4 + 2;

    // Segundo párrafo: reporte de incidentes
    doc.setFont("helvetica", "normal");
    const legalText2 = `Será responsabilidad de el/la/los/las colaborador/es/as reportar de manera inmediata cualquier daño, falla, pérdida o incidente que afecte el funcionamiento del equipo, mediante correo electrónico dirigido al Departamento de Tecnología a la dirección`;

    const splitLegal2 = doc.splitTextToSize(legalText2, 180);
    
    if (currentY + splitLegal2.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    
    doc.text(splitLegal2, 15, currentY);
    currentY += splitLegal2.length * 4;

    // Correo en negritas
    doc.setFont("helvetica", "bold");
    doc.text("dep-sistemas@recursos-tecnologicos.com.", 15, currentY);
    doc.setFont("helvetica", "normal");  // Restaurar fuente normal
    currentY += 4;

    // Segundo párrafo: Se considera mal uso con letras a) a g)
    doc.setFont("helvetica", "normal");
    const malUsoText = `Se considera mal uso:
a) Manipulación indebida de componentes internos.
b) Instalación de software no autorizado.
c) Uso en condiciones ambientales inadecuadas.
d) Derrame de líquidos.
e) Uso de fuerza excesiva.
f) Golpes, caídas o impactos por descuido.
g) Modificación física sin autorización.`;

    const splitMalUso = doc.splitTextToSize(malUsoText, 180);
    
    if (currentY + splitMalUso.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    
    doc.text(splitMalUso, 15, currentY);
    currentY += splitMalUso.length * 4 + 2;

    // Tercer párrafo: En caso de robo con puntos
    const roboText = `En caso de robo, el colaborador deberá presentar denuncia ante las autoridades:
• Si la denuncia es presentada y el procesador del equipo tiene hasta 5 años de vigencia, el costo de reposición será 50% colaborador y 50% empresa.
• Si el procesador del equipo tiene más de 5 años de vigencia, la empresa asume el 100% del costo.
• Si el usuario no presenta denuncia, el colaborador asume el 100% del costo de reposición.`;

    const splitRobo = doc.splitTextToSize(roboText, 180);
    
    if (currentY + splitRobo.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    
    doc.text(splitRobo, 15, currentY);
    currentY += splitRobo.length * 4 + 4;

    // Nota sobre mouse y teclado
    if (currentY > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    
    doc.setFontSize(8);
    
    // Escribir "Nota:" en negritas
    doc.setFont("helvetica", "bold");
    const notaLabel = "Nota: ";
    doc.text(notaLabel, 15, currentY);
    const notaLabelWidth = doc.getTextWidth(notaLabel);
    
    // Texto normal después de "Nota:"
    doc.setFont("helvetica", "normal");
    const notaPart1 = "El mouse y el teclado se entregan nuevos, en óptimas condiciones y debidamente probados. Cualquier daño o pérdida será responsabilidad del colaborador, quien deberá asumir el ";
    const notaPart2Bold = "100% del costo de reposición.";
    
    // Calcular el ancho disponible para la primera parte (después de "Nota: ")
    const notaAvailableWidth = pageWidth - 15 - notaLabelWidth - 15;
    const notaPart1Lines = doc.splitTextToSize(notaPart1, notaAvailableWidth);
    
    // Primera línea va junto a "Nota:"
    doc.text(notaPart1Lines[0], 15 + notaLabelWidth, currentY);
    let notaY = currentY + 4;
    
    // Resto de líneas van al margen izquierdo
    for (let i = 1; i < notaPart1Lines.length; i++) {
      doc.text(notaPart1Lines[i], 15, notaY);
      notaY += 4;
    }
    
    // Calcular si el texto bold cabe en la última línea
    const lastLineText = notaPart1Lines[notaPart1Lines.length - 1] || "";
    const lastLineWidth = doc.getTextWidth(lastLineText);
    doc.setFont("helvetica", "bold");
    const boldPartWidth = doc.getTextWidth(notaPart2Bold);
    
    // Si cabe en la misma línea, ponerlo ahí
    const startX = notaPart1Lines.length === 1 ? 15 + notaLabelWidth + lastLineWidth : 15 + lastLineWidth;
    if (startX + boldPartWidth < pageWidth - 15) {
      doc.text(notaPart2Bold, startX + 1, notaY - 4);
    } else {
      // Si no cabe, ponerlo en nueva línea
      doc.text(notaPart2Bold, 15, notaY);
      notaY += 4;
    }
    
    doc.setFont("helvetica", "normal");
    currentY = notaY + 6;

    // Cuarto párrafo: Costo de reposición (sin negritas)
    doc.setFont("helvetica", "normal");
    const costoText = `El costo de reposición se calculará en función del valor comercial actual de un equipo de características equivalentes al entregado.`;

    const splitCosto = doc.splitTextToSize(costoText, 180);
    
    if (currentY + splitCosto.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    
    doc.text(splitCosto, 15, currentY);
    currentY += splitCosto.length * 4 + 2;

    // Quinto párrafo: Valores de reposición sin negritas
    doc.setFont("helvetica", "normal");
    const valoresText = `El costo se calcula según el valor comercial actual de un equipo equivalente. Los valores de reposición o reparación serán descontados del rol de pagos o de la liquidación final.`;

    const splitValores = doc.splitTextToSize(valoresText, 180);
    
    if (currentY + splitValores.length * 4 > pageHeight - 30) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }
    
    doc.text(splitValores, 15, currentY);
    currentY += splitValores.length * 4 + 3;

    // ===== SECCIÓN FINAL: ACEPTACIÓN EXPRESA y firmas =====
    if (currentY > pageHeight - 50) {
      doc.addPage();
      addHeader();
      currentY = 35;
    }

    // Título ACEPTACION EXPRESA - Tamaño mediano en negrita
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ACEPTACIÓN EXPRESA", 15, currentY);
    currentY += 5;

    // Texto de aceptación más compacto
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    // Línea de firma más larga después de 'Yo,'
    const acceptanceText = `Yo, __________________________________________________________________________________, con C.I. No. ________________________, declaro haber recibido a conformidad los equipos tecnológicos detallados. Me comprometo a hacer uso adecuado de los mismos y acepto que, en caso de pérdida, daño o robo atribuible a mi responsabilidad, se realicen los descuentos correspondientes a través de mi rol de pagos o liquidación final.`;
    
    const splitAcceptance = doc.splitTextToSize(acceptanceText, 180);
    doc.text(splitAcceptance, 15, currentY);
    currentY += splitAcceptance.length * 2.5 + 8;

    // Sección de firmas en dos columnas más compacta
    const colWidth = (pageWidth - 30) / 2;
    const leftColX = 15;
    const rightColX = 15 + colWidth + 10;
    
    // Establecer color negro para las líneas de firma
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2); // Grosor más delgado para las líneas de firma
    
    // Columna izquierda: Aceptado por (quien recibe - el colaborador) - CON LÍNEAS PARA LLENAR
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Aceptado por:", leftColX, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const lineY1 = currentY + 10;
    
    // Línea para nombre
    doc.line(leftColX, lineY1, leftColX + colWidth, lineY1);
    doc.text("Nombre del colaborador", leftColX, lineY1 + 3);
    
    // Línea para C.I.
    const lineY2 = currentY + 18;
    doc.text("C.I.: ", leftColX, lineY2);
    doc.line(leftColX + 8, lineY2, leftColX + colWidth, lineY2);
    
    // Línea para Firma
    const lineY3 = currentY + 26;
    doc.text("Firma: ", leftColX, lineY3);
    doc.line(leftColX + 10, lineY3, leftColX + colWidth, lineY3);
    
    // Línea para Fecha
    const lineY4 = currentY + 34;
    doc.text("Fecha: ____ / ____ / _______", leftColX, lineY4);
    
    // Columna derecha: Entregado por (quien genera la acta)
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Entregado por:", rightColX, currentY);
    
    // Nombre de quien genera la acta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const generatedUserName = "MORETA PAEZ GALO ANIBAL";
    const generatedUserCI = "1723563480";
    doc.text(generatedUserName, rightColX, lineY1 - 2);
    doc.text("Nombre completo del responsable de entrega", rightColX, lineY1 + 3);
    
    // C.I. de quien genera la acta
    doc.text(`C.I.: ${generatedUserCI}`, rightColX, lineY2);
    
    // Línea para Firma
    doc.text("Firma: ", rightColX, lineY3);
    doc.line(rightColX + 10, lineY3, rightColX + colWidth, lineY3);
    
    // Fecha actual
    doc.text(`Fecha: ${today.toLocaleDateString("es-ES")}`, rightColX, lineY4);

    // Pie de página en todas las páginas
    addFooterToAllPages();

    // Formato del nombre del archivo: Acta_Entrega_NombreCompleto_Sucursal_DDMMYYYY_HHMM.pdf
    const userName = user.userName?.replace(/\s+/g, "_") || "Usuario";
    const userBranch = user.branch?.replace(/\s+/g, "_") || "SinSucursal";
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");
    const fileName = `Acta_Entrega_${userName}_${userBranch}_${day}${month}${year}_${hours}${minutes}.pdf`;
    
    doc.save(fileName);

    // Actualizar el estado de todos los dispositivos del usuario a "acta_generada"
    await updateDevicesActaStatus();
  };

  const updateDevicesActaStatus = async () => {
    if (!user?.devices || user.devices.length === 0) return;

    setIsUpdating(true);
    try {
      // Actualizar cada ASIGNACIÓN a "acta_generada" (actaStatus está en AssignmentHistory)
      const updatePromises = user.devices.map((device: any) => {
        const assignmentId = device.assignmentId;
        if (!assignmentId) return Promise.resolve();
        return assignmentsApi.updateActaStatus(String(assignmentId), 'acta_generada');
      });

      await Promise.all(updatePromises);

      toast({
        title: "Acta generada",
        description: "El estado de las asignaciones se actualizó a 'Acta generada'",
      });

      // Notificar al componente padre para recargar datos
      if (onActaGenerated) {
        onActaGenerated();
      }

      // Cerrar modal
      onOpenChange(false);
    } catch (error) {
      console.error('Error actualizando estado de acta:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de las asignaciones",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
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
              <span className="text-xs text-muted-foreground ml-2">(Se generan automáticamente desde las notas de cada asignación)</span>
            </Label>
            <Textarea
              id="observations"
              placeholder="Las observaciones se generan automáticamente desde las notas de cada asignación. Puedes editarlas si es necesario."
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
