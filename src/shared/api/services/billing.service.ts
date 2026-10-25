import { BillingRepository } from '../repositories/billing.repo';
import {
  BillingListItem,
  BillingListSummary,
  BillingDetail,
  BillingMonthlyReport,
  ProfitShareMonthlyReport,
  PaymentMethod,
} from '@/types/logistics/logistics.types';
import type { Actor } from '@/shared/api/get-actor';
import { PaginatedResponse } from '@/types/paginate.types';
import { isEmailNotificationsEnabled, sendInvoiceNotification } from '@/lib/email';
import { PAYMENT_METHOD_LABELS } from '@/shared/constants/payment-methods';
import { formatBusinessDate } from '@/shared/utils/timezone';
import { formatOrderCode } from '@/shared/utils/order-code';

/** Error de negocio del envío del comprobante, con el estado HTTP que le toca. */
export class InvoiceEmailError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'InvoiceEmailError';
  }
}

const EMAIL_STATUS_CONFLICT = 409;
const EMAIL_STATUS_SEND_FAILED = 502;

export const BillingService = {
  getBillingList: async (
    page: number = 1,
    limit: number = 10,
    search?: string,
    isPaid?: boolean,
    dateFrom?: string,
    dateTo?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<PaginatedResponse<BillingListItem> & { summary: BillingListSummary }> => {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    try {
      const { data, total, summary } = await BillingRepository.getPaginatedBilling(
        safePage,
        safeLimit,
        search,
        isPaid,
        dateFrom,
        dateTo,
        paymentMethod,
      );

      const totalPages = Math.max(1, Math.ceil(total / safeLimit));

      return {
        data,
        meta: { total, page: safePage, limit: safeLimit, totalPages },
        summary,
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

    return { ...detail, email_notifications_enabled: isEmailNotificationsEnabled() };
  },

  /** Envía al cliente el comprobante de una factura pagada. Devuelve el correo al que salió. */
  sendInvoiceEmail: async (billingUuid: string): Promise<{ sent_to: string }> => {
    const detail = await BillingService.getBillingDetail(billingUuid);
    if (!detail.is_paid) {
      throw new InvoiceEmailError('Solo se envía el comprobante de una factura pagada.', EMAIL_STATUS_CONFLICT);
    }
    const to = detail.customer_email?.trim();
    if (!to) throw new InvoiceEmailError('El cliente no tiene correo registrado.', EMAIL_STATUS_CONFLICT);
    if (!detail.email_notifications_enabled) {
      throw new InvoiceEmailError('El envío de correos aún no está activado.', EMAIL_STATUS_CONFLICT);
    }

    try {
      const wasSent = await sendInvoiceNotification({
        to,
        billingUuid: detail.uuid,
        firstName: detail.customer_first_name,
        orderCode: formatOrderCode(detail.consolidation_uuid),
        totalAmountCRC: Number(detail.total_amount_crc),
        invoiceNumber: detail.invoice_number,
        paymentMethodLabel: detail.payment_method ? PAYMENT_METHOD_LABELS[detail.payment_method] : null,
        paidAtLabel: detail.paid_at ? formatBusinessDate(detail.paid_at) : null,
      });
      if (!wasSent) throw new InvoiceEmailError('El envío de correos no está configurado.', EMAIL_STATUS_CONFLICT);
    } catch (error) {
      if (error instanceof InvoiceEmailError) throw error;
      // Solo el motivo: el mensaje del proveedor puede traer el correo del cliente.
      console.error(
        `[Email] No se pudo enviar el comprobante de la factura ${detail.uuid}:`,
        error instanceof Error ? error.message : 'error desconocido',
      );
      throw new InvoiceEmailError('No se pudo enviar el correo. Intenta de nuevo.', EMAIL_STATUS_SEND_FAILED);
    }
    return { sent_to: to };
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

  getProfitShareReport: async (
    from?: string,
    to?: string,
  ): Promise<ProfitShareMonthlyReport[]> => {
    // El reporte agrupa por period (YYYY-MM), no por fecha: se normalizan los
    // extremos del rango al mes que los contiene. Sin rango se devuelve el
    // historial completo.
    const fromPeriod = from ? from.slice(0, 7) : undefined;
    const toPeriod = to ? to.slice(0, 7) : undefined;

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

  confirmPayment: async (
    billingUuid: string,
    paymentMethod: PaymentMethod,
    actor: Actor,
  ): Promise<Partial<BillingListItem>> => {
    if (!billingUuid) throw new Error('El UUID de la factura es requerido.');

    try {
      return await BillingRepository.markBillingAsPaid(billingUuid, paymentMethod, actor);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al marcar la factura como pagada.';
      throw new Error(msg);
    }
  },

  markPaymentNotified: async (billingUuid: string): Promise<{ uuid: string; payment_notified_at: string }> => {
    if (!billingUuid) throw new Error('El UUID de la factura es requerido.');

    const row = await BillingRepository.markPaymentNotified(billingUuid);
    if (!row) throw new Error('Factura no encontrada o todavía sin pagar.');
    return row;
  },
};

export const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  typeof value === 'string' && (Object.values(PaymentMethod) as string[]).includes(value);
