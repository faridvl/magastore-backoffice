import { ConfirmAndCollectBreakdown, OperationsTaskKey } from '@/types/dashboard/operations.types';
import { routesPrivate } from '@/shared/navigation/routes';
import {
  OPERATIONS_ORDERS_QUERY,
  OPERATIONS_ORIGIN_QUERY,
  operationsOrdersHref,
} from '@/shared/constants/operations';

export interface OperationsTaskConfig {
  title: string;
  /** Qué se cuenta, en singular y plural: "1 paquete", "3 paquetes". */
  unitSingular: string;
  unitPlural: string;
  actionLabel: string;
  /** Cómo empieza la línea de antigüedad; por defecto "La más vieja". */
  oldestPrefix?: string;
  /** Pantalla a la que lleva el botón. Sin `href`, la acción abre un modal. */
  href?: string;
}

/** Solo las partes que no son cero: "1 por confirmar · 3 pagadas, falta pasarlas a despacho". */
export const formatConfirmAndCollectBreakdown = ({
  toConfirm, toCollect, paid,
}: ConfirmAndCollectBreakdown): string => {
  const parts: string[] = [];
  if (toConfirm > 0) parts.push(`${toConfirm} por confirmar`);
  if (toCollect > 0) parts.push(`${toCollect} por cobrar`);
  if (paid > 0) {
    parts.push(
      paid === 1 ? `${paid} pagada, falta pasarla a despacho` : `${paid} pagadas, falta pasarlas a despacho`,
    );
  }
  return parts.join(' · ');
};

export const OPERATIONS_TASK_CONFIG: Record<OperationsTaskKey, OperationsTaskConfig> = {
  [OperationsTaskKey.NOTIFY_PACKAGES]: {
    title: 'Avisar paquetes que llegaron',
    unitSingular: 'paquete sin avisar',
    unitPlural: 'paquetes sin avisar',
    actionLabel: 'Avisar',
  },
  [OperationsTaskKey.BUILD_ORDERS]: {
    title: 'Armar órdenes',
    unitSingular: 'paquete suelto',
    unitPlural: 'paquetes sueltos',
    actionLabel: 'Armar',
    href: `${routesPrivate.admin.logistics.index}?${OPERATIONS_ORIGIN_QUERY}`,
  },
  [OperationsTaskKey.GENERATE_ESTIMATES]: {
    title: 'Generar estimados',
    unitSingular: 'orden nueva',
    unitPlural: 'órdenes nuevas',
    actionLabel: 'Ver órdenes',
    href: operationsOrdersHref(OPERATIONS_ORDERS_QUERY.generateEstimates),
  },
  [OperationsTaskKey.CONFIRM_AND_COLLECT]: {
    title: 'Confirmar y cobrar',
    oldestPrefix: 'La más vieja sin pagar',
    unitSingular: 'orden por cobrar',
    unitPlural: 'órdenes por cobrar',
    actionLabel: 'Ver órdenes',
    href: operationsOrdersHref(OPERATIONS_ORDERS_QUERY.confirmAndCollect),
  },
  [OperationsTaskKey.DISPATCH]: {
    title: 'Despachar',
    unitSingular: 'orden por enviar',
    unitPlural: 'órdenes por enviar',
    actionLabel: 'Ver órdenes',
    href: operationsOrdersHref(OPERATIONS_ORDERS_QUERY.dispatch),
  },
  [OperationsTaskKey.FINALIZE]: {
    title: 'Finalizar entregas',
    unitSingular: 'orden por entregar',
    unitPlural: 'órdenes por entregar',
    actionLabel: 'Ver órdenes',
    href: operationsOrdersHref(OPERATIONS_ORDERS_QUERY.finalize),
  },
  [OperationsTaskKey.FOLLOW_UP]: {
    title: 'Hacer seguimiento',
    unitSingular: 'orden por contactar',
    unitPlural: 'órdenes por contactar',
    actionLabel: 'Ver órdenes',
    href: operationsOrdersHref(OPERATIONS_ORDERS_QUERY.followUp),
  },
};
