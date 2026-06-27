import sql from '@/lib/db';
import {
  PackageStatus,
  PackageType,
  PackageInput,
  Package,
  Consolidation,
  Billing,
} from '@/types/logistics/logistics.types';
import { getSettings } from './settings.repo';
import { DeliveryMethod } from '@/types/logistics/logistics.types';

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
    const rows = await sql`
      INSERT INTO packages (customer_id, tracking_number, weight_lb, package_type, address_id)
      VALUES (${data.customer_id}, ${data.tracking_number}, ${data.weight_lb}, ${data.package_type || PackageType.AEREO}, ${addressId})
      RETURNING uuid, tracking_number, status, created_at;
    `;
    return rows[0];
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
  ): Promise<{ data: any[]; total: number }> => {
    const offset = (page - 1) * limit;

    const searchTerm = search ? `%${search}%` : null;
    const isActivos = status === 'ACTIVOS';
    const statusTerm = status && status !== 'ALL' && !isActivos ? status : null;
    const fromDate = dateFrom || null;
    const toDate = dateTo || null;

    const [packages, countResult] = await Promise.all([
      sql`
      SELECT p.*, c.first_name, c.last_name, c.customer_code
      FROM packages p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE
        (${searchTerm}::text IS NULL OR p.tracking_number ILIKE ${searchTerm} OR c.first_name ILIKE ${searchTerm} OR c.customer_code ILIKE ${searchTerm})
        AND (${statusTerm}::text IS NULL OR p.status = ${statusTerm})
        AND (NOT ${isActivos} OR p.status != 'ENTREGADO')
        AND (${fromDate}::date IS NULL OR p.created_at::date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR p.created_at::date <= ${toDate}::date)
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
      if (!cons) throw new Error('Consolidación no encontrada.');

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
   * 5. GENERATE BILLING: Crea el snapshot financiero de una consolidación.
   * Lee tarifas vigentes de system_settings. Valida estado y duplicados.
   * El costo de envío local (delivery_fee_crc) se elige en el momento de facturar.
   * profit_per_lb es solo una métrica de reporting y NO se incluye en la factura.
   */
  generateBilling: async (
    consolidationUuid: string,
    deliveryMethod: DeliveryMethod,
  ): Promise<Partial<Billing>> => {
    const settings = await getSettings();
    if (!settings) throw new Error('No se encontraron las tarifas del sistema.');

    const price_lb  = Number(settings.price_per_lb);
    const exchange  = Number(settings.exchange_rate);
    const min_lb    = Number(settings.min_weight);
    const deliveryFee =
      deliveryMethod === 'CORREOS_CR' ? Number(settings.correos_fee_crc ?? 4500) :
      deliveryMethod === 'TRACOPA'    ? Number(settings.tracopa_fee_crc  ?? 3000) :
      0; // RETIRO — sin costo de envío

    try {
      await sql`BEGIN`;

      const [c] = await sql`
        SELECT id, customer_id, total_weight_lb, status FROM consolidations WHERE uuid = ${consolidationUuid}
      `;
      if (!c) throw new Error('Consolidación no encontrada.');

      const validStatuses = ['CERRADO', 'DESPACHADO', 'ENTREGADO'];
      if (!validStatuses.includes(c.status)) {
        throw new Error(
          `La consolidación debe estar en estado CERRADO o superior para facturar. Estado actual: ${c.status}`,
        );
      }

      const [existing] = await sql`
        SELECT uuid FROM billing WHERE consolidation_id = ${c.id} LIMIT 1
      `;
      if (existing) throw new Error('Esta consolidación ya tiene una factura generada.');

      const [addressRow] = await sql`
        SELECT exact_address FROM customer_addresses
        WHERE customer_id = ${c.customer_id}
        ORDER BY is_default DESC
        LIMIT 1
      `;
      const deliveryAddressSnapshot = addressRow?.exact_address ?? null;

      const actualWeight  = Number(c.total_weight_lb);
      const chargedWeight = Math.max(actualWeight, min_lb);
      const flete         = chargedWeight * price_lb * exchange;
      const totalCrc      = flete + deliveryFee;

      const [bill] = await sql`
        INSERT INTO billing (
          consolidation_id,
          applied_rate_usd,
          applied_exchange,
          applied_fee_crc,
          total_weight_charged,
          total_amount_crc,
          delivery_method,
          delivery_fee_crc,
          delivery_address_snapshot
        ) VALUES (
          ${c.id},
          ${price_lb},
          ${exchange},
          ${deliveryFee},
          ${chargedWeight},
          ${totalCrc},
          ${deliveryMethod},
          ${deliveryFee},
          ${deliveryAddressSnapshot}
        )
        RETURNING uuid, total_amount_crc, delivery_method, delivery_fee_crc, created_at;
      `;

      await sql`COMMIT`;
      return bill;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },

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
   * a asignar pertenezcan al mismo cliente que la consolidación.
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
