import jsPDF from 'jspdf';

const loadImageAsDataURL = (src: string): Promise<string> => {
	return new Promise((resolve, reject) => {
		// Convertir URLs de galería de Imgur a URLs directas de imagen
		let imgSrc = src;
		if (src.includes('imgur.com/gallery/') || src.includes('imgur.com/a/')) {
			// Extraer el ID de la imagen del hash o del path
			const hashMatch = src.match(/#(\w+)/);
			const pathMatch = src.match(/imgur\.com\/(?:gallery|a)\/([^#\s]+)/);
			
			if (hashMatch) {
				// Si hay un hash, usar ese ID
				imgSrc = `https://i.imgur.com/${hashMatch[1]}.jpg`;
			} else if (pathMatch) {
				// Si no hay hash, intentar con el ID del path
				imgSrc = `https://i.imgur.com/${pathMatch[1]}.jpg`;
			}
		}
		
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
		
		img.onerror = (error) => {
			// Si falla, intentar con proxy CORS
			const corsProxy = 'https://corsproxy.io/?';
			const proxiedUrl = corsProxy + encodeURIComponent(imgSrc);
			
			const proxyImg = new Image();
			proxyImg.crossOrigin = 'anonymous';
			
			proxyImg.onload = () => {
				try {
					const canvas = document.createElement('canvas');
					canvas.width = proxyImg.width;
					canvas.height = proxyImg.height;
					const ctx = canvas.getContext('2d');
					if (!ctx) return reject(new Error('No canvas context'));
					ctx.drawImage(proxyImg, 0, 0);
					resolve(canvas.toDataURL('image/png'));
				} catch (e) {
					reject(e);
				}
			};
			
			proxyImg.onerror = () => reject(error);
			proxyImg.src = proxiedUrl;
		};
		
		img.src = imgSrc;
	});
};

/* ======================= REPORTE DE DISPOSITIVOS ======================= */

export interface DeviceSummary {
	total: number;
	available: number;
	assigned: number;
	maintenance: number;
	decommissioned: number;
}

export interface DeviceReport {
	id: number;
	assetCode: string;
	assetType: string;
	brand?: string;
	model?: string;
	serialNumber?: string;
	status: string;
	assignedTo?: string;
	purchaseDate?: string;
	branchName?: string;
}

export const generateDeviceReportPDF = async (
	devices: DeviceReport[],
	summary: DeviceSummary,
	departmentName = 'Departamento de Sistemas',
	filterType?: string,
	filterStatus?: string,
	filterBranch?: string,
	onProgress?: (progress: number) => void
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
	doc.setFillColor(41, 128, 185);
	doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');
  
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.setTextColor(255, 255, 255);
	doc.text('REPORTE DE DISPOSITIVOS', pageWidth / 2, y + 7, { align: 'center' });
  
	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	doc.text(departmentName, pageWidth / 2, y + 13, { align: 'center' });
	y += 22;

	const today = new Date();
	const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

	doc.setTextColor(100, 100, 100);
	doc.setFontSize(9);
	doc.text(`Fecha de generación: ${formattedDate}`, pageWidth - margin, y, { align: 'right' });
	y += 4;

	// Mostrar filtros aplicados
	if (filterType || filterStatus || filterBranch) {
		doc.setFontSize(8);
		doc.setFont('helvetica', 'italic');
		let filterText = 'Filtros: ';
		const filters = [];
		if (filterType) filters.push(`Tipo: ${filterType}`);
		if (filterStatus) filters.push(`Estado: ${filterStatus}`);
		if (filterBranch) filters.push(`Sucursal: ${filterBranch}`);
		filterText += filters.join(' | ');
		doc.text(filterText, pageWidth - margin, y, { align: 'right' });
	}
	y += 8;

	/* --------------------- RESUMEN EN TARJETAS ---------------------- */
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(40, 40, 40);
	doc.text('Resumen General', margin, y);
	y += 8;

	const cardWidth = (pageWidth - 2 * margin - 20) / 5;
	const cardHeight = 18;
	const cardSpacing = 4;
	let cardX = margin;

	const summaryCards = [
		{ label: 'Total', value: summary.total, color: [52, 73, 94] },
		{ label: 'Disponibles', value: summary.available, color: [46, 204, 113] },
		{ label: 'Asignados', value: summary.assigned, color: [52, 152, 219] },
		{ label: 'Mantenimiento', value: summary.maintenance, color: [241, 196, 15] },
		{ label: 'Baja', value: summary.decommissioned, color: [231, 76, 60] },
	];

	summaryCards.forEach((card) => {
		doc.setFillColor(245, 245, 245);
		doc.roundedRect(cardX, y, cardWidth, cardHeight, 2, 2, 'F');
    
		doc.setFillColor(card.color[0], card.color[1], card.color[2]);
		doc.roundedRect(cardX, y, cardWidth, 3, 2, 2, 'F');
    
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(16);
		doc.setTextColor(card.color[0], card.color[1], card.color[2]);
		doc.text(String(card.value), cardX + cardWidth / 2, y + 11, { align: 'center' });
    
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(100, 100, 100);
		doc.text(card.label, cardX + cardWidth / 2, y + 16, { align: 'center' });
    
		cardX += cardWidth + cardSpacing;
	});

	y += cardHeight + 12;

	/* --------------------- TABLA ---------------------- */
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(40, 40, 40);
	doc.text('Detalle de Dispositivos', margin, y);
	y += 8;

	const headers = [
		'Código', 'Tipo', 'Marca', 'Modelo', 'Serie', 'Estado', 'Asignado a', 'F. Compra', 'Sucursal'
	];

	const baseWidths = [25, 20, 24, 26, 28, 22, 30, 25, 30];
	const contentWidth = pageWidth - margin * 2;

	const scale = baseWidths.reduce((a, b) => a + b, 0) > contentWidth
		? contentWidth / baseWidths.reduce((a, b) => a + b, 0)
		: 1;

	const widths = baseWidths.map(w => Math.floor(w * scale));

	const headerHeight = 9;

	const drawHeaders = () => {
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(8);
		doc.setTextColor(255, 255, 255);

		let x = margin;

		headers.forEach((h, i) => {
			doc.setFillColor(41, 128, 185);
			doc.rect(x, y, widths[i], headerHeight, 'F');
      
			doc.setDrawColor(230, 230, 230);
			doc.setLineWidth(0.1);
			doc.rect(x, y, widths[i], headerHeight, 'D');
      
			doc.text(h, x + widths[i] / 2, y + headerHeight / 2 + 2.5, { align: 'center' });
			x += widths[i];
		});

		y += headerHeight;
	};

	drawHeaders();

	const statusMap: Record<string, string> = {
		available: 'Disponible',
		assigned: 'Asignado',
		maintenance: 'Mantenimiento',
		decommissioned: 'Baja',
	};

	const lineHeight = 5;
	let rowIndex = 0;

	/* --------------------- FILAS ---------------------- */
	if (onProgress) onProgress(0);
	for (let i = 0; i < devices.length; i++) {
		const device = devices[i];
		const f = (d?: string) => {
			if (!d) return '-';
			const x = new Date(d);
			return `${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`;
		};

		const row = [
			device.assetCode || '-',
			device.assetType || '-',
			device.brand || '-',
			device.model || '-',
			device.serialNumber || '-',
			statusMap[device.status] || device.status || '-',
			device.assignedTo || '-',
			f(device.purchaseDate),
			device.branchName || '-',
		];

		const wrapped = row.map((v, i) =>
			doc.splitTextToSize(v, widths[i] - 3)
		);

		const maxLines = Math.max(...wrapped.map(a => a.length));
		const h = maxLines * lineHeight + 3;

		if (y + h > pageHeight - 20) {
			doc.addPage();
			y = margin;
			rowIndex = 0;
			drawHeaders();
		}

		let x = margin;
		doc.setDrawColor(230, 230, 230);
		doc.setLineWidth(0.1);

		widths.forEach((w) => {
			if (rowIndex % 2 === 0) {
				doc.setFillColor(248, 249, 250);
				doc.rect(x, y, w, h, 'FD');
			} else {
				doc.rect(x, y, w, h, 'D');
			}
			x += w;
		});

		x = margin;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(50, 50, 50);

		wrapped.forEach((cell, i) => {
			cell.forEach((t, idx) => {
				const textX = i === 0 ? x + 2 : x + widths[i] / 2;
				const align = i === 0 ? undefined : 'center';
				doc.text(t, textX, y + 4 + idx * lineHeight, align ? { align } : undefined);
			});
			x += widths[i];
		});

		y += h;
		rowIndex++;
		if (onProgress) onProgress((i + 1) / Math.max(1, devices.length));
	}

	/* --------------------- FOOTER ---------------------- */
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
    
		doc.setDrawColor(41, 128, 185);
		doc.setLineWidth(0.5);
		doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
		doc.setFontSize(7);
		doc.setTextColor(120, 120, 120);
		doc.setFont('helvetica', 'normal');
		doc.text(`Generado el ${today.toLocaleString('es-ES')}`, margin, pageHeight - 7);
    
		doc.setFont('helvetica', 'bold');
		doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
	}

	doc.save(`Reporte_Dispositivos_${formattedDate.replace(/\//g, '-')}.pdf`);
};

/* ======================= REPORTE DE PERSONAS ======================= */

export interface PersonSummary {
	total: number;
	active: number;
	inactive: number;
	suspended: number;
}

export interface PersonReport {
	id: number;
	firstName: string;
	lastName: string;
	nationalId: string;
	username: string;
	email?: string;
	phone?: string;
	status: string;
	branchName?: string;
	departmentName?: string;
	roleName?: string;
}

export const generatePeopleReportPDF = async (
	people: PersonReport[],
	summary: PersonSummary,
	departmentName = 'Departamento de Recursos Humanos',
	onProgress?: (progress: number) => void
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
	doc.setFillColor(41, 128, 185);
	doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');
  
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.setTextColor(255, 255, 255);
	doc.text('REPORTE DE PERSONAL', pageWidth / 2, y + 7, { align: 'center' });
  
	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	doc.text(departmentName, pageWidth / 2, y + 13, { align: 'center' });
	y += 22;

	const today = new Date();
	const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

	doc.setTextColor(100, 100, 100);
	doc.setFontSize(9);
	doc.text(`Fecha de generación: ${formattedDate}`, pageWidth - margin, y, { align: 'right' });
	y += 8;

	/* --------------------- RESUMEN EN TARJETAS ---------------------- */
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(40, 40, 40);
	doc.text('Resumen General', margin, y);
	y += 8;

	const cardWidth = (pageWidth - 2 * margin - 15) / 4;
	const cardHeight = 18;
	const cardSpacing = 5;
	let cardX = margin;

	const summaryCards = [
		{ label: 'Total', value: summary.total, color: [52, 73, 94] },
		{ label: 'Activos', value: summary.active, color: [46, 204, 113] },
		{ label: 'Inactivos', value: summary.inactive, color: [149, 165, 166] },
		{ label: 'Suspendidos', value: summary.suspended, color: [231, 76, 60] },
	];

	summaryCards.forEach((card) => {
		doc.setFillColor(245, 245, 245);
		doc.roundedRect(cardX, y, cardWidth, cardHeight, 2, 2, 'F');
    
		doc.setFillColor(card.color[0], card.color[1], card.color[2]);
		doc.roundedRect(cardX, y, cardWidth, 3, 2, 2, 'F');
    
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(16);
		doc.setTextColor(card.color[0], card.color[1], card.color[2]);
		doc.text(String(card.value), cardX + cardWidth / 2, y + 11, { align: 'center' });
    
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(100, 100, 100);
		doc.text(card.label, cardX + cardWidth / 2, y + 16, { align: 'center' });
    
		cardX += cardWidth + cardSpacing;
	});

	y += cardHeight + 12;

	/* --------------------- TABLA ---------------------- */
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(40, 40, 40);
	doc.text('Detalle de Personal', margin, y);
	y += 8;

	const headers = [
		'Nombre', 'Cédula', 'Usuario', 'Email', 'Teléfono', 'Sucursal', 'Departamento', 'Rol', 'Estado'
	];

	const baseWidths = [35, 25, 25, 35, 25, 30, 30, 25, 20];
	const contentWidth = pageWidth - margin * 2;

	const scale = baseWidths.reduce((a, b) => a + b, 0) > contentWidth
		? contentWidth / baseWidths.reduce((a, b) => a + b, 0)
		: 1;

	const widths = baseWidths.map(w => Math.floor(w * scale));

	const headerHeight = 9;

	const drawHeaders = () => {
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(8);
		doc.setTextColor(255, 255, 255);

		let x = margin;

		headers.forEach((h, i) => {
			doc.setFillColor(41, 128, 185);
			doc.rect(x, y, widths[i], headerHeight, 'F');
      
			doc.setDrawColor(230, 230, 230);
			doc.setLineWidth(0.1);
			doc.rect(x, y, widths[i], headerHeight, 'D');
      
			doc.text(h, x + widths[i] / 2, y + headerHeight / 2 + 2.5, { align: 'center' });
			x += widths[i];
		});

		y += headerHeight;
	};

	drawHeaders();

	const statusMap: Record<string, string> = {
		active: 'Activo',
		inactive: 'Inactivo',
		suspended: 'Suspendido',
	};

	const lineHeight = 5;
	let rowIndex = 0;

	/* --------------------- FILAS ---------------------- */
	if (onProgress) onProgress(0);
	for (let i = 0; i < people.length; i++) {
		const person = people[i];
		const row = [
			`${person.firstName} ${person.lastName}`,
			person.nationalId || '-',
			person.username || '-',
			person.email || '-',
			person.phone || '-',
			person.branchName || '-',
			person.departmentName || '-',
			person.roleName || '-',
			statusMap[person.status] || person.status || '-',
		];

		const wrapped = row.map((v, i) =>
			doc.splitTextToSize(v, widths[i] - 3)
		);

		const maxLines = Math.max(...wrapped.map(a => a.length));
		const h = maxLines * lineHeight + 3;

		if (y + h > pageHeight - 20) {
			doc.addPage();
			y = margin;
			rowIndex = 0;
			drawHeaders();
		}

		let x = margin;
		doc.setDrawColor(230, 230, 230);
		doc.setLineWidth(0.1);

		widths.forEach((w) => {
			if (rowIndex % 2 === 0) {
				doc.setFillColor(248, 249, 250);
				doc.rect(x, y, w, h, 'FD');
			} else {
				doc.rect(x, y, w, h, 'D');
			}
			x += w;
		});

		x = margin;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(50, 50, 50);

		wrapped.forEach((cell, i) => {
			cell.forEach((t, idx) => {
				const textX = i === 0 ? x + 2 : x + widths[i] / 2;
				const align = i === 0 ? undefined : 'center';
				doc.text(t, textX, y + 4 + idx * lineHeight, align ? { align } : undefined);
			});
			x += widths[i];
		});

		y += h;
		rowIndex++;
		if (onProgress) onProgress((i + 1) / Math.max(1, people.length));
	}

	/* --------------------- FOOTER ---------------------- */
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
    
		doc.setDrawColor(41, 128, 185);
		doc.setLineWidth(0.5);
		doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
		doc.setFontSize(7);
		doc.setTextColor(120, 120, 120);
		doc.setFont('helvetica', 'normal');
		doc.text(`Generado el ${today.toLocaleString('es-ES')}`, margin, pageHeight - 7);
    
		doc.setFont('helvetica', 'bold');
		doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
	}

	doc.save(`Reporte_Personal_${formattedDate.replace(/\//g, '-')}.pdf`);
};

/* ====================== REPORTE DE ASIGNACIONES ====================== */

export interface AssignmentSummary {
	totalActive: number;
	totalHistory: number;
	totalGlobal: number;
}

export interface AssignmentReport {
	id: string;
	assetCode: string;
	assetType: string;
	assetBrand?: string;
	assetModel?: string;
	personName: string;
	branchName: string;
	assignmentDate: string;
	returnDate?: string;
	deliveryCondition: string;
	returnCondition?: string;
	isActive: boolean; // true = activa, false = historial
	mica?: string;
	procesador?: string;
	anioCompra?: number;
}

export const generateAssignmentsReportPDF = async (
	assignments: AssignmentReport[],
	summary: AssignmentSummary,
	departmentName = 'Departamento de Sistemas',
	filterBranch?: string,
	filterStartDate?: string,
	filterEndDate?: string,
	onProgress?: (progress: number) => void
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
	doc.setFillColor(110, 110, 110);
	doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');
  
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.setTextColor(255, 255, 255);
	doc.text('REPORTE DE ASIGNACIONES', pageWidth / 2, y + 7, { align: 'center' });
  
	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	doc.text(departmentName, pageWidth / 2, y + 13, { align: 'center' });
	y += 22;

	const today = new Date();
	const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

	doc.setTextColor(100, 100, 100);
	doc.setFontSize(9);
	doc.text(`Fecha de generación: ${formattedDate}`, pageWidth - margin, y, { align: 'right' });
	y += 4;

	// Mostrar filtros aplicados
	if (filterBranch || filterStartDate || filterEndDate) {
		doc.setFontSize(8);
		doc.setFont('helvetica', 'italic');
		let filterText = 'Filtros: ';
		const filters = [];
		if (filterBranch) filters.push(`Sucursal: ${filterBranch}`);
		if (filterStartDate) filters.push(`Desde: ${filterStartDate}`);
		if (filterEndDate) filters.push(`Hasta: ${filterEndDate}`);
		filterText += filters.join(' | ');
		doc.text(filterText, pageWidth - margin, y, { align: 'right' });
	}
	y += 8;

	/* --------------------- RESUMEN EN TARJETAS ---------------------- */
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(40, 40, 40);
	doc.text('Resumen General', margin, y);
	y += 8;

	const cardWidth = (pageWidth - 2 * margin - 12) / 3;
	const cardHeight = 18;
	const cardSpacing = 6;
	let cardX = margin;

	const cards = [
		{ label: 'Total Global', value: summary.totalGlobal, bg: [52, 152, 219], text: [255, 255, 255] },
		{ label: 'Asignaciones Activas', value: summary.totalActive, bg: [46, 204, 113], text: [255, 255, 255] },
		{ label: 'Historial (Devueltas)', value: summary.totalHistory, bg: [149, 165, 166], text: [255, 255, 255] },
	];

	cards.forEach((card) => {
		doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
		doc.roundedRect(cardX, y, cardWidth, cardHeight, 3, 3, 'F');
    
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(18);
		doc.setTextColor(card.text[0], card.text[1], card.text[2]);
		doc.text(String(card.value), cardX + cardWidth / 2, y + 8, { align: 'center' });
    
		doc.setFontSize(8);
		doc.setFont('helvetica', 'normal');
		doc.text(card.label, cardX + cardWidth / 2, y + 14, { align: 'center' });
    
		cardX += cardWidth + cardSpacing;
	});

	y += cardHeight + 10;

	/* --------------------- TABLA DE ASIGNACIONES ---------------------- */
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(40, 40, 40);
	doc.text('Detalle de Asignaciones', margin, y);
	y += 6;

	// Headers de la tabla
	const headers = ['Tipo', 'Código', 'Activo', 'Persona', 'Sucursal', 'F. Asignación', 'F. Devolución', 'Estado', 'C. Entrega', 'C. Devolución'];
	const widths = [18, 22, 35, 35, 30, 25, 25, 20, 20, 27]; // Total = 257

	doc.setFillColor(41, 128, 185);
	doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
  
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(7);
	doc.setTextColor(255, 255, 255);

	let x = margin;
	headers.forEach((h, i) => {
		const w = widths[i];
		doc.text(h, x + w / 2, y + 5, { align: 'center' });
		x += w;
	});

	y += 8;

	// Datos de la tabla
	doc.setTextColor(40, 40, 40);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7);

	let rowIndex = 0;

	const conditionMap: { [key: string]: string } = {
		excellent: 'Excelente',
		good: 'Bueno',
		fair: 'Regular',
		poor: 'Malo',
	};

	if (onProgress) onProgress(0);
	for (let i = 0; i < assignments.length; i++) {
		const assignment = assignments[i];
		// Chequear si necesitamos nueva página
		if (y + 10 > pageHeight - 20) {
			doc.addPage();
			y = margin + 10;
		}

		// Zebra striping
		if (rowIndex % 2 === 0) {
			doc.setFillColor(245, 247, 250);
			doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
		}

		// Mostrar info especial según tipo
        let assetDisplay = `${assignment.assetBrand || ''} ${assignment.assetModel || ''}`.trim();
        // Laptops: solo marca, modelo, procesador y año de compra
        if (assignment.assetType && assignment.assetType.toLowerCase().includes('laptop')) {
            assetDisplay = `${assignment.assetBrand || ''} ${assignment.assetModel || ''}`.trim();
            if (assignment.procesador) {
                assetDisplay += ` - ${assignment.procesador}`;
            }
            if (assignment.anioCompra) {
                assetDisplay += ` (${assignment.anioCompra})`;
            }
        }
        // Celulares: mostrar mica y teléfono si tiene mica
        else if (assignment.assetType && assignment.assetType.toLowerCase().includes('celular')) {
            assetDisplay = `${assignment.assetBrand || ''} ${assignment.assetModel || ''}`.trim();
            if (assignment.mica) {
                assetDisplay += ` - Mica: ${assignment.mica}`;
                if (assignment['telefono']) {
                    assetDisplay += ` - Tel: ${assignment['telefono']}`;
                }
            }
        }

		const returnDateDisplay = assignment.returnDate 
			? new Date(assignment.returnDate).toLocaleDateString('es-ES') 
			: '-';
		const statusDisplay = assignment.isActive ? 'ACTIVA' : 'DEVUELTA';
		const deliveryCondDisplay = conditionMap[assignment.deliveryCondition] || assignment.deliveryCondition;
		const returnCondDisplay = assignment.returnCondition 
			? (conditionMap[assignment.returnCondition] || assignment.returnCondition)
			: '-';

		const row = [
			assignment.assetType,
			assignment.assetCode,
			assetDisplay,
			assignment.personName,
			assignment.branchName,
			new Date(assignment.assignmentDate).toLocaleDateString('es-ES'),
			returnDateDisplay,
			statusDisplay,
			deliveryCondDisplay,
			returnCondDisplay,
		];

		x = margin;

		// Dibujar bordes individuales de cada celda
		widths.forEach((w) => {
			doc.setDrawColor(200, 200, 200);
			doc.setLineWidth(0.1);
			doc.rect(x, y, w, 8);
			x += w;
		});

		x = margin;

		// Texto de cada celda
		row.forEach((cell, i) => {
			const w = widths[i];
			const textX = x + w / 2;
			doc.text(String(cell), textX, y + 5, { align: 'center' });
			x += w;
		});

		y += 8;
		rowIndex++;
		if (onProgress) onProgress((i + 1) / Math.max(1, assignments.length));
	}

		// --- Agregar texto de responsabilidad después de la tabla ---
		y += 10;
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(11);
		doc.setTextColor(40, 40, 40);
		doc.text('Responsabilidad del receptor', margin, y);
		y += 7;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(60, 60, 60);
		const lines1 = doc.splitTextToSize('El receptor de los equipos tecnológicos (en adelante, el/la/los/las colaboradores) es responsable de su uso adecuado y del mantenimiento en condiciones óptimas, conforme a las instrucciones y políticas establecidas por la empresa. Será responsabilidad de el/la/los/las colaborador/es/as reportar de manera inmediata cualquier daño, falla, pérdida o incidente que afecte el funcionamiento del equipo, mediante correo electrónico dirigido al Departamento de Tecnología a la dirección', pageWidth - 2 * margin);
		doc.text(lines1, margin, y);
		y += lines1.length * 5;
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(30, 30, 200);
		doc.text('dep-sistemas@recursos-tecnologicos.com', margin, y);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(60, 60, 60);
		y += 7;

	/* --------------------- FOOTER ---------------------- */
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
    
		doc.setDrawColor(41, 128, 185);
		doc.setLineWidth(0.5);
		doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
		doc.setFontSize(7);
		doc.setTextColor(120, 120, 120);
		doc.setFont('helvetica', 'normal');
		doc.text(`Generado el ${today.toLocaleString('es-ES')}`, margin, pageHeight - 7);
    
		doc.setFont('helvetica', 'bold');
		doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
	}

	doc.save(`Reporte_Asignaciones_${formattedDate.replace(/\//g, '-')}.pdf`);
};

