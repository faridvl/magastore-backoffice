# ARCHITECTURE.md

## Stack

Next.js 14.2 (Pages Router, no App Router) · React 18.3 · TypeScript 5.5 estricto (alias `@/*` →
`src/*`) · Tailwind 3.4 (`tailwind.config.js`, sin CSS modules; `tailwind()` en
`src/utils/tailwind-utils.ts`) · TanStack Query 5 · react-hook-form + yup (`yupResolver`; sin zod) · sonner · lucide-react · Neon serverless (`@neondatabase/serverless`, HTTP, SQL crudo) ·
`jsonwebtoken` + `bcryptjs` · Resend · `@react-pdf/renderer`. Node 26 local. Despliegue en Vercel
(`vercel.json`: un cron y más memoria para el PDF). Sin ORM, sin tests, sin script de typecheck.

## Estructura (`src/`)

```
pages/admin/**        páginas finas: authorizeServerSidePage + un container
pages/api/**          handlers (auth, billing, consolidations, logistics, customers, cron, public...)
pages/{login,tracking,landing}.tsx   públicas; middleware.ts reescribe magastorecr.com a /landing
components/common/    genéricos (typography, button, new-table, sidebar, layout, modales)
components/containers/{modulo}/   container + use-*.ts (billing, customers, logistics, operations,
                                  shipment-orders, settings, whatsapp-templates...)
components/pdf/       factura y estimado en react-pdf
shared/api/           repositories/ (*.repo.ts, SQL) · services/ (*.service.ts) · querys/ ·
                      mutations/ · get-actor.ts · api-service-client.ts · config.ts
shared/{constants,utils,navigation}/   textos de dominio, timezone, format-crc, rutas
hocs/auth.tsx · lib/{db,email,email-templates,rate-limiter}.ts · types/ por dominio
```

Fuera de `src/`: `scripts/NNN-*.sql` (migraciones), `scripts/prod/` (esquema base), `.github/`
(workflow y script de migraciones), `claude-project/` (documentación funcional del sistema).

## Flujo de una petición

```
Página (SSR + cookie) → Container → use-hook → React Query → ApiServiceClient (Bearer de la cookie)
  → pages/api/* → Service → Repository → sql (Neon HTTP)
```

## Autenticación

- Login: `POST /api/auth/login` (`auth.service.ts`) compara con bcrypt y firma un JWT
  `{ id, email }` con `JWT_SECRET`, que **dura 7 días**. La cookie de sesión también dura 7
  días (`cookies-manager.ts`); si se cambia una, cambiar la otra. Sin `JWT_SECRET` no hay
  secreto por defecto: `login`, `getActor` y `/api/auth/me` fallan.
- Cookies no `httpOnly` (las escribe `js-cookie`): `SESSION_ACCESS_TOKEN`, `SESSION_USER_NAME`,
  `SESSION_USER_ROLE`. Rate limit de login en memoria (5 intentos/min por IP).
- Roles `ADMIN` y `OPERADOR`. `adminOnly` solo se aplica en páginas SSR y en el sidebar; **la API
  no revisa el rol**. La mayoría de handlers solo comprueban que exista el token; únicamente
  `getActor` (billing y logistics) verifica el JWT.

## Dominio

- **Paquete** (`packages`): `PANAMA` → `EN_TRAMITE` (al pagar la factura de su orden) →
  `ENTREGADO` (al finalizar la orden, o a mano). No hay máquina de estados: se puede fijar
  cualquier valor. Al marcar un paquete `ENTREGADO` a mano se envía un correo real.
- **Orden de envío** (`consolidations`): `status` = `ABIERTO` → `CERRADO` → `DESPACHADO` →
  `ENTREGADO`, más `current_step` 1..5 (migración 030, `ShipmentOrderStep`):
  1 Confirmación · 2 Cobro · 3 Despacho · 4 Cierre · 5 Finalizada.
  Generar el estimado pasa 1→2 y cierra la orden; despachar la deja `DESPACHADO` en paso 3;
  3→4 (`advanceToClosing`) no toca `status` y exige guía (salvo retiro en oficina); 4→5
  (`finalizeOrder`, una sola sentencia) pone la orden y sus paquetes en `ENTREGADO`. Reabrir
  (→ `ABIERTO`) descarta estimado, factura impaga y participación; no se puede con factura pagada.
  El comentario de la migración 030 describe un 4 = `ENTREGADO` que ya no es así.
- Postventa tras el paso 5: seguimiento y reseña por WhatsApp (`post-delivery.ts`).
- **Facturación**: `generatePreBilling` (estimado, snapshot en `pre_billing`, re-ejecutable) →
  `confirmPreBilling` (crea `billing` con número de factura y snapshot de dirección) →
  `markBillingAsPaid` (pago, autoría, paquetes a `EN_TRAMITE`). Modos de cobro por tipo de
  cliente: `NORMAL`, `DESCUENTO`, `AL_COSTO`. Cada orden genera una fila de participación
  (`profit_shares`, ESTIMADO → FACTURADO). Moneda: CRC.
- Otras tablas: `customers` (+ `customer_addresses`, `customer_recipients`, `customer_types`,
  `customer_warehouse_codes`, `warehouse_routes`), `courier_rates`, `delivery_methods`,
  `delivery_rates`, `package_events`, `system_settings`, `settings_history`,
  `whatsapp_templates`, `users`.
- `package_events` recibe el `INSERT` de `updatePackageStatus` y además un trigger de la
  migración 005; alimenta la bitácora y el rastreo público (`/tracking`, `/api/tracking`).

## Integraciones

- **Resend** (`lib/email.ts`): aviso de entrega (paquete `ENTREGADO`) y de factura al confirmar el
  estimado. El envío no espera ni rompe el flujo. Variables y setup: `.claude/docs/email-setup.md`.
- **WhatsApp**: sin API; se abre `wa.me` con una plantilla editable (`whatsapp_templates`).
- **PDF**: `GET /api/billing/pdf` y `pre-billing-pdf` (react-pdf, requieren cookie).
- **Cron de Vercel**: `/api/cron/deactivate-inactive-customers`, diario 09:00 UTC.

## Variables de entorno (`process.env` en `src/`)

`MAGASTORE_DB_POSTGRES_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL` (por defecto `/api`),
`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_LOGO_URL`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_WHATSAPP_NUMBER` (código de país + número; alimenta el teléfono de los PDF).
Local: `.env.local`.

## Zonas de alto impacto

- **`system_settings` y `delivery_rates`**: mueven todo cobro nuevo.
- **`authorizeServerSidePage` / cookies**: protegen toda la superficie admin.
- **Falsas transacciones**: `sql\`BEGIN\`` sobre HTTP no revierte. Afecta `createConsolidationWithPackages`,
  `assignPackages`, `unassignPackage`, `deleteConsolidation`, `updateConsolidationStatus`,
  `generatePreBilling`, `confirmPreBilling`, `consolidatePackages`, `markBillingAsPaid`,
  `courier-rates` (`toggleActive`, `setDefault`) y en `customers.repo.ts` el alta, las direcciones y la importación de clientes; también `logPackagesNotified`.
- **`src/pages/api/test-db.ts`**: sin autenticación, devuelve el resultado de `SELECT NOW()` y el
  mensaje de error crudo.
- **Cron `deactivate-inactive-customers`**: escritura masiva (clientes sin paquetes por 40 días);
  protegido con `CRON_SECRET`, se niega a correr sin él; `?days=` cambia el umbral.
- **`packages.status`**: lo ve el cliente en el rastreo; cambiar valores exige migración y textos.
