// Depreciación de equipos para las actas de entrega/recepción.
// Regla: 20% anual, prorrateado por MES (20/12 = 1,6667% por mes) y contando solo
// mes y año de la compra (el día no cuenta). A los 60 meses llega al 100% y el
// valor no baja de $0. Es solo informativo para el acta
// y vive solo en Gestor: las apps de celular/Windows no lo muestran.

export const DEPRECIACION_ANUAL = 0.2;

export interface Depreciacion {
  precio: number;
  fechaCompra: Date;
  mesesTranscurridos: number;
  porcentaje: number; // 0..100
  valorActual: number;
}

const aFecha = (v: unknown): Date | null => {
  if (!v) return null;
  // "2025-01-01" (sin hora) se interpreta como UTC y en Ecuador caería el día anterior:
  // se arma en hora local para que la fecha y los años completos coincidan con lo escrito.
  const soloDia = typeof v === 'string' ? v.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  const d = soloDia ? new Date(Number(soloDia[1]), Number(soloDia[2]) - 1, Number(soloDia[3])) : new Date(v as any);
  return Number.isNaN(d.getTime()) ? null : d;
};

const aNumero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const formatoDinero = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "septiembre 2025": el acta muestra solo mes y año, nunca el día exacto. */
export const formatoMesAnio = (d: Date) => `${MESES[d.getMonth()]} ${d.getFullYear()}`;

/**
 * Meses transcurridos entre dos fechas, contando solo mes y año (el día no
 * cuenta), para que coincida con lo que se imprime en el acta: comprado en
 * septiembre 2025, en noviembre 2026 han pasado 14 meses.
 */
export const mesesTranscurridos = (desde: Date, hasta: Date) =>
  Math.max(0, (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()));

/** 23.33 -> "23,33"; 20 -> "20" (hasta 2 decimales, sin ceros de sobra). */
const formatoPorcentaje = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/**
 * Devuelve null si falta el precio o la fecha de compra: sin ambos no se
 * puede calcular nada y el acta no debe inventar datos.
 */
export const calcularDepreciacion = (
  precioCompra: unknown,
  fechaCompra: unknown,
  hoy: Date = new Date(),
): Depreciacion | null => {
  const precio = aNumero(precioCompra);
  const fecha = aFecha(fechaCompra);
  if (precio === null || fecha === null) return null;

  const meses = mesesTranscurridos(fecha, hoy);
  const porcentaje = Math.min(100, (meses * DEPRECIACION_ANUAL * 100) / 12);
  const valorActual = Math.max(0, Math.round(precio * (1 - porcentaje / 100) * 100) / 100);

  return { precio, fechaCompra: fecha, mesesTranscurridos: meses, porcentaje, valorActual };
};

/**
 * Líneas para el recuadro del equipo en el acta. Vacío si no hay precio.
 * Si hay precio pero no fecha, solo se muestra el precio.
 */
export const lineasPrecioYDepreciacion = (d: any, hoy: Date = new Date()): string[] => {
  const precioCrudo = d?.purchasePrice ?? d?.attributesJson?.purchasePrice;
  const fechaCruda = d?.purchaseDate ?? d?.attributesJson?.purchaseDate;

  const dep = calcularDepreciacion(precioCrudo, fechaCruda, hoy);
  if (dep) {
    return [
      `Fecha de compra: ${formatoMesAnio(dep.fechaCompra)}`,
      `Precio de compra: ${formatoDinero(dep.precio)}`,
      `Depreciación (20% anual): ${formatoPorcentaje(dep.porcentaje)}%`,
      `Valor actual: ${formatoDinero(dep.valorActual)}`,
    ];
  }

  const precio = Number(precioCrudo);
  if (precioCrudo !== null && precioCrudo !== undefined && precioCrudo !== '' && Number.isFinite(precio) && precio >= 0) {
    return [`Precio de compra: ${formatoDinero(precio)}`];
  }
  return [];
};

/** ¿Hay al menos un celular/tablet con precio de compra? (para mostrar la casilla) */
export const hayCelularConPrecio = (devices: any[] | undefined | null) =>
  (devices || []).some((d) => {
    const tipo = String(d?.assetType || d?.type || '');
    return /celular|cellphone|móvil|movil|tablet/i.test(tipo) && lineasPrecioYDepreciacion(d).length > 0;
  });
