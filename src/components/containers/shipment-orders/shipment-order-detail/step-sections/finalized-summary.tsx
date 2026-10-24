import { formatWeight, formatCount } from '@/shared/utils/format';
import React from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import { ConsolidationDetail, DeliveryMethodEntity } from '@/types/logistics/logistics.types';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { resolveZone } from '@/shared/constants/costa-rica-locations';
import { PAYMENT_METHOD_LABELS } from '@/shared/constants/payment-methods';
import { formatCrc } from '@/shared/utils/format-crc';
import { formatBusinessDateTime } from '@/shared/utils/timezone';

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-xs font-bold text-slate-400">{label}</p>
    <div className="text-sm text-slate-700 mt-1 break-words">{children}</div>
  </div>
);

/**
 * Ficha de una orden ya cerrada: lo que se consulta después (qué se cobró,
 * cómo pagó, a dónde fue, con qué guía) y en qué fecha pasó cada cosa.
 */
export const FinalizedSummary: React.FC<{
  detail: ConsolidationDetail;
  deliveryMethods: DeliveryMethodEntity[] | undefined;
  isPickup: boolean;
  onOpenBilling: () => void;
}> = ({ detail, deliveryMethods, isPickup, onOpenBilling }) => {
  const invoiceLabel = detail.billing_invoice_number != null
    ? `F-${String(detail.billing_invoice_number).padStart(4, '0')}`
    : null;

  const history = [
    { label: 'Orden creada', date: detail.created_at },
    { label: 'Estimado confirmado y factura emitida', date: detail.pre_billing_confirmed_at },
    {
      label: `Pago registrado${detail.billing_payment_method ? ` · ${PAYMENT_METHOD_LABELS[detail.billing_payment_method]}` : ''}${detail.billing_paid_by_name ? ` · por ${detail.billing_paid_by_name}` : ''}`,
      date: detail.billing_paid_at,
    },
    { label: 'Envío solicitado al proveedor', date: detail.shipment_requested_at },
    { label: isPickup ? 'Lista para retiro' : 'Despachada', date: detail.dispatched_at },
    { label: 'Cliente avisado del envío', date: detail.customer_notified_shipment_at },
    { label: 'Seguimiento postventa', date: detail.follow_up_sent_at },
  ]
    .filter((item): item is { label: string; date: string } => !!item.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={22} className="text-emerald-500 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 whitespace-nowrap">Orden finalizada</h2>
            <p className="text-sm text-slate-500">Entregada al cliente</p>
          </div>
        </div>
        {detail.billing_uuid && (
          <button
            type="button"
            onClick={onOpenBilling}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <FileText size={14} /> {invoiceLabel ?? 'Factura'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-6">
        <Fact label="Cobrado">
          <p className="text-lg font-extrabold text-slate-900">
            {detail.billing_total_amount_crc != null ? formatCrc(Number(detail.billing_total_amount_crc)) : '—'}
          </p>
          <p className={detail.billing_is_paid ? 'text-emerald-700' : 'text-amber-700'}>
            {detail.billing_is_paid
              ? ['Pagada', detail.billing_payment_method && PAYMENT_METHOD_LABELS[detail.billing_payment_method]].filter(Boolean).join(' · ')
              : 'Pendiente de pago'}
          </p>
        </Fact>
        <Fact label="Paquetes">
          <p className="font-semibold text-slate-800">{formatCount(detail.packages.length, 'paquete', 'paquetes')}</p>
          <p className="text-slate-500">{formatWeight(detail.total_weight_lb)}</p>
        </Fact>
        <Fact label="Entrega">
          <p className="font-semibold text-slate-800">
            {detail.delivery_method ? resolveDeliveryMethodLabel(detail.delivery_method, deliveryMethods) : 'Sin método'}
          </p>
          {isPickup ? (
            <p className="text-slate-500">Retiro en oficina</p>
          ) : detail.delivery_exact_address ? (
            <p className="text-slate-500">
              {detail.delivery_exact_address}, {detail.delivery_district}, {detail.delivery_canton}, {detail.delivery_province}
              {detail.delivery_canton ? ` · Zona ${resolveZone(detail.delivery_canton)}` : ''}
            </p>
          ) : (
            <p className="text-slate-500">Sin dirección</p>
          )}
        </Fact>
        {!isPickup && (
          <Fact label="Recibió">
            <p className="font-semibold text-slate-800">{detail.delivery_recipient_name ?? detail.customer_name}</p>
            <p className="text-slate-500">{detail.delivery_recipient_phone ?? detail.customer_phone ?? 'Sin teléfono'}</p>
          </Fact>
        )}
        {!isPickup && (
          <Fact label="Guía">
            {detail.tracking_code
              ? <p className="font-mono font-semibold text-slate-800 break-all">{detail.tracking_code}</p>
              : <p className="text-slate-500">Sin guía</p>}
          </Fact>
        )}
        {detail.billing_actual_delivery_fee_crc != null && (
          <Fact label="Costo real del envío">
            <p className="font-semibold text-slate-800">{formatCrc(Number(detail.billing_actual_delivery_fee_crc))}</p>
            {detail.billing_change_returned && <p className="text-slate-500">Vuelto devuelto</p>}
          </Fact>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Historial</h3>
          <ol className="relative border-l border-slate-200 ml-1.5 space-y-3">
            {history.map((item) => (
              <li key={item.label} className="relative pl-4">
                <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden />
                <p className="text-sm text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{formatBusinessDateTime(item.date)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};
