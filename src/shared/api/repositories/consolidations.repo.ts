import sql from '@/lib/db';
import {
  ConsolidationListItem,
  ConsolidationDetail,
  ConsolidationStatus,
  AvailablePackage,
} from '@/types/logistics/logistics.types';
import { PaginatedResponse } from '@/types/paginate.types';

export const ConsolidationsRepository = {
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
    const statusTerm = status && status !== 'ALL' ? status : null;
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
        COALESCE(
          json_agg(
            json_build_object(
              'uuid', p.uuid,
              'tracking_number', p.tracking_number,
              'weight_lb', p.weight_lb,
              'package_type', p.package_type,
              'status', p.status,
              'arrival_date', p.arrival_date
            ) ORDER BY p.created_at DESC
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS packages
      FROM consolidations con
      LEFT JOIN customers c ON c.id = con.customer_id
      LEFT JOIN packages p ON p.consolidation_id = con.id
      WHERE con.uuid = ${uuid}
      GROUP BY con.uuid, con.customer_id, con.status, con.total_weight_lb,
               con.created_at, con.updated_at, c.first_name, c.last_name, c.customer_code, c.email
    `;
    return row ? (row as ConsolidationDetail) : null;
  },

  updateConsolidationStatus: async (
    uuid: string,
    status: ConsolidationStatus,
  ): Promise<{ uuid: string; status: ConsolidationStatus }> => {
    const [row] = await sql`
      UPDATE consolidations
      SET status = ${status}, updated_at = NOW()
      WHERE uuid = ${uuid}
      RETURNING uuid, status
    `;
    if (!row) throw new Error('Consolidación no encontrada.');
    return row as { uuid: string; status: ConsolidationStatus };
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
        p.arrival_date
      FROM packages p
      WHERE p.customer_id = ${customerUuid}
        AND p.consolidation_id IS NULL
      ORDER BY p.created_at DESC
    `;
    return rows as AvailablePackage[];
  },
};
