/**
 * Tipos del panel Operativo (`/admin/operations`).
 *
 * Es una vista de lectura sobre datos que ya existen: no introduce tablas ni
 * columnas nuevas. Se mantiene separada de `dashboard.types.ts` porque el panel
 * clásico sigue vivo y ambos evolucionan por su cuenta.
 */

/** Contadores de la bandeja de pendientes — cada uno enlaza a su pantalla filtrada. */
export interface OperationsInbox {
  /** Paquetes sin costo de courier o sin tipo de cambio: bloquean el cálculo de ganancia. */
  packagesWithoutCost: number;
  /** Paquetes recibidos que todavía no pertenecen a ninguna orden de envío. */
  packagesWithoutOrder: number;
  /** Clientes distintos que agrupan esos paquetes sueltos. */
  customersWithPackagesWithoutOrder: number;
  /**
   * Paquetes en bodega que el cliente todavía no sabe que llegaron
   * (`packages.notified_at IS NULL`). Es el arranque del embudo: sin este aviso
   * el cliente no pide la orden de envío. Distinto del aviso de cobro, que se
   * cuenta en `ordersNotNotified`.
   */
  packagesNotNotified: number;
  /** Clientes distintos con paquetes sin avisar — es la unidad del envío masivo. */
  customersWithPackagesNotNotified: number;
  /** Órdenes con estimado generado al que nunca se le envió el aviso de cobro. */
  ordersNotNotified: number;
  /** Órdenes con factura emitida y sin pagar. */
  ordersPendingPayment: number;
  /** Monto total de esas facturas sin pagar. */
  pendingPaymentCRC: number;
}

/**
 * Distingue el cobro exigible del que todavía es proyección: una factura emitida
 * es plata que el cliente ya debe; un estimado enviado es una orden que aún puede
 * cambiar de monto. Las dos requieren seguimiento, por eso comparten tabla.
 */
export type ReceivableKind = 'FACTURA' | 'ESTIMADO';

/** Una fila de la tabla de cobros pendientes. */
export interface PendingReceivable {
  /** UUID de la orden de envío — es el destino del enlace de la fila. */
  consolidationUuid: string;
  /**
   * UUID de la factura, presente solo cuando `kind` es `FACTURA`. Habilita el
   * botón de marcar pagado: un estimado todavía no es cobrable, hay que
   * confirmarlo desde la orden primero.
   */
  billingUuid: string | null;
  customerName: string;
  customerCode: string | null;
  kind: ReceivableKind;
  amountCRC: number;
  /** Fecha de emisión de la factura, o de creación del estimado. */
  issuedAt: string;
  /** Días transcurridos desde `issuedAt`. Ordena la tabla: lo más viejo primero. */
  ageDays: number;
  /** Si ya se envió el aviso de cobro por WhatsApp. */
  isNotified: boolean;
}

/** KPIs del mes calendario en curso. */
export interface OperationsMonthly {
  invoicedCRC: number;
  paidCRC: number;
  /** Suma de `billing.profit_crc` — snapshot ya calculado al facturar. */
  profitCRC: number;
  /** Facturas del mes sin costo de courier conocido: la ganancia queda incompleta. */
  unknownCostCount: number;
  packageCount: number;
  packageCountPreviousMonth: number;
}

/** Punto de la serie facturado vs. cobrado. */
export interface MonthlyRevenuePoint {
  /** Etiqueta corta del mes, ya formateada en español (ej. "Ago"). */
  month: string;
  invoiced: number;
  paid: number;
}

export interface OperationsStats {
  inbox: OperationsInbox;
  /**
   * Cobros que ya se le avisaron al cliente y siguen sin pagarse. Es la bandeja
   * de seguimiento: se vacía cuando se marca el pago.
   */
  pendingReceivables: PendingReceivable[];
  /** Total de cobros notificados pendientes, para avisar cuando la tabla se recorta. */
  pendingReceivablesTotal: number;
  /**
   * Cobros que todavía no se le avisaron a nadie. Se separan de los anteriores
   * porque la acción es distinta — acá falta notificar, no cobrar — y así cada
   * fila desaparece de su bandeja en cuanto se resuelve.
   */
  awaitingNotification: PendingReceivable[];
  /** Total de cobros sin notificar, para avisar cuando la tabla se recorta. */
  awaitingNotificationTotal: number;
  monthly: OperationsMonthly;
  revenueByMonth: MonthlyRevenuePoint[];
}
