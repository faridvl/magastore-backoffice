# Email: setup y configuración

Proveedor: **Resend** (resend.com). Hay un solo correo al cliente, el **comprobante de factura
pagada**, y hoy está **apagado** hasta verificar el dominio.

---

## Variables de entorno

```env
RESEND_API_KEY="re_..."                 # API key de Resend
EMAIL_FROM="onboarding@resend.dev"      # remitente; por defecto el de pruebas
EMAIL_NOTIFICATIONS_ENABLED="true"      # solo con el valor exacto true se envía
EMAIL_LOGO_URL=""                       # opcional; por defecto magastorecr.com/logo/magastore-logo-2026.png
```

Sin `EMAIL_NOTIFICATIONS_ENABLED=true` (falta, vacío u otro valor) no se llama a Resend: el botón
queda deshabilitado con "El envío de correos aún no está activado" y el endpoint responde 409.
Sin `RESEND_API_KEY` tampoco se envía (409, "El envío de correos no está configurado").

## Cómo activarlo (en este orden)

1. Resend > Domains > agregar `magastorecr.com`, cargar en el DNS los registros SPF y DKIM que
   indica y esperar a que quede verificado.
2. En Vercel (Production): `EMAIL_FROM="Magastore <notifications@magastorecr.com>"` y `RESEND_API_KEY`.
3. En Vercel (Production): `EMAIL_NOTIFICATIONS_ENABLED=true`.
4. Redeploy para que tome las variables.

> Con `onboarding@resend.dev` Resend solo entrega al dueño de la cuenta: antes de verificar el
> dominio los correos no llegan a los clientes aunque estén encendidos.

---

## El correo y cuándo sale

No sale solo: el operador lo manda con el botón **Enviar por correo** del modal de la factura
(`billing-detail-modal`), que solo aparece si la factura está **pagada**.

- Endpoint: `POST /api/billing/send-email` con `{ billingUuid }`. Exige sesión verificada
  (`getActor`) y uuid válido. Responde 200 con `sent_to`; 409 si la factura no está pagada, el
  cliente no tiene correo o el envío está apagado; 502 si Resend falla o no responde en 5 s.
- Contenido: "¡Gracias por tu pago!", total pagado, método y fecha de pago (hora de Costa Rica),
  envío #código (el mismo de WhatsApp) y botón de WhatsApp del negocio.
- `sendInvoiceNotification` (`src/lib/email.ts`) usa `idempotencyKey` `factura/<uuid>`: dos clics
  seguidos mandan un solo correo; reenviar el mismo día no entrega otro. El log lleva el nombre y el
  código del error, nunca el correo ni el nombre del cliente.
- No hay endpoint de prueba: se quitó `/api/email/test` (cualquier sesión podía mandar correos).

## Logo

La plantilla usa `EMAIL_LOGO_URL`; si no está, `https://magastorecr.com/logo/magastore-logo-2026.png`
(responde 200 hoy; `magastore-logo-principal-transparente.png` aún da 404 en producción). Siempre
URL absoluta: Gmail no muestra imágenes en base64.

---

## Archivos relevantes

| Archivo | Descripción |
|---|---|
| `src/lib/email.ts` | Cliente Resend (perezoso), interruptor, tope de 5 s y envío |
| `src/lib/email-templates.ts` | Plantilla HTML del comprobante, estilos en línea |
| `src/pages/api/billing/send-email.ts` | Endpoint del botón |
| `src/shared/api/services/billing.service.ts` | `sendInvoiceEmail` (reglas y errores) |
| `src/components/common/billing-detail-modal/billing-detail-modal.tsx` | Botón "Enviar por correo" |
