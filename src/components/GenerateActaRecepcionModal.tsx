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

  // Generar observaciones dinámicas desde las notas de cada asignación
  const generateObservationsFromDevices = () => {
    if (!user?.devices || user.devices.length === 0) return "";
    
    const notesPerDevice = user.devices
      .filter((d: any) => {
        const notes = d.deliveryNotes?.trim();
        if (!notes) return false;
        const isAutomatic = /asignación automática/i.test(notes);
        return !isAutomatic;
      })
      .map((d: any) => d.deliveryNotes.trim());
    
    if (notesPerDevice.length === 0) return "";
    
    return notesPerDevice.join("\n");
  };

  useEffect(() => {
    if (open) {
      const autoObservations = generateObservationsFromDevices();
      setObservations(autoObservations);
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

    // Párrafo introductorio con formato similar al de la imagen
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const introText = ` En la ciudad de Quito, en fecha ${formattedDate}, el suscrito `;
    doc.text(introText, 15, 47);
    
    // Nombre del suscrito en negritas con espacio antes
    let textWidth = doc.getTextWidth(introText);
    doc.setFont("helvetica", "bold");
    doc.text(` ${subscriberName}`, 15 + textWidth, 47);
    textWidth += doc.getTextWidth(` ${subscriberName}`);
    
    doc.setFont("helvetica", "normal");
    const introText2 = `, portador de la cédula de identidad N.° `;
    doc.text(introText2, 15 + textWidth, 47);
    textWidth += doc.getTextWidth(introText2);
    
    doc.setFont("helvetica", "bold");
    doc.text(subscriberCI, 15 + textWidth, 47);
    
    // Segunda línea del párrafo
    doc.setFont("helvetica", "normal");
    const introLine2 = `declara haber recibido a satisfacción los siguientes equipos tecnológicos de `;
    doc.text(introLine2, 15, 51);
    textWidth = doc.getTextWidth(introLine2);
    
    doc.setFont("helvetica", "bold");
    doc.text(` ${collaboratorName}`, 15 + textWidth, 51);
    
    // Tercera línea
    doc.setFont("helvetica", "normal");
    const introLine3 = `con cédula de identidad N.° ${collaboratorCI}, propiedad de la empresa TechResources, conforme al acta de entrega`;
    const splitLine3 = doc.splitTextToSize(introLine3, 180);
    doc.text(splitLine3, 15, 55);
    
    doc.text("emitida por la misma.", 15, 59);

    let currentY = 67;

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
      const isCelular = /celular|cellphone|phone/i.test(typeLabel);
      const isDesktop = /desktop|pc|computadora/i.test(typeLabel);
      const isIPPhone = /ip-phone|ipphone|teléfono ip|telefono ip/i.test(typeLabel);
      const isPrinter = /printer|impresora/i.test(typeLabel);
      
      const purchaseDateValue = d?.purchaseDate || d?.attributesJson?.purchaseDate;
      const purchaseYear = purchaseDateValue ? new Date(purchaseDateValue).getFullYear() : '-';
      
      const laptopLines = isLaptop
        ? [
            `Procesador: ${resolveField(d, ["cpu", "processor", "procesador"])} - ${purchaseYear}`,
            `RAM (GB): ${resolveField(d, ["ram", "memory", "memoria"])}`,
            `Almacenamiento (GB): ${resolveField(d, ["storage", "almacenamiento", "ssd", "hdd", "disk"])}`,
            `Cargador: ${resolveField(d, ["hasCharger", "chargerIncluded", "charger", "cargador"], true)}`,
            `Maletín: ${resolveField(d, ["hasBag", "bagIncluded", "bag", "maletin"], true)}`,
          ]
        : [];

      const phoneLines = isCelular
        ? [
            `Número Celular: ${resolveField(d, ["chipNumber", "phoneNumber", "phone", "number", "telefono", "numeroCelular", "celular"])}`,
            `Operadora: ${resolveField(d, ["operator", "operadora", "carrier"])}`,
            `RAM (GB): ${resolveField(d, ["ram", "memory", "memoria"])}`,
            `Almacenamiento (GB): ${resolveField(d, ["storage", "almacenamiento", "internalStorage"])}`,
            `IMEI: ${resolveField(d, ["imeis", "imei", "imei1"], false, true)}`,
            `Procesador: ${resolveField(d, ["cpu", "processor", "procesador"])}`,
            `Color: ${resolveField(d, ["color"])}`,
            `Cargador: ${resolveField(d, ["hasCellCharger", "hasCharger", "chargerIncluded", "charger", "cargador"], true)}`,
            `Cable de carga: ${resolveField(d, ["hasChargingCable", "chargingCable"], true)}`,
            `Estuche/Case: ${resolveField(d, ["hasCase", "case", "funda", "estuche"], true)}`,
            `Mica: ${resolveField(d, ["hasMicas", "hasMica", "hasScreenProtector", "screenProtector", "mica"], true)}`,
            `Chip: ${resolveField(d, ["hasChip", "chip"], true)}`,
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
      
      const filteredLines = allLines.filter(line => {
        if (line.includes(': -')) return false;
        if (line.endsWith(': No')) return false;
        return true;
      });
      
      let displayLines = filteredLines;
      if (filteredLines.length <= 4) {
        displayLines = [
          ...baseLines.filter(l => !l.includes(': -')),
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
    const devices = user.devices || [];
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
    const splitObs = doc.splitTextToSize(observations, 180);
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
    
    // Línea para nombre del responsable
    doc.line(leftColX, lineY1, leftColX + colWidth, lineY1);
    doc.text("Nombre completo del responsable de entrega", leftColX, lineY1 + 3);
    
    // C.I. del responsable con línea
    const lineY2 = currentY + 18;
    doc.text("C.I.: ", leftColX, lineY2);
    doc.line(leftColX + 8, lineY2, leftColX + colWidth, lineY2);
    
    // Línea para Firma
    const lineY3 = currentY + 28;
    doc.text("Firma: ", leftColX, lineY3);
    doc.line(leftColX + 10, lineY3, leftColX + colWidth, lineY3);
    
    // Fecha vacía
    const lineY4 = currentY + 38;
    doc.text("Fecha: ____ / ____ / _______", leftColX, lineY4);
    
    // Columna derecha: Entregado por (el colaborador - datos de la asignación)
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Entregado por:", rightColX, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    
    // Línea para nombre del colaborador
    doc.line(rightColX, lineY1, rightColX + colWidth, lineY1);
    doc.text("Nombre completo del colaborador", rightColX, lineY1 + 3);
    
    // C.I. del colaborador
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
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");
    const fileName = `Acta_Recepcion_${userName}_${day}${month}${year}_${hours}${minutes}.pdf`;
    
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
