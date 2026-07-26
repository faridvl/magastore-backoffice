/**
 * Máscaras de los campos de courier + casillero.
 *
 * Los casilleros están en Estados Unidos (Miami, Doral), no en Costa Rica, así
 * que el teléfono NO puede pasar por `applyPhoneMask` de customer-masks: esa
 * asume +506 y 8 dígitos locales, y convertiría un número real como
 * "+1 786-360-2816" en basura.
 */

/**
 * Mayúsculas para los campos de texto libre del casillero. La dirección es el
 * dato que el cliente copia para enviar su mercancía y aparece impresa junto a
 * su código: guardarla siempre en mayúsculas evita que la misma bodega se vea
 * como "Miami", "MIAMI" y "miami" según quién la haya escrito.
 *
 * Se preservan los espacios internos (una dirección los necesita) y solo se
 * colapsan los repetidos.
 */
export function applyUpperMask(value: string): string {
  return value.toUpperCase().replace(/\s{2,}/g, ' ');
}

/**
 * Prefijo de código: mayúsculas y sin espacios. Un espacio dentro del prefijo
 * se arrastraría a todos los códigos emitidos (ej. "MGA 2453-C-07") y rompe la
 * búsqueda por casillero, que compara el código como una sola palabra.
 */
export function applyCodePrefixMask(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '');
}

/**
 * Dígitos locales del teléfono, sin el código de país.
 *
 * El "+1 " que la máscara antepone forma parte del value del input, así que al
 * borrar con backspace el navegador entrega "+1 786-360-281" y una lectura
 * ingenua de los dígitos recupera "1786360281" — diez dígitos, incluido el 1
 * del prefijo, que se reformatean como "+1 178-636-0281". Cada borrado empuja
 * otro 1 hacia el número y el campo se atasca en "+1 111-111-1111", imposible
 * de vaciar.
 *
 * Por eso el prefijo se descarta como TEXTO antes de leer dígito alguno: el 1
 * de "+1" nunca llega a contarse como parte del número.
 */
function localDigits(value: string): string {
  const withoutPrefix = value.replace(/^\s*\+\s*1\b/, '');
  const digits = withoutPrefix.replace(/\D/g, '');

  // Si el prefijo ya estaba en pantalla, todo lo que sigue es el número local y
  // ningún dígito puede ser código de país. Descartar aquí un 1 inicial rompe
  // el tipeo: al escribir el dígito 11 sobre "+1 123-123-4444" el valor tiene
  // 11 dígitos que empiezan en 1, y tratarlos como "país + número" se comía el
  // primer dígito escrito, corriendo todo a "+1 231-234-4444".
  if (withoutPrefix !== value) return digits;

  // Sin prefijo el valor viene de fuera (pegado o cargado de la base): ahí un
  // 1 al frente de 11 dígitos sí es el código de país.
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

/**
 * Teléfono US: +1 XXX-XXX-XXXX. Se enmascara sobre los 10 dígitos locales,
 * descartando el 1 de país si el operador lo escribe.
 */
export function applyUsPhoneMask(value: string): string {
  const local = localDigits(value).slice(0, 10);

  const area = local.slice(0, 3);
  const mid = local.slice(3, 6);
  const last = local.slice(6, 10);

  const formatted = [area, mid, last].filter(Boolean).join('-');
  return formatted ? `+1 ${formatted}` : '';
}

/**
 * Igual que applyUsPhoneMask pero para cargar un valor YA guardado.
 *
 * La diferencia importa: hay teléfonos en la base que no son números US válidos
 * (uno con 9 dígitos, otro costarricense con prefijo +506). Reagrupar esos
 * dígitos en el formato US produce un número plausible pero inventado —
 * "+506 8816 5808" se convertiría en "+1 506-881-6580" — y el operador lo vería
 * ya "corregido" en el formulario, sin motivo para dudar de él.
 *
 * Al cargar se devuelve el valor tal cual salvo que tenga exactamente los 10
 * dígitos de un número US: así lo inválido se ve inválido, la validación lo
 * marca en rojo y el operador lo corrige a conciencia.
 */
export function loadUsPhone(value: string): string {
  if (!isValidUsPhone(value)) return value;
  return applyUsPhoneMask(value);
}

/**
 * Un teléfono US válido son exactamente 10 dígitos locales. Se expone para que
 * el schema valide con el mismo criterio que usa la máscara — si divergen, un
 * valor puede verse bien formateado y aun así fallar la validación.
 */
export function isValidUsPhone(value: string): boolean {
  return localDigits(value).length === 10;
}

/**
 * ZIP de Estados Unidos: 5 dígitos, o ZIP+4 (33172-1615) si el operador escribe
 * los 9. Ambos son válidos — el +4 identifica el bloque dentro del ZIP.
 */
export function applyZipMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Deja el importe con un solo punto decimal y máximo 2 decimales. */
export function applyMoneyMask(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}
