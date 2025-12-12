import jsPDF from 'jspdf';

export interface DeviceSummary {
  total: number;
  assigned: number;
  available: number;
  maintenance: number;
  decommissioned: number;
}

export interface Device {
  id: number;
  assetCode: string;
  assetType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: string;
  assignedTo?: string;
  purchaseDate?: string;
  deliveryDate?: string;
  receptionDate?: string;
}
const loadImageAsDataURL = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
};
const createPieChartImage = (summary: DeviceSummary): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 380;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const colors = {
    assigned: '#2ecc71',
    available: '#3498db',
    maintenance: '#f1c40f',
    decommissioned: '#e74c3c',
  };

  const slices = [
    { key: 'assigned', value: summary.assigned },
    { key: 'available', value: summary.available },
    { key: 'maintenance', value: summary.maintenance },
    { key: 'decommissioned', value: summary.decommissioned },
  ];

  const total = slices.reduce((a, b) => a + b.value, 0) || 1;
  let start = -Math.PI / 2;

  const cx = 110;
  const cy = 110;
  const r = 90;

  for (const s of slices) {
    const angle = (s.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[s.key];
    ctx.fill();
    start += angle;
  }

  // Leyenda
  const labels: Record<string, string> = {
    assigned: 'Asignados',
    available: 'Disponibles',
    maintenance: 'Mantenimiento',
    decommissioned: 'Baja',
  };

  ctx.font = '12px Arial';
  let ly = 70;
  const lx = 240;

  slices.forEach((s) => {
    ctx.fillStyle = colors[s.key];
    ctx.fillRect(lx, ly - 10, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillText(`${labels[s.key]}: ${s.value}`, lx + 18, ly);
    ly += 20;
  });

  return canvas.toDataURL('image/png');
};

export const generateDeviceReportPDF = async (
  devices: Device[],
  summary: DeviceSummary,
  departmentName = 'Departamento de Sistemas'
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin + 10;

  /* --------------------- LOGO ---------------------- */
  try {
    const logoURL = `${window.location.origin}/images/techinformeencabezado.png`;
    const img = await loadImageAsDataURL(logoURL);
    doc.addImage(img, 'PNG', (pageWidth - 120) / 2, y, 120, 18);
  } catch {}
  y += 32;

  /* --------------------- TÍTULOS ---------------------- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(departmentName, pageWidth / 2, y, { align: 'center' });
  y += 8;

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${formattedDate}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Reporte de Dispositivos', pageWidth / 2, y, { align: 'center' });
  y += 10;

  /* --------------------- RESUMEN + GRÁFICO ---------------------- */
  doc.setFontSize(11);
  doc.text('Resumen de Dispositivos:', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const summaryYStart = y;
  const lines = [
    `Total de Dispositivos: ${summary.total}`,
    `Asignados: ${summary.assigned}`,
    `Disponibles: ${summary.available}`,
    `Mantenimiento: ${summary.maintenance}`,
    `Baja: ${summary.decommissioned}`,
  ];

  lines.forEach((t) => {
    doc.text(t, margin + 3, y);
    y += 6;
  });

  const chart = createPieChartImage(summary);
  if (chart) {
    const chartW = 75;
    const chartH = 40;
    doc.addImage(chart, 'PNG', pageWidth - margin - chartW, summaryYStart - 2, chartW, chartH);
  }

  y += 10;

  /* --------------------- TABLA (ESTILO MATERIAL) ---------------------- */
  const headers = [
  'Código', 'Marca', 'Modelo', 'Fecha Compra',
  'Fecha Entrega', 'Fecha Recepción', 'Serie', 'Estado', 'Asignado a'
];


  const baseWidths = [ 28, 24, 26, 26, 26, 28, 30, 22, 36];
  const contentWidth = pageWidth - margin * 2;

  const scale = baseWidths.reduce((a, b) => a + b, 0) > contentWidth
    ? contentWidth / baseWidths.reduce((a, b) => a + b, 0)
    : 1;

  const widths = baseWidths.map(w => Math.floor(w * scale));

  const headerHeight = 10;

  const drawHeaders = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60); // gris oscuro
    doc.setDrawColor(41, 128, 185); // línea azul moderno

    let x = margin;

    headers.forEach((h, i) => {
      doc.text(h, x + 2, y + headerHeight / 2 + 3);
      doc.line(x, y + headerHeight, x + widths[i], y + headerHeight); // línea inferior azul
      x += widths[i];
    });

    y += headerHeight + 2;
  };

  /* Dibujar encabezado */
  drawHeaders();

  const statusMap: Record<string, string> = {
    assigned: 'Asignado',
    available: 'Disponible',
    maintenance: 'Mantenimiento',
    decommissioned: 'Baja',
  };

  const lineHeight = 5;

  /* --------------------- FILAS ---------------------- */
  devices.forEach((device) => {
    if (y + 10 > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaders();
    }

    const f = (d?: string) => {
      if (!d) return '-';
      const x = new Date(d);
      return `${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`;
    };

    const row = [
  device.assetCode || '-',
  device.brand || '-',
  device.model || '-',
  f(device.purchaseDate),
  f(device.deliveryDate),
  f(device.receptionDate),
  device.serialNumber || '-',
  statusMap[device.status] || device.status || '-',
  device.assignedTo || '-',
];

    const wrapped = row.map((v, i) =>
      doc.splitTextToSize(v, widths[i] - 3)
    );

    const maxLines = Math.max(...wrapped.map(a => a.length));
    const h = maxLines * lineHeight + 3;

    /* Dibujar fila */
    let x = margin;
    doc.setDrawColor(220);

    widths.forEach((w) => {
      doc.rect(x, y, w, h);
      x += w;
    });

    /* texto */
    x = margin;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    wrapped.forEach((cell, i) => {
      cell.forEach((t, idx) => {
        doc.text(t, x + 2, y + 4 + idx * lineHeight);
      });
      x += widths[i];
    });

    y += h;
  });

  /* --------------------- FOOTER ---------------------- */
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generado el ${today.toLocaleString('es-ES')}`, pageWidth / 2, pageHeight - 8, {
    align: 'center',
  });

  doc.save(`Reporte_Dispositivos_${formattedDate.replace(/\//g, '-')}.pdf`);
};
