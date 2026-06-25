import { Resend } from 'resend';
import { renderDeliveryEmail, renderInvoiceEmail } from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';
const LOGO_URL = process.env.EMAIL_LOGO_URL || undefined;

export interface SendDeliveryParams {
  to: string;
  firstName: string;
  trackingNumber: string;
}

export interface SendInvoiceParams {
  to: string;
  firstName: string;
  totalAmountCRC: number;
  billingUuid: string;
}

export async function sendDeliveryNotification(params: SendDeliveryParams) {
  const html = renderDeliveryEmail({
    firstName: params.firstName,
    trackingNumber: params.trackingNumber,
    logoUrl: LOGO_URL,
  });

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Tu paquete ${params.trackingNumber} fue entregado`,
    html,
  });
}

export async function sendInvoiceNotification(params: SendInvoiceParams) {
  const html = renderInvoiceEmail({
    firstName: params.firstName,
    totalAmountCRC: params.totalAmountCRC,
    billingUuid: params.billingUuid,
    logoUrl: LOGO_URL,
  });

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Tu factura de Magastore está lista',
    html,
  });
}
