import sql from '@/lib/db';
import { Customer, CustomerInput, CustomerAddress, CustomerUpdateInput, CustomerAddressUpdateInput, CustomerImportRow, CustomerImportResult, CustomerWarehouseCodeInput } from '@/types/customer/customer.types';
import { WarehouseRoutesRepository } from './warehouse-routes.repo';

/**
 * Resuelve los casilleros de un cliente nuevo: uno por cada ruta elegida, cada
 * uno con su propio código opcional.
 *
 * El primero manda — su código es el que se guarda en `customers.customer_code`,
 * la columna que el resto del sistema usa para buscar y mostrar al cliente.
 *
 * Cada código explícito aplica a SU ruta, no a la primera del arreglo: antes
 * había un único código suelto que se pegaba a `routes[0]`, así que el código
 * manual de un cliente terminaba en el courier equivocado según el orden en que
 * el operador hubiera marcado los checkboxes.
 *
 * Debe llamarse dentro de una transacción — el incremento de los contadores
 * solo se revierte si el ROLLBACK lo alcanza.
 */
async function resolveCustomerCodes(
  warehouseCodes?: CustomerWarehouseCodeInput[],
): Promise<{ primaryCode: string; assignments: { warehouseRouteId: number; code: string }[] }> {
  // Deduplicadas por ruta: la tabla de unión rechaza dos filas del mismo par
  // (cliente, ruta) y abortaría la transacción a mitad del alta. Se conserva la
  // primera aparición, que es la que trae el código que escribió el operador.
  const byRoute = new Map<number, CustomerWarehouseCodeInput>();
  for (const entry of warehouseCodes ?? []) {
    if (!byRoute.has(entry.warehouse_route_id)) byRoute.set(entry.warehouse_route_id, entry);
  }
  let requested = Array.from(byRoute.values());

  // Sin rutas explícitas se usa la del courier predeterminado, para que ningún
  // cliente quede sin casillero (import masivo y altas rápidas).
  if (requested.length === 0) {
    const fallback = await WarehouseRoutesRepository.getDefaultRoute();
    if (!fallback) {
      throw new Error('No hay un courier predeterminado configurado. Elige al menos un courier para el cliente.');
    }
    requested = [{ warehouse_route_id: fallback.id }];
  }

  const assignments: { warehouseRouteId: number; code: string }[] = [];

  for (const { warehouse_route_id: routeId, code } of requested) {
    const trimmed = code?.trim();

    if (trimmed) {
      const route = await WarehouseRoutesRepository.getById(routeId);
      // Si el código sigue el prefijo de la ruta, se adelanta el contador para
      // que la próxima alta automática no genere ese mismo número.
      if (route && trimmed.startsWith(route.code_prefix)) {
        const counterValue = parseInt(trimmed.slice(route.code_prefix.length), 10);
        if (!Number.isNaN(counterValue)) {
          await WarehouseRoutesRepository.advanceCounterIfHigher(route.id, counterValue);
        }
      }
      assignments.push({ warehouseRouteId: routeId, code: trimmed });
      continue;
    }

    const generated = await WarehouseRoutesRepository.incrementAndGetCodeById(routeId);
    assignments.push({ warehouseRouteId: routeId, code: generated });
  }

  return { primaryCode: assignments[0].code, assignments };
}

/**
 * Verifica si ya existe un cliente con ese código de casillero.
 *
 * Mira las dos tablas: `customers.customer_code` guarda solo el código primario,
 * pero los casilleros secundarios viven en `customer_warehouse_codes`. Revisar
 * solo la primera dejaba pasar un código manual que chocaba con el segundo
 * casillero de otro cliente.
 */
export const existsByCustomerCode = async (code: string): Promise<boolean> => {
  const rows = await sql`
    SELECT 1 FROM customers WHERE customer_code = ${code}
    UNION ALL
    SELECT 1 FROM customer_warehouse_codes WHERE code = ${code}
    LIMIT 1
  `;
  return rows.length > 0;
};

/**
 * Verifica si ya existe un cliente por identificación o email
 */
export const checkExistingCustomer = async (idCard: string, email: string): Promise<boolean> => {
  const result = await sql`
    SELECT id FROM customers 
    WHERE id_card = ${idCard} OR email = ${email} 
    LIMIT 1
  `;
  return result.length > 0;
};

