# Plan de Desarrollo — Magastore Backoffice
Ultima actualizacion: 2026-06-25

Solo etapas pendientes. Etapas 0-15 completadas — ver git log para historial.
Al completar cada etapa: eliminar su bloque de este archivo + actualizar README.md + status.md.

---

## Etapa 16 — Billing: direccion de entrega + reportes
**Estado:** Pendiente

### Feature 1: Direccion de entrega en factura
Snapshot de `customer_addresses.exact_address` (is_default) en `billing.delivery_address_snapshot TEXT` al generar factura.

| Archivo | Cambio |
|---|---|
| `scripts/006-billing-address-snapshot.sql` | ADD COLUMN delivery_address_snapshot TEXT en billing |
| `logistics.repo.ts:generateBilling` | Leer direccion default del cliente y guardarla en el INSERT |
| `src/components/pdf/billing-invoice.tsx` | Mostrar la direccion en el PDF |

### Feature 2: Pagina `/admin/billing/reports`
Ruta definida en routes.ts, pagina no existe.

| Archivo | Cambio |
|---|---|
| `billing.repo.ts` | Query: total facturado por mes, pagado vs pendiente |
| `src/pages/api/billing/reports.ts` | GET auth, llama repo |
| `use-billing-reports-query.ts` | Hook, staleTime 5min |
| Container + pagina | Tabla + grafica barras, filtro por rango de fechas |

**Criterio de exito:** PDF incluye direccion. `/admin/billing/reports` muestra datos reales.

---

## Etapa 17 — State machine en status de paquetes
**Estado:** Pendiente (baja prioridad)

Transiciones validas: `MIAMI → TRANSITO → ADUANA → BODEGA_CR → ENTREGADO`. Solo avanzar.

| Archivo | Cambio |
|---|---|
| `logistics.service.ts:updateStatus` | Validar transicion; 400 si no es valida |

**Criterio de exito:** Pasar de MIAMI a ENTREGADO directamente retorna 400.

---

## Etapa 18 — Rate limiting en login
**Estado:** Pendiente (requerido antes de produccion publica)

Opcion recomendada: `upstash/ratelimit` + Redis (Vercel/Upstash gratis).
Limite: 5 intentos fallidos por IP en 1 minuto → 429.

| Archivo | Cambio |
|---|---|
| `src/pages/api/auth/login.ts` | Agregar rate limiting antes de la verificacion de password |

**Criterio de exito:** 6to intento fallido desde la misma IP retorna 429.

---

## Etapa 19 — Package Detail: guardar peso real
**Estado:** Completada 2026-06-25 | commit: `d2d8c47`

---

## Etapa 20 — Package Detail: cambio de estado inline + bitacora
**Estado:** Completada 2026-06-25 | commit: `20e1272`

`/admin/logistics/edit/[id]` esta 100% mockeada (datos hardcoded, auth comentada, redirige a ruta inexistente, tiene estado `LISTO` que no existe en `PackageStatus`).

| Archivo | Cambio |
|---|---|
| `scripts/005-package-events-trigger.sql` | Verificar/crear trigger `trg_package_status_history`. Si ya existe en Neon, el script solo documenta. |
| `src/pages/admin/logistics/edit/[id]/index.tsx` | Reemplazar con redirect a `/admin/logistics/[id]` (o eliminar) |
| `mutations/logistics/use-update-package-status-mutation.ts` | Nuevo — PATCH con `action=status`, invalida `['fetchPackageDetail', uuid]` y `['packagesList']` |
| `use-logistics-detail.ts` | Estado `statusPanel: { isOpen, nuevoEstado, nota, ubicacion }` + handlers `handleUpdateStatus` / `handleToggleStatusPanel` |
| `logistics-view-detail.tsx` | Panel desplegable bajo el header: select de `PackageStatus`, textarea nota, input ubicacion, boton confirmar con toast |

**Criterio de exito:** Cambio de estado desde el detalle → persiste en DB → evento aparece en bitacora. Toast success/error. Pagina de edicion mockeada eliminada.

---

## Etapa 21 — Package Detail: panel financiero real + limpieza
**Estado:** Pendiente

El panel siempre muestra un estimado calculado con tarifas vigentes, incluso cuando ya existe `billing.total_amount_crc` en DB. El JOIN de billing en `getTrackingHistory` no tiene LIMIT 1.

| Archivo | Cambio |
|---|---|
| `logistics.repo.ts:getTrackingHistory` | Cambiar `LEFT JOIN billing b ON b.consolidation_id = con.id` por subconsulta con `LIMIT 1`; agregar `b.total_amount_crc`, `b.delivery_method`, `b.delivery_fee_crc` al SELECT |
| `logistics.types.ts:PackageDetail` | Agregar `total_amount_crc: number \| null`, `delivery_method: string \| null`, `delivery_fee_crc: number \| null` |
| `use-logistics-detail.ts` | Si `apiData.total_amount_crc` existe → usar ese valor; si no → calcular estimado |
| `logistics-view-detail.tsx` | Label "Total Facturado" (verde) vs "Estimado" (gris); mostrar metodo de entrega si hay factura |

**Criterio de exito:** Paquete sin factura → estimado en gris. Paquete con factura → total real en verde con metodo de entrega.
