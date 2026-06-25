# Magastore Backoffice

Backoffice de gestion de courier para importaciones desde Miami a Costa Rica. Maneja el ciclo completo: registro de paquetes, consolidacion de envios, facturacion en CRC, y seguimiento para el cliente final.

---

## Stack

- **Framework:** Next.js 14 (Pages Router)
- **Lenguaje:** TypeScript (strict mode)
- **Base de datos:** Neon PostgreSQL via `@neondatabase/serverless`
- **Estado del servidor:** React Query
- **Estilos:** Tailwind CSS
- **Auth:** JWT 12h + bcrypt

---

## Instalacion

```bash
npm install
```

Variables de entorno requeridas en `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
MAGASTORE_DB_POSTGRES_URL=postgresql://...
JWT_SECRET=your-secret-key
```

```bash
npm run dev     # servidor local en localhost:3000
npm run lint    # ESLint
```

---

## Arquitectura

```
Page (SSR auth) -> Container -> Hook -> React Query -> API Route -> Service -> Repository -> Neon SQL
```

Ver [`CLAUDE.md`](CLAUDE.md) para guia completa de arquitectura, convenciones y reglas.

---

## Estado del Proyecto

Plan de desarrollo completo: [`.claude/docs/development-plan.md`](.claude/docs/development-plan.md)
Estado detallado por area: [`.claude/docs/status.md`](.claude/docs/status.md)

### Completado

| Etapa | Descripcion | Commit |
|---|---|---|
| Etapa 0 | Commit inicial -- detalle de paquete | `124e9bd` |
| Etapa 1 | Billing backend: repo + service | `6782647` |
| Etapa 2 | Billing API handlers | `2ec6aca` |
| Etapa 3 | Billing React Query hooks | `93c3d32` |
| Etapa 4 | Billing UI: container + page | `17ae1ba` |
| Etapa 5 | Delivery fees (Correos CR / Tracopa) + package detail con datos reales | `168517f` |
| Etapa 6 | Dashboard con KPIs y graficas reales | `6e44051` |
| Etapa 7 | Tracking publico conectado a API real | `8f451ef` |
| Etapa 8 | UI consolidaciones: listar, crear, detalle, asignar paquetes, avanzar estado | `4edb5b3` |
| Etapa 9 | Normalizar package_type (enum PackageType + script SQL) | `23f7665` |
| Etapa 10 | Edicion de cliente (PUT endpoint + formulario inline) | `ae16355` |
| Etapa 11 | PDF de factura descargable (react-pdf + endpoint GET /api/billing/pdf) | `a931fc8` |
| DB | Scripts SQL 001, 002 y 003 ejecutados en Neon | 2026-06-25 |

**Funciona con datos reales:** auth, clientes (CRUD completo incluyendo edicion), paquetes (registro, status), consolidaciones (crear, asignar paquetes, ciclo de vida completo), facturacion completa (generar, listar, marcar pagado), configuracion de tarifas, bitacora de paquetes, dashboard con KPIs y graficas reales, tracking publico por numero de tracking.

### Pendiente -- Producto Completo (Etapas 11-13)

| Etapa | Descripcion | Estado |
|---|---|---|
| Etapa 12 | Multi-rol (ADMIN / OPERADOR) | Pendiente |
| Etapa 12 | Multi-rol (ADMIN / OPERADOR) | Pendiente |
| Etapa 13 | Notificaciones por email al entregar | Pendiente |


### Porcentaje actual

| Escenario | % |
|---|---|
| Uso interno (operadores con guia) | ~90% |
| MVP completo (tracking en vivo) | ~87% |
| Producto completo (Etapas 11-13 pendientes) | ~45% |

---

## Migraciones SQL ejecutadas

| Script | Descripcion | Fecha |
|---|---|---|
| 001-delivery-fees-settings.sql | ADD COLUMN correos_fee_crc, tracopa_fee_crc en system_settings | 2026-06-25 |
| 002-billing-delivery-columns.sql | ADD COLUMN delivery_method, delivery_fee_crc en billing | 2026-06-25 |
| 003-normalize-package-type.sql | Normalizar package_type: AEREO/Aereo/AVION a AEREO; Maritimo a MARITIMO | 2026-06-25 |
