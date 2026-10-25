/** Días desde el despacho tras los cuales corresponde el seguimiento postventa. */
export const FOLLOW_UP_DELAY_DAYS = 3;

/**
 * Tope del filtro "Seguimiento pendiente": sin él, todas las órdenes viejas
 * finalizadas antes de existir el seguimiento aparecerían como pendientes.
 */
export const FOLLOW_UP_WINDOW_DAYS = 30;

/** Valor del eje de paso del listado que activa el filtro de seguimiento. */
export const FOLLOW_UP_PENDING_STEP_FILTER = 'SEGUIMIENTO_PENDIENTE';
