import React from 'react';
import { X, CheckCircle2, Clock, XCircle, Package, FileDown } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { BillingDetail } from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { buildBillingBreakdown } from '@/shared/utils/billing-breakdown';

const formatCRC = (amount: number) => `₡${Math.round(amount).toLocaleString('es-CR')}`;
const formatInvoiceNumber = (n: number) => `F-${String(n).padStart(4, '0')}`;

interface Props {
  billingDetail: BillingDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onMarkAsPaid: () => void;
  isMarkingPaid: boolean;
  onDownloadPdf: (uuid: string, invoiceNumber?: number) => void;
  isDownloadingPdf: boolean;
}

export const BillingDetailModal: React.FC<Props> = ({
  billingDetail,
  isLoading,
  onClose,
  onMarkAsPaid,
  isMarkingPaid,
  onDownloadPdf,
  isDownloadingPdf,
}) => {
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
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

  return (
  <div
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : billingDetail ? (
        <>
          <div className="flex items-start justify-between mb-6">
            <div>
              <Typography variant={TypographyVariant.HEADER} className="text-2xl tracking-tighter">
                {billingDetail.customer_name}
              </Typography>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                {formatInvoiceNumber(billingDetail.invoice_number)} · {billingDetail.customer_code} · {billingDetail.customer_email}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all flex-shrink-0">
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Desglose de cobro */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-5 space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Desglose</p>
            <BillingRow
              label="Peso cobrado"
              value={`${billingDetail.total_weight_charged} lb`}
            />
            <BillingRow
              label={
                breakdown?.isNormal === false
                  ? `Flete internacional (lista $${billingDetail.applied_rate_usd}/lb × ₡${billingDetail.applied_exchange})`
                  : `Flete internacional ($${billingDetail.applied_rate_usd}/lb × ₡${billingDetail.applied_exchange})`
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
              <span className="font-black text-slate-800 text-sm">Total a Cancelar</span>
              <span className="text-2xl font-black text-slate-900">{formatCRC(billingDetail.total_amount_crc)}</span>
            </div>
          </div>

          {/* Trackings */}
          {billingDetail.packages?.length > 0 && (
            <div className="mb-5 p-4 bg-slate-50 rounded-2xl">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <Package size={10} className="inline mr-1" />
                Paquetes incluidos
              </p>
              <div className="flex flex-wrap gap-1">
                {billingDetail.packages.map((pkg, i) => (
                  <span key={i} className="font-mono text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-600">
                    {pkg.tracking_number} · {Number(pkg.weight_lb).toFixed(2)} lb
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
                <span className="font-black text-xs uppercase tracking-wider">Pagado</span>
                {billingDetail.paid_at && (
                  <span className="text-[10px] text-emerald-500">
                    · {new Date(billingDetail.paid_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 border border-orange-100 px-4 py-2.5 rounded-xl w-full justify-center animate-pulse">
                <Clock size={16} />
                <span className="font-black text-xs uppercase tracking-wider">Pago Pendiente</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => onDownloadPdf(billingDetail.uuid, billingDetail.invoice_number)}
              disabled={isDownloadingPdf}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              <FileDown size={15} />
              {isDownloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cerrar
              </button>
              {!billingDetail.is_paid && (
                <button
                  onClick={onMarkAsPaid}
                  disabled={isMarkingPaid}
                  className="py-3.5 px-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                >
                  {isMarkingPaid ? 'Procesando...' : 'Marcar como Pagado'}
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-8 gap-3">
          <XCircle className="text-red-400" size={32} />
          <p className="text-slate-500 text-sm">No se pudo cargar el detalle.</p>
          <button
            onClick={onClose}
            className="mt-2 px-6 py-2 bg-slate-100 rounded-xl text-sm font-bold"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  </div>
  );
};

const BillingRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className="text-slate-800 font-bold">{value}</span>
  </div>
);
