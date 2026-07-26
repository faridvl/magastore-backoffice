import { BillingRepository } from '../repositories/billing.repo';
import {
  BillingListItem,
  BillingDetail,
  BillingMonthlyReport,
  ProfitShareMonthlyReport,
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

  getBillingReports: async (from: string, to: string): Promise<BillingMonthlyReport[]> => {
    if (!from || !to) throw new Error('Las fechas de inicio y fin son requeridas.');

    try {
      return await BillingRepository.getBillingReports(from, to);
    } catch (error: unknown) {
      console.error('[BillingService.getBillingReports]:', error);
      throw new Error('Error al obtener el reporte de facturación.');
    }
  },

  getProfitShareReport: async (from: string, to: string): Promise<ProfitShareMonthlyReport[]> => {
    if (!from || !to) throw new Error('Las fechas de inicio y fin son requeridas.');

    // El reporte agrupa por period (YYYY-MM), no por fecha: se normalizan los
    // extremos del rango al mes que los contiene.
    const fromPeriod = from.slice(0, 7);
    const toPeriod = to.slice(0, 7);

    try {
      return await BillingRepository.getProfitShareReport(fromPeriod, toPeriod);
    } catch (error: unknown) {
      console.error('[BillingService.getProfitShareReport]:', error);
      throw new Error('Error al obtener el reporte de participación.');
    }
  },

  markProfitSharePeriodPaid: async (
    period: string,
    isPaid: boolean,
    userName: string,
  ): Promise<{ period: string; is_paid: boolean; paid_at: string | null }> => {
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      throw new Error('El período es requerido en formato YYYY-MM.');
    }

    try {
      return await BillingRepository.markProfitSharePeriodPaid(period, isPaid, userName);
    } catch (error: unknown) {
      console.error('[BillingService.markProfitSharePeriodPaid]:', error);
      throw new Error('Error al actualizar el estado de pago del período.');
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
