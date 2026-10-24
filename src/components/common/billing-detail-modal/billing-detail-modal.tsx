import { formatCrc } from '@/shared/utils/format-crc';
import React, { useState } from 'react';
import { CheckCircle2, Clock, XCircle, Package, FileDown } from 'lucide-react';
import { Modal } from '@/components/common/modal/modal';
import { PaymentMethodPicker } from '@/components/common/payment-method-picker/payment-method-picker';
import { BillingDetail, ConsolidationPaymentStatus, PaymentMethod } from '@/types/logistics/logistics.types';
import { BACKFILLED_AUTHOR_LABEL, PAYMENT_METHOD_LABELS } from '@/shared/constants/payment-methods';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { buildBillingBreakdown } from '@/shared/utils/billing-breakdown';
import { PAYMENT_STATUS_LABEL } from '@/shared/constants/status-labels';
import { formatWeight } from '@/shared/utils/format';
import { formatBusinessDate } from '@/shared/utils/timezone';

const formatCRC = formatCrc;
// "$6,00/lb × ₡482": coma decimal como el resto de la app.
const formatRate = (rateUsd: number, exchange: number) =>
  `$${Number(rateUsd).toFixed(2).replace('.', ',')}/lb × ₡${String(Number(exchange)).replace('.', ',')}`;
const formatInvoiceNumber = (n: number) => `F-${String(n).padStart(4, '0')}`;

interface Props {
  billingDetail: BillingDetail | null;
  isLoading: boolean;
  /** Hay una recarga en curso (p. ej. tras tocar Reintentar). */
  isRetrying?: boolean;
  onClose: () => void;
  /** Reintenta la carga cuando falla; sin él no se ofrece el botón. */
  onRetry?: () => void;
  onMarkAsPaid: (paymentMethod: PaymentMethod) => void;
  isMarkingPaid: boolean;
  onDownloadPdf: (uuid: string, invoiceNumber?: number) => void;
  isDownloadingPdf: boolean;
}

