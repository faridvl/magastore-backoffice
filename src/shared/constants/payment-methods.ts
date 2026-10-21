import { PaymentMethod } from '@/types/logistics/logistics.types';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.SINPE_MOVIL]: 'SINPE Móvil',
  [PaymentMethod.TRANSFERENCIA]: 'Transferencia',
  [PaymentMethod.EFECTIVO]: 'Efectivo',
  [PaymentMethod.TARJETA]: 'Tarjeta',
  [PaymentMethod.OTRO]: 'Otro',
};

export const PAYMENT_METHOD_OPTIONS = Object.values(PaymentMethod);

// Etiqueta para autoría atribuida por el backfill de la migración 033.
export const BACKFILLED_AUTHOR_LABEL = 'Admin (histórico)';
