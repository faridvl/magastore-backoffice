import sql from '@/lib/db';
import {
  ConsolidationListItem,
  ConsolidationDetail,
  ConsolidationStatus,
  AvailablePackage,
  DeliveryMethod,
  CustomerWithAvailablePackages,
} from '@/types/logistics/logistics.types';
import { PaginatedResponse } from '@/types/paginate.types';

export const ConsolidationsRepository = {
  getOpenConsolidationForCustomer: async (
    customerUuid: string,
  ): Promise<{ uuid: string } | null> => {
    const [row] = await sql`
      SELECT uuid FROM consolidations
      WHERE customer_id = ${customerUuid} AND status = 'ABIERTO'
      LIMIT 1
    `;
    return (row as { uuid: string } | undefined) ?? null;
  },

  createConsolidation: async (
    customerUuid: string,
  ): Promise<{ uuid: string; status: ConsolidationStatus }> => {
    const [customer] = await sql`
      SELECT id FROM customers WHERE id = ${customerUuid} LIMIT 1
    `;
    if (!customer) throw new Error('Cliente no encontrado.');

    const [row] = await sql`
      INSERT INTO consolidations (customer_id, status, total_weight_lb)
      VALUES (${customerUuid}, 'ABIERTO', 0)
      RETURNING uuid, status
    `;
    return row as { uuid: string; status: ConsolidationStatus };
  },

  createConsolidationWithPackages: async (
    customerUuid: string,
    packageUuids: string[],
    deliveryAddressId?: string,
    deliveryMethod?: DeliveryMethod,
  ): Promise<{ uuid: string; status: ConsolidationStatus; total_weight_lb: number }> => {
    await sql`BEGIN`;
    try {
      const [customer] = await sql`
        SELECT id FROM customers WHERE id = ${customerUuid} LIMIT 1
      `;
      if (!customer) throw new Error('Cliente no encontrado.');

      const [mismatch] = await sql`
        SELECT COUNT(*) AS mismatched
        FROM packages
        WHERE uuid = ANY(${packageUuids}) AND customer_id != ${customerUuid}
      `;
      if (parseInt(mismatch.mismatched, 10) > 0) {
        throw new Error('Todos los paquetes seleccionados deben pertenecer al mismo cliente.');
      }

      // Con una sola dirección registrada se asigna automáticamente. Con 2+ direcciones,
      // el operador debe elegir explícitamente (deliveryAddressId requerido en ese caso).
      let resolvedAddressId = deliveryAddressId ?? null;
      if (!resolvedAddressId) {
        const addresses = await sql`
          SELECT id FROM customer_addresses WHERE customer_id = ${customerUuid}
        `;
        if (addresses.length === 1) {
          resolvedAddressId = addresses[0].id;
        } else if (addresses.length > 1) {
          throw new Error('deliveryAddressId es requerido: el cliente tiene más de una dirección registrada.');
        }
      }

      const [created] = await sql`
        INSERT INTO consolidations (customer_id, status, total_weight_lb, delivery_address_id, delivery_method)
        VALUES (${customerUuid}, 'ABIERTO', 0, ${resolvedAddressId}, ${deliveryMethod ?? null})
        RETURNING id, uuid, status
      `;

      await sql`
        UPDATE packages SET consolidation_id = ${created.id}
        WHERE uuid = ANY(${packageUuids})
      `;

      const [updated] = await sql`
        UPDATE consolidations
        SET total_weight_lb = COALESCE((SELECT SUM(weight_lb) FROM packages WHERE consolidation_id = ${created.id}), 0),
            updated_at = NOW()
        WHERE id = ${created.id}
        RETURNING uuid, status, total_weight_lb
      `;

      await sql`COMMIT`;
      return updated as { uuid: string; status: ConsolidationStatus; total_weight_lb: number };
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

  getPaginatedConsolidations: async (
    page: number,
    limit: number,
    search?: string,
    paymentFilter?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PaginatedResponse<ConsolidationListItem>> => {
    const offset = (page - 1) * limit;
    const searchTerm = search ? `%${search}%` : null;
    const isPendienteDePago = paymentFilter === 'PENDIENTE_PAGO';
    const isPagado = paymentFilter === 'PAGADO';
    const isEntregado = paymentFilter === 'ENTREGADO';
    const isSinNotificar = paymentFilter === 'SIN_NOTIFICAR';
    const fromDate = dateFrom || null;
    const toDate = dateTo || null;

    // Filtro por pago (no por status logístico): "Pendientes de pago" agrupa todo lo que
    // el operador todavía debe mover hacia el cobro — ABIERTO sin nada generado, CERRADO
    // con estimado sin confirmar, o CERRADO con factura sin pagar. Cubre el caso de
    // reabrir una orden con factura sin pagar: vuelve a ABIERTO pero sigue siendo
    // "pendiente de pago" en el sentido operativo, solo que con chip "Sin estimado".
    const [rows, countResult] = await Promise.all([
      sql`
        SELECT
          con.uuid,
          con.customer_id,
          con.status,
          con.total_weight_lb,
          con.created_at,
          con.updated_at,
          c.first_name || ' ' || c.last_name AS customer_name,
          c.customer_code,
          COUNT(p.id) AS package_count,
          b.uuid AS billing_uuid,
          b.is_paid AS billing_is_paid,
          b.total_amount_crc AS billing_amount_crc,
          pb.estimated_amount_crc AS pre_billing_amount_crc,
          CASE
            WHEN b.uuid IS NOT NULL AND b.is_paid = true THEN 'PAGADO'
            WHEN b.uuid IS NOT NULL THEN 'PENDIENTE_PAGO'
            WHEN pb.uuid IS NOT NULL THEN 'ESTIMADO_PENDIENTE'
            ELSE 'SIN_ESTIMADO'
          END AS payment_status,
          COALESCE(b.total_amount_crc, pb.estimated_amount_crc) AS display_amount_crc,
          (b.uuid IS NOT NULL) AS is_billing_amount
        FROM consolidations con
        LEFT JOIN customers c ON c.id = con.customer_id
        LEFT JOIN packages p ON p.consolidation_id = con.id
        LEFT JOIN pre_billing pb ON pb.consolidation_id = con.id
        LEFT JOIN billing b ON b.consolidation_id = con.id
        WHERE
          (${searchTerm}::text IS NULL
            OR c.first_name ILIKE ${searchTerm}
            OR c.last_name ILIKE ${searchTerm}
            OR c.customer_code ILIKE ${searchTerm}
            OR con.uuid::text ILIKE ${searchTerm})
          AND (NOT ${isPendienteDePago} OR (con.status != 'ENTREGADO' AND (b.uuid IS NULL OR b.is_paid = false)))
          AND (NOT ${isPagado} OR (b.is_paid = true AND con.status != 'ENTREGADO'))
          AND (NOT ${isEntregado} OR con.status = 'ENTREGADO')
          AND (NOT ${isSinNotificar} OR (pb.uuid IS NOT NULL AND pb.notified_at IS NULL))
          AND (${fromDate}::date IS NULL OR con.created_at::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR con.created_at::date <= ${toDate}::date)
        GROUP BY con.uuid, con.customer_id, con.status, con.total_weight_lb, con.created_at, con.updated_at,
                 c.first_name, c.last_name, c.customer_code, b.uuid, b.is_paid, b.total_amount_crc, pb.estimated_amount_crc, pb.uuid
        ORDER BY con.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*) AS total
        FROM consolidations con
        LEFT JOIN customers c ON c.id = con.customer_id
        LEFT JOIN billing b ON b.consolidation_id = con.id
        LEFT JOIN pre_billing pb ON pb.consolidation_id = con.id
        WHERE
          (${searchTerm}::text IS NULL
            OR c.first_name ILIKE ${searchTerm}
            OR c.last_name ILIKE ${searchTerm}
            OR c.customer_code ILIKE ${searchTerm}
            OR con.uuid::text ILIKE ${searchTerm})
          AND (NOT ${isPendienteDePago} OR (con.status != 'ENTREGADO' AND (b.uuid IS NULL OR b.is_paid = false)))
          AND (NOT ${isPagado} OR (b.is_paid = true AND con.status != 'ENTREGADO'))
          AND (NOT ${isEntregado} OR con.status = 'ENTREGADO')
          AND (NOT ${isSinNotificar} OR (pb.uuid IS NOT NULL AND pb.notified_at IS NULL))
          AND (${fromDate}::date IS NULL OR con.created_at::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR con.created_at::date <= ${toDate}::date)
      `,
    ]);

    const total = parseInt(countResult[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows as ConsolidationListItem[],
      meta: { total, page, limit, totalPages },
    };
  },

  getConsolidationDetail: async (uuid: string): Promise<ConsolidationDetail | null> => {
    const [row] = await sql`
      SELECT
        con.uuid,
        con.customer_id,
        con.status,
        con.total_weight_lb,
        con.created_at,
        con.updated_at,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.customer_code,
        c.email AS customer_email,
        c.phone AS customer_phone,
        ct.name AS customer_type_name,
        ct.billing_mode AS customer_type_billing_mode,
        ct.discount_percent AS customer_type_discount_percent,
        COALESCE(
          json_agg(
            json_build_object(
              'uuid', p.uuid,
              'tracking_number', p.tracking_number,
              'weight_lb', p.weight_lb,
              'package_type', p.package_type,
              'status', p.status,
              'arrival_date', p.arrival_date,
              'store_name', p.store_name,
              'courier_cost_usd', p.courier_cost_usd,
              'tc_banco', p.tc_banco
            ) ORDER BY p.created_at DESC
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS packages,
        pb.uuid AS pre_billing_uuid,
        pb.estimated_amount_crc AS pre_billing_amount,
        pb.delivery_fee_crc AS pre_billing_fee_crc,
        pb.delivery_cost_crc AS pre_billing_delivery_cost_crc,
        pb.delivery_method AS pre_billing_delivery_method,
        pb.is_confirmed AS pre_billing_confirmed,
        pb.confirmed_at AS pre_billing_confirmed_at,
        pb.notified_at AS pre_billing_notified_at,
        pb.applied_rate_usd AS pre_billing_rate_usd,
        pb.applied_exchange AS pre_billing_exchange,
        ss.price_per_lb AS current_price_per_lb,
        ss.exchange_rate AS current_exchange_rate,
        ss.min_weight AS current_min_weight,
        b.uuid AS billing_uuid,
        b.is_paid AS billing_is_paid,
        b.total_amount_crc AS billing_total_amount_crc,
        b.courier_cost_crc AS billing_courier_cost_crc,
        b.delivery_cost_crc AS billing_delivery_cost_crc,
        b.profit_crc AS billing_profit_crc,
        b.has_unknown_cost AS billing_has_unknown_cost,
        con.delivery_method,
        con.delivery_address_id,
        ca.address_label AS delivery_address_label,
        ca.exact_address AS delivery_exact_address,
        ca.district AS delivery_district,
        ca.canton AS delivery_canton,
        ca.province AS delivery_province,
        COALESCE(
          ca.canton,
          (SELECT canton FROM customer_addresses
           WHERE customer_id = con.customer_id
           ORDER BY is_default DESC LIMIT 1)
        ) AS zone_canton
      FROM consolidations con
      LEFT JOIN customers c ON c.id = con.customer_id
      LEFT JOIN customer_types ct ON ct.id = c.customer_type_id
      LEFT JOIN packages p ON p.consolidation_id = con.id
      LEFT JOIN pre_billing pb ON pb.consolidation_id = con.id
      LEFT JOIN billing b ON b.consolidation_id = con.id
      LEFT JOIN customer_addresses ca ON ca.id = con.delivery_address_id
      CROSS JOIN system_settings ss
      WHERE con.uuid = ${uuid}
      GROUP BY con.uuid, con.customer_id, con.status, con.total_weight_lb,
               con.created_at, con.updated_at, c.first_name, c.last_name, c.customer_code, c.email, c.phone,
               ct.name, ct.billing_mode, ct.discount_percent,
               pb.uuid, pb.estimated_amount_crc, pb.delivery_fee_crc, pb.delivery_cost_crc, pb.delivery_method, pb.is_confirmed, pb.confirmed_at, pb.notified_at,
               pb.applied_rate_usd, pb.applied_exchange, ss.price_per_lb, ss.exchange_rate, ss.min_weight,
               b.uuid, b.is_paid, b.total_amount_crc, b.courier_cost_crc, b.delivery_cost_crc, b.profit_crc, b.has_unknown_cost,
               con.delivery_method, con.delivery_address_id, ca.address_label, ca.exact_address,
               ca.district, ca.canton, ca.province
    `;
    return row ? (row as ConsolidationDetail) : null;
  },

  /**
   * Cambia la dirección de entrega de la orden. Solo permitido en ABIERTO — una vez
   * generado el estimado, la dirección queda congelada como parte del snapshot.
   */
  setDeliveryAddress: async (uuid: string, addressId: string): Promise<void> => {
    const [row] = await sql`
      SELECT con.id, con.status, ca.id AS address_id
      FROM consolidations con
      LEFT JOIN customer_addresses ca ON ca.id = ${addressId} AND ca.customer_id = con.customer_id
      WHERE con.uuid = ${uuid}
      LIMIT 1
    `;
    if (!row) throw new Error('Orden de envío no encontrada.');
    if (row.status !== 'ABIERTO') {
      throw new Error('Transición inválida: solo se puede cambiar la dirección de entrega mientras la orden esté ABIERTO.');
    }
    if (!row.address_id) {
      throw new Error('Dirección inválida: no pertenece a este cliente.');
    }

    await sql`
      UPDATE consolidations SET delivery_address_id = ${addressId}, updated_at = NOW()
      WHERE id = ${row.id}
    `;
  },

  /**
   * Cambia el método de envío de la orden. Solo permitido en ABIERTO — una vez
   * generado el estimado, generatePreBilling ya usó este valor para calcular la
   * tarifa y cambiarlo después dejaría el monto desincronizado del método mostrado.
   */
  setDeliveryMethod: async (uuid: string, deliveryMethod: DeliveryMethod): Promise<void> => {
    const [row] = await sql`
      SELECT id, status FROM consolidations WHERE uuid = ${uuid} LIMIT 1
    `;
    if (!row) throw new Error('Orden de envío no encontrada.');
    if (row.status !== 'ABIERTO') {
      throw new Error('Transición inválida: solo se puede cambiar el método de envío mientras la orden esté ABIERTO.');
    }

    await sql`
      UPDATE consolidations SET delivery_method = ${deliveryMethod}, updated_at = NOW()
      WHERE id = ${row.id}
    `;
  },

  /**
   * Estampa pre_billing.notified_at al enviar la plantilla de cobro por WhatsApp —
   * marcador de "orden notificada" para el filtro "Sin notificar" del listado.
   */
  markPreBillingNotified: async (consolidationUuid: string): Promise<void> => {
    const [c] = await sql`SELECT id FROM consolidations WHERE uuid = ${consolidationUuid} LIMIT 1`;
    if (!c) throw new Error('Orden de envío no encontrada.');

    const [pre] = await sql`SELECT uuid FROM pre_billing WHERE consolidation_id = ${c.id} LIMIT 1`;
    if (!pre) throw new Error('Estimado requerido: esta orden de envío no tiene un estimado generado.');

    await sql`
      UPDATE pre_billing SET notified_at = NOW()
      WHERE consolidation_id = ${c.id}
    `;
  },

  deleteConsolidation: async (uuid: string): Promise<void> => {
    await sql`BEGIN`;
    try {
      const [row] = await sql`
        SELECT status FROM consolidations WHERE uuid = ${uuid} LIMIT 1
      `;
      if (!row) throw new Error('Orden de envío no encontrada.');
      if (row.status !== 'ABIERTO') throw new Error('Solo se pueden eliminar órdenes de envío en estado ABIERTO.');

      await sql`
        UPDATE packages SET consolidation_id = NULL
        WHERE consolidation_id = (SELECT id FROM consolidations WHERE uuid = ${uuid})
      `;

      await sql`
        DELETE FROM pre_billing
        WHERE consolidation_id = (SELECT id FROM consolidations WHERE uuid = ${uuid})
      `;

      await sql`DELETE FROM consolidations WHERE uuid = ${uuid}`;
      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

  updateConsolidationStatus: async (
    uuid: string,
    status: ConsolidationStatus,
  ): Promise<{ uuid: string; status: ConsolidationStatus }> => {
    await sql`BEGIN`;
    try {
      const [current] = await sql`
        SELECT id, status FROM consolidations WHERE uuid = ${uuid} LIMIT 1
      `;
      if (!current) throw new Error('Orden de envío no encontrada.');

      // Reabrir (CERRADO → ABIERTO): el estimado/factura quedó ligado al peso/paquetes
      // de ese momento. Si la factura existe pero no ha sido pagada, se descarta junto
      // con la prefactura — el operador deberá generar el estimado y confirmarlo de nuevo
      // tras editar los paquetes. Si ya fue pagada, no se puede reabrir: invalidaría un
      // cobro real ya realizado.
      if (status === ConsolidationStatus.ABIERTO && current.status === ConsolidationStatus.CERRADO) {
        const [bill] = await sql`
          SELECT uuid, is_paid FROM billing WHERE consolidation_id = ${current.id} LIMIT 1
        `;
        if (bill?.is_paid) {
          throw new Error('No se puede reabrir: esta orden de envío ya tiene una factura pagada.');
        }
        if (bill) {
          await sql`DELETE FROM billing WHERE consolidation_id = ${current.id}`;
        }
        await sql`DELETE FROM pre_billing WHERE consolidation_id = ${current.id}`;
        // La participación de Farid se calculó sobre ese estimado/factura que se
        // acaba de descartar: dejarla viva la seguiría sumando al total del mes
        // por un cobro que ya no existe. Se regenera al volver a estimar.
        await sql`DELETE FROM profit_shares WHERE consolidation_id = ${current.id}`;
      }

      const [row] = await sql`
        UPDATE consolidations
        SET status = ${status}, updated_at = NOW()
        WHERE uuid = ${uuid}
        RETURNING uuid, id, status
      `;
      if (!row) throw new Error('Orden de envío no encontrada.');

      // Al marcar ENTREGADO, mover todos los paquetes a ENTREGADO también
      if (status === ConsolidationStatus.ENTREGADO) {
        await sql`
          UPDATE packages SET status = 'ENTREGADO'
          WHERE consolidation_id = ${row.id}
            AND status != 'ENTREGADO'
        `;
      }

      await sql`COMMIT`;
      return { uuid: row.uuid, status: row.status };
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

  /**
   * Clientes con al menos un paquete sin orden de envío (consolidation_id NULL),
   * con conteo y peso total — usado por el modal de notificación masiva de
   * WhatsApp en Logística (independiente de cualquier selección de paquetes).
   */
  getCustomersWithAvailablePackages: async (): Promise<CustomerWithAvailablePackages[]> => {
    const rows = await sql`
      SELECT
        c.id AS customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        COUNT(p.id) AS package_count,
        COUNT(p.id) FILTER (WHERE p.notified_at IS NULL) AS unnotified_count,
        COALESCE(SUM(p.weight_lb), 0) AS total_weight_lb
      FROM packages p
      JOIN customers c ON c.id = p.customer_id
      WHERE p.consolidation_id IS NULL
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      ORDER BY c.first_name ASC, c.last_name ASC
    `;
    return rows as CustomerWithAvailablePackages[];
  },

  getAvailablePackagesForCustomer: async (
    customerUuid: string,
  ): Promise<AvailablePackage[]> => {
    const rows = await sql`
      SELECT
        p.uuid,
        p.tracking_number,
        p.weight_lb,
        p.package_type,
        p.status,
        p.arrival_date,
        p.store_name
      FROM packages p
      WHERE p.customer_id = ${customerUuid}
        AND p.consolidation_id IS NULL
      ORDER BY p.created_at DESC
    `;
    return rows as AvailablePackage[];
  },

  getConsolidationByPackageUuid: async (
    packageUuid: string,
  ): Promise<{ id: number; uuid: string; status: ConsolidationStatus; billing_uuid: string | null; package_count: number } | null> => {
    const [row] = await sql`
      SELECT con.id, con.uuid, con.status, b.uuid AS billing_uuid,
        (SELECT COUNT(*) FROM packages p2 WHERE p2.consolidation_id = con.id) AS package_count
      FROM packages p
      JOIN consolidations con ON con.id = p.consolidation_id
      LEFT JOIN billing b ON b.consolidation_id = con.id
      WHERE p.uuid = ${packageUuid}
      LIMIT 1
    `;
    if (!row) return null;
    return { ...row, package_count: Number(row.package_count) } as { id: number; uuid: string; status: ConsolidationStatus; billing_uuid: string | null; package_count: number };
  },

  unassignPackage: async (packageUuid: string, consolidationId: number): Promise<void> => {
    await sql`BEGIN`;
    try {
      await sql`
        UPDATE packages SET consolidation_id = NULL
        WHERE uuid = ${packageUuid}
      `;

      await sql`
        UPDATE consolidations
        SET total_weight_lb = COALESCE((SELECT SUM(weight_lb) FROM packages WHERE consolidation_id = ${consolidationId}), 0),
            updated_at = NOW()
        WHERE id = ${consolidationId}
      `;

      await sql`
        DELETE FROM pre_billing WHERE consolidation_id = ${consolidationId}
      `;

      // Cambió el peso de la orden: la participación calculada sobre el estimado
      // anterior ya no corresponde. Se regenera al volver a estimar.
      await sql`
        DELETE FROM profit_shares WHERE consolidation_id = ${consolidationId}
      `;

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

  /**
   * Agrega paquetes sueltos (sin orden) a una orden ya existente. Solo permitido en
   * ABIERTO. Si existía una prefactura, se elimina — el peso cambia y el snapshot
   * queda obsoleto (mismo criterio que unassignPackage).
   */
  assignPackages: async (consolidationUuid: string, packageUuids: string[]): Promise<void> => {
    await sql`BEGIN`;
    try {
      const [con] = await sql`
        SELECT id, customer_id, status FROM consolidations WHERE uuid = ${consolidationUuid} LIMIT 1
      `;
      if (!con) throw new Error('Orden de envío no encontrada.');
      if (con.status !== 'ABIERTO') {
        throw new Error('Solo se pueden agregar paquetes a una orden de envío en estado ABIERTO.');
      }

      const [mismatch] = await sql`
        SELECT COUNT(*) AS mismatched
        FROM packages
        WHERE uuid = ANY(${packageUuids}) AND (customer_id != ${con.customer_id} OR consolidation_id IS NOT NULL)
      `;
      if (parseInt(mismatch.mismatched, 10) > 0) {
        throw new Error('Todos los paquetes deben pertenecer al mismo cliente y no estar ya asignados a otra orden.');
      }

      await sql`
        UPDATE packages SET consolidation_id = ${con.id}
        WHERE uuid = ANY(${packageUuids})
      `;

      await sql`
        UPDATE consolidations
        SET total_weight_lb = COALESCE((SELECT SUM(weight_lb) FROM packages WHERE consolidation_id = ${con.id}), 0),
            updated_at = NOW()
        WHERE id = ${con.id}
      `;

      await sql`
        DELETE FROM pre_billing WHERE consolidation_id = ${con.id}
      `;

      // Mismo criterio que unassignPackage: cambió el peso, la participación
      // calculada sobre el estimado anterior deja de corresponder.
      await sql`
        DELETE FROM profit_shares WHERE consolidation_id = ${con.id}
      `;

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },
};