/**
 * Inserta cliente y múltiples direcciones en una sola transacción SQL (WITH)
 */
export const createCustomerWithAddresses = async (data: CustomerInput): Promise<Customer> => {
  const addressesJson = JSON.stringify(data.addresses);

  try {
    await sql`BEGIN`;

    // Un casillero por cada courier elegido. Si algo falla después, el ROLLBACK
    // también revierte los contadores.
    const { primaryCode: code, assignments } = await resolveCustomerCodes(data.warehouse_codes);

    const rows = await sql`
      WITH new_cust AS (
        INSERT INTO customers (
          id_card,
          id_type,
          first_name,
          last_name,
          email,
          phone,
          customer_code,
          customer_type_id
        )
        VALUES (
          ${data.id_card},
          ${data.id_type},
          ${data.first_name},
          ${data.last_name},
          ${data.email},
          ${data.phone},
          ${code},
          COALESCE(
            ${data.customer_type_id ?? null},
            (SELECT id FROM customer_types WHERE billing_mode = 'NORMAL' AND is_active = true ORDER BY id LIMIT 1)
          )
        )
        RETURNING *
      ),
      ins_addr AS (
        INSERT INTO customer_addresses (
          customer_id, province, canton, district, exact_address, address_label, is_default
        )
        SELECT
          new_cust.id,
          (addr->>'province'),
          (addr->>'canton'),
          (addr->>'district'),
          (addr->>'exact_address'),
          COALESCE(addr->>'address_label', 'Casa'),
          COALESCE((addr->>'is_default')::boolean, false)
        FROM new_cust, jsonb_array_elements(${addressesJson}::jsonb) AS addr
        RETURNING *
      )
      SELECT
        nc.*,
        COALESCE((SELECT json_agg(ia.*) FROM ins_addr ia), '[]'::json) as addresses_list
      FROM new_cust nc;
    `;

    if (!rows || rows.length === 0) {
      throw new Error('Error crítico: La base de datos no retornó el registro creado.');
    }

    for (const a of assignments) {
      await WarehouseRoutesRepository.assignCodeToCustomer(rows[0].id, a.warehouseRouteId, a.code);
    }

    await sql`COMMIT`;
    return mapRowToCustomer(rows[0]);
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
};
/**
 * Obtiene lista paginada de clientes (sin direcciones para ligereza)
 */
export const getPaginatedCustomers = async (
  page: number,
  limit: number,
): Promise<{ data: Customer[]; total: number }> => {
  const offset = (page - 1) * limit;

  const [customers, totalResult] = await Promise.all([
    // El tipo de cliente viaja en el listado porque el alta de paquetes calcula
    // el cobro en vivo desde el cliente seleccionado aquí: sin billing_mode
    // mostraría precio de lista a un cliente AL_COSTO o con descuento.
    sql`
      SELECT c.id, c.id_card, c.id_type, c.first_name, c.last_name, c.email, c.phone,
             c.customer_code, c.is_active, c.created_at, c.customer_type_id,
             ct.name AS customer_type_name,
             ct.billing_mode AS customer_type_billing_mode,
             ct.discount_percent AS customer_type_discount_percent
      FROM customers c
      LEFT JOIN customer_types ct ON ct.id = c.customer_type_id
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*) as total FROM customers`,
  ]);

  return {
    data: customers.map((row) => mapRowToCustomer(row)),
    total: parseInt(totalResult[0].total, 10),
  };
};

/**
 * Obtiene cliente por ID incluyendo sus direcciones
 */
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  const rows = await sql`
    SELECT c.*,
      (SELECT json_agg(ca.*) FROM customer_addresses ca WHERE ca.customer_id = c.id) as addresses_list,
      (
        SELECT json_agg(json_build_object(
          'code', cwc.code, 'warehouse_route_id', wr.id,
          'courier_name', cr.name,
          'origin', wr.origin, 'package_type', wr.package_type,
          'address_line', wr.address_line, 'city', wr.city, 'state', wr.state,
          'postal_code', wr.postal_code, 'contact_phone', wr.contact_phone
        ))
        FROM customer_warehouse_codes cwc
        JOIN warehouse_routes wr ON wr.id = cwc.warehouse_route_id
        JOIN courier_rates cr ON cr.id = wr.courier_rate_id
        WHERE cwc.customer_id = c.id
      ) as warehouse_codes_list,
      ct.name AS customer_type_name,
      ct.billing_mode AS customer_type_billing_mode,
      ct.discount_percent AS customer_type_discount_percent
    FROM customers c
    LEFT JOIN customer_types ct ON ct.id = c.customer_type_id
    WHERE c.id = ${id} LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  return mapRowToCustomer(rows[0]);
};

/**
 * Obtiene las direcciones de un cliente por su ID
 */
export const getCustomerAddresses = async (customerId: string): Promise<CustomerAddress[]> => {
  const rows = await sql`
    SELECT id, customer_id, province, canton, district, exact_address, address_label, is_default, created_at
    FROM customer_addresses
    WHERE customer_id = ${customerId}
    ORDER BY is_default DESC, created_at ASC
  `;
  return rows as CustomerAddress[];
};

/**
 * Alta o edición de UNA dirección, sin tocar el resto del cliente. El modal de
 * direcciones del detalle usa esto en vez del update completo: guardar una
 * dirección no debería reenviar nombre, correo y tipo de cliente.
 *
 * Marcar una como principal desmarca las demás dentro de la misma transacción —
 * si no, el cliente podría quedar con dos principales y el alta de órdenes
 * elegiría cualquiera.
 */
export const upsertCustomerAddress = async (
  customerId: string,
  addr: CustomerAddressUpdateInput,
): Promise<CustomerAddress[]> => {
  try {
    await sql`BEGIN`;

    if (addr.is_default) {
      await sql`UPDATE customer_addresses SET is_default = false WHERE customer_id = ${customerId}`;
    }

    if (addr.id) {
      const [updated] = await sql`
        UPDATE customer_addresses SET
          province      = ${addr.province},
          canton        = ${addr.canton},
          district      = ${addr.district},
          exact_address = ${addr.exact_address},
          address_label = ${addr.address_label ?? 'Casa'},
          is_default    = ${addr.is_default ?? false}
        WHERE id = ${addr.id} AND customer_id = ${customerId}
        RETURNING id
      `;
      if (!updated) throw new Error('La dirección no existe o no pertenece a este cliente.');
    } else {
      await sql`
        INSERT INTO customer_addresses (customer_id, province, canton, district, exact_address, address_label, is_default)
        VALUES (${customerId}, ${addr.province}, ${addr.canton}, ${addr.district}, ${addr.exact_address}, ${addr.address_label ?? 'Casa'}, ${addr.is_default ?? false})
      `;
    }

    // Todo cliente necesita una principal: si la que se acaba de guardar no lo
    // es y ninguna otra lo era, se promueve la más antigua.
    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM customer_addresses
      WHERE customer_id = ${customerId} AND is_default = true
    `;
    if (Number(count) === 0) {
      await sql`
        UPDATE customer_addresses SET is_default = true
        WHERE id = (
          SELECT id FROM customer_addresses
          WHERE customer_id = ${customerId} ORDER BY created_at ASC LIMIT 1
        )
      `;
    }

    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }

  return getCustomerAddresses(customerId);
};

