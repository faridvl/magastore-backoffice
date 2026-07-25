import { CustomerTypesRepository } from '../repositories/customer-types.repo';
import { CustomerBillingMode, CustomerTypeInput } from '@/types/customer/customer.types';

const VALID_MODES = Object.values(CustomerBillingMode) as string[];

function validateInput(data: CustomerTypeInput): void {
  if (!data.name?.trim()) throw new Error('El nombre del tipo de cliente es requerido.');
  if (!VALID_MODES.includes(data.billing_mode)) {
    throw new Error('El modo de cobro no es válido.');
  }
  if (data.billing_mode === CustomerBillingMode.DESCUENTO) {
    if (data.discount_percent == null || data.discount_percent <= 0 || data.discount_percent > 100) {
      throw new Error('El descuento debe ser mayor a 0 y hasta 100.');
    }
  }
}

/** Los modos sin descuento siempre guardan 0, para que el dato no quede inconsistente. */
function normalize(data: CustomerTypeInput): CustomerTypeInput {
  return {
    name: data.name.trim(),
    billing_mode: data.billing_mode,
    discount_percent: data.billing_mode === CustomerBillingMode.DESCUENTO ? Number(data.discount_percent) : 0,
  };
}

export const CustomerTypesService = {
  getAll: async () => {
    return CustomerTypesRepository.getAll();
  },

  create: async (data: CustomerTypeInput) => {
    validateInput(data);
    return CustomerTypesRepository.create(normalize(data));
  },

  update: async (uuid: string, data: CustomerTypeInput) => {
    if (!uuid) throw new Error('Se requiere el UUID del tipo de cliente.');
    validateInput(data);
    return CustomerTypesRepository.update(uuid, normalize(data));
  },

  toggleActive: async (uuid: string, isActive: boolean) => {
    if (!uuid) throw new Error('Se requiere el UUID del tipo de cliente.');
    if (!isActive) {
      const assigned = await CustomerTypesRepository.countCustomers(uuid);
      if (assigned > 0) {
        throw new Error(
          `No se puede desactivar: ${assigned} cliente${assigned !== 1 ? 's' : ''} tiene${assigned !== 1 ? 'n' : ''} este tipo asignado. Reasígnalos primero.`,
        );
      }
    }
    return CustomerTypesRepository.toggleActive(uuid, isActive);
  },
};
