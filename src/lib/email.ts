import { Resend } from 'resend';
import { buildInvoiceSubject, renderInvoiceEmail } from './email-templates';

const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';
const LOGO_URL = process.env.EMAIL_LOGO_URL || undefined;

// Un Resend colgado no debe tumbar la respuesta al operador.
const SEND_TIMEOUT_MS = 5000;

let resendClient: Resend | null = null;

// Perezoso: sin RESEND_API_KEY el constructor lanza, y eso reventaría al importar este módulo
// en todas las rutas que usan los services.
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

/** Los correos al cliente salen solo con el valor exacto `true`: se activan al verificar el dominio. */
export const isEmailNotificationsEnabled = (): boolean => process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';

export interface SendInvoiceParams {
  to: string;
  billingUuid: string;
  firstName: string;
  orderCode: string;
  totalAmountCRC: number;
  invoiceNumber: number;
  paymentMethodLabel?: string | null;
  paidAtLabel?: string | null;
}

/**
 * Envía el comprobante de una factura pagada. Devuelve false si no se envió nada (notificaciones
 * apagadas o sin API key). Resend no lanza cuando rechaza un envío: devuelve `error`; se lanza solo
 * su nombre y código, porque el mensaje puede traer la dirección del cliente y termina en el log.
 */
export async function sendInvoiceNotification(params: SendInvoiceParams): Promise<boolean> {
  if (!isEmailNotificationsEnabled()) {
    console.log('[Email] correo de factura omitido: notificaciones apagadas');
    return false;
  }
  const resend = getResend();
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY no está configurada: no se envía el correo.');
    return false;
  }

  const html = renderInvoiceEmail({
    firstName: params.firstName,
    orderCode: params.orderCode,
    totalAmountCRC: params.totalAmountCRC,
    invoiceNumber: params.invoiceNumber,
    paymentMethodLabel: params.paymentMethodLabel,
    paidAtLabel: params.paidAtLabel,
    logoUrl: LOGO_URL,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Resend no respondió a tiempo')), SEND_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([
      resend.emails.send(
        { from: FROM, to: params.to, subject: buildInvoiceSubject(params.invoiceNumber), html },
        // Dos clics seguidos sobre la misma factura no mandan dos correos.
        { idempotencyKey: `factura/${params.billingUuid}` },
      ),
      timeout,
    ]);
    if (result.error) {
      throw new Error(`Resend rechazó el envío: ${result.error.name} (${result.error.statusCode ?? 'sin código'})`);
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}
