import React from 'react';
import { MessageCircle, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/common/modal/modal';
import { CustomerWithAvailablePackages } from '@/types/logistics/logistics.types';
import { formatCount, formatWeight } from '@/shared/utils/format';

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
  <Modal
    title="Notificar paquetes disponibles"
    subtitle="Toca Enviar o Reenviar junto a cada cliente."
    onClose={onClose}
    footer={
      <button
        onClick={onClose}
        className="min-h-[44px] w-full rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
      >
        Cerrar
      </button>
    }
  >
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
      <div className="space-y-2">
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
                <p className="text-xs text-slate-500">
                  {formatCount(c.package_count, 'paquete', 'paquetes')} · {formatWeight(c.total_weight_lb)}
                  {!c.phone && ' · Sin teléfono'}
                </p>
                {allNotified && !sent && (
                  <p className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle size={12} /> Notificado
                  </p>
                )}
                {hasNew && (
                  <p className="text-xs font-bold text-amber-700 mt-0.5">
                    {formatCount(unnotified, 'paquete nuevo', 'paquetes nuevos')} sin notificar
                  </p>
                )}
              </div>
              <button
                onClick={() => onSend(c.customer_id)}
                disabled={!c.phone || sending}
                className={`flex min-h-[44px] items-center gap-1.5 px-4 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex-shrink-0 ${
                  sent
                    ? 'bg-emerald-500 text-white'
                    : allNotified
                      ? 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {sent ? (
                  <><CheckCircle size={14} /> Enviado</>
                ) : sending ? (
                  'Abriendo...'
                ) : allNotified ? (
                  <><MessageCircle size={14} /> Reenviar</>
                ) : (
                  <><MessageCircle size={14} /> Enviar</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    )}
  </Modal>
);
