import sql from '@/lib/db';
import { DeliveryMethodEntity, DeliveryMethodInput } from '@/types/logistics/logistics.types';

export const DeliveryMethodsRepository = {
  getAll: async (): Promise<DeliveryMethodEntity[]> => {
    const rows = await sql`
      SELECT id, uuid, code, name, requires_zone, is_pickup, is_active, created_at, updated_at
      FROM delivery_methods
      ORDER BY name ASC
    `;
    return rows as DeliveryMethodEntity[];
  },

  create: async (data: DeliveryMethodInput): Promise<DeliveryMethodEntity> => {
    const [row] = await sql`
      INSERT INTO delivery_methods (code, name, requires_zone, is_pickup)
      VALUES (${data.code}, ${data.name}, ${data.requires_zone}, ${data.is_pickup})
      RETURNING id, uuid, code, name, requires_zone, is_pickup, is_active, created_at, updated_at
    `;
    return row as DeliveryMethodEntity;
  },

  update: async (uuid: string, data: DeliveryMethodInput): Promise<DeliveryMethodEntity> => {
    const [row] = await sql`
      UPDATE delivery_methods
      SET code          = ${data.code},
          name          = ${data.name},
          requires_zone = ${data.requires_zone},
          is_pickup     = ${data.is_pickup},
          updated_at    = NOW()
      WHERE uuid = ${uuid}
      RETURNING id, uuid, code, name, requires_zone, is_pickup, is_active, created_at, updated_at
    `;
    if (!row) throw new Error('Método de entrega no encontrado.');
    return row as DeliveryMethodEntity;
  },

  toggleActive: async (uuid: string, isActive: boolean): Promise<DeliveryMethodEntity> => {
    const [row] = await sql`
      UPDATE delivery_methods SET is_active = ${isActive}, updated_at = NOW()
      WHERE uuid = ${uuid}
      RETURNING id, uuid, code, name, requires_zone, is_pickup, is_active, created_at, updated_at
    `;
    if (!row) throw new Error('Método de entrega no encontrado.');
    return row as DeliveryMethodEntity;
  },

  /** Lookup liviano por code — usado en cálculos de rentabilidad que solo necesitan is_pickup. */
  findByCode: async (code: string): Promise<Pick<DeliveryMethodEntity, 'is_pickup' | 'requires_zone'> | null> => {
    const [row] = await sql`
      SELECT is_pickup, requires_zone FROM delivery_methods WHERE code = ${code}
    `;
    return (row as Pick<DeliveryMethodEntity, 'is_pickup' | 'requires_zone'>) ?? null;
  },

  /** Cuántas órdenes/tarifas usan este código — para avisar antes de desactivarlo o bloquear el borrado. */
  countUsages: async (code: string): Promise<number> => {
    const [row] = await sql`
      SELECT (
        (SELECT COUNT(*) FROM consolidations WHERE delivery_method = ${code}) +
        (SELECT COUNT(*) FROM pre_billing WHERE delivery_method = ${code}) +
        (SELECT COUNT(*) FROM billing WHERE delivery_method = ${code}) +
        (SELECT COUNT(*) FROM delivery_rates WHERE delivery_method = ${code})
      )::int AS total
    `;
    return Number(row?.total ?? 0);
  },

  remove: async (uuid: string): Promise<void> => {
    const rows = await sql`
      DELETE FROM delivery_methods WHERE uuid = ${uuid} RETURNING id
    `;
    if (rows.length === 0) throw new Error('Método de entrega no encontrado.');
  },
};
