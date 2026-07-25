export type WhatsAppTemplateVars = Record<string, string>;

export function interpolate(template: string, vars: WhatsAppTemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/**
 * Arma el link wa.me a partir de un teléfono guardado en formato "+506 XXXX-XXXX"
 * (u otras variantes). wa.me requiere solo dígitos con código de país, sin "+".
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('506') ? digits : `506${digits}`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_TEMPLATE_PACKAGES_AVAILABLE = `📦 Estimado(a), {{nombre}}.

Le informamos que actualmente tiene los siguientes paquetes disponibles en nuestra bodega en Panamá:

{{lista_paquetes}}

*Peso total disponible:* {{peso_total}} lb

Antes de programar su envío a Costa Rica, agradecemos nos indique cómo desea proceder:

1. Enviar todos los paquetes disponibles.
2. Esperar la llegada de más paquetes para consolidarlos en un solo envío.
3. Separar los paquetes en diferentes envíos.
4. Actualizar la dirección de entrega (si aplica).

Una vez recibamos su confirmación, prepararemos su envío y le enviaremos la prefactura correspondiente.

Quedamos atentos a su respuesta. Será un gusto asistirle.

*MAGASTORE 📦✈️*`;

export const WHATSAPP_TEMPLATE_PREBILLING_READY = `📦 Estimado(a), {{nombre}}.

Su envío #{{id_orden}} ya tiene el estimado listo (adjunto el PDF).

Peso total: {{peso_total}} lb
Método de entrega: {{metodo_entrega}}
*Total a pagar: {{monto}}*

Quedamos atentos a su confirmación para proceder.

*MAGASTORE 📦✈️*`;

export function buildPackagesAvailableMessage(params: {
  firstName: string;
  packages: { storeName: string | null; trackingNumber: string; weightLb: number }[];
  /** Texto configurado en BD. Si falta, se usa la constante como respaldo. */
  templateBody?: string;
}): string {
  const lista = params.packages
    .map((p) => `* ${p.storeName || p.trackingNumber} – ${p.weightLb.toFixed(2)} lb`)
    .join('\n');
  const pesoTotal = params.packages.reduce((sum, p) => sum + p.weightLb, 0).toFixed(2);

  return interpolate(params.templateBody || WHATSAPP_TEMPLATE_PACKAGES_AVAILABLE, {
    nombre: params.firstName,
    lista_paquetes: lista,
    peso_total: pesoTotal,
  });
}

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  CORREOS_CR: 'Correos de Costa Rica',
  TRACOPA: 'Tracopa',
  RETIRO: 'Retiro en oficina',
};

export function buildPreBillingReadyMessage(params: {
  firstName: string;
  orderShortId: string;
  weightLb: number;
  deliveryMethod: string | null;
  /** Total del estimado en colones. */
  amountCrc?: number | null;
  /** Texto configurado en BD. Si falta, se usa la constante como respaldo. */
  templateBody?: string;
}): string {
  return interpolate(params.templateBody || WHATSAPP_TEMPLATE_PREBILLING_READY, {
    nombre: params.firstName,
    id_orden: params.orderShortId,
    peso_total: params.weightLb.toFixed(2),
    metodo_entrega: params.deliveryMethod ? (DELIVERY_METHOD_LABELS[params.deliveryMethod] ?? params.deliveryMethod) : '—',
    monto: params.amountCrc != null ? `₡${Math.round(Number(params.amountCrc)).toLocaleString('es-CR')}` : '—',
  });
}

export const WHATSAPP_TEMPLATE_WAREHOUSE_WELCOME = `Estos serían los datos de tu nuevo casillero en {{ruta_label}} 📫:

Nombre apellido: MGA {{nombre_completo}}
Dirección: {{direccion}}
Referencia: {{codigo}}
Estado: {{estado}}
Ciudad: {{ciudad}}
Codigo postal: {{codigo_postal}}
Teléfono: {{telefono}}`;

export function buildWarehouseWelcomeMessage(params: {
  firstName: string;
  fullName: string;
  code: string;
  routeLabel: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  contactPhone: string | null;
  /** Texto configurado en BD. Si falta, se usa la constante como respaldo. */
  templateBody?: string;
}): string {
  return interpolate(params.templateBody || WHATSAPP_TEMPLATE_WAREHOUSE_WELCOME, {
    nombre: params.firstName,
    nombre_completo: params.fullName,
    codigo: params.code,
    ruta_label: params.routeLabel,
    direccion: params.addressLine ?? '[pendiente de configurar]',
    ciudad: params.city ?? '—',
    estado: params.state ?? '—',
    codigo_postal: params.postalCode ?? '—',
    telefono: params.contactPhone ?? '—',
  });
}