/**
 * Elimina una dirección. Se bloquea la última: el alta de órdenes de envío
 * exige una dirección de entrega y un cliente sin ninguna quedaría inoperable.
 */
export const deleteCustomerAddress = async (
  customerId: string,
  addressId: string,
): Promise<CustomerAddress[]> => {
  const existing = await getCustomerAddresses(customerId);
  if (existing.length <= 1) {
    throw new Error('El cliente debe conservar al menos una dirección.');
  }

  const target = existing.find((a) => a.id === addressId);
  if (!target) throw new Error('La dirección no existe o no pertenece a este cliente.');

  try {
    await sql`BEGIN`;
    await sql`DELETE FROM customer_addresses WHERE id = ${addressId} AND customer_id = ${customerId}`;

    // Si se borró la principal, la más antigua toma su lugar.
    if (target.is_default) {
      await sql`
        UPDATE customer_addresses SET is_default = true
        WHERE id = (
          SELECT id FROM customer_addresses
          WHERE customer_id = ${customerId} ORDER BY created_at ASC LIMIT 1
        )
      `;
    }
    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }

  return getCustomerAddresses(customerId);
};

/**
 * Verifica si el email ya está tomado por otro cliente (para validación en edición)
 */
export const checkExistingCustomerByIdCardExcluding = async (idCard: string, excludeId: string): Promise<boolean> => {
  const result = await sql`
    SELECT id FROM customers
    WHERE id_card = ${idCard} AND id != ${excludeId}
    LIMIT 1
  `;
  return result.length > 0;
};

