import sql from '@/lib/db';
import { WarehouseRoute } from '@/types/customer/customer.types';

/**
 * Formatea el contador con padding de 2 dígitos (00, 01... 99). Por encima de
 * 99 sigue creciendo sin padding (100, 101...) — el padding es solo cosmético
 * para los primeros números, no un límite real de clientes por ruta.
 */
function formatCode(codePrefix: string, counter: number): string {
  const padded = counter < 100 ? String(counter).padStart(2, '0') : String(counter);
  return `${codePrefix}${padded}`;
}

export const WarehouseRoutesRepository = {
  getActiveRoute: async (origin: string, packageType: string): Promise<WarehouseRoute | null> => {
    const [row] = await sql`
      SELECT id, uuid, origin, package_type, code_prefix, current_counter,
             address_line, city, state, postal_code, contact_phone, is_active, created_at
      FROM warehouse_routes
      WHERE origin = ${origin} AND package_type = ${packageType} AND is_active = true
      LIMIT 1
    `;
    return (row as WarehouseRoute) ?? null;
  },

  getAll: async (): Promise<WarehouseRoute[]> => {
    const rows = await sql`
      SELECT id, uuid, origin, package_type, code_prefix, current_counter,
             address_line, city, state, postal_code, contact_phone, is_active, created_at
      FROM warehouse_routes
      ORDER BY origin ASC, package_type ASC
    `;
    return rows as WarehouseRoute[];
  },

  /**
   * Incrementa el contador de la ruta de forma atómica (UPDATE ... RETURNING,
   * no MAX()+1 en aplicación) y devuelve el código ya formateado. Debe llamarse
   * dentro de una transacción junto con el INSERT del cliente, para que un
   * fallo posterior (ej. email duplicado) revierta también el contador.
   */
  incrementAndGetCode: async (origin: string, packageType: string): Promise<{ code: string; warehouseRouteId: number }> => {
    const [route] = await sql`
      UPDATE warehouse_routes
      SET current_counter = current_counter + 1
      WHERE origin = ${origin} AND package_type = ${packageType} AND is_active = true
      RETURNING id, code_prefix, current_counter
    `;
    if (!route) throw new Error(`No hay una ruta de casillero activa para origin=${origin}, package_type=${packageType}.`);

    return {
      code: formatCode(route.code_prefix, route.current_counter),
      warehouseRouteId: route.id,
    };
  },

  /**
   * Registra el código ya generado en la tabla de unión cliente↔ruta. Se llama
   * junto con incrementAndGetCode, dentro de la misma transacción.
   */
  assignCodeToCustomer: async (customerId: string, warehouseRouteId: number, code: string): Promise<void> => {
    await sql`
      INSERT INTO customer_warehouse_codes (customer_id, warehouse_route_id, code)
      VALUES (${customerId}, ${warehouseRouteId}, ${code})
    `;
  },

  /**
   * Avanza el contador de la ruta hasta counterValue si es mayor al actual —
   * usado tras un import masivo con códigos explícitos, para que la próxima
   * alta manual no colisione con un número ya importado.
   */
  advanceCounterIfHigher: async (origin: string, packageType: string, counterValue: number): Promise<void> => {
    await sql`
      UPDATE warehouse_routes
      SET current_counter = ${counterValue}
      WHERE origin = ${origin} AND package_type = ${packageType} AND current_counter < ${counterValue}
    `;
  },
};
