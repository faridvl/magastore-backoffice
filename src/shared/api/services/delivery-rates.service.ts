import { DeliveryRatesRepository } from '../repositories/delivery-rates.repo';
import { DeliveryMethodsRepository } from '../repositories/delivery-methods.repo';
import { DeliveryRateInput } from '@/types/logistics/logistics.types';

function validateInput(data: DeliveryRateInput): void {
  if (!data.delivery_method) throw new Error('El método de envío es requerido.');
  if (data.min_weight_kg == null || data.max_weight_kg == null) {
    throw new Error('El rango de peso (mínimo y máximo) es requerido.');
  }
  if (data.min_weight_kg < 0) throw new Error('El peso mínimo no puede ser negativo.');
  if (data.fee_crc == null || data.fee_crc < 0) throw new Error('El cobro al cliente debe ser un monto válido.');
  if (data.cost_crc != null && data.cost_crc < 0) throw new Error('El costo real no puede ser negativo.');
}

// Valida contra el catálogo antes de tocar la BD — sin esto, un code inexistente
// (carrera con otra pestaña que lo desactivó/borró, o llamada directa a la API)
// llega crudo hasta el FK de Postgres y el usuario ve el error técnico sin traducir.
async function assertDeliveryMethodExists(code: string): Promise<void> {
  const method = await DeliveryMethodsRepository.findByCode(code);
  if (!method) {
    throw new Error(`El método de entrega "${code}" no existe o fue eliminado.`);
  }
}

export const DeliveryRatesService = {
  getAll: async () => {
    return DeliveryRatesRepository.getAll();
  },

  create: async (data: DeliveryRateInput) => {
    validateInput(data);
    await assertDeliveryMethodExists(data.delivery_method);
    return DeliveryRatesRepository.create(data);
  },

  update: async (uuid: string, data: DeliveryRateInput) => {
    if (!uuid) throw new Error('Se requiere el UUID de la tarifa.');
    validateInput(data);
    await assertDeliveryMethodExists(data.delivery_method);
    return DeliveryRatesRepository.update(uuid, data);
  },

  toggleActive: async (uuid: string, isActive: boolean) => {
    if (!uuid) throw new Error('Se requiere el UUID de la tarifa.');
    return DeliveryRatesRepository.toggleActive(uuid, isActive);
  },

  remove: async (uuid: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la tarifa.');
    return DeliveryRatesRepository.remove(uuid);
  },
};
