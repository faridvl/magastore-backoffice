import { BUSINESS_WHATSAPP_HREF } from '@/shared/constants/contact';
import { formatCrc } from '@/shared/utils/format-crc';

export interface InvoiceEmailData {
  firstName: string;
  orderCode: string;
  totalAmountCRC: number;
  invoiceNumber: number;
  /** Cómo pagó, p. ej. "SINPE Móvil"; la fecha ya viene formateada en hora de Costa Rica. */
  paymentMethodLabel?: string | null;
  paidAtLabel?: string | null;
  logoUrl?: string;
}

// Los correos llevan estilos en línea (no hay Tailwind ahí). Paleta de la marca: negro, dorado y
// el dorado legible sobre blanco.
const COLOR = {
  page: '#f7f7f7',
  card: '#ffffff',
  dark: '#111111',
  onDark: '#f7f7f7',
  gold: '#ffcd3c',
  goldReadable: '#b58a00',
  text: '#111111',
  muted: '#475569',
  line: '#e7e7e7',
} as const;

const FONT = "Montserrat,-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://magastorecr.com').replace(/\/+$/, '');
// Logo dorado sobre negro (ya trae "Compras por internet"); es de los que responden hoy en producción.
const DEFAULT_LOGO_URL = `${PUBLIC_SITE_URL}/logo/magastore-logo-2026.png`;
const INVOICE_NUMBER_DIGITS = 4;
const LOGO_WIDTH_PX = 160;
const LOGO_HEIGHT_PX = 102;
const BUTTON_HEIGHT_PX = 44;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function formatInvoiceNumber(invoiceNumber: number): string {
  return `F-${String(invoiceNumber).padStart(INVOICE_NUMBER_DIGITS, '0')}`;
}

export function buildInvoiceSubject(invoiceNumber: number): string {
  return `Tu factura ${formatInvoiceNumber(invoiceNumber)} de Magastore está pagada`;
}

function buildHeader(logoUrl?: string): string {
  return `
    <tr>
      <td style="background-color:${COLOR.dark};padding:24px;border-radius:12px 12px 0 0;border-bottom:4px solid ${COLOR.gold};text-align:center;">
        <img src="${escapeHtml(logoUrl || DEFAULT_LOGO_URL)}" alt="Magastore" width="${LOGO_WIDTH_PX}" height="${LOGO_HEIGHT_PX}" style="display:block;margin:0 auto;width:100%;max-width:${LOGO_WIDTH_PX}px;height:auto;border:0;color:${COLOR.onDark};font-size:22px;font-weight:700;font-family:${FONT};" />
      </td>
    </tr>`;
}

function buildFooter(): string {
  return `
    <tr>
      <td style="background-color:${COLOR.card};padding:20px 24px 24px;border-radius:0 0 12px 12px;border-top:1px solid ${COLOR.line};text-align:center;">
        <p style="margin:0;color:${COLOR.muted};font-size:13px;line-height:1.5;font-family:${FONT};">
          Mensaje automático de Magastore.
        </p>
      </td>
    </tr>`;
}

function wrapInLayout(rows: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Magastore</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.page};padding:24px 12px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
          ${rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEyebrow(text: string): string {
  return `<p style="margin:0 0 6px;color:${COLOR.goldReadable};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:${FONT};">${text}</p>`;
}

function buildTitle(text: string): string {
  return `<h1 style="margin:0 0 16px;color:${COLOR.text};font-size:26px;line-height:1.25;font-weight:800;font-family:${FONT};">${text}</h1>`;
}

function buildParagraph(html: string, bottomPx = 24): string {
  return `<p style="margin:0 0 ${bottomPx}px;color:${COLOR.muted};font-size:16px;line-height:1.6;font-family:${FONT};">${html}</p>`;
}

export function renderInvoiceEmail(data: InvoiceEmailData): string {
  const formatted = formatCrc(data.totalAmountCRC);
  const invoiceLabel = formatInvoiceNumber(data.invoiceNumber);
  const firstName = escapeHtml(data.firstName);
  const orderCode = escapeHtml(data.orderCode);
  const paymentLine = [data.paymentMethodLabel, data.paidAtLabel]
    .filter((part): part is string => !!part && part !== '—')
    .map(escapeHtml)
    .join(' · ');

  const rows = `
    ${buildHeader(data.logoUrl)}
    <tr>
      <td style="background-color:${COLOR.card};padding:32px 24px;">
        ${buildEyebrow(`Factura ${invoiceLabel}`)}
        ${buildTitle('¡Gracias por tu pago!')}
        ${buildParagraph(
          `Hola <strong style="color:${COLOR.text};">${firstName}</strong>, recibimos el pago de tu envío #${orderCode}.`,
          16,
        )}

        <table cellpadding="0" cellspacing="0" style="width:100%;border-radius:10px;background-color:${COLOR.dark};margin-bottom:12px;">
          <tr>
            <td style="padding:20px 16px;text-align:center;">
              <p style="margin:0 0 4px;color:${COLOR.gold};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-family:${FONT};">
                Total pagado
              </p>
              <p style="margin:0;color:${COLOR.gold};font-size:30px;font-weight:800;white-space:nowrap;font-family:${FONT};">
                ${formatted}
              </p>
              ${
                paymentLine
                  ? `<p style="margin:8px 0 0;color:${COLOR.onDark};font-size:14px;line-height:1.5;font-family:${FONT};">${paymentLine}</p>`
                  : ''
              }
            </td>
          </tr>
        </table>

        <p style="margin:0 0 24px;color:${COLOR.muted};font-size:14px;line-height:1.5;font-family:${FONT};">
          Envío #${orderCode} · Factura ${invoiceLabel}
        </p>

        ${buildParagraph('¿Alguna duda?', 16)}

        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="background-color:${COLOR.dark};border-radius:8px;text-align:center;">
              <a href="${escapeHtml(BUSINESS_WHATSAPP_HREF)}" style="display:block;box-sizing:border-box;min-height:${BUTTON_HEIGHT_PX}px;padding:12px 16px;line-height:20px;color:${COLOR.onDark};font-size:16px;font-weight:700;text-decoration:none;font-family:${FONT};">Escríbenos por WhatsApp</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${buildFooter()}`;

  return wrapInLayout(rows, `Total pagado ${formatted} · Envío #${data.orderCode}`);
}
