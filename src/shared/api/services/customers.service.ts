import { Customer, CustomerInput, CustomerUpdateInput, CustomerAddressInput, CustomerAddressUpdateInput, CustomerImportRow, CustomerImportResult, CustomerWarehouseCodeInput } from '@/types/customer/customer.types';
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
  // La dirección exacta la escribe el operador a mano: se guarda en mayúsculas
  // igual que el resto de los datos del cliente. Provincia/cantón/distrito
  // vienen de resolveLocation y conservan la grafía oficial.
  return { ...addr, ...resolved, exact_address: addr.exact_address?.trim().toUpperCase() ?? addr.exact_address };
}

/**
 * Normaliza los datos identificatorios del cliente antes de tocar la base.
 *
 * Todo va en MAYÚSCULAS excepto el correo: la unicidad se valida con una
 * comparación literal (`checkExistingCustomer`), así que si el mismo correo
 * entrara con distinta caja se colaría un duplicado; y Resend recibe la
 * dirección tal como se guarda. Debe aplicarse ANTES de las validaciones de
 * duplicados, no después, o se validaría un valor distinto al que se inserta.
 */
function normalizeCustomerIdentity<T extends {
  first_name?: string;
  last_name?: string;
  email?: string;
  id_card?: string;
}>(data: T): T {
  return {
    ...data,
    ...(data.first_name != null && { first_name: data.first_name.trim().toUpperCase() }),
    ...(data.last_name != null && { last_name: data.last_name.trim().toUpperCase() }),
    ...(data.id_card != null && { id_card: data.id_card.trim().toUpperCase() }),
    ...(data.email != null && { email: data.email.trim().toLowerCase() }),
  };
}

/**
 * Traduce la columna `couriers` de la plantilla (nombres separados por coma) a
 * los ids de ruta de casillero que el repositorio necesita. Se hace una sola
 * vez para todo el archivo — no una consulta por fila — y se falla antes de
 * insertar nada: un nombre mal escrito debe detener la importación completa,
 * no dejar la mitad de los clientes con el casillero equivocado.
 */
async function resolveImportCouriers(rows: CustomerImportRow[]): Promise<void> {
  const needsResolution = rows.some((r) => r.couriers?.trim() || r.customer_code?.trim());
  if (!needsResolution) return;

  const rates = await CourierRatesRepository.getAllWithWarehouse();
  const byName = new Map(rates.map((r) => [r.name.trim().toLowerCase(), r]));

  for (const row of rows) {
    const raw = row.couriers?.trim();
    // La plantilla admite un solo código manual por cliente: se aplica al
    // primer courier de la fila. Sin couriers, el repositorio usa el
    // predeterminado y el código va ahí.
    const manualCode = row.customer_code?.trim().toUpperCase() || null;

    if (!raw) {
      if (manualCode) {
        const fallback = await WarehouseRoutesRepository.getDefaultRoute();
        if (!fallback) {
          throw new Error(`Fila con cédula ${row.id_card}: hay un código manual pero no existe un courier predeterminado al cual asignarlo.`);
        }
        row.warehouse_codes = [{ warehouse_route_id: fallback.id, code: manualCode }];
      }
      continue;
    }

    const names = raw.split(',').map((n) => n.trim()).filter(Boolean);
    const codes: CustomerWarehouseCodeInput[] = [];

    for (const name of names) {
      const rate = byName.get(name.toLowerCase());
      if (!rate) {
        throw new Error(`Fila con cédula ${row.id_card}: el courier "${name}" no existe. Couriers disponibles: ${rates.map((r) => r.name).join(', ')}.`);
      }
      if (!rate.is_active) {
        throw new Error(`Fila con cédula ${row.id_card}: el courier "${rate.name}" está inactivo y no puede asignarse.`);
      }
      const route = await WarehouseRoutesRepository.getActiveRouteByCourier(rate.id);
      if (!route) {
        throw new Error(`Fila con cédula ${row.id_card}: el courier "${rate.name}" no tiene casillero configurado.`);
      }
      // Un cliente no puede tener dos veces la misma ruta: la tabla de unión lo
      // rechazaría a mitad de la importación.
      if (codes.some((c) => c.warehouse_route_id === route.id)) continue;
      codes.push({
        warehouse_route_id: route.id,
        code: codes.length === 0 ? manualCode : null,
      });
    }

    row.warehouse_codes = codes;
  }
}

/**
 * Días sin registrar un paquete tras los cuales un cliente pasa a inactivo.
 * Lo aplica el cron diario (/api/cron/deactivate-inactive-customers).
 */
