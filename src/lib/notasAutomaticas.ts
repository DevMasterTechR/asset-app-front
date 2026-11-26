/**
 * Notas de asignación que pone el sistema solo (sincronización con HWIDApp,
 * accesorios asignados junto con la laptop/celular...). No dicen nada útil en
 * un acta: si no se escribió una observación de verdad, el acta queda en
 * "Ninguna" en vez de obligar a borrar estas líneas a mano.
 */
const PATRONES_AUTOMATICOS = [
  /asignaci[oó]n\s+(creada\s+)?autom[aá]tica/i,
  /sincronizaci[oó]n\s+con\s+hwid/i,
];

export function esNotaAutomatica(nota?: string | null): boolean {
  const texto = String(nota || '').trim();
  if (!texto) return false;
  return PATRONES_AUTOMATICOS.some((p) => p.test(texto));
}

/** La nota tal cual, o "" si es una nota automática del sistema. */
export function notaReal(nota?: string | null): string {
  const texto = String(nota || '').trim();
  return esNotaAutomatica(texto) ? '' : texto;
}
