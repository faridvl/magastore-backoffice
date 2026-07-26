# Magastore Backoffice

Sistema de gestión interna para una empresa de courier que importa paquetes desde Panamá hacia Costa Rica. Los operadores usan este backoffice para registrar paquetes al llegar, darles seguimiento durante el tránsito, agruparlos en órdenes de envío por cliente, generar pre-facturas y facturas finales en colones, y notificar al cliente cuando su paquete está listo.

El cliente final tiene acceso a una página pública de tracking (`/tracking`) donde puede ver el estado de su paquete con su número de guía, sin necesidad de login.

**Stack:** Next.js 14 (Pages Router) · TypeScript strict · Neon PostgreSQL (serverless) · React Query · Tailwind CSS · JWT · Resend · sonner

> **UI/UX:** La interfaz es completamente responsive — mobile-first con breakpoints `sm` / `md` / `lg`. En mobile los botones de acción se apilan en columna (ancho completo), los filtros de fecha van en filas separadas, y todas las vistas de lista tienen empty states con ícono y mensaje descriptivo.

---

## Instalación

```bash
npm install
npm run dev      # localhost:3000
npm run lint     # ESLint (next/core-web-vitals)
```

No hay suite de tests configurada.

### Variables de entorno

Crear `.env.local` en la raíz:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
MAGASTORE_DB_POSTGRES_URL=postgresql://...
JWT_SECRET=your-secret-key
RESEND_API_KEY=re_...
EMAIL_FROM=notificaciones@tudominio.com
EMAIL_LOGO_URL=https://tudominio.com/logo.png   # opcional
NEXT_PUBLIC_SITE_URL=https://magastorecr.com    # opcional
NEXT_PUBLIC_WHATSAPP_NUMBER=506XXXXXXXX         # opcional
```

- `MAGASTORE_DB_POSTGRES_URL` — string de conexión a Neon PostgreSQL
- `JWT_SECRET` — secreto para firmar tokens JWT (expiran en 7 días). Si está ausente, el sistema cae a un fallback hardcodeado — **no usar en producción sin esta variable**
- `RESEND_API_KEY` — para notificaciones de entrega y facturas por email
- `EMAIL_FROM` — dirección remitente que debe estar verificada en Resend
- `EMAIL_LOGO_URL` — URL pública del logo para los emails (opcional)
- `NEXT_PUBLIC_SITE_URL` — dominio público usado en las meta tags OG/canonical del landing (opcional, default `https://magastorecr.com`)
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — número de contacto del negocio en formato `506XXXXXXXX`, sin `+` ni espacios. Alimenta los CTA del landing; si está ausente, los botones apuntan a `/tracking` (opcional)

---

## Qué hace el sistema

### Flujo principal

1. **Registro de paquete** — el operador registra un paquete cuando llega: tracking number, peso, tipo (aéreo/marítimo), tarifa courier, cliente dueño, dirección de entrega.
2. **Cambio de estados** — el paquete avanza por: `PANAMA → EN_TRAMITE → ENTREGADO`. Cada cambio registra un evento en la bitácora con tipo (`INFO`, `WARNING`, `DAMAGE`, `CRITICAL`), descripción y ubicación opcional.
3. **Orden de Envío** — los paquetes de un mismo cliente se agrupan en una orden de envío. El peso total se recalcula automáticamente al asignar/quitar paquetes.
4. **Pre-factura** — antes de emitir la factura final se genera una pre-factura con estimación de costos (precio/lb desde `system_settings`, tipo de cambio, método de entrega) para la orden de envío. El operador la confirma con el cliente.
5. **Factura final** — al confirmar la pre-factura se genera la factura definitiva con snapshot de tarifas vigentes. El monto queda fijo en el momento de facturar.
6. **Cobro** — el operador marca la factura como pagada. El cliente puede descargar el PDF desde la página de tracking.
7. **Notificaciones** — se envía email al cliente cuando su paquete es entregado y cuando se genera su factura, usando Resend con templates HTML.

### Módulos del backoffice (`/admin`)

| Ruta | Descripción |
|---|---|
| `/admin/dashboard` | KPIs y gráficas: ingresos del mes, paquetes activos, clientes. Banner de bienvenida con nombre del operador. |
| `/admin/logistics` | Lista paginada de paquetes con filtros por estado, búsqueda y rango de fechas. Toggle Activos/Historial. |
| `/admin/logistics/[id]` | Detalle de paquete: peso, bitácora de eventos, cambio de estado, panel financiero (billing, courier rates). |
| `/admin/logistics/create` | Registro de nuevo paquete con calculadora de costo en tiempo real. |
| `/admin/packages` | Buscador rápido por número de tracking — vista resumida con datos de cliente y billing. |
| `/admin/customers` | Lista de clientes con importación masiva desde Excel, empty state, paginación. |
| `/admin/customers/[id]` | Detalle de cliente: historial de paquetes, direcciones, edición de cédula. |
| `/admin/customers/create` | Registro de nuevo cliente con validación de duplicados. |
| `/admin/shipment-orders` | Gestión de órdenes de envío: crear, asignar paquetes, pre-factura, cambio de estado, eliminar. |
| `/admin/billing` | Lista de facturas generadas: marcar pagado, descargar PDF. |
| `/admin/billing/reports` | Reporte mensual de facturación: ingresos, pagado, pendiente, ganancia. |
| `/admin/settings` | Tarifas del sistema: precio/lb, tipo de cambio, costos de entrega. Historial de cambios paginado. |
| `/tracking` | Página pública — el cliente busca su paquete por tracking number y puede descargar su factura en PDF. |

