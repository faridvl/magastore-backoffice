# Magastore Backoffice

Sistema de gestión interna para una empresa de courier que importa paquetes desde Miami hacia Costa Rica. Los operadores usan este backoffice para registrar paquetes al llegar a Miami, darles seguimiento durante el tránsito, agruparlos en consolidaciones por cliente, generar facturas en colones y notificar al cliente cuando su paquete está listo.

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
```

- `MAGASTORE_DB_POSTGRES_URL` — string de conexión a Neon PostgreSQL
- `JWT_SECRET` — secreto para firmar tokens JWT (expiran en 12h). Si está ausente, el sistema cae a un fallback hardcodeado — **no usar en producción sin esta variable**
- `RESEND_API_KEY` — para notificaciones de entrega y facturas por email
- `EMAIL_FROM` — dirección remitente que debe estar verificada en Resend

---

## Qué hace el sistema

### Flujo principal

1. **Registro de paquete** — el operador registra un paquete cuando llega a Miami: tracking number, peso, tipo (aéreo/marítimo), cliente dueño.
2. **Cambio de estados** — el paquete avanza por: `MIAMI → TRANSITO → ADUANA → BODEGA_CR → ENTREGADO`. Cada cambio de estado registra un evento en la bitácora con nota y ubicación opcional.
3. **Consolidación** — los paquetes de un mismo cliente se agrupan en una consolidación. El peso total se recalcula automáticamente.
4. **Facturación** — al cerrar una consolidación se genera una factura con snapshot de tarifas vigentes (precio/lb, tipo de cambio, costo de envío local). El monto queda fijo en el momento de facturar.
5. **Cobro** — el operador marca la factura como pagada. El cliente puede descargar el PDF.
6. **Notificaciones** — se envía email al cliente cuando su paquete es entregado y cuando se genera su factura.

### Módulos del backoffice (`/admin`)

| Ruta | Descripción |
|---|---|
| `/admin/dashboard` | KPIs y gráficas: ingresos del mes, paquetes activos, clientes. Muestra empty state en actividad reciente si no hay paquetes. |
| `/admin/logistics` | Lista paginada de paquetes con filtros por estado, búsqueda y rango de fechas (Desde/Hasta en filas separadas en mobile). Cards mobile con empty state. |
| `/admin/logistics/[id]` | Detalle de paquete: peso (solo enteros ≥ 1 lb), bitácora, cambio de estado, panel financiero |
| `/admin/packages` | Buscador rápido por número de tracking — vista resumida con datos de cliente y billing |
| `/admin/customers` | Lista de clientes con empty state en mobile. Botones Template/Importar/Nuevo Cliente apilados en mobile. |
| `/admin/customers/[id]` | Detalle de cliente con historial y direcciones |
| `/admin/customers/create` | Registro de nuevo cliente. Formulario en 1 columna en mobile. |
| `/admin/consolidations` | Gestión de consolidaciones: crear, asignar paquetes, cerrar. Toolbar en 4 filas en mobile (búsqueda → botón → filtros de estado → fechas). Empty state en cards mobile. |
| `/admin/billing` | Lista de facturas generadas, marcar pagado, descargar PDF |
| `/admin/billing/reports` | Reporte mensual de facturación |
| `/admin/settings` | Tarifas del sistema: precio/lb, tipo de cambio, costos de envío local. Tabla de historial con paginador en 2 filas en mobile. |
| `/tracking` | Página pública — el cliente busca su paquete por tracking number |

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

### Billing — consideración importante

La factura usa un **snapshot de tarifas** al momento de generarse (precio/lb, tipo de cambio, costo de envío). Esos valores quedan fijos en la fila de `billing` — facturas pasadas no cambian si se actualizan las tarifas.

El **preview de costo** que se muestra al registrar un paquete lee las tarifas vigentes de `system_settings`. La factura final puede diferir levemente si las tarifas cambian entre el registro y la facturación.

### Notificaciones

Las notificaciones por email están implementadas con Resend. Si `RESEND_API_KEY` no está configurada, las llamadas fallan silenciosamente (el flujo principal no se interrumpe).

---

## Estructura de directorios relevante

```
src/
├── pages/
│   ├── admin/          # Páginas protegidas del backoffice
│   ├── api/            # API Routes de Next.js (backend)
│   └── tracking.tsx    # Página pública de tracking
├── components/
│   └── containers/     # Un container + hook por módulo
├── shared/
│   └── api/
│       ├── repositories/   # SQL queries
│       ├── services/       # Lógica de negocio
│       ├── querys/         # React Query GET hooks
│       └── mutations/      # React Query POST/PATCH hooks
├── types/              # Interfaces TypeScript por dominio
├── hocs/               # authorizeServerSidePage, unauthorizeServerSidePage
└── lib/
    ├── db.ts           # Cliente Neon SQL
    ├── email.ts        # Funciones Resend
    └── rate-limiter.ts # Rate limiting en memoria (login)
```

---

## Migraciones SQL

Scripts en `scripts/` — deben ejecutarse en orden en Neon:

| Script | Descripción |
|---|---|
| `001-delivery-fees-settings.sql` | Agrega columnas de tarifas de envío a system_settings |
| `002-billing-delivery-columns.sql` | Columnas de método y fee de entrega en billing |
| `003-normalize-package-type.sql` | Normaliza valores de package_type |
| `004-users-role-column.sql` | Columna role en tabla users |
| `005-package-events-trigger.sql` | Trigger que registra eventos automáticos en bitácora |
| `006-billing-address-snapshot.sql` | Columna de snapshot de dirección de entrega en billing |

Todos ejecutados en el ambiente de producción (Neon).

---

## Convenciones

- Tailwind para todo el estilo — sin CSS modules. Usar `tailwind()` de `src/utils/tailwind-utils.ts` para clases condicionales.
- No introducir `any`. Si el tipo es desconocido, definir interfaz o usar `unknown` con type guard.
- Cada mutation (insert/update/delete) debe mostrar `toast.success` o `toast.error` via `sonner`.
- `staleTime` estándar para React Query: `1000 * 60 * 5` (5 minutos).
- Search inputs debounceados a 400ms — no reducir.

Ver [CLAUDE.md](CLAUDE.md) para el protocolo completo de arquitectura, reglas de base de datos y convenciones de código.
