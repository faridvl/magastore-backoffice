import { toast } from 'sonner';

export type WhatsAppTemplateVars = Record<string, string>;

export function interpolate(template: string, vars: WhatsAppTemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/**
 * Normaliza un teléfono guardado en formato "+506 XXXX-XXXX" (u otras variantes)
 * a solo dígitos con código de país, sin "+" — el formato que exigen wa.me y
 * web.whatsapp.com.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('506') ? digits : `506${digits}`;
}

/**
 * El iPad de operación no tiene NINGUNA app de WhatsApp instalada (ni normal ni
 * Business): el único acceso es web.whatsapp.com agregado a inicio. Por eso no
 * hay deep-link posible — no existe app que registre el esquema whatsapp://,
 * así que ningún enlace puede "detectarla". De ahí que en iPad el flujo bueno
 * sea copiar el mensaje y pegarlo en WhatsApp Web.
 *
 * iPadOS 13+ reporta "Macintosh" en el userAgent, así que se detecta por la
 * combinación de plataforma Mac + pantalla táctil (maxTouchPoints > 1), que es
 * la única señal fiable.
 */
function isIpad(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/**
 * Arma el link de WhatsApp para el teléfono y mensaje dados.
 *
 * En iPad se apunta directo a web.whatsapp.com/send: wa.me es una página
 * intermedia que intenta abrir el esquema whatsapp:// , falla al no haber app
 * nativa, y recién entonces redirige a WhatsApp Web — ese salto extra es lo que
 * hace que abrir el chat tarde muchísimo en iPad. En el resto de dispositivos se
 * mantiene wa.me, que sí resuelve a la app nativa.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const withCountryCode = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return isIpad()
    ? `https://web.whatsapp.com/send?phone=${withCountryCode}&text=${text}`
    : `https://wa.me/${withCountryCode}?text=${text}`;
}

/**
 * Abre WhatsApp con el mensaje precargado.
 *
 * En iPad la app corre como PWA standalone: window.open(..., '_blank') no puede
 * activar el ícono de WhatsApp Web agregado a inicio (iOS no hace deep-link
 * entre dos PWAs instaladas), así que abre una vista in-app nueva por cada
 * click y esas vistas se van acumulando. Navegar en la misma vista evita la
 * acumulación y deja al operador volver con el gesto de "atrás" del sistema.
 */
export function openWhatsApp(phone: string, message: string): void {
  const url = buildWhatsAppUrl(phone, message);
  if (isIpad()) {
    window.location.href = url;
    return;
  }
  window.open(url, '_blank');
}

/**
 * Copia texto al portapapeles de forma fiable en Safari/iPad.
 *
 * navigator.clipboard.writeText exige un "user gesture" vivo, y Safari lo da
 * por perdido en cuanto hubo un await de por medio — que es justo el caso de
 * los flujos de notificación, que consultan los paquetes antes de armar el
 * mensaje. Cuando eso pasa se recurre a execCommand('copy') sobre un textarea
 * temporal, que no depende del gesto. Es API obsoleta pero sigue siendo el
 * único fallback que funciona ahí.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Cae al fallback de abajo.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Fuera de vista pero enfocable: iOS ignora los elementos con display:none
    // o visibility:hidden al ejecutar el copiado.
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copia el mensaje de WhatsApp al portapapeles y avisa por toast.
 *
 * Flujo pensado para el iPad de operación: sin app de WhatsApp instalada, abrir
 * web.whatsapp.com desde la PWA obliga a una navegación lenta y saca al
 * operador de Magastore. Copiar y pegar en el WhatsApp Web ya abierto es más
 * rápido y no pierde el contexto de la pantalla actual.
 *
 * Devuelve true si se copió, para que el caller decida si marca la acción como
 * realizada.
 */
export async function copyWhatsAppMessage(message: string): Promise<boolean> {
  const ok = await copyToClipboard(message);
  if (ok) {
    toast.success('Mensaje copiado. Pegalo en WhatsApp Web.');
  } else {
    toast.error('No se pudo copiar el mensaje.');
  }
  return ok;
}

/**
 * Punto de entrada único de las notificaciones de WhatsApp.
 *
 * En el iPad de operación (sin app de WhatsApp) copia el mensaje al
 * portapapeles y deja al operador pegarlo en su WhatsApp Web ya abierto: evita
 * la navegación lenta y no lo saca de Magastore. En cualquier otro dispositivo
 * abre el chat directo, que ahí sí resuelve a la app nativa.
 */
export async function notifyWhatsApp(phone: string, message: string): Promise<void> {
  if (isIpad()) {
    await copyWhatsAppMessage(message);
    return;
  }
  openWhatsApp(phone, message);
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

export type WhatsAppPackageLine = {
  storeName: string | null;
  trackingNumber: string;
  weightLb: number;
};

/**
 * Una línea por paquete, con la tienda como etiqueta y el tracking como
 * respaldo cuando no se registró. Compartida por las plantillas que listan
 * paquetes para que el formato sea idéntico en todos los mensajes.
 */
function formatPackageLines(packages: WhatsAppPackageLine[]): string {
  return packages
    .map((p) => `* ${p.storeName || p.trackingNumber} – ${p.weightLb.toFixed(2)} lb`)
    .join('\n');
}

export function buildPackagesAvailableMessage(params: {
  firstName: string;
  packages: WhatsAppPackageLine[];
  /** Texto configurado en BD. Si falta, se usa la constante como respaldo. */
  templateBody?: string;
}): string {
  const pesoTotal = params.packages.reduce((sum, p) => sum + p.weightLb, 0).toFixed(2);

  return interpolate(params.templateBody || WHATSAPP_TEMPLATE_PACKAGES_AVAILABLE, {
    nombre: params.firstName,
    lista_paquetes: formatPackageLines(params.packages),
    peso_total: pesoTotal,
  });
}

export function buildPreBillingReadyMessage(params: {
  firstName: string;
  orderShortId: string;
  weightLb: number;
  /** Name ya resuelto del método de entrega (delivery_methods.name) — el caller lo
   * resuelve porque tiene acceso al catálogo vía React Query; esta función es
   * un constructor de texto puro, no debe conocer la fuente del label. */
  deliveryMethodLabel: string | null;
  /** Total del estimado en colones. */
  amountCrc?: number | null;
  /** Paquetes de la orden, para las variables {{lista_paquetes}} y
   * {{cantidad_paquetes}}. Opcional: las plantillas que no las usan siguen
   * funcionando sin pasarlos. */
  packages?: WhatsAppPackageLine[];
  /** Texto configurado en BD. Si falta, se usa la constante como respaldo. */
  templateBody?: string;
}): string {
  const packages = params.packages ?? [];

  return interpolate(params.templateBody || WHATSAPP_TEMPLATE_PREBILLING_READY, {
    nombre: params.firstName,
    id_orden: params.orderShortId,
    lista_paquetes: formatPackageLines(packages),
    cantidad_paquetes: String(packages.length),
    peso_total: params.weightLb.toFixed(2),
    metodo_entrega: params.deliveryMethodLabel ?? '—',
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