/* ======================= REPORTE DE SEGURIDAD ======================= */

export interface SecuritySummary {
	total: number;
	available: number;
	assigned: number;
	maintenance: number;
	decommissioned: number;
}

export interface SecurityReport {
	id: number;
	assetCode: string;
	brand?: string;
	model?: string;
	category: string;
	quantity: number;
	location: string;
	status: string;
	branchName?: string;
	notes?: string;
	imageUrl?: string;
}

export const generateSecurityReportPDF = async (
	devices: SecurityReport[],
	summary: SecuritySummary,
	departmentName = 'Departamento de Seguridad',
	filterCategory?: string,
	filterBranch?: string,
	onProgress?: (progress: number) => void
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
	doc.setFillColor(41, 128, 185);
	doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');
  
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.setTextColor(255, 255, 255);
	doc.text('REPORTE DE DISPOSITIVOS DE SEGURIDAD', pageWidth / 2, y + 7, { align: 'center' });
  
	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	doc.text(departmentName, pageWidth / 2, y + 13, { align: 'center' });
	y += 22;

	const today = new Date();
	const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

	doc.setTextColor(100, 100, 100);
	doc.setFontSize(9);
	doc.text(`Fecha de generación: ${formattedDate}`, pageWidth - margin, y, { align: 'right' });
	y += 4;

	// Mostrar filtros aplicados
	if (filterCategory || filterBranch) {
		doc.setFontSize(8);
		doc.setFont('helvetica', 'italic');
		let filterText = 'Filtros: ';
		const filters = [];
		if (filterCategory) filters.push(`Categoría: ${filterCategory}`);
		if (filterBranch) filters.push(`Sucursal: ${filterBranch}`);
		filterText += filters.join(', ');
		doc.text(filterText, pageWidth - margin, y, { align: 'right' });
		y += 4;
	}

	y += 3;

	/* --------------------- RESUMEN ---------------------- */
	doc.setFillColor(230, 230, 250);
	doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');
  
	doc.setTextColor(30, 30, 30);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.text('RESUMEN DE DISPOSITIVOS DE SEGURIDAD', pageWidth / 2, y + 6, { align: 'center' });

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
  
	// Distribuir equitativamente las 5 estadísticas en el ancho disponible
	const availableWidth = pageWidth - 2 * margin;
	const spacing = availableWidth / 5;
	const col1X = margin + spacing * 0.5;
	const col2X = margin + spacing * 1.5;
	const col3X = margin + spacing * 2.5;
	const col4X = margin + spacing * 3.5;
	const col5X = margin + spacing * 4.5;
  
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(30, 30, 30);
	doc.text(`Total: ${summary.total}`, col1X, y + 12, { align: 'center' });
	doc.setTextColor(0, 150, 0);
	doc.text(`Disponibles: ${summary.available}`, col2X, y + 12, { align: 'center' });
	doc.setTextColor(100, 100, 100);
	doc.text(`Asignados: ${summary.assigned}`, col3X, y + 12, { align: 'center' });
	doc.setTextColor(200, 150, 0);
	doc.text(`Mantenimiento: ${summary.maintenance}`, col4X, y + 12, { align: 'center' });
	doc.setTextColor(200, 0, 0);
	doc.text(`Dados de baja: ${summary.decommissioned}`, col5X, y + 12, { align: 'center' });
  
	y += 22;

	/* --------------------- TABLA ---------------------- */
	const rowHeight = 8;
	const rowHeightWithImage = 35; // Altura mayor cuando hay imagen
	const headerHeight = 10;
	const colWidths = [22, 32, 25, 12, 40, 22, 28, 35, 44];
	const headers = ['Código', 'Marca/Modelo', 'Categoría', 'Cant.', 'Ubicación', 'Estado', 'Sucursal', 'Observación', 'Imagen'];

	const drawTableHeader = () => {
		doc.setFillColor(41, 128, 185);
		doc.rect(margin, y, pageWidth - 2 * margin, headerHeight, 'F');
    
		doc.setTextColor(255, 255, 255);
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(9);
    
		let x = margin + 2;
		headers.forEach((header, i) => {
			doc.text(header, x, y + 6.5);
			x += colWidths[i];
		});
    
		y += headerHeight;
	};

	const statusColors: Record<string, [number, number, number]> = {
		available: [0, 150, 0],
		assigned: [100, 100, 100],
		maintenance: [200, 150, 0],
		decommissioned: [200, 0, 0],
	};

	const statusLabels: Record<string, string> = {
		available: 'Disponible',
		assigned: 'Asignado',
		maintenance: 'Mantenimiento',
		decommissioned: 'Dado de baja',
	};

	drawTableHeader();

	let rowIndex = 0;
  
	const processDevice = async (device: SecurityReport, idx: number) => {
		const currentRowHeight = device.imageUrl ? rowHeightWithImage : rowHeight;
    
		if (y + currentRowHeight > pageHeight - 20) {
			doc.addPage();
			y = margin + 10;
			drawTableHeader();
			rowIndex = 0;
		}

		if (rowIndex % 2 === 0) {
			doc.setFillColor(245, 245, 255);
			doc.rect(margin, y, pageWidth - 2 * margin, currentRowHeight, 'F');
		}

		doc.setTextColor(0, 0, 0);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);

		let x = margin + 2;
    
		// Código
		doc.text(device.assetCode || '-', x, y + 5.5);
		x += colWidths[0];
    
		// Marca/Modelo
		const brandModel = `${device.brand || ''} ${device.model || ''}`.trim() || '-';
		const brandModelLines = doc.splitTextToSize(brandModel, colWidths[1] - 2);
		doc.text(brandModelLines[0] || '-', x, y + 5.5);
		x += colWidths[1];
    
		// Categoría
		const categoryLines = doc.splitTextToSize(device.category || '-', colWidths[2] - 2);
		doc.text(categoryLines[0] || '-', x, y + 5.5);
		x += colWidths[2];
    
		// Cantidad
		doc.text(String(device.quantity || 0), x, y + 5.5);
		x += colWidths[3];
    
		// Ubicación - Multilínea
		const locationText = device.location || '-';
		const locationLines = doc.splitTextToSize(locationText, colWidths[4] - 2);
		locationLines.slice(0, 3).forEach((line: string, idx: number) => {
			doc.text(line, x, y + 5.5 + (idx * 3));
		});
		x += colWidths[4];
    
		// Estado
		const color = statusColors[device.status] || [0, 0, 0];
		doc.setTextColor(color[0], color[1], color[2]);
		doc.setFont('helvetica', 'bold');
		doc.text(statusLabels[device.status] || device.status, x, y + 5.5);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(0, 0, 0);
		x += colWidths[5];
    
		// Sucursal
		const branchText = device.branchName || '-';
		const branchLines = doc.splitTextToSize(branchText, colWidths[6] - 2);
		doc.text(branchLines[0] || '-', x, y + 5.5);
		x += colWidths[6];
    
		// Observación - Multilínea
		const notesText = device.notes || '-';
		const notesLines = doc.splitTextToSize(notesText, colWidths[7] - 2);
		notesLines.slice(0, 3).forEach((line: string, idx: number) => {
			doc.text(line, x, y + 5.5 + (idx * 3));
		});
		x += colWidths[7];
    
		// Imagen
		if (device.imageUrl) {
			try {
				const imgData = await loadImageAsDataURL(device.imageUrl);
				const imgWidth = 40;
				const imgHeight = 30;
				const imgX = x + 2;
				const imgY = y + 2;
				doc.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, imgHeight);
			} catch (err) {
				doc.setFontSize(7);
				doc.text('Imagen no asignada', x + 2, y + 5.5);
			}
		} else {
			doc.setFontSize(7);
			doc.text('Imagen no asignada', x + 2, y + 5.5);
		}

		y += device.imageUrl ? rowHeightWithImage : rowHeight;
		rowIndex++;
	};
  
	// Procesar dispositivos de forma secuencial para manejar imágenes async
	if (onProgress) onProgress(0);
	for (let i = 0; i < devices.length; i++) {
		await processDevice(devices[i], i);
		if (onProgress) onProgress((i + 1) / Math.max(1, devices.length));
	}

	/* --------------------- FOOTER ---------------------- */
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
    
		doc.setDrawColor(41, 128, 185);
		doc.setLineWidth(0.5);
		doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
		doc.setFontSize(7);
		doc.setTextColor(120, 120, 120);
		doc.setFont('helvetica', 'normal');
		doc.text(`Generado el ${today.toLocaleString('es-ES')}`, margin, pageHeight - 7);
    
		doc.setFont('helvetica', 'bold');
		doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
	}

	doc.save(`Reporte_Seguridad_${formattedDate.replace(/\//g, '-')}.pdf`);
};

