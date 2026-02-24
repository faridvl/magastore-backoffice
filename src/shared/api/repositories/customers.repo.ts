import sql from '@/lib/db';
import { Customer, CustomerInput, CustomerAddress } from '@/types/customer/customer.types';

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

  // Intentamos la query. Si falla, el error real saltará al catch del Service/Controller
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
        -- Generamos el código aquí mismo usando un placeholder único
        -- para evitar el UPDATE y la ambigüedad del serial_id
        'MG-' || UPPER(SUBSTRING(uuid_generate_v4()::text FROM 31)) || '-' || nextval(pg_get_serial_sequence('customers', 'customer_id'))
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

  return mapRowToCustomer(rows[0]);
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
    SELECT c.*, (SELECT json_agg(ca.*) FROM customer_addresses ca WHERE ca.customer_id = c.id) as addresses_list
    FROM customers c WHERE c.id = ${id} LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  return mapRowToCustomer(rows[0]);
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
});
