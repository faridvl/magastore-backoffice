/**
 * Tipos del panel Operativo (`/admin/operations`).
 *
 * Es una vista de lectura sobre datos que ya existen: no introduce tablas ni
 * columnas nuevas.
 */

import { ShipmentOrderStep } from '@/types/logistics/logistics.types';

/** Cada tarea de "Tu día", en el orden en que se trabaja. */
export enum OperationsTaskKey {
  NOTIFY_PACKAGES = 'NOTIFY_PACKAGES',
  BUILD_ORDERS = 'BUILD_ORDERS',
  GENERATE_ESTIMATES = 'GENERATE_ESTIMATES',
  CONFIRM_AND_COLLECT = 'CONFIRM_AND_COLLECT',
  DISPATCH = 'DISPATCH',
  FINALIZE = 'FINALIZE',
  FOLLOW_UP = 'FOLLOW_UP',
}

/** Cómo se reparten las órdenes del paso 2; las tres partes suman `count`. */
export interface ConfirmAndCollectBreakdown {
  /** Estimado generado, todavía sin factura. */
  toConfirm: number;
  /** Con factura, sin pagar. */
  toCollect: number;
  /** Con factura pagada: solo falta pasarlas a despacho. */
  paid: number;
}

export interface OperationsTask {
  key: OperationsTaskKey;
  /** Lo mismo que muestra la pantalla a la que lleva el botón de la fila. */
  count: number;
  /** Días de calendario (hora de Costa Rica) del elemento más viejo; null si no hay. */
  oldestDays: number | null;
  /** Subconjunto que necesita atención aparte (ej. órdenes sin guía). Solo informativo. */
  missingCount?: number;
  /** Solo en "Confirmar y cobrar". */
  breakdown?: ConfirmAndCollectBreakdown;
}

/** Un cobro pendiente: una factura sin pagar. */
export interface PendingCollection {
  consolidationUuid: string;
  billingUuid: string;
  currentStep: ShipmentOrderStep;
  customerName: string;
  customerCode: string | null;
  amountCRC: number;
  /** Días de calendario (hora de Costa Rica) desde que se emitió la factura. */
  ageDays: number;
}

export interface CollectionsGroup {
  /** Las más viejas primero, recortadas a las que caben en el panel. */
  items: PendingCollection[];
  /** Todas las que cumplen el criterio; coincide con el listado de "Ver todas". */
  total: number;
  totalCRC: number;
}

export interface OperationsCollections {
  /** Facturas sin pagar cuyo cobro todavía no se le avisó al cliente. */
  toNotify: CollectionsGroup;
  /** Facturas sin pagar que ya se avisaron. */
  awaitingPayment: CollectionsGroup;
}

export interface OperationsStats {
  tasks: OperationsTask[];
  collections: OperationsCollections;
}
