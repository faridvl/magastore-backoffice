import { Customer, CustomerInput, CustomerUpdateInput, CustomerImportRow, CustomerImportResult } from '@/types/customer/customer.types';
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

  importCustomers: async (rows: CustomerImportRow[]): Promise<CustomerImportResult> => {
    if (!rows || rows.length === 0) {
      throw new Error('No se proporcionaron filas para importar.');
    }

    // Validar conflictos de datos entre filas del mismo id_card antes de insertar
    const seen = new Map<string, { email: string; first_name: string; last_name: string }>();
    for (const row of rows) {
      if (!row.id_card?.trim()) throw new Error('Una o más filas tienen la cédula vacía.');
      if (!row.email?.trim()) throw new Error(`Fila con cédula ${row.id_card}: el correo es requerido.`);
      if (!row.first_name?.trim() || !row.last_name?.trim()) throw new Error(`Fila con cédula ${row.id_card}: nombre y apellidos son requeridos.`);
      if (!row.province?.trim() || !row.canton?.trim() || !row.district?.trim() || !row.exact_address?.trim()) {
        throw new Error(`Fila con cédula ${row.id_card}: todos los campos de dirección son requeridos.`);
      }

      if (seen.has(row.id_card)) {
        const prev = seen.get(row.id_card)!;
        if (prev.email !== row.email || prev.first_name !== row.first_name || prev.last_name !== row.last_name) {
          throw new Error(`La cédula ${row.id_card} aparece con datos de cliente distintos en múltiples filas.`);
        }
      } else {
        seen.set(row.id_card, { email: row.email, first_name: row.first_name, last_name: row.last_name });
      }
    }

    return CustomerRepo.importCustomers(rows);
  },

  getCustomerPackages: async (id: string) => {
    if (!id) throw new Error('El ID del cliente es requerido.');
    return CustomerRepo.getPackagesByCustomer(id);
  },

  /**
   * Actualiza datos editables de un cliente existente
   */
  editCustomer: async (id: string, data: CustomerUpdateInput): Promise<Customer> => {
    if (!id) throw new Error('El ID del cliente es requerido.');
    if (!data.first_name?.trim()) throw new Error('El nombre es requerido.');
    if (!data.last_name?.trim()) throw new Error('Los apellidos son requeridos.');
    if (!data.email?.trim()) throw new Error('El correo electrónico es requerido.');
    if (!data.phone?.trim()) throw new Error('El teléfono es requerido.');

    const emailTaken = await CustomerRepo.checkEmailTakenByOther(data.email, id);
    if (emailTaken) {
      throw new Error('Este correo electrónico ya está registrado en otro cliente.');
    }

    if (data.id_card) {
      const idCardTaken = await CustomerRepo.checkExistingCustomerByIdCardExcluding(data.id_card, id);
      if (idCardTaken) throw new Error('Esta cédula ya está registrada en otro cliente.');
    }

    try {
      return await CustomerRepo.updateCustomer(id, data);
    } catch (error: any) {
      console.error('[CustomerService.editCustomer]:', error);
      throw new Error(error.message || 'Error inesperado al actualizar el cliente.');
    }
  },
};