export const checkEmailTakenByOther = async (email: string, excludeId: string): Promise<boolean> => {
  const result = await sql`
    SELECT id FROM customers
    WHERE email = ${email} AND id != ${excludeId}
    LIMIT 1
  `;
  return result.length > 0;
};

/**
 * Actualiza datos del cliente y sus direcciones existentes
 */
export const updateCustomer = async (id: string, data: CustomerUpdateInput): Promise<Customer> => {
  await sql`
    UPDATE customers
    SET
      first_name = ${data.first_name},
      last_name  = ${data.last_name},
      email      = ${data.email},
      phone      = ${data.phone},
      is_active  = ${data.is_active},
      id_card    = COALESCE(${data.id_card ?? null}, id_card),
      id_type    = COALESCE(${data.id_type ?? null}, id_type),
      customer_type_id = COALESCE(${data.customer_type_id ?? null}, customer_type_id)
    WHERE id = ${id}
  `;

  if (data.addresses && data.addresses.length > 0) {
    for (const addr of data.addresses) {
      if (addr.id) {
        await sql`
          UPDATE customer_addresses SET
            province      = ${addr.province},
            canton        = ${addr.canton},
            district      = ${addr.district},
            exact_address = ${addr.exact_address},
            address_label = ${addr.address_label ?? 'Casa'},
            is_default    = ${addr.is_default ?? false}
          WHERE id = ${addr.id} AND customer_id = ${id}
        `;
      } else {
        await sql`
          INSERT INTO customer_addresses (customer_id, province, canton, district, exact_address, address_label, is_default)
          VALUES (${id}, ${addr.province}, ${addr.canton}, ${addr.district}, ${addr.exact_address}, ${addr.address_label ?? 'Casa'}, ${addr.is_default ?? false})
        `;
      }
    }
  }

  const updated = await getCustomerById(id);
  if (!updated) throw new Error('Cliente no encontrado después de actualizar.');
  return updated;
};

export const getPackagesByCustomer = async (customerId: string): Promise<{
  uuid: string;
  tracking_number: string;
  weight_lb: string;
  status: string;
  arrival_date: string;
  courier_rate_name: string | null;
  courier_cost_usd: string | null;
  insurance_applied: boolean;
  consolidation_uuid: string | null;
  consolidation_status: string | null;
}[]> => {
  const rows = await sql`
    SELECT
      p.uuid,
      p.tracking_number,
      p.weight_lb,
      p.status,
      p.arrival_date,
      p.courier_cost_usd,
      p.insurance_applied,
      cr.name AS courier_rate_name,
      con.uuid AS consolidation_uuid,
      con.status AS consolidation_status
    FROM packages p
    LEFT JOIN courier_rates cr ON p.courier_rate_id = cr.id
    LEFT JOIN consolidations con ON p.consolidation_id = con.id
    WHERE p.customer_id = ${customerId}
    ORDER BY p.created_at DESC
  `;
  return rows as any[];
};

export interface CustomerMetricsRow {
  package_count: number;
  total_weight_lb: number;
  first_package_date: string | null;
  last_package_date: string | null;
  total_billed_crc: number;
}

/**
 * Métricas reales del cliente para la cabecera de su detalle: conteo y peso
 * de paquetes, fechas de actividad, y total facturado (via billing→consolidations).
 */
