// Nombres y código de persona. MISMA regla que hwid-server/etiqueta.js y que
// el back (src/common/nombre-persona.ts): si se cambia acá, se cambia allá.
//
// En Ecuador los dos apellidos van al final, así que se cuenta DESDE EL FINAL:
//
//   BRYAN ROBERTO QUISPE ROMERO           -> nombres BRYAN ROBERTO, apellidos QUISPE ROMERO
//   MARIA JOSE DE LA CRUZ LOOR            -> nombres MARIA JOSE,    apellidos DE LA CRUZ LOOR
//   SERGIO ERAZO                          -> nombres SERGIO,        apellidos ERAZO
//
// Antes se partía en la primera palabra (nombre) y el resto (apellido), y 45
// personas quedaron con el segundo nombre metido en el apellido.
//
// Código de persona: primer nombre + inicial del primer apellido + número
// (BRYANQ406). Es la etiqueta que llevan todos los equipos de esa persona.

const PARTICULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'SAN', 'SANTA', 'VAN', 'VON', 'DA', 'DI', 'DO', 'DOS']);

/** Solo A-Z, sin tildes y con la Ñ como N. */
export function soloLetras(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]+/g, ' ')
    .trim();
}

// Bloques del nombre: cada palabra con las partículas que la preceden
// ("DE LA CRUZ" es un solo bloque).
function bloques(nombreCompleto: string): string[][] {
  const palabras = String(nombreCompleto ?? '').trim().split(/\s+/).filter(Boolean);
  const salida: string[][] = [];
  let pendientes: string[] = [];
  for (const p of palabras) {
    if (PARTICULAS.has(soloLetras(p))) {
      pendientes.push(p);
      continue;
    }
    salida.push([...pendientes, p]);
    pendientes = [];
  }
  if (pendientes.length) {
    if (salida.length) salida[salida.length - 1].push(...pendientes);
    else salida.push(pendientes);
  }
  return salida;
}

/** Separa un nombre completo en nombres y apellidos (los apellidos al final). */
export function separarNombre(nombreCompleto: string): { nombres: string; apellidos: string } {
  const b = bloques(nombreCompleto);
  if (b.length <= 1) return { nombres: b.flat().join(' '), apellidos: '' };
  // 2 bloques: nombre + apellido. 3: un nombre y dos apellidos (lo más común).
  // 4 o más: los dos últimos son los apellidos.
  const cuantosNombres = b.length >= 4 ? b.length - 2 : 1;
  return {
    nombres: b.slice(0, cuantosNombres).flat().join(' '),
    apellidos: b.slice(cuantosNombres).flat().join(' '),
  };
}

/** BRYANQ406. Vacío si falta el nombre o el número. */
export function codigoPersona(nombreCompleto: string, numero: unknown): string {
  const n = String(numero ?? '').replace(/\D+/g, '');
  if (!n) return '';
  const b = bloques(soloLetras(nombreCompleto));
  if (b.length < 2) return '';
  const primerNombre = b[0][b[0].length - 1];
  const primerApellido = b.length >= 4 ? b[b.length - 2] : b[1];
  const inicial = primerApellido[primerApellido.length - 1][0];
  return `${primerNombre}${inicial}${n.padStart(3, '0')}`;
}
