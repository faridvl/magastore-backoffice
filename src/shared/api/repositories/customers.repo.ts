import sql from '@/lib/db';
import { Customer, CustomerInput, CustomerAddress, CustomerUpdateInput, CustomerImportRow, CustomerImportResult } from '@/types/customer/customer.types';
import { WarehouseRoutesRepository } from './warehouse-routes.repo';

// Única ruta real hoy (ver warehouse_routes seed en scripts/013). Cuando exista
// una segunda ruta activa, esto deja de ser una constante fija.
const DEFAULT_WAREHOUSE_ORIGIN = 'USA';
const DEFAULT_WAREHOUSE_PACKAGE_TYPE = 'AEREO';

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

    // Incremento atómico del contador de la ruta (único casillero real hoy:
    // USA/AEREO) antes de insertar — si algo falla después, el ROLLBACK
    // también revierte el contador.
    const { code, warehouseRouteId } = await WarehouseRoutesRepository.incrementAndGetCode(
      DEFAULT_WAREHOUSE_ORIGIN,
      DEFAULT_WAREHOUSE_PACKAGE_TYPE,
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
          customer_code
        )
        VALUES (
          ${data.id_card},
          ${data.id_type},
          ${data.first_name},
          ${data.last_name},
          ${data.email},
          ${data.phone},
          ${code}
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

    await WarehouseRoutesRepository.assignCodeToCustomer(rows[0].id, warehouseRouteId, code);

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
      ) as warehouse_codes_list
    FROM customers c WHERE c.id = ${id} LIMIT 1
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
      id_type    = COALESCE(${data.id_type ?? null}, id_type)
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
        let finalCode = meta.customer_code;
        let warehouseRouteId: number | null = null;
        if (!finalCode) {
          const generated = await WarehouseRoutesRepository.incrementAndGetCode(
            DEFAULT_WAREHOUSE_ORIGIN,
            DEFAULT_WAREHOUSE_PACKAGE_TYPE,
          );
          finalCode = generated.code;
          warehouseRouteId = generated.warehouseRouteId;
        } else {
          const route = await WarehouseRoutesRepository.getActiveRoute(DEFAULT_WAREHOUSE_ORIGIN, DEFAULT_WAREHOUSE_PACKAGE_TYPE);
          if (route) {
            warehouseRouteId = route.id;
            // Si el código explícito sigue el patrón del prefijo de la ruta,
            // avanza el contador para que la próxima alta manual no colisione.
            if (finalCode.startsWith(route.code_prefix)) {
              const suffix = finalCode.slice(route.code_prefix.length);
              const counterValue = parseInt(suffix, 10);
              if (!Number.isNaN(counterValue)) {
                await WarehouseRoutesRepository.advanceCounterIfHigher(DEFAULT_WAREHOUSE_ORIGIN, DEFAULT_WAREHOUSE_PACKAGE_TYPE, counterValue);
              }
            }
          }
        }

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

        if (warehouseRouteId && newCustomer) {
          await WarehouseRoutesRepository.assignCodeToCustomer(newCustomer.id, warehouseRouteId, finalCode);
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
