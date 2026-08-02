/**
 * Variables que cada plantilla puede usar. Es el contrato entre el texto
 * editable en BD y los builders que lo rellenan: si el body usa un placeholder
 * que no está acá, quedaría vacío al enviar, así que se valida al guardar.
 */
export const WHATSAPP_TEMPLATE_CODES = {
  PACKAGES_AVAILABLE: 'PACKAGES_AVAILABLE',
  PREBILLING_READY: 'PREBILLING_READY',
  WAREHOUSE_WELCOME: 'WAREHOUSE_WELCOME',
  SHIPMENT_REQUEST: 'SHIPMENT_REQUEST',
  SHIPMENT_DISPATCHED: 'SHIPMENT_DISPATCHED',
} as const;

export type WhatsAppTemplateCode = (typeof WHATSAPP_TEMPLATE_CODES)[keyof typeof WHATSAPP_TEMPLATE_CODES];

export interface TemplateVarSpec {
  key: string;
  label: string;
}

export const TEMPLATE_VARIABLES: Record<string, TemplateVarSpec[]> = {
  PACKAGES_AVAILABLE: [
    { key: 'nombre', label: 'Solo el nombre del cliente — ej. María' },
    { key: 'lista_paquetes', label: 'Lista con cada paquete y su peso, uno por línea' },
    { key: 'peso_total', label: 'Suma del peso de todos los paquetes — ej. 12.50' },
  ],
  PREBILLING_READY: [
    { key: 'nombre', label: 'Solo el nombre del cliente — ej. María' },
    { key: 'id_orden', label: 'Código corto de la orden — ej. A1B2C3D4' },
    { key: 'lista_paquetes', label: 'Lista con cada paquete de la orden y su peso, uno por línea' },
    { key: 'desglose_paquetes', label: 'Cada paquete con su peso y su cobro, uno por línea — ej. * Amazon – 3.00 lb – ₡8,730' },
    { key: 'cantidad_paquetes', label: 'Cuántos paquetes lleva la orden — ej. 3' },
    { key: 'peso_total', label: 'Peso total de la orden en libras — ej. 12.50' },
    { key: 'metodo_entrega', label: 'Cómo se entrega — ej. Correos de Costa Rica' },
    { key: 'monto_envio', label: 'Cobro del envío sin la entrega — ej. ₡8,730' },
    { key: 'monto_entrega', label: 'Cobro de la entrega local — ej. ₡6,900 (o "Sin cargo" si es retiro)' },
    { key: 'descuento', label: 'Línea de descuento si el cliente tiene tarifa especial — ej. Descuento cliente (10%): -₡900. Vacío si no aplica' },
    { key: 'monto', label: 'Total a pagar del estimado — ej. ₡24,500' },
  ],
  // Va al PROVEEDOR, no al cliente: es el texto que se copia para pedirle el
  // despacho. De ahí que no incluya montos ni tarifas — el proveedor no factura
  // al cliente final.
  SHIPMENT_REQUEST: [
    { key: 'id_orden', label: 'Código corto de la orden — ej. A1B2C3D4' },
    { key: 'lista_trackings', label: 'Un tracking por línea, con guion — ej. - TBA332299392729' },
    { key: 'nombre_cliente', label: 'Nombre del cliente dueño de los paquetes — ej. María Rodríguez' },
    { key: 'nombre_recibe', label: 'Nombre completo de quien recibe — ej. MARÍA RODRÍGUEZ SOTO' },
    { key: 'telefono_recibe', label: 'Teléfono de quien recibe — ej. 62048869' },
    { key: 'cedula', label: 'Cédula de quien recibe — ej. 117210411' },
    { key: 'provincia', label: 'Provincia de la dirección de entrega — ej. SAN JOSE' },
    { key: 'canton', label: 'Cantón de la dirección de entrega — ej. CENTRAL' },
    { key: 'distrito', label: 'Distrito de la dirección de entrega — ej. EL CARMEN' },
    { key: 'direccion', label: 'Dirección exacta de entrega' },
    { key: 'cantidad_paquetes', label: 'Cuántos paquetes lleva la orden — ej. 3' },
    { key: 'peso_total', label: 'Peso total de la orden en libras — ej. 12.50' },
  ],
  // Va AL CLIENTE al marcar la orden como despachada. metodo_entrega y
  // link_rastreo salen del catálogo de métodos, no del texto: escribirlos a mano
  // haría que despachar por otro transportista enviara datos equivocados.
  SHIPMENT_DISPATCHED: [
    { key: 'nombre', label: 'Solo el nombre del cliente — ej. María' },
    { key: 'metodo_entrega', label: 'Transportista que lleva el envío — ej. Correos de Costa Rica' },
    { key: 'numero_guia', label: 'Guía del transportista — ej. EZ292332205CR' },
    { key: 'link_rastreo', label: 'Enlace de rastreo del transportista, configurado en Ajustes → Métodos de entrega' },
    { key: 'id_orden', label: 'Código corto de la orden — ej. A1B2C3D4' },
    { key: 'cantidad_paquetes', label: 'Cuántos paquetes lleva el envío — ej. 3' },
  ],
  WAREHOUSE_WELCOME: [
    { key: 'nombre', label: 'Solo el nombre del cliente — ej. María' },
    { key: 'nombre_completo', label: 'Nombre y apellidos — ej. María Rodríguez' },
    { key: 'codigo', label: 'Código de casillero del cliente — ej. MGA-2453-C-11' },
    { key: 'ruta_label', label: 'Nombre de la ruta — ej. USA Aéreo' },
    { key: 'direccion', label: 'Dirección del casillero — ej. 2610 NW 89TH CT' },
    { key: 'ciudad', label: 'Ciudad del casillero — ej. Doral' },
    { key: 'estado', label: 'Estado o provincia — ej. Florida' },
    { key: 'codigo_postal', label: 'Código postal — ej. 33172-1615' },
    { key: 'telefono', label: 'Teléfono del casillero — ej. +1 786-360-2816' },
  ],
};

/** Placeholders {{...}} presentes en un texto. */
export function extractPlaceholders(body: string): string[] {
  return Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);
}

/** Placeholders usados que no pertenecen al set válido de esa plantilla. */
export function findUnknownPlaceholders(code: string, body: string): string[] {
  const allowed = new Set((TEMPLATE_VARIABLES[code] ?? []).map((v) => v.key));
  return Array.from(new Set(extractPlaceholders(body))).filter((p) => !allowed.has(p));
}
