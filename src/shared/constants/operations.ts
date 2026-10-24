import { OperationsTaskKey } from '@/types/dashboard/operations.types';
import { routesPrivate } from '@/shared/navigation/routes';

/** Cuántas tarjetas de cobro se muestran antes del enlace "Ver todas". */
export const COLLECTIONS_PREVIEW_LIMIT = 6;

/** Días desde los que una factura sin pagar se marca en rojo. */
export const COLLECTION_OVERDUE_DAYS = 15;

/** Días desde los que la tarea más vieja de cada fila se marca en rojo. */
export const TASK_STALE_AFTER_DAYS: Record<OperationsTaskKey, number> = {
  [OperationsTaskKey.NOTIFY_PACKAGES]: 2,
  [OperationsTaskKey.BUILD_ORDERS]: 5,
  [OperationsTaskKey.GENERATE_ESTIMATES]: 3,
  [OperationsTaskKey.CONFIRM_AND_COLLECT]: 5,
  [OperationsTaskKey.DISPATCH]: 3,
  [OperationsTaskKey.FINALIZE]: 7,
  [OperationsTaskKey.FOLLOW_UP]: 7,
};

const ORDERS_ROUTE = routesPrivate.admin.shipmentOrders.index;

/**
 * Filtros con los que se abre Órdenes. `paid=ALL` siempre va explícito: sin él el
 * listado arranca en "Sin pagar" y el número de la fila no coincidiría.
 */
export const OPERATIONS_ORDERS_QUERY = {
  generateEstimates: 'step=CONFIRMACION&paid=ALL',
  confirmAndCollect: 'step=COBRO&paid=ALL',
  dispatch: 'step=DESPACHO&paid=ALL',
  finalize: 'step=NOTIFICACION&paid=ALL',
  followUp: 'step=SEGUIMIENTO_PENDIENTE&paid=ALL',
  collectionsToNotify: 'paid=FACTURADA_SIN_PAGAR&notified=SIN_NOTIFICAR',
  collectionsAwaitingPayment: 'paid=FACTURADA_SIN_PAGAR&notified=NOTIFICADA',
} as const;

/** Parámetro con el que otras pantallas saben que el operador llegó desde el Operativo. */
export const OPERATIONS_ORIGIN_PARAM = 'from';
export const OPERATIONS_ORIGIN_VALUE = 'operativo';
export const OPERATIONS_ORIGIN_QUERY = `${OPERATIONS_ORIGIN_PARAM}=${OPERATIONS_ORIGIN_VALUE}`;

/** Ancla de la fila "Estimado enviado al cliente" en el detalle de la orden. */
export const ESTIMATE_ROW_ANCHOR = 'estimado';

/** Pestaña de Cobros en la URL: sin parámetro es "Por avisar". */
export const COLLECTIONS_TAB_PARAM = 'cobros';
export const COLLECTIONS_AWAITING_PAYMENT_VALUE = 'avisados';

export const operationsOrdersHref = (query: string): string => `${ORDERS_ROUTE}?${query}`;
