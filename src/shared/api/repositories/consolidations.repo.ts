import sql from '@/lib/db';
import {
  ConsolidationListItem,
  ConsolidationDetail,
  ConsolidationStatus,
  AvailablePackage,
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

  getPaginatedConsolidations: async (
    page: number,
    limit: number,
    search?: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PaginatedResponse<ConsolidationListItem>> => {
    const offset = (page - 1) * limit;
    const searchTerm = search ? `%${search}%` : null;
    const isPendientes = status === 'PENDIENTES';
    const statusTerm = status && status !== 'ALL' && !isPendientes ? status : null;
    const fromDate = dateFrom || null;
    const toDate = dateTo || null;

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
          COUNT(p.id) AS package_count
        FROM consolidations con
        LEFT JOIN customers c ON c.id = con.customer_id
        LEFT JOIN packages p ON p.consolidation_id = con.id
        WHERE
          (${searchTerm}::text IS NULL
            OR c.first_name ILIKE ${searchTerm}
            OR c.last_name ILIKE ${searchTerm}
            OR c.customer_code ILIKE ${searchTerm}
            OR con.uuid::text ILIKE ${searchTerm})
          AND (${statusTerm}::text IS NULL OR con.status = ${statusTerm})
          AND (NOT ${isPendientes} OR con.status IN ('ABIERTO', 'CERRADO'))
          AND (${fromDate}::date IS NULL OR con.created_at::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR con.created_at::date <= ${toDate}::date)
        GROUP BY con.uuid, con.customer_id, con.status, con.total_weight_lb, con.created_at, con.updated_at,
                 c.first_name, c.last_name, c.customer_code
        ORDER BY con.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*) AS total
        FROM consolidations con
        LEFT JOIN customers c ON c.id = con.customer_id
        WHERE
          (${searchTerm}::text IS NULL
            OR c.first_name ILIKE ${searchTerm}
            OR c.last_name ILIKE ${searchTerm}
            OR c.customer_code ILIKE ${searchTerm}
            OR con.uuid::text ILIKE ${searchTerm})
          AND (${statusTerm}::text IS NULL OR con.status = ${statusTerm})
          AND (NOT ${isPendientes} OR con.status IN ('ABIERTO', 'CERRADO'))
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
        COALESCE(
          json_agg(
            json_build_object(
              'uuid', p.uuid,
              'tracking_number', p.tracking_number,
              'weight_lb', p.weight_lb,
              'package_type', p.package_type,
              'status', p.status,
              'arrival_date', p.arrival_date,
              'store_name', p.store_name
            ) ORDER BY p.created_at DESC
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS packages,
        pb.uuid AS pre_billing_uuid,
        pb.estimated_amount_crc AS pre_billing_amount,
        pb.delivery_method AS pre_billing_delivery_method,
        pb.is_confirmed AS pre_billing_confirmed,
        pb.confirmed_at AS pre_billing_confirmed_at,
        pb.notified_at AS pre_billing_notified_at,
        b.uuid AS billing_uuid,
        b.is_paid AS billing_is_paid
      FROM consolidations con
      LEFT JOIN customers c ON c.id = con.customer_id
      LEFT JOIN packages p ON p.consolidation_id = con.id
      LEFT JOIN pre_billing pb ON pb.consolidation_id = con.id
      LEFT JOIN billing b ON b.consolidation_id = con.id
      WHERE con.uuid = ${uuid}
      GROUP BY con.uuid, con.customer_id, con.status, con.total_weight_lb,
               con.created_at, con.updated_at, c.first_name, c.last_name, c.customer_code, c.email, c.phone,
               pb.uuid, pb.estimated_amount_crc, pb.delivery_method, pb.is_confirmed, pb.confirmed_at, pb.notified_at,
               b.uuid, b.is_paid
    `;
    return row ? (row as ConsolidationDetail) : null;
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
  ): Promise<{ id: number; uuid: string; status: ConsolidationStatus; billing_uuid: string | null } | null> => {
    const [row] = await sql`
      SELECT con.id, con.uuid, con.status, b.uuid AS billing_uuid
      FROM packages p
      JOIN consolidations con ON con.id = p.consolidation_id
      LEFT JOIN billing b ON b.consolidation_id = con.id
      WHERE p.uuid = ${packageUuid}
      LIMIT 1
    `;
    return (row as { id: number; uuid: string; status: ConsolidationStatus; billing_uuid: string | null } | undefined) ?? null;
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

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },
};