---

## Arquitectura

```
Page (SSR auth) → Container → Custom Hook → React Query → API Route → Service → Repository → Neon SQL
```

- **Pages** (`src/pages/admin/`) — shells delgados. Solo aplican `authorizeServerSidePage()` en `getServerSideProps` y montan un container.
- **Containers** (`src/components/containers/`) — componente inteligente por módulo. Consume el hook y renderiza la UI.
- **Hooks** (`use-*.ts`, co-ubicados con el container) — todo el estado local, paginación, búsqueda, y llamadas a React Query.
- **React Query hooks** (`src/shared/api/querys/` y `mutations/`) — wrappean `useApiQuery` / `useApiMutation`, inyectan el token automáticamente.
- **Services** (`src/shared/api/services/`) — validaciones y reglas de negocio.
- **Repositories** (`src/shared/api/repositories/`) — SQL puro contra Neon. Operaciones multi-tabla usan `BEGIN`/`COMMIT`/`ROLLBACK` manual.

### Autenticación

Tokens JWT almacenados en cookies via `CookiesManager`. El cliente API los lee automáticamente en cada request. Roles: `ADMIN` y `OPERADOR`. Las páginas admin validan rol en `getServerSideProps` y redirigen si no hay sesión.

### Billing

La factura parte de una **pre-factura** (estimación confirmable) que el operador genera al cerrar una orden de envío. Al confirmar, se genera la **factura final** con snapshot de tarifas — precio/lb, tipo de cambio, método de entrega, fee de envío local. Esos valores quedan fijos en la fila de `billing`; facturas pasadas no cambian si se actualizan las tarifas.

Las tarifas vienen todas de `system_settings` — no hay constantes hardcodeadas en el repositorio.

**Fórmula:**
```
chargedWeight  = MAX(actual_weight_lb, min_weight)
courierCost    = courier_cost_usd × tc_banco  (costo del courier en CRC)
localFee       = delivery_fee_crc  (Correos CR / Tracopa / Retiro)
totalCRC       = (chargedWeight × price_per_lb × exchange_rate) + localFee
```

### Notificaciones

Implementadas con Resend usando templates HTML (`src/lib/email-templates.ts`). Se disparan al marcar un paquete como `ENTREGADO` y al confirmar una pre-factura. Si `RESEND_API_KEY` no está configurada, las llamadas fallan silenciosamente — el flujo principal no se interrumpe.

### Tarifas Courier

La tabla `courier_rates` almacena las tarifas por courier/ruta/tipo de paquete. Al registrar un paquete el operador selecciona la tarifa aplicable. Los valores (`rate_usd`, `insurance_usd`) se capturan en el paquete y en la factura como snapshot.

---

## Estructura de directorios relevante

```
src/
├── pages/
│   ├── admin/          # Páginas protegidas del backoffice
│   ├── api/            # API Routes de Next.js (backend)
│   └── tracking/       # Página pública de tracking
├── components/
│   └── containers/     # Un container + hook por módulo
├── shared/
│   └── api/
│       ├── repositories/   # SQL queries (Neon)
│       ├── services/       # Lógica de negocio y validaciones
│       ├── querys/         # React Query GET hooks
│       └── mutations/      # React Query POST/PATCH/DELETE hooks
├── types/              # Interfaces TypeScript por dominio
├── hocs/               # authorizeServerSidePage, unauthorizeServerSidePage
└── lib/
    ├── db.ts           # Cliente Neon SQL
    ├── email.ts        # Funciones Resend (entrega + factura)
    ├── email-templates.ts  # Templates HTML para emails
    └── rate-limiter.ts # Rate limiting en memoria (login)
```

---

## Migraciones SQL

Scripts en `scripts/` — deben ejecutarse en orden en Neon:

| Script | Descripción |
|---|---|
| `003-normalize-package-type.sql` | Normaliza valores de package_type |
| `004-users-role-column.sql` | Columna role en tabla users |
| `005-package-events-trigger.sql` | Trigger que registra eventos automáticos en bitácora |
| `006-billing-address-snapshot.sql` | Columna de snapshot de dirección de entrega en billing |
| `007-packages-address-id.sql` | Columna address_id en packages para dirección de entrega |

Todos ejecutados en el ambiente de producción (Neon).

---

## Convenciones

- Tailwind para todo el estilo — sin CSS modules. Usar `tailwind()` de `src/utils/tailwind-utils.ts` para clases condicionales.
- No introducir `any`. Si el tipo es desconocido, definir interfaz o usar `unknown` con type guard.
- Cada mutation (insert/update/delete) debe mostrar `toast.success` o `toast.error` via `sonner`.
- `staleTime` estándar para React Query: `1000 * 60 * 5` (5 minutos).
- Search inputs debounceados a 400ms — no reducir.

Ver [CLAUDE.md](CLAUDE.md) para el protocolo completo de arquitectura, reglas de base de datos y convenciones de código.
