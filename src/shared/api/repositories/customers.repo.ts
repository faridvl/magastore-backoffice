import sql from '@/lib/db';
import { Customer, CustomerInput, CustomerAddress, CustomerUpdateInput, CustomerImportRow, CustomerImportResult } from '@/types/customer/customer.types';
import { WarehouseRoutesRepository } from './warehouse-routes.repo';

/**
 * Resuelve los casilleros de un cliente nuevo: uno por cada ruta elegida.
 *
 * El primero manda — su código es el que se guarda en `customers.customer_code`,
 * la columna que el resto del sistema usa para buscar y mostrar al cliente. Un
 * código explícito (cliente que ya tenía casillero antes de entrar al sistema)
 * solo aplica a esa primera ruta; las demás se generan.
 *
 * Debe llamarse dentro de una transacción — el incremento de los contadores
 * solo se revierte si el ROLLBACK lo alcanza.
 */
async function resolveCustomerCodes(
  explicitCode?: string | null,
  routeIds?: number[],
): Promise<{ primaryCode: string; assignments: { warehouseRouteId: number; code: string }[] }> {
  const trimmed = explicitCode?.trim();

  // Sin rutas explícitas se usa la del courier predeterminado, para que ningún
  // cliente quede sin casillero (import masivo y altas rápidas).
  // Deduplicadas: la tabla de unión rechaza dos filas del mismo par
  // (cliente, ruta) y abortaría la transacción a mitad del alta.
  let routes = Array.from(new Set(routeIds ?? []));
  if (routes.length === 0) {
    const fallback = await WarehouseRoutesRepository.getDefaultRoute();
    // Sin courier predeterminado configurado, un código explícito se respeta
    // tal cual y el cliente queda sin casillero vinculado — es lo que ya hacía
    // el flujo anterior cuando no existía la ruta.
    if (!fallback) {
      if (!trimmed) throw new Error('No hay un courier predeterminado configurado. Elige al menos un courier para el cliente.');
      return { primaryCode: trimmed, assignments: [] };
    }
    routes = [fallback.id];
  }

  const assignments: { warehouseRouteId: number; code: string }[] = [];

  for (let index = 0; index < routes.length; index++) {
    const routeId = routes[index];
    // El código explícito solo pisa a la primera ruta; para el resto no hay
    // forma de saber qué número le tocaría, así que se genera.
    if (index === 0 && trimmed) {
      const route = await WarehouseRoutesRepository.getById(routeId);
      // Si el código sigue el prefijo de la ruta, se adelanta el contador para
      // que la próxima alta automática no genere ese mismo número.
      if (route && trimmed.startsWith(route.code_prefix)) {
        const counterValue = parseInt(trimmed.slice(route.code_prefix.length), 10);
        if (!Number.isNaN(counterValue)) {
          await WarehouseRoutesRepository.advanceCounterIfHigher(route.origin, route.package_type, counterValue);
        }
      }
      assignments.push({ warehouseRouteId: routeId, code: trimmed });
      continue;
    }

    const code = await WarehouseRoutesRepository.incrementAndGetCodeById(routeId);
    assignments.push({ warehouseRouteId: routeId, code });
  }

  return { primaryCode: assignments[0].code, assignments };
}

/**
 * Verifica si ya existe un cliente con ese código de casillero.
 */
export const existsByCustomerCode = async (code: string): Promise<boolean> => {
  const rows = await sql`SELECT 1 FROM customers WHERE customer_code = ${code} LIMIT 1`;
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
    const { primaryCode: code, assignments } = await resolveCustomerCodes(
      data.customer_code,
      data.warehouse_route_ids,
    );

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
    sql`SELECT * FROM customers ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
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
          'code', cwc.code, 'origin', wr.origin, 'package_type', wr.package_type,
          'address_line', wr.address_line, 'city', wr.city, 'state', wr.state,
          'postal_code', wr.postal_code, 'contact_phone', wr.contact_phone
        ))
        FROM customer_warehouse_codes cwc
        JOIN warehouse_routes wr ON wr.id = cwc.warehouse_route_id
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
          warehouse_route_ids: row.warehouse_route_ids,
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
        const { primaryCode: finalCode, assignments } = await resolveCustomerCodes(
          meta.customer_code,
          meta.warehouse_route_ids,
        );

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
    origin: wc.origin,
    package_type: wc.package_type,
    address_line: wc.address_line,
    city: wc.city,
    state: wc.state,
    postal_code: wc.postal_code,
    contact_phone: wc.contact_phone,
  })),
});
