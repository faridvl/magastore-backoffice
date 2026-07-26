import sql from '@/lib/db';
import { WarehouseRoute, WarehouseRouteInput, CustomerWarehouseRoute } from '@/types/customer/customer.types';

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
  /**
   * Casillero de una ruta sin importar si está activa — para mostrar/editar
   * los datos junto a su tarifa de courier en el mantenimiento.
   */
  /**
   * Casillero de un courier sin importar si está activo — para mostrar/editar
   * los datos junto a su tarifa en el mantenimiento.
   */
  getByCourierRateId: async (courierRateId: number): Promise<WarehouseRoute | null> => {
    const [row] = await sql`
      SELECT id, uuid, courier_rate_id, origin, package_type, code_prefix, current_counter,
             address_line, city, state, postal_code, contact_phone, is_active, created_at
      FROM warehouse_routes
      WHERE courier_rate_id = ${courierRateId}
      LIMIT 1
    `;
    return (row as WarehouseRoute) ?? null;
  },

  /**
   * Alta/actualización del casillero de un courier. La clave es el courier, no
   * (origin, package_type): dos proveedores del mismo origen y tipo son
   * bodegas distintas, con dirección y numeración propias. El contador nunca
   * se toca en el update: es estado vivo de asignación de códigos.
   */
  upsert: async (courierRateId: number, data: WarehouseRouteInput): Promise<WarehouseRoute> => {
    const [row] = await sql`
      INSERT INTO warehouse_routes (
        courier_rate_id, origin, package_type, code_prefix,
        address_line, city, state, postal_code, contact_phone
      ) VALUES (
        ${courierRateId}, ${data.origin}, ${data.package_type}, ${data.code_prefix},
        ${data.address_line}, ${data.city}, ${data.state}, ${data.postal_code}, ${data.contact_phone}
      )
      ON CONFLICT (courier_rate_id) DO UPDATE SET
        origin        = EXCLUDED.origin,
        package_type  = EXCLUDED.package_type,
        code_prefix   = EXCLUDED.code_prefix,
        address_line  = EXCLUDED.address_line,
        city          = EXCLUDED.city,
        state         = EXCLUDED.state,
        postal_code   = EXCLUDED.postal_code,
        contact_phone = EXCLUDED.contact_phone
      RETURNING id, uuid, courier_rate_id, origin, package_type, code_prefix, current_counter,
                address_line, city, state, postal_code, contact_phone, is_active, created_at
    `;
    return row as WarehouseRoute;
  },

  setActive: async (courierRateId: number, isActive: boolean): Promise<void> => {
    await sql`
      UPDATE warehouse_routes SET is_active = ${isActive}
      WHERE courier_rate_id = ${courierRateId}
    `;
  },

  getActiveRouteByCourier: async (courierRateId: number): Promise<WarehouseRoute | null> => {
    const [row] = await sql`
      SELECT id, uuid, courier_rate_id, origin, package_type, code_prefix, current_counter,
             address_line, city, state, postal_code, contact_phone, is_active, created_at
      FROM warehouse_routes
      WHERE courier_rate_id = ${courierRateId} AND is_active = true
      LIMIT 1
    `;
    return (row as WarehouseRoute) ?? null;
  },

  getById: async (routeId: number): Promise<WarehouseRoute | null> => {
    const [row] = await sql`
      SELECT id, uuid, courier_rate_id, origin, package_type, code_prefix, current_counter,
             address_line, city, state, postal_code, contact_phone, is_active, created_at
      FROM warehouse_routes
      WHERE id = ${routeId}
      LIMIT 1
    `;
    return (row as WarehouseRoute) ?? null;
  },

  /**
   * Igual que incrementAndGetCode pero direccionando la ruta por id — el alta
   * de cliente ya conoce los ids elegidos y no tiene por qué reconstruir la
   * clave natural (origin, package_type).
   */
  incrementAndGetCodeById: async (routeId: number): Promise<string> => {
    const [route] = await sql`
      UPDATE warehouse_routes
      SET current_counter = current_counter + 1
      WHERE id = ${routeId} AND is_active = true
      RETURNING code_prefix, current_counter
    `;
    if (!route) throw new Error(`No hay un casillero activo para la ruta ${routeId}.`);
    return formatCode(route.code_prefix, route.current_counter);
  },

  /**
   * Ruta del courier marcado como predeterminado. Es el fallback cuando se da
   * de alta un cliente sin elegir couriers explícitamente — antes esto era la
   * constante USA/AEREO, que dejaba de ser cierta al existir más de una ruta.
   */
  getDefaultRoute: async (): Promise<WarehouseRoute | null> => {
    const [row] = await sql`
      SELECT wr.id, wr.uuid, wr.courier_rate_id, wr.origin, wr.package_type,
             wr.code_prefix, wr.current_counter,
             wr.address_line, wr.city, wr.state, wr.postal_code, wr.contact_phone,
             wr.is_active, wr.created_at
      FROM courier_rates cr
      JOIN warehouse_routes wr ON wr.courier_rate_id = cr.id
      WHERE cr.is_default = true AND cr.is_active = true AND wr.is_active = true
      LIMIT 1
    `;
    return (row as WarehouseRoute) ?? null;
  },

  /**
   * Rutas activas que el cliente ya tiene asignadas, con su código y los datos
   * del casillero. Es la lista que filtra el selector de courier al registrar
   * un paquete: solo se puede registrar contra un casillero que el cliente
   * realmente tiene.
   */
  getCustomerRoutes: async (customerId: string): Promise<CustomerWarehouseRoute[]> => {
    const rows = await sql`
      SELECT wr.id AS warehouse_route_id, cwc.code, wr.origin, wr.package_type,
             wr.address_line, wr.city, wr.state, wr.postal_code, wr.contact_phone,
             cr.name AS courier_name
      FROM customer_warehouse_codes cwc
      JOIN warehouse_routes wr ON wr.id = cwc.warehouse_route_id
      JOIN courier_rates cr ON cr.id = wr.courier_rate_id
      WHERE cwc.customer_id = ${customerId} AND wr.is_active = true
      ORDER BY cr.name ASC
    `;
    return rows as CustomerWarehouseRoute[];
  },

  getAll: async (): Promise<WarehouseRoute[]> => {
    const rows = await sql`
      SELECT id, uuid, courier_rate_id, origin, package_type, code_prefix, current_counter,
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
  incrementAndGetCode: async (courierRateId: number): Promise<{ code: string; warehouseRouteId: number }> => {
    const [route] = await sql`
      UPDATE warehouse_routes
      SET current_counter = current_counter + 1
      WHERE courier_rate_id = ${courierRateId} AND is_active = true
      RETURNING id, code_prefix, current_counter
    `;
    if (!route) throw new Error(`El courier ${courierRateId} no tiene un casillero activo configurado.`);

    return {
      code: formatCode(route.code_prefix, route.current_counter),
      warehouseRouteId: route.id,
    };
  },

  /**
   * Código que el cliente ya tiene en esta ruta, o null si no tiene ninguno.
   * Un paquete solo puede registrarse contra un courier cuyo casillero el
   * cliente ya tenga asignado — si no, no habría dirección real a la que el
   * cliente pudo haber enviado esa mercancía.
   */
  getCustomerCodeForRoute: async (customerId: string, warehouseRouteId: number): Promise<string | null> => {
    const [row] = await sql`
      SELECT code FROM customer_warehouse_codes
      WHERE customer_id = ${customerId} AND warehouse_route_id = ${warehouseRouteId}
      LIMIT 1
    `;
    return (row?.code as string) ?? null;
  },

  /**
   * Asigna a un cliente el siguiente código de una ruta que aún no tiene.
   * Atómico igual que el alta: incrementa el contador y registra la fila.
   */
  assignNextCodeToCustomer: async (customerId: string, warehouseRouteId: number): Promise<string> => {
    const [route] = await sql`
      UPDATE warehouse_routes
      SET current_counter = current_counter + 1
      WHERE id = ${warehouseRouteId} AND is_active = true
      RETURNING code_prefix, current_counter
    `;
    if (!route) throw new Error('El casillero de esta ruta no está activo.');

    const code = formatCode(route.code_prefix, route.current_counter);
    await sql`
      INSERT INTO customer_warehouse_codes (customer_id, warehouse_route_id, code)
      VALUES (${customerId}, ${warehouseRouteId}, ${code})
    `;
    return code;
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
   * Paquetes registrados por un cliente contra el courier dueño de esta ruta.
   * Se consulta antes de quitarle el casillero: si ya recibió mercancía por ahí,
   * el código es parte del historial y borrarlo dejaría paquetes apuntando a un
   * casillero que el cliente "nunca tuvo".
   */
  countPackagesForCustomerRoute: async (customerId: string, warehouseRouteId: number): Promise<number> => {
    const [row] = await sql`
      SELECT COUNT(*)::int AS count
      FROM packages p
      JOIN warehouse_routes wr ON wr.courier_rate_id = p.courier_rate_id
      WHERE p.customer_id = ${customerId} AND wr.id = ${warehouseRouteId}
    `;
    return Number(row?.count ?? 0);
  },

  /**
   * Quita el casillero de un cliente. El contador de la ruta NO se decrementa:
   * es una secuencia, no un conteo de asignaciones vivas — retrocederlo haría
   * que el próximo cliente recibiera un código ya usado antes.
   */
  removeCustomerCode: async (customerId: string, warehouseRouteId: number): Promise<void> => {
    const rows = await sql`
      DELETE FROM customer_warehouse_codes
      WHERE customer_id = ${customerId} AND warehouse_route_id = ${warehouseRouteId}
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new Error('El cliente no tiene un casillero en esa ruta.');
    }
  },

  /**
   * Avanza el contador de la ruta hasta counterValue si es mayor al actual —
   * usado tras un import masivo con códigos explícitos, para que la próxima
   * alta manual no colisione con un número ya importado.
   */
  advanceCounterIfHigher: async (routeId: number, counterValue: number): Promise<void> => {
    await sql`
      UPDATE warehouse_routes
      SET current_counter = ${counterValue}
      WHERE id = ${routeId} AND current_counter < ${counterValue}
    `;
  },
};
