import sql from '@/lib/db';
import { CourierRate, CourierRateInput, CourierRateWithWarehouse } from '@/types/logistics/logistics.types';

export const CourierRatesRepository = {
  getAll: async (): Promise<CourierRate[]> => {
    const rows = await sql`
      SELECT id, uuid, name, origin, package_type, rate_usd, insurance_usd, is_active, is_default, created_at
      FROM courier_rates
      ORDER BY name ASC
    `;
    return rows as CourierRate[];
  },

  /**
   * Tarifas con los datos del casillero de su misma ruta (origin, package_type).
   * LEFT JOIN: una tarifa creada antes de este mantenimiento puede no tener
   * casillero todavía — se muestra con los campos en null para poder completarla.
   */
  getAllWithWarehouse: async (): Promise<CourierRateWithWarehouse[]> => {
    const rows = await sql`
      SELECT cr.id, cr.uuid, cr.name, cr.origin, cr.package_type, cr.rate_usd,
             cr.insurance_usd, cr.is_active, cr.is_default, cr.created_at,
             wr.code_prefix, wr.current_counter, wr.address_line, wr.city,
             wr.state, wr.postal_code, wr.contact_phone
      FROM courier_rates cr
      LEFT JOIN warehouse_routes wr
        ON wr.origin = cr.origin AND wr.package_type = cr.package_type
      ORDER BY cr.name ASC
    `;
    return rows as CourierRateWithWarehouse[];
  },

  /**
   * Ruta de casillero que corresponde a una tarifa de courier (misma clave
   * natural origin+package_type). Devuelve también el nombre de la tarifa para
   * poder construir mensajes de error claros.
   */
  getWarehouseRouteForRate: async (
    courierRateId: number,
  ): Promise<{ route_id: number | null; rate_name: string; origin: string; package_type: string } | null> => {
    const [row] = await sql`
      SELECT wr.id AS route_id, cr.name AS rate_name, cr.origin, cr.package_type
      FROM courier_rates cr
      LEFT JOIN warehouse_routes wr
        ON wr.origin = cr.origin AND wr.package_type = cr.package_type
      WHERE cr.id = ${courierRateId}
      LIMIT 1
    `;
    return row
      ? {
          route_id: row.route_id != null ? Number(row.route_id) : null,
          rate_name: row.rate_name as string,
          origin: row.origin as string,
          package_type: row.package_type as string,
        }
      : null;
  },

  /** Igual que getWarehouseRouteForRate pero por uuid — es lo que maneja la UI. */
  getWarehouseRouteByUuid: async (
    uuid: string,
  ): Promise<{ route_id: number | null; rate_name: string } | null> => {
    const [row] = await sql`
      SELECT wr.id AS route_id, cr.name AS rate_name
      FROM courier_rates cr
      LEFT JOIN warehouse_routes wr
        ON wr.origin = cr.origin AND wr.package_type = cr.package_type
      WHERE cr.uuid = ${uuid}
      LIMIT 1
    `;
    return row
      ? { route_id: row.route_id != null ? Number(row.route_id) : null, rate_name: row.rate_name as string }
      : null;
  },

  create: async (data: CourierRateInput): Promise<CourierRate> => {
    const [row] = await sql`
      INSERT INTO courier_rates (name, origin, package_type, rate_usd, insurance_usd)
      VALUES (${data.name}, ${data.origin}, ${data.package_type}, ${data.rate_usd}, ${data.insurance_usd})
      RETURNING id, uuid, name, origin, package_type, rate_usd, insurance_usd, is_active, is_default, created_at
    `;
    return row as CourierRate;
  },

  update: async (uuid: string, data: CourierRateInput): Promise<CourierRate> => {
    const [row] = await sql`
      UPDATE courier_rates
      SET name          = ${data.name},
          origin        = ${data.origin},
          package_type  = ${data.package_type},
          rate_usd      = ${data.rate_usd},
          insurance_usd = ${data.insurance_usd}
      WHERE uuid = ${uuid}
      RETURNING id, uuid, name, origin, package_type, rate_usd, insurance_usd, is_active, is_default, created_at
    `;
    if (!row) throw new Error('Tarifa de courier no encontrada.');
    return row as CourierRate;
  },

  toggleActive: async (uuid: string, isActive: boolean): Promise<CourierRate> => {
    try {
      await sql`BEGIN`;
      const [row] = await sql`
        UPDATE courier_rates SET is_active = ${isActive}
        WHERE uuid = ${uuid}
        RETURNING id, uuid, name, origin, package_type, rate_usd, insurance_usd, is_active, is_default, created_at
      `;
      if (!row) throw new Error('Tarifa de courier no encontrada.');

      // Un courier inactivo no puede seguir siendo el predeterminado: el
      // formulario de paquetes solo lista activos y quedaría sin preselección.
      if (!isActive && row.is_default) {
        await sql`UPDATE courier_rates SET is_default = false WHERE uuid = ${uuid}`;
        row.is_default = false;
      }

      await sql`COMMIT`;
      return row as CourierRate;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

  /**
   * Marca una tarifa como predeterminada, quitándole la marca a la anterior.
   * En una transacción porque el índice único parcial rechaza dos filas en true.
   */
  setDefault: async (uuid: string): Promise<CourierRate> => {
    try {
      await sql`BEGIN`;

      const [target] = await sql`SELECT id, is_active FROM courier_rates WHERE uuid = ${uuid} LIMIT 1`;
      if (!target) throw new Error('Tarifa de courier no encontrada.');
      if (!target.is_active) {
        throw new Error('No se puede marcar como predeterminado un courier inactivo.');
      }

      await sql`UPDATE courier_rates SET is_default = false WHERE is_default = true`;
      const [row] = await sql`
        UPDATE courier_rates SET is_default = true
        WHERE uuid = ${uuid}
        RETURNING id, uuid, name, origin, package_type, rate_usd, insurance_usd, is_active, is_default, created_at
      `;

      await sql`COMMIT`;
      return row as CourierRate;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },
};
