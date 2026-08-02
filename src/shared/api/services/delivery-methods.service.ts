import { DeliveryMethodsRepository } from '../repositories/delivery-methods.repo';
import { DeliveryMethodInput } from '@/types/logistics/logistics.types';

const CODE_PATTERN = /^[A-Z0-9_]+$/;

function validateInput(data: DeliveryMethodInput): void {
  if (!data.name?.trim()) throw new Error('El nombre del método de entrega es requerido.');
  if (!data.code?.trim()) throw new Error('El código del método de entrega es requerido.');
  if (!CODE_PATTERN.test(data.code.trim())) {
    throw new Error('El código solo puede tener letras mayúsculas, números y guion bajo (ej. CORREOS_CR).');
  }
}

function normalize(data: DeliveryMethodInput): DeliveryMethodInput {
  return {
    code: data.code.trim().toUpperCase(),
    name: data.name.trim(),
    requires_zone: !!data.requires_zone,
    is_pickup: !!data.is_pickup,
    // Cadena vacía → null: un '' guardado haría que el mensaje de despacho
    // incluyera una línea de enlace en blanco en vez de omitirse.
    tracking_url: data.tracking_url?.trim() || null,
  };
}

export const DeliveryMethodsService = {
  getAll: async () => {
    return DeliveryMethodsRepository.getAll();
  },

  create: async (data: DeliveryMethodInput) => {
    validateInput(data);
    return DeliveryMethodsRepository.create(normalize(data));
  },

  update: async (uuid: string, data: DeliveryMethodInput) => {
    if (!uuid) throw new Error('Se requiere el UUID del método de entrega.');
    validateInput(data);
    return DeliveryMethodsRepository.update(uuid, normalize(data));
  },

  toggleActive: async (uuid: string, isActive: boolean) => {
    if (!uuid) throw new Error('Se requiere el UUID del método de entrega.');
    if (!isActive) {
      const code = await DeliveryMethodsRepository.getCodeByUuid(uuid);
      if (!code) throw new Error('Método de entrega no encontrado.');
      const activeUsages = await DeliveryMethodsRepository.countActiveUsages(code);
      if (activeUsages > 0) {
        throw new Error(
          `No se puede desactivar: hay ${activeUsages} orden(es) sin facturar o tarifa(s) activa(s) usando este método. Ciérralas o reasígnalas primero.`,
        );
      }
    }
    return DeliveryMethodsRepository.toggleActive(uuid, isActive);
  },

  // No expuesto en la UI todavía (D3 solo ofrece desactivar), pero disponible para
  // el caso de un método creado por error y sin ningún uso registrado.
  remove: async (uuid: string, code: string) => {
    if (!uuid) throw new Error('Se requiere el UUID del método de entrega.');
    const usages = await DeliveryMethodsRepository.countUsages(code);
    if (usages > 0) {
      throw new Error(
        `No se puede eliminar: ${usages} orden(es), tarifa(s) o factura(s) usan este método. Desactívalo en su lugar.`,
      );
    }
    return DeliveryMethodsRepository.remove(uuid);
  },
};
