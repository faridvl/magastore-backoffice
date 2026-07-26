import { CourierRatesRepository } from '../repositories/courier-rates.repo';
import { WarehouseRoutesRepository } from '../repositories/warehouse-routes.repo';
import { CourierRateInput } from '@/types/logistics/logistics.types';

function validateInput(data: CourierRateInput): void {
  if (!data.name?.trim()) throw new Error('El nombre de la tarifa es requerido.');
  if (!data.origin?.trim()) throw new Error('El origen es requerido.');
  if (!data.package_type) throw new Error('El tipo de paquete es requerido.');
  if (data.rate_usd == null || data.rate_usd <= 0) throw new Error('La tarifa por libra debe ser mayor a 0.');
  if (data.insurance_usd == null || data.insurance_usd < 0) throw new Error('El seguro no puede ser negativo.');
  if (!data.code_prefix?.trim()) {
    throw new Error('El prefijo de código del casillero es requerido (ej. MGA-2453-C-).');
  }
  // La dirección completa del casillero no es opcional: es el dato que el
  // cliente copia para enviar su mercancía. Un courier con la dirección a
  // medias produce casilleros que no sirven para nada.
  if (!data.address_line?.trim()) throw new Error('La dirección del casillero es requerida.');
  if (!data.city?.trim()) throw new Error('La ciudad del casillero es requerida.');
  if (!data.state?.trim()) throw new Error('El estado/provincia del casillero es requerido.');
  if (!data.postal_code?.trim()) throw new Error('El código postal del casillero es requerido.');
  if (!data.contact_phone?.trim()) throw new Error('El teléfono de contacto del casillero es requerido.');
}

/**
 * Un courier son dos cosas inseparables: su tarifa (courier_rates) y su
 * casillero (warehouse_routes) — dirección física donde el cliente recibe y
 * prefijo con el que se genera su código. La relación es 1—1 por id de courier,
 * no por (origin, package_type): dos proveedores del mismo origen y tipo son
 * bodegas distintas y cada uno necesita su propio casillero.
 */
/**
 * El prefijo identifica al casillero dentro de los códigos que ve el cliente
 * (ej. CPF285-07). Si dos proveedores comparten prefijo, un código deja de
 * decir a qué bodega pertenece y el operador no puede rutear el paquete.
 */
async function assertPrefixAvailable(codePrefix: string, exceptCourierRateId?: number): Promise<void> {
  const routes = await WarehouseRoutesRepository.getAll();
  const clash = routes.find(
    (r) => r.code_prefix.toUpperCase() === codePrefix.toUpperCase() && r.courier_rate_id !== exceptCourierRateId,
  );
  if (clash) {
    throw new Error(`El prefijo ${codePrefix} ya lo usa otro courier. Cada casillero necesita un prefijo propio.`);
  }
}

/**
 * Normaliza los campos de texto a mayúsculas antes de persistir. La UI ya
 * enmascara mientras se escribe, pero la normalización vive también aquí porque
 * el servicio es la única puerta común: sin esto, un alta hecha desde la API
 * directamente guardaría "miami" y la misma bodega aparecería escrita de dos
 * formas distintas según el origen del dato.
 *
 * El teléfono queda fuera a propósito: son dígitos y símbolos, las mayúsculas
 * no le aplican.
 */
function normalizeInput(data: CourierRateInput): CourierRateInput {
  const upper = (value: string | null | undefined): string => (value ?? '').trim().toUpperCase();
  return {
    ...data,
    name: upper(data.name),
    origin: upper(data.origin),
    code_prefix: upper(data.code_prefix).replace(/\s+/g, ''),
    address_line: upper(data.address_line),
    city: upper(data.city),
    state: upper(data.state),
    postal_code: (data.postal_code ?? '').trim(),
    contact_phone: (data.contact_phone ?? '').trim(),
  };
}

async function syncWarehouseRoute(courierRateId: number, data: CourierRateInput): Promise<void> {
  await WarehouseRoutesRepository.upsert(courierRateId, {
    origin: data.origin.trim(),
    package_type: data.package_type,
    code_prefix: data.code_prefix.trim(),
    address_line: data.address_line?.trim() || null,
    city: data.city?.trim() || null,
    state: data.state?.trim() || null,
    postal_code: data.postal_code?.trim() || null,
    contact_phone: data.contact_phone?.trim() || null,
  });
}

export const CourierRatesService = {
  getAll: async () => {
    return CourierRatesRepository.getAllWithWarehouse();
  },

  create: async (data: CourierRateInput) => {
    // Se valida sobre el dato ya normalizado: así un campo con solo espacios
    // falla la validación en vez de guardarse como cadena vacía.
    const input = normalizeInput(data);
    validateInput(input);
    await assertPrefixAvailable(input.code_prefix);
    const created = await CourierRatesRepository.create(input);
    await syncWarehouseRoute(created.id, input);
    return created;
  },

  update: async (uuid: string, data: CourierRateInput) => {
    if (!uuid) throw new Error('Se requiere el UUID de la tarifa.');
    const input = normalizeInput(data);
    validateInput(input);
    const updated = await CourierRatesRepository.update(uuid, input);
    await assertPrefixAvailable(input.code_prefix, updated.id);
    await syncWarehouseRoute(updated.id, input);
    return updated;
  },

  setDefault: async (uuid: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la tarifa.');
    return CourierRatesRepository.setDefault(uuid);
  },

  toggleActive: async (uuid: string, isActive: boolean) => {
    if (!uuid) throw new Error('Se requiere el UUID de la tarifa.');
    const updated = await CourierRatesRepository.toggleActive(uuid, isActive);
    // El casillero sigue el estado de su tarifa: desactivar el courier debe
    // sacar su ruta del pool de asignación de códigos nuevos.
    await WarehouseRoutesRepository.setActive(updated.id, isActive);
    return updated;
  },
};
