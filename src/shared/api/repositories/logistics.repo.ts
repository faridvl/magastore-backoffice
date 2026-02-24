import sql from '@/lib/db';
import {
  PackageStatus,
  PackageInput,
  Package,
  Consolidation,
  Billing,
} from '@/types/logistics/logistics.types';

/**
 * Repository para el sistema de logística de couriers.
 * Maneja transacciones manuales compatibles con Neon HTTP Client.
 */
export const LogisticsRepository = {
  /**
   * 1. CREATE PACKAGE: Registro de entrada de mercancía en Miami.
   */
  createPackage: async (data: PackageInput): Promise<Partial<Package>> => {
    const rows = await sql`
      INSERT INTO packages (customer_id, tracking_number, weight_lb, package_type)
      VALUES (${data.customer_id}, ${data.tracking_number}, ${data.weight_lb}, ${data.package_type || 'Aereo'})
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
        COALESCE(
          (SELECT json_agg(ev.* ORDER BY ev.created_at DESC) 
           FROM package_events ev WHERE ev.package_id = p.id), 
          '[]'::json
        ) as events
      FROM packages p
      WHERE p.uuid = ${packageUuid}
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
  ): Promise<{ data: any[]; total: number }> => {
    const offset = (page - 1) * limit;

    // Preparamos los valores para SQL
    const searchTerm = search ? `%${search}%` : null;
    const statusTerm = status && status !== 'ALL' ? status : null;

    const [packages, countResult] = await Promise.all([
      sql`
      SELECT p.*, c.first_name, c.last_name, c.customer_code
      FROM packages p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE 
        (${searchTerm}::text IS NULL OR p.tracking_number ILIKE ${searchTerm} OR c.first_name ILIKE ${searchTerm} OR c.customer_code ILIKE ${searchTerm})
        AND (${statusTerm}::text IS NULL OR p.status = ${statusTerm})
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
   * 5. GENERATE BILLING: Crea el snapshot financiero (Factura).
   */
  generateBilling: async (
    targetUuid: string,
    type: 'PACKAGE' | 'CONSOLIDATION',
  ): Promise<Partial<Billing>> => {
    const RATES = { price_lb: 4.5, exchange: 525, fee: 1500, min_lb: 1 };

    try {
      await sql`BEGIN`;

      let targetId: number;
      let actualWeight: number;

      if (type === 'PACKAGE') {
        const [p] = await sql`SELECT id, weight_lb FROM packages WHERE uuid = ${targetUuid}`;
        if (!p) throw new Error('Paquete no encontrado.');
        targetId = p.id;
        actualWeight = Number(p.weight_lb);
      } else {
        const [c] =
          await sql`SELECT id, total_weight_lb FROM consolidations WHERE uuid = ${targetUuid}`;
        if (!c) throw new Error('Consolidado no encontrado.');
        targetId = c.id;
        actualWeight = Number(c.total_weight_lb);
      }

      const chargedWeight = Math.max(actualWeight, RATES.min_lb);
      const totalCrc = chargedWeight * RATES.price_lb * RATES.exchange + RATES.fee;

      const [bill] = await sql`
        INSERT INTO billing (
          package_id, 
          consolidation_id, 
          applied_rate_usd, 
          applied_exchange, 
          applied_fee_crc,
          total_weight_charged,
          total_amount_crc
        ) VALUES (
          ${type === 'PACKAGE' ? targetId : null},
          ${type === 'CONSOLIDATION' ? targetId : null},
          ${RATES.price_lb},
          ${RATES.exchange},
          ${RATES.fee},
          ${chargedWeight},
          ${totalCrc}
        )
        RETURNING uuid, total_amount_crc, created_at;
      `;

      await sql`COMMIT`;
      return bill;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
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
  ): Promise<Partial<Package>> => {
    const rows = await sql`
      UPDATE packages 
      SET status = ${status},
          internal_notes = ${note || null},
          evidence_url = ${evidenceUrl || null},
          updated_at = NOW()
      WHERE uuid = ${packageUuid}
      RETURNING uuid, status, internal_notes, evidence_url;
    `;

    if (rows.length === 0) throw new Error('Paquete no encontrado.');
    return rows[0];
  },
};
