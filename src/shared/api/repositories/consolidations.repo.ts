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
    // Tres ejes independientes y combinables (reemplazan el enum único
    // ShipmentOrderPaymentFilter de 5 valores mutuamente excluyentes): el
    // dueño pidió poder cruzar "paso 2" con "sin pagar" con "notificada", algo
    // que un solo valor de filtro no puede expresar.
    stepFilter?: string,
    paidFilter?: string,
    notifiedFilter?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PaginatedResponse<ConsolidationListItem>> => {
    const offset = (page - 1) * limit;
    const searchTerm = search ? `%${search}%` : null;
    // Eje 1: paso del wizard. 'FINALIZADA' filtra por current_step = 4
    // directamente — ya no hace falta pasar por con.status.
    const stepValue = stepFilter && stepFilter !== 'ALL' ? Number(stepFilter) : null;
    // Eje 2: pago. Independiente del paso — una orden en paso 3 (despacho) o
    // ya finalizada puede seguir sin pagar (clientes a los que se les
    // despacha sin haber cobrado, caso confirmado por el dueño).
    const isPagada = paidFilter === 'PAGADA';
    const isSinPagar = paidFilter === 'SIN_PAGAR';
    // Eje 3: notificación de la prefactura.
    const isNotificada = notifiedFilter === 'NOTIFICADA';
    const isSinNotificar = notifiedFilter === 'SIN_NOTIFICAR';
    const fromDate = dateFrom || null;
    const toDate = dateTo || null;

    const [rows, countResult] = await Promise.all([
      sql`
        SELECT
          con.uuid,
          con.customer_id,
          con.status,
          con.current_step,
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
          pb.notified_at AS pre_billing_notified_at,
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
          AND (${stepValue}::smallint IS NULL OR con.current_step = ${stepValue}::smallint)
          AND (NOT ${isPagada} OR (b.uuid IS NOT NULL AND b.is_paid = true))
          AND (NOT ${isSinPagar} OR (b.uuid IS NULL OR b.is_paid = false))
          AND (NOT ${isNotificada} OR (pb.uuid IS NOT NULL AND pb.notified_at IS NOT NULL))
          AND (NOT ${isSinNotificar} OR (pb.uuid IS NOT NULL AND pb.notified_at IS NULL))
          AND (${fromDate}::date IS NULL OR (con.created_at AT TIME ZONE 'America/Costa_Rica')::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR (con.created_at AT TIME ZONE 'America/Costa_Rica')::date <= ${toDate}::date)
        GROUP BY con.uuid, con.customer_id, con.status, con.current_step, con.total_weight_lb, con.created_at, con.updated_at,
                 c.first_name, c.last_name, c.customer_code, b.uuid, b.is_paid, b.total_amount_crc, pb.estimated_amount_crc, pb.uuid, pb.notified_at
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
          AND (${stepValue}::smallint IS NULL OR con.current_step = ${stepValue}::smallint)
          AND (NOT ${isPagada} OR (b.uuid IS NOT NULL AND b.is_paid = true))
          AND (NOT ${isSinPagar} OR (b.uuid IS NULL OR b.is_paid = false))
          AND (NOT ${isNotificada} OR (pb.uuid IS NOT NULL AND pb.notified_at IS NOT NULL))
          AND (NOT ${isSinNotificar} OR (pb.uuid IS NOT NULL AND pb.notified_at IS NULL))
          AND (${fromDate}::date IS NULL OR (con.created_at AT TIME ZONE 'America/Costa_Rica')::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR (con.created_at AT TIME ZONE 'America/Costa_Rica')::date <= ${toDate}::date)
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
        con.current_step,
        con.total_weight_lb,
        con.created_at,
        con.updated_at,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.customer_code,
        c.email AS customer_email,
        c.phone AS customer_phone,
        c.id_card AS customer_id_card,
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
        b.delivery_fee_crc AS billing_delivery_fee_crc,
        b.original_delivery_fee_crc AS billing_original_delivery_fee_crc,
        b.actual_delivery_fee_crc AS billing_actual_delivery_fee_crc,
        b.change_returned AS billing_change_returned,
        b.change_returned_at AS billing_change_returned_at,
        ps.share_crc AS profit_share_crc,
        ps.share_percent AS profit_share_percent,
        ps.status AS profit_share_status,
        con.delivery_method,
        con.delivery_address_id,
        con.tracking_code,
        con.dispatched_at,
        con.shipment_requested_at,
        con.customer_notified_shipment_at,
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
      LEFT JOIN profit_shares ps ON ps.consolidation_id = con.id
      LEFT JOIN customer_addresses ca ON ca.id = con.delivery_address_id
      CROSS JOIN system_settings ss
      WHERE con.uuid = ${uuid}
      GROUP BY con.uuid, con.customer_id, con.status, con.current_step, con.total_weight_lb,
               con.created_at, con.updated_at, c.first_name, c.last_name, c.customer_code, c.email, c.phone, c.id_card,
               ct.name, ct.billing_mode, ct.discount_percent,
               pb.uuid, pb.estimated_amount_crc, pb.delivery_fee_crc, pb.delivery_cost_crc, pb.delivery_method, pb.is_confirmed, pb.confirmed_at, pb.notified_at,
               pb.applied_rate_usd, pb.applied_exchange, ss.price_per_lb, ss.exchange_rate, ss.min_weight,
               b.uuid, b.is_paid, b.total_amount_crc, b.courier_cost_crc, b.delivery_cost_crc, b.profit_crc, b.has_unknown_cost,
               b.delivery_fee_crc, b.original_delivery_fee_crc, b.actual_delivery_fee_crc, b.change_returned, b.change_returned_at,
               ps.share_crc, ps.share_percent, ps.status,
               con.delivery_method, con.delivery_address_id, con.tracking_code, con.dispatched_at,
               con.shipment_requested_at, con.customer_notified_shipment_at,
               ca.address_label, ca.exact_address,
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
   * Guarda o corrige la guía del transportista después del despacho. Existe
   * porque la guía es opcional al despachar: el operador entrega el bulto y
   * recibe el número más tarde, o lo tipea mal y necesita corregirlo.
   *
   * Solo tiene sentido sobre una orden ya despachada o entregada — en ABIERTO o
   * CERRADO todavía no hay envío que rastrear, y aceptar una guía ahí dejaría un
   * dato que el reabrir/despachar posterior sobrescribiría de forma confusa.
   */
  setTrackingCode: async (uuid: string, trackingCode: string | null): Promise<void> => {
    const [row] = await sql`
      SELECT id, status FROM consolidations WHERE uuid = ${uuid} LIMIT 1
    `;
    if (!row) throw new Error('Orden de envío no encontrada.');
    if (row.status !== 'DESPACHADO' && row.status !== 'ENTREGADO') {
      throw new Error('Solo se puede registrar la guía en una orden ya despachada.');
    }

    await sql`
      UPDATE consolidations
      SET tracking_code = ${trackingCode || null}, updated_at = NOW()
      WHERE id = ${row.id}
    `;
  },

  /**
   * Ajuste del costo real de envío (paso 4, Notificación y cierre). El
   * transportista confirma un costo que puede diferir del que se usó al
   * generar el estimado — este método corrige lo que se le cobró al cliente.
   *
   * Alcance deliberadamente acotado (ver migración 030): actualiza
   * delivery_fee_crc y total_amount_crc de la factura. NO toca
   * delivery_cost_crc ni profit_crc — la ganancia registrada y la
   * participación de Farid (profit_shares) quedan como se calcularon al
   * confirmar la factura, decisión explícita del dueño.
   *
   * original_delivery_fee_crc se fija UNA SOLA VEZ, en el primer ajuste (con
   * COALESCE): delivery_fee_crc se sobreescribe con el valor real, así que sin
   * este snapshot la diferencia (para el vuelto) daría siempre 0 al releer la
   * orden — se perdería contra qué comparar. Un segundo ajuste posterior sigue
   * comparando contra lo que el cliente vio en la factura original, no contra
   * el ajuste anterior.
   *
   * Solo sobre una orden ya facturada: sin factura no hay delivery_fee_crc
   * que corregir.
   */
  setActualDeliveryFee: async (consolidationUuid: string, actualFeeCrc: number): Promise<{ billing_uuid: string; new_total_amount_crc: number }> => {
    const [c] = await sql`SELECT id FROM consolidations WHERE uuid = ${consolidationUuid} LIMIT 1`;
    if (!c) throw new Error('Orden de envío no encontrada.');

    const [bill] = await sql`
      SELECT uuid, delivery_fee_crc, total_amount_crc FROM billing WHERE consolidation_id = ${c.id} LIMIT 1
    `;
    if (!bill) throw new Error('Esta orden de envío no tiene factura generada.');

    // El fee viejo se resta del total y se suma el nuevo — no se recalcula
    // total_amount_crc desde cero, para no arrastrar ningún otro cambio de
    // tarifas que haya ocurrido después de confirmar la factura.
    const oldFee = Number(bill.delivery_fee_crc);
    const newTotal = Number(bill.total_amount_crc) - oldFee + actualFeeCrc;

    const [updated] = await sql`
      UPDATE billing
      SET original_delivery_fee_crc = COALESCE(original_delivery_fee_crc, delivery_fee_crc),
          actual_delivery_fee_crc = ${actualFeeCrc},
          delivery_fee_crc = ${actualFeeCrc},
          total_amount_crc = ${newTotal},
          -- Un nuevo ajuste invalida un vuelto ya marcado como entregado con
          -- el cálculo anterior — se resetea para que el operador lo revise.
          change_returned = NULL,
          change_returned_at = NULL
      WHERE consolidation_id = ${c.id}
      RETURNING uuid, total_amount_crc
    `;

    return { billing_uuid: updated.uuid, new_total_amount_crc: Number(updated.total_amount_crc) };
  },

  /** Marca que el vuelto calculado en el paso 4 ya se le entregó al cliente. */
  markChangeReturned: async (consolidationUuid: string): Promise<void> => {
    const [c] = await sql`SELECT id FROM consolidations WHERE uuid = ${consolidationUuid} LIMIT 1`;
    if (!c) throw new Error('Orden de envío no encontrada.');

    const [bill] = await sql`SELECT uuid FROM billing WHERE consolidation_id = ${c.id} LIMIT 1`;
    if (!bill) throw new Error('Esta orden de envío no tiene factura generada.');

    await sql`
      UPDATE billing SET change_returned = true, change_returned_at = NOW()
      WHERE consolidation_id = ${c.id}
    `;
  },

  /**
   * Avanza del paso 4 (Notificación y cierre) al 5 (Finalizada). No toca
   * `status` ni paquetes — ya están en ENTREGADO desde que la orden entró al
   * paso 4 (ver ShipmentOrderStep en logistics.types.ts). Solo se permite
   * desde el paso 4: evita saltar pasos por una llamada directa a la API.
   */
  finalizeOrder: async (consolidationUuid: string): Promise<void> => {
    const [row] = await sql`
      UPDATE consolidations
      SET current_step = 5, updated_at = NOW()
      WHERE uuid = ${consolidationUuid} AND current_step = 4
      RETURNING id
    `;
    if (!row) throw new Error('Solo se puede finalizar una orden que esté en el paso de notificación y cierre.');
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

  /**
   * Estampa consolidations.shipment_requested_at al copiar la solicitud de
   * envío al proveedor (paso 3) — marcador para el chip "Envío solicitado" del
   * wizard. Distinto de markCustomerNotifiedShipment: este es el aviso al
   * proveedor, aquel al cliente.
   */
  markShipmentRequested: async (consolidationUuid: string): Promise<void> => {
    await sql`
      UPDATE consolidations SET shipment_requested_at = NOW()
      WHERE uuid = ${consolidationUuid}
    `;
  },

  /**
   * Estampa consolidations.customer_notified_shipment_at al avisarle al
   * cliente (WhatsApp) que su envío fue solicitado — marcador para el chip
   * "Cliente notificado / no notificado" del paso 3.
   */
  markCustomerNotifiedShipment: async (consolidationUuid: string): Promise<void> => {
    await sql`
      UPDATE consolidations SET customer_notified_shipment_at = NOW()
      WHERE uuid = ${consolidationUuid}
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
    // Guía del transportista, solo al pasar a DESPACHADO. Opcional: el operador
    // no siempre la tiene al entregar el bulto, y se puede agregar después con
    // setTrackingCode. Parámetro nuevo al final para no romper a los llamadores
    // existentes, que siguen invocando con dos argumentos.
    trackingCode?: string | null,
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
        // La participación de Farid se calculó sobre ese estimado/factura que se
        // acaba de descartar: dejarla viva la seguiría sumando al total del mes
        // por un cobro que ya no existe. Se regenera al volver a estimar. Debe
        // borrarse antes que billing: profit_shares.billing_id referencia a
        // billing(id) sin ON DELETE CASCADE.
        await sql`DELETE FROM profit_shares WHERE consolidation_id = ${current.id}`;
        if (bill) {
          await sql`DELETE FROM billing WHERE consolidation_id = ${current.id}`;
        }
        await sql`DELETE FROM pre_billing WHERE consolidation_id = ${current.id}`;
      }

      // La guía pertenece al despacho que se está descartando, no a la orden en
      // abstracto: conservarla haría que un despacho posterior notificara al
      // cliente con el número de un envío que nunca ocurrió. Se limpia junto con
      // el estimado y la factura, por el mismo motivo que ellos.
      const isReopening = status === ConsolidationStatus.ABIERTO;

      // current_step sigue al status 1:1 en toda transición que pasa por acá
      // (ABIERTO=1, CERRADO=2, DESPACHADO=3, ENTREGADO=4 — mismo mapeo del
      // backfill de la migración 030). El paso 1→2 (CERRADO, generar estimado)
      // no pasa por esta función: lo mueve generatePreBilling junto con el
      // auto-cierre de la orden, en su propia transacción.
      const [row] = await sql`
        UPDATE consolidations
        SET status = ${status},
            current_step = CASE ${status}
              WHEN 'ABIERTO' THEN 1
              WHEN 'CERRADO' THEN 2
              WHEN 'DESPACHADO' THEN 3
              WHEN 'ENTREGADO' THEN 4
              ELSE current_step
            END,
            tracking_code = CASE
              WHEN ${isReopening}::boolean THEN NULL
              WHEN ${status} = 'DESPACHADO' THEN ${trackingCode ?? null}
              ELSE tracking_code
            END,
            dispatched_at = CASE
              WHEN ${isReopening}::boolean THEN NULL
              WHEN ${status} = 'DESPACHADO' THEN NOW()
              ELSE dispatched_at
            END,
            updated_at = NOW()
        WHERE uuid = ${uuid}
        RETURNING uuid, id, status, current_step
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
   * Agrega paquetes sueltos (sin orden) a una orden ya existente. Permitido en
   * los pasos 1 (ABIERTO) y 2 (CERRADO, con estimado ya generado) — no en el
   * paso 3 (DESPACHADO): el proveedor ya tiene el bulto solicitado con la
   * lista de paquetes original, agregarle uno más ahí no tiene efecto real.
   *
   * En paso 1 no hay nada que invalidar (todavía no existe estimado). En paso
   * 2 esta función solo actualiza el peso y devuelve `hadPreBilling`: es el
   * service (ConsolidationsService.assignPackages) el que decide recalcular
   * llamando a LogisticsService.generatePreBilling — generatePreBilling vive
   * en el dominio de logistics.repo.ts, cruzar ese límite desde acá duplicaría
   * la fórmula de cobro en vez de reusarla.
   */
  assignPackages: async (consolidationUuid: string, packageUuids: string[]): Promise<{ hadPreBilling: boolean }> => {
    await sql`BEGIN`;
    try {
      const [con] = await sql`
        SELECT id, customer_id, status FROM consolidations WHERE uuid = ${consolidationUuid} LIMIT 1
      `;
      if (!con) throw new Error('Orden de envío no encontrada.');
      if (con.status !== 'ABIERTO' && con.status !== 'CERRADO') {
        throw new Error('Solo se pueden agregar paquetes en el paso de confirmación o de cobro de la orden de envío.');
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

      const [existingPreBilling] = await sql`
        SELECT uuid FROM pre_billing WHERE consolidation_id = ${con.id} LIMIT 1
      `;
      const hadPreBilling = !!existingPreBilling;

      // Paso 1: nunca hay prefactura todavía, nada que borrar. Paso 2: NO se
      // borra acá — el service recalcula en el lugar llamando a
      // generatePreBilling, que hace el UPSERT con el peso nuevo dentro de su
      // propia transacción. Borrarla acá dejaría una ventana sin prefactura si
      // el recálculo del service fallara después de este COMMIT.

      // Mismo criterio que unassignPackage: cambió el peso, la participación
      // calculada sobre el estimado anterior deja de corresponder.
      await sql`
        DELETE FROM profit_shares WHERE consolidation_id = ${con.id}
      `;

      await sql`COMMIT`;
      return { hadPreBilling };
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },
};
