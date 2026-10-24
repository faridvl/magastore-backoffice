import React from 'react';
import { AlertTriangle, MessageCircle, Receipt } from 'lucide-react';
import { CollectionCardItem } from './use-operations';
import { formatCrc } from '@/shared/utils/format-crc';

/** Los mismos 5 caracteres con los que el listado de Órdenes identifica cada orden. */
const SHORT_ORDER_ID_LENGTH = 5;

interface OperationsCollectionCardProps {
  collection: CollectionCardItem;
  overdueDays: number;
  onNotify: (consolidationUuid: string) => void;
  onOpenBilling: (billingUuid: string) => void;
}

export const OperationsCollectionCard: React.FC<OperationsCollectionCardProps> = ({
  collection, overdueDays, onNotify, onOpenBilling,
}) => {
  const isOverdue = collection.ageDays >= overdueDays;
  const shortOrderId = collection.consolidationUuid.slice(-SHORT_ORDER_ID_LENGTH).toUpperCase();

  return (
    <li className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-4">
      <p className="line-clamp-2 break-words font-black text-neutral-900">{collection.customerName}</p>
      <p
        className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${
          isOverdue ? 'text-danger-dark' : 'text-neutral-500'
        }`}
      >
        {isOverdue && <AlertTriangle size={13} className="shrink-0" aria-hidden />}
        <span className="font-mono">#{shortOrderId}</span>
        <span aria-hidden>·</span>
        {collection.ageDays === 0
          ? 'Facturada hoy'
          : `Facturada hace ${collection.ageDays} ${collection.ageDays === 1 ? 'día' : 'días'}`}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-xl font-black text-neutral-900 tabular-nums whitespace-nowrap">
          {formatCrc(collection.amountCRC)}
        </p>

        {collection.canSendEstimate ? (
          <button
            type="button"
            onClick={() => onNotify(collection.consolidationUuid)}
            className="min-h-[44px] px-4 rounded-xl bg-neutral-900 text-white text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap active:bg-neutral-700"
          >
            <MessageCircle size={16} aria-hidden />
            Enviar estimado
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenBilling(collection.billingUuid)}
            className="min-h-[44px] px-4 rounded-xl bg-neutral-900 text-white text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap active:bg-neutral-700"
          >
            <Receipt size={16} aria-hidden />
            Ver factura
          </button>
        )}
      </div>
    </li>
  );
};
