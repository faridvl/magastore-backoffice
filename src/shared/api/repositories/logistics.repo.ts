import sql from '@/lib/db';
import {
  PackageStatus,
  PackageType,
  PackageInput,
  Package,
  Consolidation,
  CourierRate,
  PreBilling,
  PreBillingDetail,
  DeliveryMethod,
} from '@/types/logistics/logistics.types';
import { getSettings } from './settings.repo';

/**
 * Repository para el sistema de logística de couriers.
 * Maneja transacciones manuales compatibles con Neon HTTP Client.
 */
export const LogisticsRepository = {
  /**
   * 1. CREATE PACKAGE: Registro de entrada de mercancía en Miami.
   */
  createPackage: async (data: PackageInput): Promise<Partial<Package>> => {
    const addressId = data.address_id || null;
    const courierCostUsd = data.courier_cost_usd ?? null;
    const tcBanco = data.tc_banco ?? null;
    const insuranceApplied = data.insurance_applied ?? true;
    const courierRateId = data.courier_rate_id ?? null;
    const storeName = data.store_name?.trim() || null;
    const status = data.status || PackageStatus.PANAMA;
    const rows = await sql`
      INSERT INTO packages (customer_id, tracking_number, weight_lb, package_type, status, address_id, courier_cost_usd, tc_banco, insurance_applied, courier_rate_id, store_name)
      VALUES (${data.customer_id}, ${data.tracking_number}, ${data.weight_lb}, ${data.package_type || PackageType.AEREO}, ${status}, ${addressId}, ${courierCostUsd}, ${tcBanco}, ${insuranceApplied}, ${courierRateId}, ${storeName})
      RETURNING uuid, tracking_number, status, courier_cost_usd, tc_banco, insurance_applied, courier_rate_id, store_name, created_at;
    `;
    return rows[0];
  },

  /**
   * Verifica si ya existe un paquete con el mismo tracking_number.
   */
  existsByTrackingNumber: async (trackingNumber: string): Promise<boolean> => {
    const [row] = await sql`
      SELECT 1 FROM packages WHERE tracking_number = ${trackingNumber} LIMIT 1
    `;
    return !!row;
  },

  getCourierRates: async (): Promise<CourierRate[]> => {
    const rows = await sql`
      SELECT id, uuid, name, origin, package_type, rate_usd, insurance_usd, is_active, created_at
      FROM courier_rates
      WHERE is_active = true
      ORDER BY name ASC
    `;
    return rows as CourierRate[];
  },

  generatePreBilling: async (
    consolidationUuid: string,
    deliveryMethod: DeliveryMethod,
  ): Promise<Partial<PreBilling>> => {
    const settings = await getSettings();
    if (!settings) throw new Error('No se encontraron las tarifas del sistema.');

    const price_lb = Number(settings.price_per_lb);
    const exchange = Number(settings.exchange_rate);
    const min_lb   = Number(settings.min_weight);
    const deliveryFee =
      deliveryMethod === 'CORREOS_CR' ? Number(settings.correos_fee_crc ?? 4500) :
      deliveryMethod === 'TRACOPA'    ? Number(settings.tracopa_fee_crc  ?? 3000) :
      0;

    try {
      await sql`BEGIN`;

      const [c] = await sql`
        SELECT id, total_weight_lb, status FROM consolidations WHERE uuid = ${consolidationUuid}
      `;
      if (!c) throw new Error('Orden de envío no encontrada.');

      if (c.status === 'DESPACHADO' || c.status === 'ENTREGADO') {
        throw new Error('No se puede generar el estimado: la orden de envío ya fue despachada.');
      }

      const actualWeight  = Number(c.total_weight_lb);
      const chargedWeight = Math.max(actualWeight, min_lb);
      const flete         = chargedWeight * price_lb * exchange;
      const estimatedCrc  = flete + deliveryFee;

      const [existing] = await sql`
        SELECT uuid FROM pre_billing WHERE consolidation_id = ${c.id} LIMIT 1
      `;

      let result: Partial<PreBilling>;
      if (existing) {
        const [updated] = await sql`
          UPDATE pre_billing
          SET estimated_amount_crc = ${estimatedCrc},
              delivery_method      = ${deliveryMethod},
              delivery_fee_crc     = ${deliveryFee},
              applied_rate_usd     = ${price_lb},
              applied_exchange     = ${exchange},
              total_weight_charged = ${chargedWeight},
              updated_at           = NOW()
          WHERE consolidation_id = ${c.id}
          RETURNING uuid, estimated_amount_crc, delivery_method, is_confirmed, created_at
        `;
        result = updated;
      } else {
        const [pre] = await sql`
          INSERT INTO pre_billing (
            consolidation_id, estimated_amount_crc, delivery_method,
            delivery_fee_crc, applied_rate_usd, applied_exchange, total_weight_charged
          ) VALUES (
            ${c.id}, ${estimatedCrc}, ${deliveryMethod},
            ${deliveryFee}, ${price_lb}, ${exchange}, ${chargedWeight}
          )
          RETURNING uuid, estimated_amount_crc, delivery_method, is_confirmed, created_at
        `;
        result = pre;
      }

      // Generar el estimado "cierra" la orden: deja de aceptar más paquetes
      // y pasa a la cola de cobro. Solo aplica la primera vez (ABIERTO); si ya
      // está CERRADO (recalculando el estimado) no hay transición que hacer.
      if (c.status === 'ABIERTO') {
        await sql`UPDATE consolidations SET status = 'CERRADO', updated_at = NOW() WHERE id = ${c.id}`;
      }

      await sql`COMMIT`;
      return result;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

  confirmPreBilling: async (consolidationUuid: string): Promise<{ billing_uuid: string }> => {
    const settings = await getSettings();
    if (!settings) throw new Error('No se encontraron las tarifas del sistema.');

    try {
      await sql`BEGIN`;

      const [c] = await sql`
        SELECT id, customer_id, total_weight_lb, delivery_address_id FROM consolidations WHERE uuid = ${consolidationUuid}
      `;
      if (!c) throw new Error('Orden de envío no encontrada.');

      const [pre] = await sql`
        SELECT * FROM pre_billing WHERE consolidation_id = ${c.id} LIMIT 1
      `;
      if (!pre) throw new Error('No existe prefactura para esta orden de envío.');
      if (pre.is_confirmed) throw new Error('La prefactura ya fue confirmada.');

      const [existingBill] = await sql`
        SELECT uuid FROM billing WHERE consolidation_id = ${c.id} LIMIT 1
      `;
      if (existingBill) throw new Error('Esta orden de envío ya tiene una factura generada.');

      // La dirección snapshot usa la fijada en la orden (delivery_address_id), no la
      // is_default del cliente — pueden diferir si el operador la cambió para este envío.
      const [addressRow] = c.delivery_address_id
        ? await sql`SELECT exact_address FROM customer_addresses WHERE id = ${c.delivery_address_id}`
        : await sql`
            SELECT exact_address FROM customer_addresses
            WHERE customer_id = ${c.customer_id}
            ORDER BY is_default DESC LIMIT 1
          `;

      const [bill] = await sql`
        INSERT INTO billing (
          consolidation_id, applied_rate_usd, applied_exchange, applied_fee_crc,
          total_weight_charged, total_amount_crc, delivery_method,
          delivery_fee_crc, delivery_address_snapshot
        ) VALUES (
          ${c.id}, ${pre.applied_rate_usd}, ${pre.applied_exchange}, ${pre.delivery_fee_crc},
          ${pre.total_weight_charged}, ${pre.estimated_amount_crc}, ${pre.delivery_method},
          ${pre.delivery_fee_crc}, ${addressRow?.exact_address ?? null}
        )
        RETURNING uuid
      `;

      await sql`
        UPDATE pre_billing SET is_confirmed = true, confirmed_at = NOW()
        WHERE consolidation_id = ${c.id}
      `;

      await sql`COMMIT`;
      return { billing_uuid: bill.uuid };
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

  bulkUpdateStatus: async (
    packageUuids: string[],
    status: PackageStatus,
  ): Promise<number> => {
    const rows = await sql`
      UPDATE packages
      SET status = ${status}, updated_at = NOW()
      WHERE uuid = ANY(${packageUuids})
      RETURNING id
    `;
    return rows.length;
  },

  /**
   * 2. GET TRACKING HISTORY: Consulta por UUID con agregación de eventos.
   */
  getTrackingHistory: async (packageUuid: string): Promise<any> => {
    const rows = await sql`
      SELECT
        p.uuid,
        p.tracking_number,
        p.status,
        p.weight_lb,
        p.internal_notes,
        p.evidence_url,
        p.tc_banco,
        c.first_name,
        c.last_name,
        c.customer_code,
        cr.name        AS courier_rate_name,
        cr.rate_usd    AS courier_rate_usd,
        cr.insurance_usd AS courier_insurance_usd,
        b.is_paid,
        b.paid_at,
        b.total_amount_crc,
        b.delivery_method,
        b.delivery_fee_crc,
        b.applied_rate_usd,
        b.applied_exchange,
        b.total_weight_charged,
        b.applied_fee_crc,
        COALESCE(
          (SELECT json_agg(ev.* ORDER BY ev.created_at DESC)
           FROM package_events ev WHERE ev.package_id = p.id),
          '[]'::json
        ) AS events
      FROM packages p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN consolidations con ON p.consolidation_id = con.id
      LEFT JOIN courier_rates cr ON p.courier_rate_id = cr.id
      LEFT JOIN LATERAL (
        SELECT is_paid, paid_at, total_amount_crc, delivery_method, delivery_fee_crc,
               applied_rate_usd, applied_exchange, total_weight_charged, applied_fee_crc
        FROM billing
        WHERE consolidation_id = con.id
        ORDER BY created_at DESC
        LIMIT 1
      ) b ON true
      WHERE p.uuid = ${packageUuid}
    `;
    return rows[0] || null;
  },

  /**
   * 2b. GET PACKAGE DETAIL BY TRACKING: Consulta admin completa por tracking_number (con billing).
   */
  getPackageDetailByTracking: async (trackingNumber: string): Promise<any> => {
    const rows = await sql`
      SELECT
        p.uuid,
        p.tracking_number,
        p.status,
        p.weight_lb,
        p.internal_notes,
        p.evidence_url,
        c.first_name,
        c.last_name,
        c.customer_code,
        b.is_paid,
        b.paid_at,
        b.total_amount_crc,
        b.delivery_method,
        b.delivery_fee_crc,
        COALESCE(
          (SELECT json_agg(ev.* ORDER BY ev.created_at DESC)
           FROM package_events ev WHERE ev.package_id = p.id),
          '[]'::json
        ) AS events
      FROM packages p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN consolidations con ON p.consolidation_id = con.id
      LEFT JOIN LATERAL (
        SELECT is_paid, paid_at, total_amount_crc, delivery_method, delivery_fee_crc
        FROM billing
        WHERE consolidation_id = con.id
        ORDER BY created_at DESC
        LIMIT 1
      ) b ON true
      WHERE p.tracking_number = ${trackingNumber}
    `;
    return rows[0] || null;
  },

  /**
   * 2c. GET TRACKING BY NUMBER: Consulta pública por tracking_number (para /tracking).
   */
  getTrackingByNumber: async (trackingNumber: string): Promise<any> => {
    const rows = await sql`
      SELECT
        p.uuid,
        p.tracking_number,
        p.status,
        p.weight_lb,
        p.arrival_date,
        p.internal_notes,
        p.evidence_url,
        c.first_name,
        c.last_name,
        c.customer_code,
        COALESCE(
          (SELECT json_agg(ev.* ORDER BY ev.created_at ASC)
           FROM package_events ev WHERE ev.package_id = p.id),
          '[]'::json
        ) AS events
      FROM packages p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.tracking_number = ${trackingNumber}
    `;
    return rows[0] || null;
  },

  /**
   * 3. GET ALL PAGINATED: Obtiene lista de paquetes para administración.
   */
  getPaginatedPackages: async (
    page: number,
    limit: number,
    search?: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string,
    consolidationFilter?: string,
    customerUuid?: string,
  ): Promise<{ data: any[]; total: number }> => {
    const offset = (page - 1) * limit;

    const searchTerm = search ? `%${search}%` : null;
    const isActivos = status === 'ACTIVOS';
    const statusTerm = status && status !== 'ALL' && !isActivos ? status : null;
    const fromDate = dateFrom || null;
    const toDate = dateTo || null;
    const wantsSinOrden = consolidationFilter === 'SIN_ORDEN';
    const wantsConOrden = consolidationFilter === 'CON_ORDEN';
    const customerFilter = customerUuid || null;

    const [packages, countResult] = await Promise.all([
      sql`
      SELECT p.*, c.first_name, c.last_name, c.customer_code,
        con.uuid AS consolidation_uuid, con.status AS consolidation_status
      FROM packages p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN consolidations con ON p.consolidation_id = con.id
      WHERE
        (${searchTerm}::text IS NULL OR p.tracking_number ILIKE ${searchTerm} OR c.first_name ILIKE ${searchTerm} OR c.customer_code ILIKE ${searchTerm})
        AND (${statusTerm}::text IS NULL OR p.status = ${statusTerm})
        AND (NOT ${isActivos} OR p.status != 'ENTREGADO')
        AND (${fromDate}::date IS NULL OR p.created_at::date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR p.created_at::date <= ${toDate}::date)
        AND (NOT ${wantsSinOrden} OR p.consolidation_id IS NULL)
        AND (NOT ${wantsConOrden} OR p.consolidation_id IS NOT NULL)
        AND (${customerFilter}::text IS NULL OR p.customer_id = ${customerFilter}::uuid)
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
      sql`
      SELECT COUNT(*) as total
      FROM packages p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE
        (${searchTerm}::text IS NULL OR p.tracking_number ILIKE ${searchTerm} OR c.first_name ILIKE ${searchTerm} OR c.customer_code ILIKE ${searchTerm})
        AND (${statusTerm}::text IS NULL OR p.status = ${statusTerm})
        AND (NOT ${isActivos} OR p.status != 'ENTREGADO')
        AND (${fromDate}::date IS NULL OR p.created_at::date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR p.created_at::date <= ${toDate}::date)
        AND (NOT ${wantsSinOrden} OR p.consolidation_id IS NULL)
        AND (NOT ${wantsConOrden} OR p.consolidation_id IS NOT NULL)
        AND (${customerFilter}::text IS NULL OR p.customer_id = ${customerFilter}::uuid)
    `,
    ]);

    return {
      data: packages,
      total: parseInt(countResult[0].total, 10),
    };
  },

  /**
   * 4. CONSOLIDATE PACKAGES: Transacción para unir paquetes a un contenedor/padre.
   */
  consolidatePackages: async (
    consolidationUuid: string,
    packageUuids: string[],
  ): Promise<Partial<Consolidation>> => {
    try {
      await sql`BEGIN`;

      const [cons] = await sql`SELECT id FROM consolidations WHERE uuid = ${consolidationUuid}`;
      if (!cons) throw new Error('Orden de envío no encontrada.');

      await sql`
        UPDATE packages 
        SET consolidation_id = ${cons.id} 
        WHERE uuid = ANY(${packageUuids})
      `;

      const [updatedCons] = await sql`
        UPDATE consolidations 
        SET total_weight_lb = (SELECT SUM(weight_lb) FROM packages WHERE consolidation_id = ${cons.id}),
            updated_at = NOW()
        WHERE id = ${cons.id}
        RETURNING uuid, total_weight_lb, status;
      `;

      await sql`COMMIT`;
      return updatedCons;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

  /**
   * 5. GENERATE BILLING: Crea el snapshot financiero de una orden de envío.
   * Lee tarifas vigentes de system_settings. Valida estado y duplicados.
   * El costo de envío local (delivery_fee_crc) se elige en el momento de facturar.
   * profit_per_lb es solo una métrica de reporting y NO se incluye en la factura.
   */
  /**
   * 5b. UPDATE PACKAGE WEIGHT: Actualiza solo el peso registrado.
   */
  updatePackageWeight: async (
    packageUuid: string,
    weight_lb: number,
  ): Promise<Partial<Package>> => {
    const rows = await sql`
      UPDATE packages
      SET weight_lb = ${weight_lb}
      WHERE uuid = ${packageUuid}
      RETURNING uuid, weight_lb;
    `;
    if (rows.length === 0) throw new Error('Paquete no encontrado.');
    return rows[0];
  },

  /**
   * Registra en la bitácora de cada paquete que el cliente fue notificado de su
   * disponibilidad por WhatsApp. No cambia el status del paquete.
   */
  logPackagesNotified: async (packageUuids: string[]): Promise<void> => {
    const rows = await sql`
      SELECT id, status FROM packages WHERE uuid = ANY(${packageUuids})
    `;
    for (const row of rows) {
      await sql`
        INSERT INTO package_events (package_id, status, event_type, description)
        VALUES (${row.id}, ${row.status}, 'INFO', 'Cliente notificado de disponibilidad por WhatsApp')
      `;
    }
  },

  /**
   * 6. REGISTER INCIDENCE / UPDATE STATUS: Actualización con metadatos de daño.
   */
  updatePackageStatus: async (
    packageUuid: string,
    status: PackageStatus,
    note?: string,
    evidenceUrl?: string,
    location?: string,
  ): Promise<Partial<Package>> => {
    const rows = await sql`
      UPDATE packages
      SET status = ${status},
          internal_notes = ${note || null},
          evidence_url = ${evidenceUrl || null}
      WHERE uuid = ${packageUuid}
      RETURNING id, uuid, status, internal_notes, evidence_url;
    `;

    if (rows.length === 0) throw new Error('Paquete no encontrado.');

    await sql`
      INSERT INTO package_events (package_id, status, event_type, description, location)
      VALUES (${rows[0].id}, ${status}, 'INFO', ${note || null}, ${location || null})
    `;

    return rows[0];
  },

  /**
   * 7. GET PACKAGE CUSTOMER INFO: Datos del cliente para notificación al entregar.
   */
  getPackageCustomerInfo: async (
    packageUuid: string,
  ): Promise<{ email: string; first_name: string; tracking_number: string } | null> => {
    const rows = await sql`
      SELECT c.email, c.first_name, p.tracking_number
      FROM packages p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.uuid = ${packageUuid}
      LIMIT 1
    `;
    return (rows[0] as { email: string; first_name: string; tracking_number: string }) ?? null;
  },

  /**
   * 8. GET CONSOLIDATION CUSTOMER INFO: Datos del cliente para notificación al facturar.
   */
  getConsolidationCustomerInfo: async (
    consolidationUuid: string,
  ): Promise<{ email: string; first_name: string } | null> => {
    const rows = await sql`
      SELECT DISTINCT c.email, c.first_name
      FROM consolidations con
      JOIN packages p ON p.consolidation_id = con.id
      JOIN customers c ON p.customer_id = c.id
      WHERE con.uuid = ${consolidationUuid}
      LIMIT 1
    `;
    return (rows[0] as { email: string; first_name: string }) ?? null;
  },

  /**
   * 9. VALIDATE PACKAGES BELONG TO CONSOLIDATION CUSTOMER: Verifica que todos los paquetes
   * a asignar pertenezcan al mismo cliente que la orden de envío.
   * Retorna el conteo de paquetes que NO coinciden.
   */
  countMismatchedPackages: async (
    consolidationUuid: string,
    packageUuids: string[],
  ): Promise<number> => {
    const rows = await sql`
      SELECT COUNT(*) AS mismatched
      FROM packages p
      JOIN consolidations con ON con.uuid = ${consolidationUuid}
      WHERE p.uuid = ANY(${packageUuids})
        AND p.customer_id != con.customer_id
    `;
    return parseInt(rows[0]?.mismatched ?? '0', 10);
  },
};