export const getCustomerMetrics = async (customerId: string): Promise<CustomerMetricsRow> => {
  const [row] = await sql`
    SELECT
      (SELECT COUNT(*) FROM packages p WHERE p.customer_id = ${customerId}) AS package_count,
      (SELECT COALESCE(SUM(p.weight_lb), 0) FROM packages p WHERE p.customer_id = ${customerId}) AS total_weight_lb,
      (SELECT MIN(p.created_at) FROM packages p WHERE p.customer_id = ${customerId}) AS first_package_date,
      (SELECT MAX(p.created_at) FROM packages p WHERE p.customer_id = ${customerId}) AS last_package_date,
      (
        SELECT COALESCE(SUM(b.total_amount_crc), 0)
        FROM billing b
        JOIN consolidations con ON con.id = b.consolidation_id
        WHERE con.customer_id = ${customerId}
      ) AS total_billed_crc
  `;
  return row as unknown as CustomerMetricsRow;
};

/**
 * Reemplaza el código principal del cliente. `customers.customer_code` es la
 * columna que leen listados, PDFs y la página pública de tracking, así que si
 * el casillero que la respaldaba se elimina, otro debe ocupar su lugar.
 */
export const updateCustomerCode = async (customerId: string, code: string): Promise<void> => {
  await sql`UPDATE customers SET customer_code = ${code} WHERE id = ${customerId}`;
};

export interface DeactivatedCustomerRow {
  customer_code: string;
  first_name: string;
  last_name: string;
  last_package_at: string | null;
}

/**
 * Marca como inactivo a todo cliente activo que lleve más de `days` días sin
 * registrar un paquete. Un cliente sin ningún paquete se mide desde su fecha de
 * alta — si no, alguien registrado hace meses y que nunca envió nada seguiría
 * contando como activo para siempre.
 *
 * Un solo UPDATE con subconsulta: recorrer clientes en la aplicación sería N+1
 * sobre packages. Devuelve las filas afectadas para poder reportarlas.
 */
export const deactivateInactiveCustomers = async (days: number): Promise<DeactivatedCustomerRow[]> => {
  const rows = await sql`
    WITH stale AS (
      SELECT c.id,
             (SELECT MAX(p.created_at) FROM packages p WHERE p.customer_id = c.id) AS last_package_at
      FROM customers c
      WHERE c.is_active = true
    )
    UPDATE customers c
    SET is_active = false
    FROM stale s
    WHERE c.id = s.id
      AND COALESCE(s.last_package_at, c.created_at) < NOW() - (${days} || ' days')::interval
    RETURNING c.customer_code, c.first_name, c.last_name, s.last_package_at
  `;
  return rows as unknown as DeactivatedCustomerRow[];
};

export const checkCustomerCodeExists = async (code: string): Promise<boolean> => {
  const result = await sql`SELECT id FROM customers WHERE customer_code = ${code} LIMIT 1`;
  return result.length > 0;
};

