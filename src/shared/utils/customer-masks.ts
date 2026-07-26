import { IdType } from '@/types/customer/customer.types';

/**
 * Máscaras y validación de los campos identificatorios del cliente.
 *
 * Vive aparte porque el alta y la edición deben comportarse igual: antes solo
 * el alta enmascaraba la cédula y el formulario de edición aceptaba cualquier
 * texto, así que editar un cliente podía dejar la cédula con un formato que el
 * alta nunca habría permitido.
 */

export function applyIdMask(value: string, idType: string): string {
  const digits = value.replace(/\D/g, '');
  if (idType === 'FISICA') {
    // 0-0000-0000
    const p1 = digits.slice(0, 1);
    const p2 = digits.slice(1, 5);
    const p3 = digits.slice(5, 9);
    return [p1, p2, p3].filter(Boolean).join('-');
  }
  if (idType === 'JURIDICA') {
    // 0-000-000000
    const p1 = digits.slice(0, 1);
    const p2 = digits.slice(1, 4);
    const p3 = digits.slice(4, 10);
    return [p1, p2, p3].filter(Boolean).join('-');
  }
  // DIMEX y PASAPORTE: libre (DIMEX acepta dígitos, PASAPORTE alfanumérico)
  if (idType === 'DIMEX') return digits.slice(0, 12);
  return value.toUpperCase(); // PASAPORTE: alfanumérico libre
}

export function validateIdCard(value: string, idType: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (idType === 'FISICA' && digits.length !== 9) return 'Cédula física debe tener 9 dígitos (0-0000-0000)';
  if (idType === 'JURIDICA' && digits.length !== 10) return 'Cédula jurídica debe tener 10 dígitos (0-000-000000)';
  if (idType === 'DIMEX' && (digits.length < 11 || digits.length > 12)) return 'DIMEX debe tener 11 o 12 dígitos';
  if (idType === 'PASAPORTE' && value.trim().length < 5) return 'Pasaporte debe tener al menos 5 caracteres';
  return undefined;
}

export function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  // Costa Rica: +506 XXXX-XXXX (8 dígitos locales)
  const local = digits.startsWith('506') ? digits.slice(3) : digits;
  const trimmed = local.slice(0, 8);
  const part1 = trimmed.slice(0, 4);
  const part2 = trimmed.slice(4, 8);
  const formatted = part2 ? `${part1}-${part2}` : part1;
  return formatted ? `+506 ${formatted}` : '';
}

/** Placeholder acorde al tipo, para que el formato esperado se vea sin adivinar. */
export function idCardPlaceholder(idType: string): string {
  if (idType === 'FISICA') return '0-0000-0000';
  if (idType === 'JURIDICA') return '0-000-000000';
  if (idType === 'DIMEX') return '000000000000';
  return 'AB123456';
}

/**
 * Valida un código de casillero escrito a mano contra el prefijo de su ruta.
 * El backend acepta cualquier texto (un cliente heredado puede traer un código
 * con otro formato), así que esto es una guía en la UI, no un bloqueo duro:
 * devuelve el motivo para mostrarlo al lado del campo.
 */
export function validateWarehouseCode(code: string, codePrefix?: string | null): string | undefined {
  const value = code.trim().toUpperCase();
  if (!value) return undefined; // vacío = se genera automáticamente

  if (!codePrefix) {
    // Sin prefijo conocido solo se exige que no tenga espacios internos, que
    // rompen la búsqueda por casillero.
    return /\s/.test(value) ? 'El código no puede llevar espacios' : undefined;
  }

  const prefix = codePrefix.toUpperCase();
  if (!value.startsWith(prefix)) {
    return `Debe empezar con ${codePrefix} (ej. ${codePrefix}07)`;
  }

  const suffix = value.slice(prefix.length);
  if (!suffix) return `Falta el número después de ${codePrefix}`;
  if (!/^\d+$/.test(suffix)) return `Después de ${codePrefix} solo van números (ej. ${codePrefix}07)`;

  return undefined;
}

/** Máscara del código: mayúsculas y sin espacios, como se guarda en la base. */
export function applyWarehouseCodeMask(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '');
}

export const ID_TYPE_OPTIONS: { value: IdType; label: string }[] = [
  { value: 'FISICA', label: 'Física' },
  { value: 'JURIDICA', label: 'Jurídica' },
  { value: 'DIMEX', label: 'DIMEX' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];
