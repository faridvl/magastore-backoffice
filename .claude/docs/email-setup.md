# Email — Setup y Configuracion

Proveedor: **Resend** (resend.com)
Implementado en: Etapa 13 — 2026-06-25

---

## Variables de entorno (.env.local)

```env
RESEND_API_KEY="re_..."           # API key de Resend (ya configurada)
EMAIL_FROM="onboarding@resend.dev" # Sender durante testing
EMAIL_LOGO_URL=""                  # URL publica del logo (dejar vacio para fallback de texto)
```

## Para produccion

1. Verificar el dominio `magastore.com` (o el dominio real) en Resend > Domains.
2. Cambiar `EMAIL_FROM` a `noreply@magastore.com` (o similar).
3. Subir el logo a CDN o al directorio `public/` del proyecto y exponer una URL publica.
4. Configurar `EMAIL_LOGO_URL` con esa URL publica.

---

## Eventos que disparan email

| Evento | Funcion | Archivo |
|---|---|---|
| Paquete marcado como `ENTREGADO` | `sendDeliveryNotification` | `src/lib/email.ts` |
| Factura generada | `sendInvoiceNotification` | `src/lib/email.ts` |

Los emails se envian de forma **no bloqueante** — un fallo en el envio no cancela la operacion principal (status update o facturacion). Los errores se loguean en consola con el prefijo `[Email]`.

---

## Test de template

Endpoint: `POST /api/email/test` (requiere sesion activa)

```json
// Body
{ "type": "delivery", "to": "tu@email.com" }
{ "type": "invoice",  "to": "tu@email.com" }
```

Ejemplo con curl:
```bash
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: SESSION_ACCESS_TOKEN=<tu-token>" \
  -d '{"type":"delivery","to":"tu@email.com"}'
```

---

## Logo en el template

El template usa `EMAIL_LOGO_URL` si esta definida y no vacia.
Si no hay logo, el header muestra el texto **MAGASTORE** en blanco sobre fondo azul oscuro.

Para agregar el logo real:
1. Colocar el archivo en `public/logo.png` (recomendado: 400x120px, fondo transparente o blanco).
2. En produccion: `EMAIL_LOGO_URL=https://tu-dominio.com/logo.png`
3. En local: `EMAIL_LOGO_URL=http://localhost:3000/logo.png`

---

## Archivos relevantes

| Archivo | Descripcion |
|---|---|
| `src/lib/email.ts` | Cliente Resend + funciones de envio |
| `src/lib/email-templates.ts` | Templates HTML con estilos inline |
| `src/pages/api/email/test.ts` | Endpoint de prueba |
| `src/shared/api/repositories/logistics.repo.ts` | `getPackageCustomerInfo`, `getConsolidationCustomerInfo` |
| `src/shared/api/services/logistics.service.ts` | Llamadas a email en `updateStatus` y `createInvoice` |