export const INACTIVITY_THRESHOLD_DAYS = 40;

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

    data = normalizeCustomerIdentity(data);
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

    // Códigos manuales: se respetan tal cual, cada uno en SU casillero, pero
    // ninguno puede pisar el de otro cliente. Los que se omiten los genera el
    // repositorio a partir del contador de la ruta.
    const normalizedCodes: CustomerWarehouseCodeInput[] = [];
    const seenCodes = new Set<string>();

    for (const entry of data.warehouse_codes ?? []) {
      const code = entry.code?.trim().toUpperCase();
      if (!code) {
        normalizedCodes.push({ warehouse_route_id: entry.warehouse_route_id, code: null });
        continue;
      }

      // Dos casilleros del mismo cliente tampoco pueden compartir código: la
      // validación contra la BD no los ve porque ninguno está insertado aún.
      if (seenCodes.has(code)) {
        throw new Error(`El código ${code} está repetido en dos casilleros del mismo cliente.`);
      }
      seenCodes.add(code);

      const codeTaken = await CustomerRepo.existsByCustomerCode(code);
      if (codeTaken) {
        throw new Error(`El código ${code} ya está asignado a otro cliente.`);
      }
      normalizedCodes.push({ warehouse_route_id: entry.warehouse_route_id, code });
    }

    data.warehouse_codes = normalizedCodes;

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

    // Validar conflictos de datos entre filas del mismo id_card antes de insertar.
    // La normalización va primero: dos filas del mismo cliente escritas con
    // distinta caja deben agruparse, no reportarse como "datos distintos".
    const seen = new Map<string, { email: string; first_name: string; last_name: string }>();
    for (let i = 0; i < rows.length; i++) {
      rows[i] = normalizeCustomerIdentity(rows[i]);
      const row = rows[i];
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
      row.exact_address = row.exact_address.trim().toUpperCase();

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

  /**
   * Guarda una sola dirección (alta o edición) sin tocar el resto del cliente —
   * lo que usa el modal de direcciones del detalle.
   */
  saveCustomerAddress: async (customerId: string, addr: CustomerAddressUpdateInput) => {
    if (!customerId) throw new Error('El ID del cliente es requerido.');
    if (!addr?.exact_address?.trim()) throw new Error('La dirección exacta es requerida.');

    const normalized = validateAndNormalizeAddress(addr);
    return CustomerRepo.upsertCustomerAddress(customerId, normalized);
  },

  removeCustomerAddress: async (customerId: string, addressId: string) => {
    if (!customerId) throw new Error('El ID del cliente es requerido.');
    if (!addressId) throw new Error('El ID de la dirección es requerido.');
    return CustomerRepo.deleteCustomerAddress(customerId, addressId);
  },

  /**
   * Desactiva clientes sin actividad reciente. Lo invoca el cron diario.
   * El umbral es configurable para poder correrlo con otro valor a mano, pero
   * el default (40 días) es el acordado con el negocio.
   */
  deactivateInactiveCustomers: async (days = INACTIVITY_THRESHOLD_DAYS) => {
    if (!Number.isInteger(days) || days < 1) {
      throw new Error('El umbral de días debe ser un entero mayor a 0.');
    }
    const deactivated = await CustomerRepo.deactivateInactiveCustomers(days);
    return { days, count: deactivated.length, customers: deactivated };
  },

  /**
   * Quita un casillero al cliente.
   *
   * Se bloquea en dos casos: si es el único (quedaría sin poder recibir nada) y
   * si ya registró paquetes por ese courier (el código es parte del historial).
   * Si el que se va era el código principal, otro toma su lugar en
   * `customers.customer_code` — esa columna la leen listados, PDFs y tracking, y
   * dejarla apuntando a un casillero borrado rompería la búsqueda del cliente.
   */
  removeCustomerWarehouseCode: async (customerId: string, warehouseRouteId: number) => {
    if (!customerId) throw new Error('El ID del cliente es requerido.');
    if (!warehouseRouteId) throw new Error('La ruta del casillero es requerida.');

    const customer = await CustomerRepo.getCustomerById(customerId);
    if (!customer) throw new Error('Cliente no encontrado.');

    const target = customer.warehouse_codes.find((wc) => wc.warehouse_route_id === warehouseRouteId);
    if (!target) throw new Error('El cliente no tiene un casillero en ese courier.');

    if (customer.warehouse_codes.length <= 1) {
      throw new Error('El cliente debe conservar al menos un casillero: sin uno no puede recibir paquetes.');
    }

    const packageCount = await WarehouseRoutesRepository.countPackagesForCustomerRoute(
      customerId,
      warehouseRouteId,
    );
    if (packageCount > 0) {
      throw new Error(
        `No se puede quitar el casillero ${target.code}: el cliente ya registró ${packageCount} paquete(s) con ${target.courier_name}.`,
      );
    }

    await WarehouseRoutesRepository.removeCustomerCode(customerId, warehouseRouteId);

    if (customer.customer_code === target.code) {
      const replacement = customer.warehouse_codes.find(
        (wc) => wc.warehouse_route_id !== warehouseRouteId,
      );
      if (replacement) {
        await CustomerRepo.updateCustomerCode(customerId, replacement.code);
      }
    }

    return CustomerRepo.getCustomerById(customerId);
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
    data = normalizeCustomerIdentity(data);
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
