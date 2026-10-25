import {
  ConsolidationPaymentStatus,
  PackageStatus,
  ShipmentOrderStep,
} from '@/types/logistics/logistics.types';

/** Tonos de los badges; el componente `Badge` los traduce a clases de la paleta. */
export enum BadgeTone {
  NEUTRAL = 'NEUTRAL',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
  VIOLET = 'VIOLET',
}

// --- Estado de pago de una orden: cuatro nombres para todas las pantallas ---

export const PAYMENT_STATUS_LABEL: Record<ConsolidationPaymentStatus, string> = {
  [ConsolidationPaymentStatus.SIN_ESTIMADO]: 'Sin estimado',
  [ConsolidationPaymentStatus.ESTIMADO_PENDIENTE]: 'Estimado enviado',
  [ConsolidationPaymentStatus.PENDIENTE_PAGO]: 'Por cobrar',
  [ConsolidationPaymentStatus.PAGADO]: 'Pagada',
};

export const PAYMENT_STATUS_TONE: Record<ConsolidationPaymentStatus, BadgeTone> = {
  [ConsolidationPaymentStatus.SIN_ESTIMADO]: BadgeTone.NEUTRAL,
  [ConsolidationPaymentStatus.ESTIMADO_PENDIENTE]: BadgeTone.INFO,
  [ConsolidationPaymentStatus.PENDIENTE_PAGO]: BadgeTone.WARNING,
  [ConsolidationPaymentStatus.PAGADO]: BadgeTone.SUCCESS,
};

interface PaymentStatusFields {
  /** Existe la factura (billing). */
  isBilled: boolean;
  isPaid: boolean;
  /** Existe la prefactura (el estimado). */
  hasPreBilling: boolean;
  /** Fecha en que el estimado se le avisó al cliente; null si aún no. */
  preBillingNotifiedAt: string | Date | null | undefined;
}

/**
 * Misma regla que el CASE de `consolidations.repo.ts` (factura pagada, factura
 * sin pagar, estimado, nada), salvo que un estimado que aún no se avisó al
 * cliente cuenta como "Sin estimado": "Estimado enviado" no puede mentir.
 */
export const getPaymentStatus = ({
  isBilled,
  isPaid,
  hasPreBilling,
  preBillingNotifiedAt,
}: PaymentStatusFields): ConsolidationPaymentStatus => {
  if (isBilled) {
    return isPaid ? ConsolidationPaymentStatus.PAGADO : ConsolidationPaymentStatus.PENDIENTE_PAGO;
  }
  if (hasPreBilling && preBillingNotifiedAt) return ConsolidationPaymentStatus.ESTIMADO_PENDIENTE;
  return ConsolidationPaymentStatus.SIN_ESTIMADO;
};

// --- Paso de la orden (5 pasos del flujo). Rojo queda reservado para atrasos ---

export const ORDER_STEP_LABEL: Record<ShipmentOrderStep, string> = {
  [ShipmentOrderStep.CONFIRMACION]: 'Confirmación',
  [ShipmentOrderStep.COBRO]: 'Cobro',
  [ShipmentOrderStep.DESPACHO]: 'Despacho',
  [ShipmentOrderStep.NOTIFICACION]: 'Cierre',
  [ShipmentOrderStep.FINALIZADA]: 'Finalizada',
};

export const ORDER_STEP_TONE: Record<ShipmentOrderStep, BadgeTone> = {
  [ShipmentOrderStep.CONFIRMACION]: BadgeTone.WARNING,
  [ShipmentOrderStep.COBRO]: BadgeTone.INFO,
  [ShipmentOrderStep.DESPACHO]: BadgeTone.VIOLET,
  [ShipmentOrderStep.NOTIFICACION]: BadgeTone.NEUTRAL,
  [ShipmentOrderStep.FINALIZADA]: BadgeTone.SUCCESS,
};

// --- Estado del paquete (enum real: PANAMA, EN_TRAMITE, ENTREGADO) ---

export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  [PackageStatus.PANAMA]: 'En Panamá',
  [PackageStatus.EN_TRAMITE]: 'En trámite',
  [PackageStatus.ENTREGADO]: 'Entregado',
};

export const PACKAGE_STATUS_TONE: Record<PackageStatus, BadgeTone> = {
  [PackageStatus.PANAMA]: BadgeTone.WARNING,
  [PackageStatus.EN_TRAMITE]: BadgeTone.INFO,
  [PackageStatus.ENTREGADO]: BadgeTone.SUCCESS,
};

/** Las columnas son TEXT: un valor fuera del enum se muestra tal cual en vez de vacío. */
export const packageStatusLabel = (status: string): string =>
  PACKAGE_STATUS_LABEL[status as PackageStatus] ?? status;

export const packageStatusTone = (status: string): BadgeTone =>
  PACKAGE_STATUS_TONE[status as PackageStatus] ?? BadgeTone.NEUTRAL;
