/**
 * Generador de códigos únicos para dispositivos
 * Genera un sufijo aleatorio de 5 caracteres alfanuméricos
 */

// Caracteres permitidos para el código (excluye caracteres confusos como 0, O, I, l)
const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Genera un código aleatorio de longitud específica
 * @param length - Longitud del código a generar (default: 5)
 * @returns Código aleatorio
 */
function generateRandomCode(length: number = 5): string {
  let result = '';
  const charactersLength = ALLOWED_CHARS.length;
  
  for (let i = 0; i < length; i++) {
    result += ALLOWED_CHARS.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

/**
 * Genera múltiples códigos únicos que no se repiten
 * @param prefix - Prefijo del código (ej: "MOSE - ")
 * @param quantity - Cantidad de códigos a generar
 * @param existingCodes - Set de códigos existentes para evitar duplicados (opcional)
 * @returns Array de códigos únicos completos
 */
export function generateUniqueCodes(
  prefix: string,
  quantity: number,
  existingCodes: Set<string> = new Set()
): string[] {
  const generatedCodes: string[] = [];
  const usedSuffixes = new Set<string>();
  
  // Agregar sufijos de códigos existentes al set
  existingCodes.forEach(code => {
    if (code.startsWith(prefix)) {
      const suffix = code.replace(prefix, '').trim();
      usedSuffixes.add(suffix);
    }
  });
  
  let attempts = 0;
  const maxAttempts = quantity * 100; // Límite de intentos para evitar loops infinitos
  
  while (generatedCodes.length < quantity && attempts < maxAttempts) {
    const suffix = generateRandomCode(5);
    
    if (!usedSuffixes.has(suffix)) {
      usedSuffixes.add(suffix);
      generatedCodes.push(`${prefix}${suffix}`);
    }
    
    attempts++;
  }
  
  if (generatedCodes.length < quantity) {
    console.warn(`Solo se pudieron generar ${generatedCodes.length} de ${quantity} códigos únicos`);
  }
  
  return generatedCodes;
}

/**
 * Genera un único código único
 * @param prefix - Prefijo del código (ej: "MOSE - ")
 * @param existingCodes - Set de códigos existentes para evitar duplicados (opcional)
 * @returns Código único completo
 */
export function generateSingleUniqueCode(
  prefix: string,
  existingCodes: Set<string> = new Set()
): string {
  const codes = generateUniqueCodes(prefix, 1, existingCodes);
  return codes[0] || `${prefix}${generateRandomCode(5)}`;
}

/**
 * Valida si un código tiene el formato correcto
 * @param code - Código a validar
 * @param prefix - Prefijo esperado
 * @returns true si el formato es válido
 */
export function isValidCodeFormat(code: string, prefix: string): boolean {
  if (!code.startsWith(prefix)) return false;
  
  const suffix = code.replace(prefix, '').trim();
  if (suffix.length !== 5) return false;
  
  // Verificar que todos los caracteres del sufijo son válidos
  for (const char of suffix) {
    if (!ALLOWED_CHARS.includes(char)) return false;
  }
  
  return true;
}

export default {
  generateUniqueCodes,
  generateSingleUniqueCode,
  isValidCodeFormat,
};
