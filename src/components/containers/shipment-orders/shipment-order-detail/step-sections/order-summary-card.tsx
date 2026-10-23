import React from 'react';
import { ConsolidationDetail, DeliveryMethodEntity } from '@/types/logistics/logistics.types';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { resolveZone } from '@/shared/constants/costa-rica-locations';
import { PAYMENT_METHOD_LABELS } from '@/shared/constants/payment-methods';
import { formatCrc } from '@/shared/utils/format-crc';
import { formatBusinessDate } from '@/shared/utils/timezone';

const SummaryItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="py-3 first:pt-0 last:pb-0">
    <p className="text-xs font-bold text-slate-400">{label}</p>
    <div className="text-sm text-slate-700 mt-1 break-words">{children}</div>
  </div>
);

/**
 * Lo que la orden ya tiene definido, siempre a la vista: al costado del paso en
 * escritorio y como ficha de consulta cuando la orden está finalizada.
 */
export const OrderSummaryCard: React.FC<{
  detail: ConsolidationDetail;
  deliveryMethods: DeliveryMethodEntity[] | undefined;
  isPickup: boolean;
}> = ({ detail, deliveryMethods, isPickup }) => {
  const amount = detail.billing_total_amount_crc ?? detail.pre_billing_amount;
  const hasBilling = !!detail.billing_uuid;

  return (
    <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 sm:p-6">
      <h2 className="text-base font-extrabold text-slate-900 mb-4">Resumen de la orden</h2>
      <div className="divide-y divide-slate-100">
        <SummaryItem label="Entrega">
          <p className="font-semibold text-slate-800">
            {detail.delivery_method ? resolveDeliveryMethodLabel(detail.delivery_method, deliveryMethods) : 'Sin método'}
          </p>
          {isPickup ? (
            <p className="text-slate-500">El cliente retira en oficina.</p>
          ) : detail.delivery_exact_address ? (
            <p className="text-slate-500">
              {detail.delivery_exact_address}, {detail.delivery_district}, {detail.delivery_canton}, {detail.delivery_province}
              {detail.delivery_canton ? ` · Zona ${resolveZone(detail.delivery_canton)}` : ''}
            </p>
          ) : (
            <p className="text-amber-700">Sin dirección</p>
          )}
        </SummaryItem>

        {!isPickup && (
          <SummaryItem label="Recibe">
            {detail.delivery_recipient_name ? (
              <>
                <p className="font-semibold text-slate-800">{detail.delivery_recipient_name}</p>
                <p className="text-slate-500">
                  {[detail.delivery_recipient_phone, detail.delivery_recipient_id_card && `Cédula ${detail.delivery_recipient_id_card}`]
                    .filter(Boolean)
                    .join(' · ') || 'Sin teléfono ni cédula'}
                </p>
              </>
            ) : (
              <p>El cliente</p>
            )}
          </SummaryItem>
        )}

        <SummaryItem label={hasBilling ? 'Factura' : 'Estimado'}>
          {amount != null ? (
            <>
              <p className="font-semibold text-slate-800">{formatCrc(Number(amount))}</p>
              {hasBilling && (
                <p className={detail.billing_is_paid ? 'text-emerald-700' : 'text-amber-700'}>
                  {detail.billing_is_paid
                    ? [
                        'Pagada',
                        detail.billing_payment_method && PAYMENT_METHOD_LABELS[detail.billing_payment_method],
                        detail.billing_paid_at && formatBusinessDate(detail.billing_paid_at),
                      ].filter(Boolean).join(' · ')
                    : 'Pendiente de pago'}
                </p>
              )}
            </>
          ) : (
            <p>Todavía no se generó</p>
          )}
        </SummaryItem>

        {!isPickup && (
          <SummaryItem label="Guía">
            {detail.tracking_code ? (
              <>
                <p className="font-mono font-semibold text-slate-800 break-all">{detail.tracking_code}</p>
                {detail.dispatched_at && <p className="text-slate-500">Despachada el {formatBusinessDate(detail.dispatched_at)}</p>}
              </>
            ) : (
              <p>Sin guía</p>
            )}
          </SummaryItem>
        )}
      </div>
    </section>
  );
};
