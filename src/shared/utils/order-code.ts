const ORDER_CODE_LENGTH = 8;

/** Código corto de la orden que ve el cliente: el mismo que lleva el WhatsApp (`id_orden`). */
export const formatOrderCode = (consolidationUuid: string): string =>
  consolidationUuid.slice(-ORDER_CODE_LENGTH).toUpperCase();
