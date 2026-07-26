import { Customer, CustomerInput, CustomerUpdateInput, CustomerAddressInput, CustomerAddressUpdateInput, CustomerImportRow, CustomerImportResult } from '@/types/customer/customer.types';
import * as CustomerRepo from '../repositories/customers.repo';
import { CourierRatesRepository } from '../repositories/courier-rates.repo';
import { WarehouseRoutesRepository } from '../repositories/warehouse-routes.repo';
import { PaginatedResponse } from '@/types/paginate.types';
import { resolveLocation } from '@/shared/constants/costa-rica-locations';

function validateAndNormalizeAddress<T extends CustomerAddressInput | CustomerAddressUpdateInput>(addr: T): T {
  const resolved = resolveLocation(addr.province, addr.canton, addr.district);
  if (!resolved) {
    throw new Error(
      `La combinación provincia/cantón/distrito "${addr.province} / ${addr.canton} / ${addr.district}" no coincide con la división territorial de Costa Rica.`,
    );
  }
  return { ...addr, ...resolved };
}

/**
 * Traduce la columna `couriers` de la plantilla (nombres separados por coma) a
 * los ids de ruta de casillero que el repositorio necesita. Se hace una sola
 * vez para todo el archivo — no una consulta por fila — y se falla antes de
 * insertar nada: un nombre mal escrito debe detener la importación completa,
 * no dejar la mitad de los clientes con el casillero equivocado.
 */
async function resolveImportCouriers(rows: CustomerImportRow[]): Promise<void> {
  const needsResolution = rows.some((r) => r.couriers?.trim());
  if (!needsResolution) return;

  const rates = await CourierRatesRepository.getAllWithWarehouse();
  const byName = new Map(rates.map((r) => [r.name.trim().toLowerCase(), r]));

  for (const row of rows) {
    const raw = row.couriers?.trim();
    if (!raw) continue;

    const names = raw.split(',').map((n) => n.trim()).filter(Boolean);
    const routeIds: number[] = [];

    for (const name of names) {
      const rate = byName.get(name.toLowerCase());
      if (!rate) {
        throw new Error(`Fila con cédula ${row.id_card}: el courier "${name}" no existe. Couriers disponibles: ${rates.map((r) => r.name).join(', ')}.`);
      }
      if (!rate.is_active) {
        throw new Error(`Fila con cédula ${row.id_card}: el courier "${rate.name}" está inactivo y no puede asignarse.`);
      }
      const route = await WarehouseRoutesRepository.getActiveRoute(rate.origin, rate.package_type);
      if (!route) {
        throw new Error(`Fila con cédula ${row.id_card}: el courier "${rate.name}" no tiene casillero configurado.`);
      }
      // Un cliente no puede tener dos veces la misma ruta: la tabla de unión lo
      // rechazaría a mitad de la importación.
      if (!routeIds.includes(route.id)) routeIds.push(route.id);
    }

    row.warehouse_route_ids = routeIds;
  }
}

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

    data.addresses = data.addresses.map(validateAndNormalizeAddress);

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

    // Código manual: se respeta tal cual, pero no puede pisar el de otro cliente.
    // Si se omite, el repositorio genera el siguiente de la ruta.
    const explicitCode = data.customer_code?.trim();
    if (explicitCode) {
      const codeTaken = await CustomerRepo.existsByCustomerCode(explicitCode);
      if (codeTaken) {
        throw new Error(`El código ${explicitCode} ya está asignado a otro cliente.`);
      }
      data.customer_code = explicitCode;
    } else {
      data.customer_code = null;
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
      const resolved = resolveLocation(row.province, row.canton, row.district);
      if (!resolved) {
        throw new Error(`Fila con cédula ${row.id_card}: la combinación provincia/cantón/distrito "${row.province} / ${row.canton} / ${row.district}" no coincide con la división territorial de Costa Rica.`);
      }
      row.province = resolved.province;
      row.canton = resolved.canton;
      row.district = resolved.district;

      if (seen.has(row.id_card)) {
        const prev = seen.get(row.id_card)!;
        if (prev.email !== row.email || prev.first_name !== row.first_name || prev.last_name !== row.last_name) {
          throw new Error(`La cédula ${row.id_card} aparece con datos de cliente distintos en múltiples filas.`);
        }
      } else {
        seen.set(row.id_card, { email: row.email, first_name: row.first_name, last_name: row.last_name });
      }
    }

    await resolveImportCouriers(rows);

    return CustomerRepo.importCustomers(rows);
  },

  getCustomerPackages: async (id: string) => {
    if (!id) throw new Error('El ID del cliente es requerido.');
    return CustomerRepo.getPackagesByCustomer(id);
  },

  getCustomerMetrics: async (id: string) => {
    if (!id) throw new Error('El ID del cliente es requerido.');
    return CustomerRepo.getCustomerMetrics(id);
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

    if (data.addresses) {
      data.addresses = data.addresses.map(validateAndNormalizeAddress);
    }

    try {
      return await CustomerRepo.updateCustomer(id, data);
    } catch (error: any) {
      console.error('[CustomerService.editCustomer]:', error);
      throw new Error(error.message || 'Error inesperado al actualizar el cliente.');
    }
  },
};
