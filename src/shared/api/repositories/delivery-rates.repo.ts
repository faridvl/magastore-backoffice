import sql from '@/lib/db';
import { DeliveryRate, DeliveryRateInput } from '@/types/logistics/logistics.types';

/**
 * Verifica que [min_weight_kg, max_weight_kg] no se solape con ninguna fila activa
 * del mismo delivery_method + zone (excluyendo excludeId al editar). Sin esta
 * validación, dos rangos solapados matchearían el mismo peso en el lookup de
 * generatePreBilling y el monto facturado dependería del orden interno de la
 * consulta SQL en vez de una regla de negocio.
 */
async function assertNoOverlap(
  deliveryMethod: string,
  zone: string | null,
  minWeightKg: number,
  maxWeightKg: number,
  excludeId?: number,
): Promise<void> {
  const rows = await sql`
    SELECT id, min_weight_kg, max_weight_kg FROM delivery_rates
    WHERE delivery_method = ${deliveryMethod}
      AND (zone = ${zone} OR (zone IS NULL AND ${zone}::text IS NULL))
      AND is_active = true
      AND (${excludeId ?? null}::int IS NULL OR id != ${excludeId ?? null})
      AND min_weight_kg <= ${maxWeightKg}
      AND max_weight_kg >= ${minWeightKg}
  `;
  if (rows.length > 0) {
    const conflict = rows[0];
    throw new Error(
      `El rango ${minWeightKg}-${maxWeightKg} kg se solapa con el rango existente ${conflict.min_weight_kg}-${conflict.max_weight_kg} kg (id ${conflict.id}) para este método y zona.`,
    );
  }
}

export const DeliveryRatesRepository = {
  getAll: async (): Promise<DeliveryRate[]> => {
    const rows = await sql`
      SELECT id, uuid, delivery_method, zone, min_weight_kg, max_weight_kg,
             fee_crc, cost_crc, is_active, created_at, updated_at
      FROM delivery_rates
      ORDER BY delivery_method ASC, zone ASC NULLS FIRST, min_weight_kg ASC
    `;
    return rows as DeliveryRate[];
  },

  create: async (data: DeliveryRateInput): Promise<DeliveryRate> => {
    if (data.min_weight_kg >= data.max_weight_kg) {
      throw new Error('El peso mínimo debe ser menor al peso máximo.');
    }
    await assertNoOverlap(data.delivery_method, data.zone, data.min_weight_kg, data.max_weight_kg);

    const [row] = await sql`
      INSERT INTO delivery_rates (delivery_method, zone, min_weight_kg, max_weight_kg, fee_crc, cost_crc)
      VALUES (${data.delivery_method}, ${data.zone}, ${data.min_weight_kg}, ${data.max_weight_kg}, ${data.fee_crc}, ${data.cost_crc})
      RETURNING id, uuid, delivery_method, zone, min_weight_kg, max_weight_kg, fee_crc, cost_crc, is_active, created_at, updated_at
    `;
    return row as DeliveryRate;
  },

  update: async (uuid: string, data: DeliveryRateInput): Promise<DeliveryRate> => {
    if (data.min_weight_kg >= data.max_weight_kg) {
      throw new Error('El peso mínimo debe ser menor al peso máximo.');
    }
    const [existing] = await sql`SELECT id FROM delivery_rates WHERE uuid = ${uuid} LIMIT 1`;
    if (!existing) throw new Error('Tarifa no encontrada.');

    await assertNoOverlap(data.delivery_method, data.zone, data.min_weight_kg, data.max_weight_kg, existing.id);

    const [row] = await sql`
      UPDATE delivery_rates
      SET delivery_method = ${data.delivery_method},
          zone            = ${data.zone},
          min_weight_kg   = ${data.min_weight_kg},
          max_weight_kg   = ${data.max_weight_kg},
          fee_crc         = ${data.fee_crc},
          cost_crc        = ${data.cost_crc},
          updated_at      = NOW()
      WHERE uuid = ${uuid}
      RETURNING id, uuid, delivery_method, zone, min_weight_kg, max_weight_kg, fee_crc, cost_crc, is_active, created_at, updated_at
    `;
    return row as DeliveryRate;
  },

  toggleActive: async (uuid: string, isActive: boolean): Promise<DeliveryRate> => {
    const [row] = await sql`
      UPDATE delivery_rates SET is_active = ${isActive}, updated_at = NOW()
      WHERE uuid = ${uuid}
      RETURNING id, uuid, delivery_method, zone, min_weight_kg, max_weight_kg, fee_crc, cost_crc, is_active, created_at, updated_at
    `;
    if (!row) throw new Error('Tarifa no encontrada.');
    return row as DeliveryRate;
  },
};