export const BillingDetailModal: React.FC<Props> = ({
  billingDetail,
  isLoading,
  isRetrying = false,
  onClose,
  onRetry,
  onMarkAsPaid,
  isMarkingPaid,
  onDownloadPdf,
  isDownloadingPdf,
}) => {
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const deliveryMethodLabel = resolveDeliveryMethodLabel(billingDetail?.delivery_method, deliveryMethodsData?.data);

  // Mismo desglose que el PDF de la factura: sale del monto real y no de la
  // tarifa de lista, para que las líneas cuadren con el total en clientes con
  // regla de cobro especial.
  const breakdown = billingDetail
    ? buildBillingBreakdown({
        packages: billingDetail.packages ?? [],
        amountCrc: billingDetail.total_amount_crc,
        deliveryFeeCrc: billingDetail.delivery_fee_crc,
        totalWeightCharged: billingDetail.total_weight_charged,
        appliedRateUsd: billingDetail.applied_rate_usd,
        appliedExchange: billingDetail.applied_exchange,
        billingMode: billingDetail.applied_billing_mode,
        discountPercent: billingDetail.applied_discount_percent,
      })
    : null;

  const footer = billingDetail ? (
    <div className="flex flex-col gap-3">
      {!billingDetail.is_paid && (
        <>
          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
            disabled={isMarkingPaid}
            label={
              paymentMethod
                ? `Pagó con ${PAYMENT_METHOD_LABELS[paymentMethod]}`
                : 'Elige cómo pagó para marcarla pagada'
            }
          />
          <button
            onClick={() => paymentMethod && onMarkAsPaid(paymentMethod)}
            disabled={isMarkingPaid || !paymentMethod}
            className="min-h-[44px] w-full whitespace-nowrap rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-50"
          >
            {isMarkingPaid ? 'Procesando...' : 'Marcar como pagada'}
          </button>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onDownloadPdf(billingDetail.uuid, billingDetail.invoice_number)}
          disabled={isDownloadingPdf}
          className="flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-50"
        >
          <FileDown size={15} />
          {isDownloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
        <button
          onClick={onClose}
          className="min-h-[44px] whitespace-nowrap rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
        >
          Cerrar
        </button>
      </div>
    </div>
  ) : undefined;

  return (
    <Modal
      title={billingDetail?.customer_name}
      subtitle={
        billingDetail
          ? `${formatInvoiceNumber(billingDetail.invoice_number)} · ${billingDetail.customer_code} · ${billingDetail.customer_email}`
          : undefined
      }
      onClose={onClose}
      footer={footer}
    >
      {isLoading || (isRetrying && !billingDetail) ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : billingDetail ? (
        <>
          {/* Desglose de cobro */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-5 space-y-3">
            <p className="text-xs font-semibold text-slate-500 mb-3">Desglose</p>
            <BillingRow
              label="Peso cobrado"
              value={formatWeight(billingDetail.total_weight_charged)}
            />
            <BillingRow
              label={
                breakdown?.isNormal === false
                  ? `Flete internacional (lista ${formatRate(billingDetail.applied_rate_usd, billingDetail.applied_exchange)})`
                  : `Flete internacional (${formatRate(billingDetail.applied_rate_usd, billingDetail.applied_exchange)})`
              }
              value={formatCRC(breakdown?.isNormal === false ? breakdown.fleteLista : breakdown?.flete ?? 0)}
            />
            {breakdown && !breakdown.isNormal && (
              <BillingRow label={breakdown.ruleLabel ?? 'Ajuste'} value={`- ${formatCRC(breakdown.descuento)}`} />
            )}
            {billingDetail.delivery_method && (
              <BillingRow
                label={`Envío local — ${deliveryMethodLabel}`}
                value={billingDetail.delivery_fee_crc > 0 ? formatCRC(billingDetail.delivery_fee_crc) : 'Sin cargo'}
              />
            )}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="font-black text-slate-800 text-sm">Total a pagar</span>
              <span className="text-2xl font-black text-slate-900">{formatCRC(billingDetail.total_amount_crc)}</span>
            </div>
          </div>

          {/* Trackings */}
          {billingDetail.packages?.length > 0 && (
            <div className="mb-5 p-4 bg-slate-50 rounded-2xl">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                <Package size={12} className="inline mr-1" />
                Paquetes incluidos
              </p>
              <div className="flex flex-wrap gap-1">
                {billingDetail.packages.map((pkg, i) => (
                  <span key={i} className="font-mono text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-600">
                    {pkg.tracking_number} · {formatWeight(pkg.weight_lb)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Estado de pago */}
          <div className="mb-6">
            {billingDetail.is_paid ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl w-full justify-center">
                <CheckCircle2 size={16} />
                <span className="font-bold text-sm">{PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PAGADO]}</span>
                {billingDetail.paid_at && (
                  <span className="text-xs text-emerald-600">· {formatBusinessDate(billingDetail.paid_at)}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 border border-orange-100 px-4 py-2.5 rounded-xl w-full justify-center">
                <Clock size={16} />
                <span className="font-bold text-sm">{PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PENDIENTE_PAGO]}</span>
              </div>
            )}
          </div>

          {/* Autoría y método de pago */}
          <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
            <BillingRow label="Emitida por" value={formatAuthor(billingDetail.created_by_name, billingDetail.created_by_backfilled)} />
            {billingDetail.is_paid && (
              <>
                <BillingRow label="Marcada pagada por" value={formatAuthor(billingDetail.paid_by_name, billingDetail.paid_by_backfilled)} />
                <BillingRow
                  label="Método de pago"
                  value={billingDetail.payment_method ? PAYMENT_METHOD_LABELS[billingDetail.payment_method] : 'Sin registrar'}
                />
              </>
            )}
          </div>

        </>
      ) : (
        <div className="flex flex-col items-center py-8 gap-3">
          <XCircle className="text-red-400" size={32} />
          <p className="text-slate-500 text-sm">No se pudo cargar el detalle.</p>
          <div className="mt-2 flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="min-h-[44px] px-6 bg-slate-900 text-white rounded-xl text-sm font-bold"
              >
                Reintentar
              </button>
            )}
            <button
              onClick={onClose}
              className="min-h-[44px] px-6 bg-slate-100 rounded-xl text-sm font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

const formatAuthor = (name: string | null, isBackfilled: boolean) =>
  isBackfilled ? BACKFILLED_AUTHOR_LABEL : name || 'Sin registrar';

const BillingRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className="text-slate-800 font-bold">{value}</span>
  </div>
);
