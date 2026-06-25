interface DeliveryEmailData {
  firstName: string;
  trackingNumber: string;
  logoUrl?: string;
}

interface InvoiceEmailData {
  firstName: string;
  totalAmountCRC: number;
  billingUuid: string;
  logoUrl?: string;
}

function buildHeader(logoUrl?: string): string {
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="Magastore" style="max-height:56px;max-width:200px;" />`
    : `<span style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">MAGASTORE</span>`;

  return `
    <tr>
      <td style="background:linear-gradient(135deg,#1a2744 0%,#1e3a5f 100%);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
        ${logo}
        <p style="margin:10px 0 0;color:#93c5fd;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Courier &amp; Logistics</p>
      </td>
    </tr>`;
}

function buildFooter(): string {
  const year = new Date().getFullYear();
  return `
    <tr>
      <td style="background-color:#f8fafc;padding:24px 40px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;color:#94a3b8;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          Este es un mensaje automático. Por favor no respondas a este correo.
        </p>
        <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          &copy; ${year} Magastore &middot; Todos los derechos reservados
        </p>
      </td>
    </tr>`;
}

function wrapInLayout(rows: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Magastore</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
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

export function renderDeliveryEmail(data: DeliveryEmailData): string {
  const rows = `
    ${buildHeader(data.logoUrl)}
    <tr>
      <td style="background-color:#ffffff;padding:48px 40px;">
        <p style="margin:0 0 6px;color:#3b82f6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          Notificación de entrega
        </p>
        <h1 style="margin:0 0 24px;color:#0f172a;font-size:28px;font-weight:800;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ¡Tu paquete llegó!
        </h1>

        <p style="margin:0 0 32px;color:#475569;font-size:16px;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          Hola <strong style="color:#0f172a;">${data.firstName}</strong>, tu paquete ha sido marcado como
          <strong style="color:#16a34a;">entregado</strong> exitosamente.
        </p>

        <table cellpadding="0" cellspacing="0" style="width:100%;border-radius:10px;border:1px solid #dbeafe;background-color:#eff6ff;margin-bottom:36px;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 6px;color:#60a5fa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Número de tracking
              </p>
              <p style="margin:0;color:#1e3a8a;font-size:22px;font-weight:800;font-family:ui-monospace,'Cascadia Code','Courier New',monospace;">
                ${data.trackingNumber}
              </p>
            </td>
          </tr>
        </table>

        <table cellpadding="0" cellspacing="0" style="width:100%;background-color:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
          <tr>
            <td style="padding:16px 24px;display:flex;align-items:center;">
              <p style="margin:0;color:#15803d;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ✓&nbsp;&nbsp;Entrega confirmada por el equipo de Magastore
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${buildFooter()}`;

  return wrapInLayout(rows);
}

export function renderInvoiceEmail(data: InvoiceEmailData): string {
  const formatted = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
  }).format(data.totalAmountCRC);

  const rows = `
    ${buildHeader(data.logoUrl)}
    <tr>
      <td style="background-color:#ffffff;padding:48px 40px;">
        <p style="margin:0 0 6px;color:#3b82f6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          Factura lista
        </p>
        <h1 style="margin:0 0 24px;color:#0f172a;font-size:28px;font-weight:800;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          Resumen de cobro
        </h1>

        <p style="margin:0 0 32px;color:#475569;font-size:16px;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          Hola <strong style="color:#0f172a;">${data.firstName}</strong>, hemos generado tu factura.
          Por favor coordina el pago con tu operador asignado.
        </p>

        <table cellpadding="0" cellspacing="0" style="width:100%;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:32px;">
          <tr>
            <td style="background-color:#1a2744;padding:24px;text-align:center;">
              <p style="margin:0 0 4px;color:#93c5fd;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Total a pagar
              </p>
              <p style="margin:0;color:#ffffff;font-size:36px;font-weight:800;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                ${formatted}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Referencia de factura
              </p>
              <p style="margin:0;color:#475569;font-size:13px;font-family:ui-monospace,'Cascadia Code','Courier New',monospace;">
                ${data.billingUuid}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          Si tienes alguna consulta sobre esta factura, comunícate con nuestro equipo de soporte.
        </p>
      </td>
    </tr>
    ${buildFooter()}`;

  return wrapInLayout(rows);
}
