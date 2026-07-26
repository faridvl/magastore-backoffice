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
 * Una ruta de courier son dos cosas inseparables: su tarifa (courier_rates) y
 * su casillero (warehouse_routes) — dirección física donde el cliente recibe y
 * prefijo con el que se genera su código. Ambas comparten la clave natural
 * (origin, package_type), así que se administran juntas: dar de alta un courier
 * nuevo implica dar de alta el casillero con el que sus clientes van a operar.
 */
async function syncWarehouseRoute(data: CourierRateInput): Promise<void> {
  await WarehouseRoutesRepository.upsert({
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
    validateInput(data);
    const created = await CourierRatesRepository.create(data);
    await syncWarehouseRoute(data);
    return created;
  },

  update: async (uuid: string, data: CourierRateInput) => {
    if (!uuid) throw new Error('Se requiere el UUID de la tarifa.');
    validateInput(data);
    const updated = await CourierRatesRepository.update(uuid, data);
    await syncWarehouseRoute(data);
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
    await WarehouseRoutesRepository.setActive(updated.origin, updated.package_type, isActive);
    return updated;
  },
};
