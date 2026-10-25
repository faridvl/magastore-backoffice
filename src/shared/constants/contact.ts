const DEFAULT_WHATSAPP_NUMBER = '62048869';
const LOCAL_PHONE_DIGITS = 8;

// NEXT_PUBLIC_WHATSAPP_NUMBER va en formato wa.me (con código de país, ej.
// 50662048869): se toman los últimos 8 dígitos, que es el número local.
const formatLocalPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length >= LOCAL_PHONE_DIGITS ? digits.slice(-LOCAL_PHONE_DIGITS) : DEFAULT_WHATSAPP_NUMBER;
  return `${local.slice(0, 4)}-${local.slice(4)}`;
};

/** WhatsApp del negocio para imprimir en documentos, formato XXXX-XXXX. */
export const BUSINESS_WHATSAPP_DISPLAY = formatLocalPhone(
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER,
);

const COUNTRY_CODE = '506';

const buildWhatsappNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === LOCAL_PHONE_DIGITS ? `${COUNTRY_CODE}${digits}` : digits;
};

const BUSINESS_WHATSAPP_NUMBER = buildWhatsappNumber(
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER,
);

/** Enlace wa.me al WhatsApp del negocio, con un mensaje opcional ya escrito. */
export const buildBusinessWhatsappHref = (message?: string): string =>
  `https://wa.me/${BUSINESS_WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

export const BUSINESS_WHATSAPP_HREF = buildBusinessWhatsappHref();
