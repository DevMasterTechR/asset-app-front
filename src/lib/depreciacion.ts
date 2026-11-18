// Depreciación de equipos para las actas de entrega/recepción.
// Regla: 20% por cada año COMPLETO transcurrido desde la fecha de compra
// (5 años => 100%, el valor no baja de $0). Es solo informativo para el acta
// y vive solo en Gestor: las apps de celular/Windows no lo muestran.

export const DEPRECIACION_ANUAL = 0.2;

export interface Depreciacion {
  precio: number;
  fechaCompra: Date;
  aniosCompletos: number;
  porcentaje: number; // 0..100
  valorActual: number;
  depreciadoTotalmenteEl: Date;
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

export const formatoFecha = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** Años completos entre dos fechas (respeta mes y día de la compra). */
export const aniosCompletos = (desde: Date, hasta: Date) => {
  let anios = hasta.getFullYear() - desde.getFullYear();
  const aunNoCumple =
    hasta.getMonth() < desde.getMonth() ||
    (hasta.getMonth() === desde.getMonth() && hasta.getDate() < desde.getDate());
  if (aunNoCumple) anios -= 1;
  return Math.max(0, anios);
};

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

  const anios = aniosCompletos(fecha, hoy);
  const porcentaje = Math.min(100, Math.round(anios * DEPRECIACION_ANUAL * 100));
  const valorActual = Math.max(0, Math.round(precio * (1 - porcentaje / 100) * 100) / 100);

  const fin = new Date(fecha);
  fin.setFullYear(fin.getFullYear() + Math.round(1 / DEPRECIACION_ANUAL));

  return { precio, fechaCompra: fecha, aniosCompletos: anios, porcentaje, valorActual, depreciadoTotalmenteEl: fin };
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
      `Fecha de compra: ${formatoFecha(dep.fechaCompra)}`,
      `Precio de compra: ${formatoDinero(dep.precio)}`,
      `Depreciación (20% anual): ${dep.porcentaje}% (${dep.aniosCompletos} ${dep.aniosCompletos === 1 ? 'año' : 'años'})`,
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
