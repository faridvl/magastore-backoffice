import sql from '@/lib/db';
import { CustomerType, CustomerTypeInput } from '@/types/customer/customer.types';

export const CustomerTypesRepository = {
  getAll: async (): Promise<CustomerType[]> => {
    const rows = await sql`
      SELECT id, uuid, name, billing_mode, discount_percent, is_active, created_at, updated_at
      FROM customer_types
      ORDER BY name ASC
    `;
    return rows as CustomerType[];
  },

  create: async (data: CustomerTypeInput): Promise<CustomerType> => {
    const [row] = await sql`
      INSERT INTO customer_types (name, billing_mode, discount_percent)
      VALUES (${data.name}, ${data.billing_mode}, ${data.discount_percent})
      RETURNING id, uuid, name, billing_mode, discount_percent, is_active, created_at, updated_at
    `;
    return row as CustomerType;
  },

  update: async (uuid: string, data: CustomerTypeInput): Promise<CustomerType> => {
    const [row] = await sql`
      UPDATE customer_types
      SET name             = ${data.name},
          billing_mode     = ${data.billing_mode},
          discount_percent = ${data.discount_percent},
          updated_at       = NOW()
      WHERE uuid = ${uuid}
      RETURNING id, uuid, name, billing_mode, discount_percent, is_active, created_at, updated_at
    `;
    if (!row) throw new Error('Tipo de cliente no encontrado.');
    return row as CustomerType;
  },

  toggleActive: async (uuid: string, isActive: boolean): Promise<CustomerType> => {
    const [row] = await sql`
      UPDATE customer_types SET is_active = ${isActive}, updated_at = NOW()
      WHERE uuid = ${uuid}
      RETURNING id, uuid, name, billing_mode, discount_percent, is_active, created_at, updated_at
    `;
    if (!row) throw new Error('Tipo de cliente no encontrado.');
    return row as CustomerType;
  },

  /** Cuántos clientes tiene asignado este tipo — para avisar antes de desactivarlo. */
  countCustomers: async (uuid: string): Promise<number> => {
    const [row] = await sql`
      SELECT COUNT(*)::int AS total
      FROM customers c
      JOIN customer_types ct ON ct.id = c.customer_type_id
      WHERE ct.uuid = ${uuid}
    `;
    return Number(row?.total ?? 0);
  },
};
