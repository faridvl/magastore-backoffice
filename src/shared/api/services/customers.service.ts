import { Customer, CustomerInput } from '@/types/customer/customer.types';
import * as CustomerRepo from '../repositories/customers.repo';
import { PaginatedResponse } from '@/types/paginate.types';

/**
 * Servicio para la gestión de clientes
 */
export const CustomerService = {
  /**
   * Registra un nuevo cliente con sus direcciones iniciales
   */
  registerCustomer: async (data: CustomerInput): Promise<Customer> => {
    if (!data.addresses || data.addresses.length === 0) {
      throw new Error('El cliente debe tener al menos una dirección registrada.');
    }

    const hasDefault = data.addresses.some((addr) => addr.is_default);
    if (!hasDefault) {
      data.addresses[0].is_default = true;
    }

    const alreadyExists = await CustomerRepo.checkExistingCustomer(data.id_card, data.email);
    if (alreadyExists) {
      throw new Error(
        'Ya existe un cliente registrado con esta identificación o correo electrónico.',
      );
    }

    try {
      return await CustomerRepo.createCustomerWithAddresses(data);
    } catch (error: any) {
      console.error('[CustomerService.registerCustomer]:', error);
      throw new Error(error.message || 'Error inesperado al procesar el registro del cliente.');
    }
  },

  /**
   * Obtiene todos los clientes con paginación
   */
  getAllCustomers: async (
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Customer>> => {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    const { data, total } = await CustomerRepo.getPaginatedCustomers(safePage, safeLimit);
    const totalPages = Math.ceil(total / safeLimit);

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
      },
    };
  },

  /**
   * Obtiene la ficha completa de un cliente por ID
   */
  getCustomerProfile: async (id: string): Promise<Customer> => {
    if (!id) throw new Error('El ID del cliente es requerido.');
    const customer = await CustomerRepo.getCustomerById(id);
    if (!customer) throw new Error('Cliente no encontrado.');
    return customer;
  },
};
