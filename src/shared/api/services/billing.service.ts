import { BillingRepository } from '../repositories/billing.repo';
import {
  BillingListItem,
  BillingDetail,
  BillingMonthlyReport,
  PendingConsolidation,
} from '@/types/logistics/logistics.types';
import { PaginatedResponse } from '@/types/paginate.types';

export const BillingService = {
  getBillingList: async (
    page: number = 1,
    limit: number = 10,
    search?: string,
    isPaid?: boolean,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PaginatedResponse<BillingListItem>> => {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    try {
      const { data, total } = await BillingRepository.getPaginatedBilling(
        safePage,
        safeLimit,
        search,
        isPaid,
        dateFrom,
        dateTo,
      );

      const totalPages = Math.ceil(total / safeLimit);

      return {
        data,
        meta: { total, page: safePage, limit: safeLimit, totalPages },
      };
    } catch (error: unknown) {
      console.error('[BillingService.getBillingList]:', error);
      throw new Error('Error al obtener el listado de facturas.');
    }
  },

  getBillingDetail: async (uuid: string): Promise<BillingDetail> => {
    if (!uuid) throw new Error('El UUID de la factura es requerido.');

    const detail = await BillingRepository.getBillingDetail(uuid);
    if (!detail) throw new Error(`No se encontró la factura con UUID: ${uuid}`);

    return detail;
  },

  getPendingConsolidations: async (): Promise<PendingConsolidation[]> => {
    try {
      return await BillingRepository.getPendingConsolidations();
    } catch (error: unknown) {
      console.error('[BillingService.getPendingConsolidations]:', error);
      throw new Error('Error al obtener las consolidaciones pendientes de facturar.');
    }
  },

  getBillingReports: async (from: string, to: string): Promise<BillingMonthlyReport[]> => {
    if (!from || !to) throw new Error('Las fechas de inicio y fin son requeridas.');

    try {
      return await BillingRepository.getBillingReports(from, to);
    } catch (error: unknown) {
      console.error('[BillingService.getBillingReports]:', error);
      throw new Error('Error al obtener el reporte de facturación.');
    }
  },

  confirmPayment: async (billingUuid: string): Promise<Partial<BillingListItem>> => {
    if (!billingUuid) throw new Error('El UUID de la factura es requerido.');

    try {
      return await BillingRepository.markBillingAsPaid(billingUuid);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al marcar la factura como pagada.';
      throw new Error(msg);
    }
  },
};