export const importCustomers = async (rows: CustomerImportRow[]): Promise<CustomerImportResult> => {
  // Agrupar filas por id_card
  const grouped = new Map<string, { meta: Omit<CustomerImportRow, 'province' | 'canton' | 'district' | 'exact_address' | 'address_label' | 'is_default'>; addresses: { province: string; canton: string; district: string; exact_address: string; address_label: string; is_default: boolean }[] }>();

  for (const row of rows) {
    if (grouped.has(row.id_card)) {
      const existing = grouped.get(row.id_card)!;
      existing.addresses.push({
        province: row.province,
        canton: row.canton,
        district: row.district,
        exact_address: row.exact_address,
        address_label: row.address_label ?? 'Casa',
        is_default: row.is_default ?? false,
      });
    } else {
      grouped.set(row.id_card, {
        meta: {
          id_card: row.id_card,
          id_type: row.id_type,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone,
          customer_code: row.customer_code,
          warehouse_codes: row.warehouse_codes,
        },
        addresses: [{
          province: row.province,
          canton: row.canton,
          district: row.district,
          exact_address: row.exact_address,
          address_label: row.address_label ?? 'Casa',
          is_default: row.is_default ?? false,
        }],
      });
    }
  }

  let inserted = 0;
  const errors: { id_card: string; reason: string }[] = [];

  for (const [id_card, { meta, addresses }] of Array.from(grouped.entries())) {
    try {
      // Asegurar exactamente una dirección default
      const hasDefault = addresses.some((a: { is_default: boolean }) => a.is_default);
      if (!hasDefault) addresses[0].is_default = true;

      const addressesJson = JSON.stringify(addresses);

      if (meta.customer_code) {
        const codeExists = await checkCustomerCodeExists(meta.customer_code);
        if (codeExists) {
          errors.push({ id_card, reason: `El código ${meta.customer_code} ya está en uso.` });
          continue;
        }
      }

      await sql`BEGIN`;
      try {
        // Código explícito de importación (cliente real ya asignado en otro
        // sistema) vs. generado atómico para altas nuevas sin código propio.
        // Las rutas vienen resueltas desde el servicio a partir de la columna
        // `couriers` de la plantilla; sin ella se usa el predeterminado.
        const { primaryCode: finalCode, assignments } = await resolveCustomerCodes(meta.warehouse_codes);

        const [newCustomer] = await sql`
          WITH new_cust AS (
            INSERT INTO customers (id_card, id_type, first_name, last_name, email, phone, customer_code)
            VALUES (
              ${meta.id_card},
              ${meta.id_type},
              ${meta.first_name},
              ${meta.last_name},
              ${meta.email},
              ${meta.phone},
              ${finalCode}
            )
            RETURNING *
          ),
          ins_addr AS (
            INSERT INTO customer_addresses (customer_id, province, canton, district, exact_address, address_label, is_default)
            SELECT
              new_cust.id,
              (addr->>'province'),
              (addr->>'canton'),
              (addr->>'district'),
              (addr->>'exact_address'),
              COALESCE(addr->>'address_label', 'Casa'),
              COALESCE((addr->>'is_default')::boolean, false)
            FROM new_cust, jsonb_array_elements(${addressesJson}::jsonb) AS addr
            RETURNING 1
          )
          SELECT new_cust.id FROM new_cust
        `;

        if (newCustomer) {
          for (const a of assignments) {
            await WarehouseRoutesRepository.assignCodeToCustomer(newCustomer.id, a.warehouseRouteId, a.code);
          }
        }

        await sql`COMMIT`;
        inserted++;
      } catch (err) {
        await sql`ROLLBACK`;
        throw err;
      }
    } catch (err: any) {
      const msg: string = err.message ?? 'Error desconocido';
      if (msg.includes('customers_id_card_key') || msg.includes('duplicate key') && msg.includes('id_card')) {
        errors.push({ id_card, reason: 'La cédula ya existe en el sistema.' });
      } else if (msg.includes('customers_email_key') || msg.includes('duplicate key') && msg.includes('email')) {
        errors.push({ id_card, reason: 'El correo ya está registrado en otro cliente.' });
      } else {
        errors.push({ id_card, reason: msg });
      }
    }
  }

  return { inserted, errors };
};

/**
 * Helper interno para mapear filas de la DB al tipo Customer
 */
const mapRowToCustomer = (raw: any): Customer => ({
  id: raw.id,
  id_card: raw.id_card,
  id_type: raw.id_type,
  first_name: raw.first_name,
  last_name: raw.last_name,
  email: raw.email,
  phone: raw.phone,
  customer_code: raw.customer_code,
  is_active: raw.is_active,
  created_at: raw.created_at,
  customer_type_id: raw.customer_type_id ?? null,
  customer_type_name: raw.customer_type_name ?? null,
  customer_type_billing_mode: raw.customer_type_billing_mode ?? null,
  customer_type_discount_percent: raw.customer_type_discount_percent != null ? Number(raw.customer_type_discount_percent) : null,
  addresses: (raw.addresses_list || []).map((addr: any) => ({
    id: addr.id,
    customer_id: addr.customer_id,
    province: addr.province,
    canton: addr.canton,
    district: addr.district,
    exact_address: addr.exact_address,
    address_label: addr.address_label,
    is_default: addr.is_default,
    created_at: addr.created_at,
  })),
  warehouse_codes: (raw.warehouse_codes_list || []).map((wc: any) => ({
    code: wc.code,
    warehouse_route_id: wc.warehouse_route_id,
    courier_name: wc.courier_name,
    origin: wc.origin,
    package_type: wc.package_type,
    address_line: wc.address_line,
    city: wc.city,
    state: wc.state,
    postal_code: wc.postal_code,
    contact_phone: wc.contact_phone,
  })),
});
