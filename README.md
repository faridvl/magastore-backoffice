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
- `JWT_SECRET` — secreto para firmar tokens JWT (expiran en 7 días). Es obligatoria: sin ella fallan el login, `/api/auth/me` y los endpoints que usan `getActor` (facturación y logística)
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

Archivos numerados en `scripts/` (`NNN-descripcion.sql`), idempotentes (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

- **Producción:** un push a `main` solo calcula y muestra el plan (workflow `.github/workflows/migrate-production.yml`, resumen del job). Para aplicarlo: Actions → "Migraciones de producción" → Run workflow en `main`, con `aplicar` marcado y `confirmar` = el texto exacto que muestra el resumen del plan (`<versión>@<sha7>`, ej. `036@1a2b3c4`), que amarra la confirmación al commit revisado. "Re-run failed jobs" de una corrida vieja no sirve (falla cerrado): lanza un Run workflow nuevo. Si el plan falla por "base más adelantada", no apliques: revisa la base y `db-migrations.json`. Usa el environment `db-production` (rama permitida: solo `main`) con el secreto `DATABASE_URL` y las variables `EXPECTED_DATABASE_HOST` y `EXPECTED_DATABASE_NAME`; si algo no coincide, el workflow se detiene antes de tocar la base. El registro de lo aplicado vive en la tabla `schema_migrations` de la propia base.
- **Desarrollo:** `dbmigrate up "[DEV] MAGASTORE"` desde la raíz, que registra en `db-migrations.json`.
- Ver lo que falta sin aplicar nada: `DATABASE_URL=... EXPECTED_DATABASE_HOST=... EXPECTED_DATABASE_NAME=... node .github/scripts/migrate.mjs --plan`.

Cada migración corre en su propia transacción junto con su registro: si falla, no queda a medias y el workflow termina en error sin seguir con las siguientes.

## Entorno local con Docker

Una base Postgres local y persistente que replica la **estructura** de producción y se llena con
datos **ficticios** de escenarios. No se copia ningún dato de Neon (ni dev ni producción) y no
sale ningún correo.

**Requisitos:** Docker Desktop andando y `npm ci`. Todo vive en `docker/` (`compose.yml`,
`scripts/`, `seed/`). El host `db.localtest.me` debe resolver a `127.0.0.1` (lo hace su DNS público); si
tu red o router lo bloquea, agrega `127.0.0.1 db.localtest.me` al archivo hosts.

| Comando | Qué hace |
|---|---|
| `npm run docker:up` / `docker:down` | Levanta (espera salud) o detiene sin borrar datos. |
| `npm run docker:reset` | Borra el volumen y deja todo desde cero: producción (027) → migraciones 028–036 → escenarios → usuario de prueba. |
| `npm run docker:reset:027` | Borra el volumen y deja la base como producción hoy (sin migraciones ni escenarios): ensayo del pase. |
| `npm run docker:migrate:plan` | Muestra lo pendiente con el mismo `.github/scripts/migrate.mjs` de producción. |
| `npm run docker:migrate` | Plan, texto de confirmación `<última>@<sha7>` y aplicación (`--apply --confirm ... --expect-pending ...`); registra en `schema_migrations`. Se detiene si hay `scripts/NNN-*.sql` sin commitear (el ensayo es lo commiteado, como en CI); `-- --allow-dirty` lo permite. |
| `npm run docker:seed` | Recarga los escenarios y el usuario de prueba (idempotente; exige la migración 036). |
| `npm run dev:docker` | `next dev` en `http://127.0.0.1:3030` contra la base de Docker. Ábrelo con `127.0.0.1` y no con `localhost`: así las cookies no chocan con el dev de :3001. |

**Ensayar el pase a producción:** `npm run docker:reset:027` → `npm run docker:migrate:plan`
(debe listar 028–036) → `npm run docker:migrate` → `npm run docker:seed`.

**Cómo está armado**

- `db` (`postgres:17`, volumen `pgdata`, base `magastore`) y `neon-proxy`
  (`local-neon-http-proxy`), que traduce el driver de Neon: HTTP para la app y WebSocket para el
  script de migraciones. Los puertos se publican solo en `127.0.0.1` (base 54329, proxy 4444); por
  eso las credenciales del contenedor (`postgres`/`postgres`) son triviales. Todos los comandos de
  compose llevan `-p magastore-local` (gana sobre `COMPOSE_PROJECT_NAME`), así el volumen es el
  mismo desde el repo o desde cualquier worktree.
- El proxy deduce el endpoint del primer tramo del host y valida el resto contra `localtest.me`:
  por eso la URL usa `db.localtest.me` y no `127.0.0.1`. Prueba rápida del proxy:
  `curl -s -X POST http://db.localtest.me:4444/sql -H "Neon-Connection-String: postgres://postgres:postgres@db.localtest.me:54329/magastore" -H "Content-Type: application/json" -d '{"query":"select 1 as ok","params":[]}'`
  (debe devolver JSON con `ok: 1`). `migrate` y `dev:docker` hacen esa misma prueba con la URL de la
  app y esperan a que responda; si el host no resuelve te dicen que agregues la línea al archivo hosts.
- **Pendiente:** la imagen del proxy solo publica el tag `main`; tras el primer `pull` fíjala por
  digest (`@sha256:...`) en `docker/compose.yml`.
- `src/lib/db.ts` apunta el driver al proxy **solo** si el host de `MAGASTORE_DB_POSTGRES_URL` es
  `db.localtest.me`; con un host de Neon no cambia nada.
- `docker/scripts/migrate.mjs` envuelve el `migrate.mjs` real (no se modifica) y le precarga la
  configuración del proxy.
- La base 027 se construye con `scripts/prod/001-schema.sql` más `scripts/003..027` (el 001 es una
  introspección anterior a la 027), sin copiar datos. También se crea el usuario de prueba: la
  migración 033 se niega a correr sin al menos un usuario, igual que en producción.
- `.env.docker.local` (ignorado por git) se crea solo con la URL local, un `JWT_SECRET` al azar y
  las credenciales del usuario ADMIN de prueba (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`). Vive en
  la raíz del **checkout principal** (el padre del `.git` común), igual desde el repo original o desde
  un worktree, porque la base es una sola y sus credenciales también. La plantilla sin secretos
  está en `docker/env.docker.example`. Para entrar a la app usa esos valores; los scripts nunca
  imprimen la contraseña.
- Los `.sql` se leen con LF aunque el checkout de Windows los traiga con CRLF (`.gitattributes` fuerza
  LF en `scripts/` y `docker/`). El script real de migraciones lee de disco, así que `docker:migrate`
  se detiene si una migración pendiente tiene CRLF: restáurala con `git checkout -- scripts/<archivo>`
  tras borrarla.
- `dev:docker` se niega si la URL no es la local, compila en `.next-docker` (no pisa el `.next`
  de otro `next dev` en la misma carpeta) y define `RESEND_API_KEY` con una clave inválida a
  propósito (el constructor de Resend falla con una cadena vacía): ningún correo sale.

### Diferencias con producción

- El ensayo 027 corre sobre tablas vacías: **no prueba** los rellenos de datos de las migraciones 030, 033, 035 y 036 sobre datos reales.
- Todo corre como superusuario `postgres`; Neon usa un dueño sin superusuario (permisos y extensiones pueden comportarse distinto).
- `001-schema.sql` es una introspección de julio más las migraciones 003–027: no refleja cambios manuales hechos en producción ni las plantillas de WhatsApp editadas en Ajustes (la 036 solo reescribe las que conservan el texto original).
- El usuario de prueba se crea **antes** de la 033 porque esa migración falla con `users` vacía; en producción ya existe uno.
- Los teléfonos del seed usan `+506 0000-00NN` (rango que no se asigna en Costa Rica): los enlaces de WhatsApp no llegan a nadie.

### Escenarios del seed

Fechas relativas a hoy; se recalculan al correr `docker:seed`, que antes borra lo creado desde la app para los clientes y órdenes del seed (por sus ids fijos) y corre cada archivo en una sola transacción. Los clientes se buscan por código
(`MGA-2453-C-NN`); las órdenes `1` a `19` y los paquetes `1` a `39` tienen ids fijos (guías
`1ZSEED0000NNNN`).

| Archivo | Escenario | Dónde buscarlo |
|---|---|---|
| `00-configuracion.sql` | Tarifas (₡6,50 por libra, cambio ₡520), 3 couriers, 2 casilleros, métodos de entrega (Correos, Tracopa, Mensajería, Retiro en oficina) con tarifas y enlaces de rastreo | Ajustes, Tarifas courier, Métodos de entrega |
| `01-clientes.sql` | Sin dirección (cliente 03); varias direcciones y 3 personas que reciben (04); sin apellido (05); nombre muy largo (06); inactivo por invitar a volver (07); jurídica con millones (08); socio al costo (09); 10 % de descuento (11); DIMEX sin movimientos (12) | Clientes |
| `02-paquetes-y-ordenes.sql` | Paquetes en Panamá sin orden y sin avisar (clientes 01, 03, 05, 06), ya avisados (02, 04), ENTREGADO sin orden (07, 02), EN_TRAMITE dentro de órdenes pagadas, uno marítimo (06) | Logística, Paquetes |
| `02` | Órdenes en paso 1: orden 1 (cliente 03, sin dirección), 2 (04, con dirección y persona que recibe), 18 (10, paquetes de dos tarifas de courier: Aéreo USA y CPF) | Órdenes de envío |
| `03-facturacion-y-cobro.sql` | Paso 2: orden 3 estimado sin confirmar (01); 4 factura sin pagar y sin avisar (02); 5 y 6 factura avisada sin pagar (06 y 08); 7 estimado avisado hace 22 días (10); 8 factura pagada con pago sin avisar (05); 19 estimado al costo (09) | Órdenes, Facturación |
| `02` + `03` | Paso 3: orden 9 con guía (02); 10 sin guía y sin pagar, Tracopa (01); 11 retiro en oficina sin dirección, guía ni persona que recibe (10). Paso 4: orden 12 con ajuste del costo de envío y vuelto pendiente (04) | Órdenes de envío |
| `02` + `03` | Paso 5: orden 13 (02, hace 10 días) y 14 (01, hace 20 días) con seguimiento pendiente; 15 (04, hace 45 días) con seguimiento, reseña y autoría "histórica" sin método de pago. Pagos con método y autor ficticio | Órdenes, filtro "Seguimiento pendiente" |
| `03` | Dinero y fechas: orden 16 con ₡2,6 millones sin pagar (08, 785,75 lb); orden 17 facturada el último día del mes anterior a las 11:00 p. m. hora de Costa Rica, que en UTC cae al día siguiente (11); órdenes en rojo en el Operativo (5, 6 y 7, umbral de 15 días); ganancia incompleta por costo de entrega "por confirmar" (órdenes 4, 5, 8 y 16) | Operativo, Inicio, Reportes |
| `03` | Cobro con tipos de cliente: 10 % de descuento (orden 17) y al costo (orden 19) | Detalle de la orden |
| `04-bitacora-de-paquetes.sql` | Historial de cada paquete (llegada, aviso, tránsito, entrega) | Detalle del paquete, rastreo público |

**Agregar un escenario nuevo:** crea `docker/seed/NN-nombre.sql` con el siguiente número (se corren
en orden), con ids fijos y `ON CONFLICT ... DO UPDATE` para que sea idempotente, fechas relativas
(`now() - interval ...`) y `setval` en las secuencias si insertas ids explícitos. Súmalo a la
tabla de arriba y verifícalo corriendo `npm run docker:seed` dos veces seguidas.

---

## Convenciones

- Tailwind para todo el estilo — sin CSS modules. Usar `tailwind()` de `src/utils/tailwind-utils.ts` para clases condicionales.
- No introducir `any`. Si el tipo es desconocido, definir interfaz o usar `unknown` con type guard.
- Cada mutation (insert/update/delete) debe mostrar `toast.success` o `toast.error` via `sonner`.
- `staleTime` estándar para React Query: `1000 * 60 * 5` (5 minutos).
- Search inputs debounceados a 400ms — no reducir.

Ver [CLAUDE.md](CLAUDE.md) para el protocolo completo de arquitectura, reglas de base de datos y convenciones de código.
