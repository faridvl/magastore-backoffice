import React from 'react';
import { MessageCircle, CheckCircle } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { CustomerWithAvailablePackages } from '@/types/logistics/logistics.types';

interface Props {
  customers: CustomerWithAvailablePackages[];
  isLoading: boolean;
  sentCustomerIds: string[];
  sendingCustomerId: string | null;
  onSend: (customerId: string) => void;
  onClose: () => void;
}

/**
 * Aviso de "paquetes disponibles" con un botón de WhatsApp por cliente.
 * Lo montan tanto Logística como el panel Operativo — el estado y el envío
 * vienen de `useNotifyMultipleCustomers`, así que este componente solo pinta.
 */
export const NotifyPackagesModal: React.FC<Props> = ({
  customers, isLoading, sentCustomerIds, sendingCustomerId, onSend, onClose,
}) => (
  <div
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <MessageCircle size={18} className="text-emerald-600" />
        </div>
        <Typography
          variant={TypographyVariant.BODY_BOLD}
          className="text-slate-800 uppercase tracking-wider text-xs"
        >
          Notificar paquetes disponibles
        </Typography>
      </div>
      <p className="text-[11px] text-slate-400 mb-6">
        Toca &quot;Enviar&quot; junto a cada cliente para abrir su mensaje de WhatsApp.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            No hay clientes con paquetes disponibles sin orden de envío.
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2 mb-6">
          {customers.map((c) => {
            const sent = sentCustomerIds.includes(c.customer_id);
            const sending = sendingCustomerId === c.customer_id;
            const unnotified = Number(c.unnotified_count);
            // Notificado persistido en BD: todos sus paquetes disponibles
            // tienen notified_at. Un paquete nuevo lo saca de este estado.
            const allNotified = unnotified === 0;
            const hasNew = !allNotified && unnotified < Number(c.package_count);
            return (
              <div
                key={c.customer_id}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${
                  sent || allNotified
                    ? 'bg-emerald-50 border-emerald-200'
                    : hasNew
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-transparent'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {c.package_count} paquete{c.package_count > 1 ? 's' : ''} ·{' '}
                    {Number(c.total_weight_lb).toFixed(2)} lb
                    {!c.phone && ' · Sin teléfono'}
                  </p>
                  {allNotified && !sent && (
                    <p className="text-[10px] font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                      <CheckCircle size={11} /> Notificado
                    </p>
                  )}
                  {hasNew && (
                    <p className="text-[10px] font-bold text-amber-600 mt-0.5">
                      {unnotified} paquete{unnotified > 1 ? 's' : ''} nuevo
                      {unnotified > 1 ? 's' : ''} sin notificar
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onSend(c.customer_id)}
                  disabled={!c.phone || sending}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all disabled:opacity-40 flex-shrink-0 ${
                    sent
                      ? 'bg-emerald-500 text-white'
                      : allNotified
                        ? 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {sent ? (
                    <><CheckCircle size={13} /> Enviado</>
                  ) : sending ? (
                    'Abriendo...'
                  ) : allNotified ? (
                    <><MessageCircle size={13} /> Reenviar</>
                  ) : (
                    <><MessageCircle size={13} /> Enviar</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
      >
        Cerrar
      </button>
    </div>
  </div>
);
