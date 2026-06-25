# Plan de Desarrollo — Magastore Backoffice
Última actualización: 2026-06-24

Cada etapa termina con `npm run lint` limpio y funcionalidad verificada en el navegador o via API.
Al completar cada etapa, actualizar el estado aquí y pedir el prompt de la siguiente.

---

## Etapa 0 — Commit del trabajo actual (package detail view)
**Estado:** ⏳ Pendiente

Archivos con cambios sin commitear que pertenecen a la feature de detalle de paquete:
- `src/components/containers/logistics/logistics-view-detail/` (nuevo)
- `src/shared/api/mutations/logistics/use-add-package-mutation.ts` (nuevo)
- `src/shared/api/query-hooks/use-api-client-query.ts` (nuevo)
- `src/shared/api/querys/logistics/find-one-package-query.ts` (nuevo)
- `src/shared/api/querys/use-api-query-hook.ts` (nuevo)
- `src/shared/errors/` (nuevo)
- `src/types/logistics/logistics.types.ts` (modificado)
- `src/components/containers/logistics/use-package-calculator.ts` (modificado)
- `src/components/containers/logistics/logistics-container/` (modificado)
- `src/components/containers/logistics/create-package-container.tsx` (modificado)
- `src/pages/admin/logistics/[id]/index.tsx` (modificado)

**Criterio de éxito:** `git status` limpio, lint pasa.

---

## Etapa 1 — Billing: Capa de datos (Backend core)
**Estado:** ⏳ Pendiente

### Archivos a modificar
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/shared/api/repositories/logistics.repo.ts` | Modificar | Reemplazar RATES hardcodeado en `generateBilling` con lectura de `system_settings`. Cambiar firma a consolidation-only. Agregar duplicate check y status validation. |
| `src/types/logistics/logistics.types.ts` | Modificar | Agregar `BillingListItem`, `PendingConsolidation`, `GenerateInvoiceInput`, `MarkPaidInput` |
| `src/shared/api/repositories/billing.repo.ts` | **Nuevo** | 4 métodos: `getPaginatedBilling`, `getBillingDetail`, `getPendingConsolidations`, `markBillingAsPaid` |
| `src/shared/api/services/billing.service.ts` | **Nuevo** | 4 métodos: `getBillingList`, `getBillingDetail`, `getPendingConsolidations`, `confirmPayment` |
| `src/shared/api/services/logistics.service.ts` | Modificar | `createInvoice(uuid, type)` → `createInvoice(consolidationUuid: string)` |

**Criterio de éxito:** `npm run lint` sin errores. TypeScript compila. Probar en Postman: `POST /api/logistics?action=invoice` con `{ consolidationUuid }` contra una consolidación real devuelve la factura con montos correctos ($6, ₡480, ₡2,900).

---

## Etapa 2 — Billing: Capa API
**Estado:** ⏳ Pendiente

### Archivos a modificar
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/pages/api/logistics/index.tsx` | Modificar | Quitar `type` del action invoice. Solo acepta `{ consolidationUuid }`. |
| `src/pages/api/billing/index.ts` | **Nuevo** | GET (lista, detalle, pendientes) + PATCH (marcar pagado). Auth + 405 + 401. |

**Criterio de éxito:** `npm run lint` limpio. Probar en Postman/navegador: `GET /api/billing` devuelve lista (vacía por ahora), `GET /api/billing?pending=true` devuelve consolidaciones sin factura.

---

## Etapa 3 — Billing: React Query Hooks
**Estado:** ⏳ Pendiente

### Archivos a crear
| Archivo | Tipo |
|---|---|
| `src/shared/api/querys/billing/use-billing-list-query.ts` | **Nuevo** |
| `src/shared/api/querys/billing/use-billing-detail-query.ts` | **Nuevo** |
| `src/shared/api/querys/billing/use-pending-consolidations-query.ts` | **Nuevo** |
| `src/shared/api/mutations/billing/use-generate-invoice-mutation.ts` | **Nuevo** |
| `src/shared/api/mutations/billing/use-mark-paid-mutation.ts` | **Nuevo** |

**Criterio de éxito:** `npm run lint` limpio. Los hooks exportan las funciones correctas y tipan bien.

---

## Etapa 4 — Billing: UI (Container + Page)
**Estado:** ⏳ Pendiente

### Archivos a modificar/crear
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/components/containers/billing/use-billing.ts` | **Nuevo** | Hook con estado: page, search (400ms debounce), isPaidFilter, activeTab, selectedBillingUuid |
| `src/components/containers/billing/billing-container.tsx` | **Nuevo** | Adaptar UI existente. Tab Registros (datos reales, CRC) + Tab Por Facturar |
| `src/pages/admin/billing/index.tsx` | Modificar | Convertir en thin page: `authorizeServerSidePage` + `DashboardLayout` + `<BillingContainer />` |

**Criterio de éxito:** `npm run lint` limpio. Billing page muestra datos reales. Se puede generar una factura para una consolidación existente. Se puede marcar como pagada. Sin datos mock.

---

## Etapa 5 — Package Detail: Conectar datos reales
**Estado:** ⏳ Pendiente

Depende de que Etapa 0 esté commiteada.

### Problemas a resolver en `use-logistics-detail.ts`
- Panel financiero usa `tarifaXLibre: 6`, `tipoCambio: 540`, `costoEnvioCorreos: 2500` hardcodeados → leer de `system_settings` o del billing record si existe
- Nombre del cliente no viene en `GET /logistics?uuid=` → agregar join en `getPackageDetail` del repo
- `handleSaveFinancial` no hace nada → conectar a mutation si aplica

### Archivos afectados
| Archivo | Cambio |
|---|---|
| `src/shared/api/repositories/logistics.repo.ts` | Agregar JOIN con customers en `getPackageDetail` |
| `src/types/logistics/logistics.types.ts` | Agregar campos de cliente a `PackageDetail` |
| `src/components/containers/logistics/logistics-view-detail/use-logistics-detail.ts` | Reemplazar estado hardcodeado con datos reales |

**Criterio de éxito:** Detalle de paquete muestra nombre del cliente real. Panel financiero usa tarifas de `system_settings`.

---

## Etapa 6 — Dashboard: Conectar gráficas y KPIs
**Estado:** ⏳ Pendiente

### Endpoint nuevo requerido
`GET /api/dashboard/stats` retorna:
- `packagesThisMonth`: COUNT paquetes del mes actual
- `totalPendingCRC`: SUM billing.total_amount_crc WHERE is_paid=false
- `activeCustomers`: COUNT customers WHERE is_active=true
- `recentPackages`: últimos 5 paquetes con cliente y estado
- `revenueByMonth`: últimos 6 meses de total_amount_crc agrupado por mes
- `topCustomers`: top 4 clientes por total facturado

### Archivos afectados
| Archivo | Cambio |
|---|---|
| `src/shared/api/repositories/dashboard.repo.ts` | **Nuevo** |
| `src/shared/api/services/dashboard.service.ts` | **Nuevo** |
| `src/pages/api/dashboard/stats.ts` | **Nuevo** |
| `src/shared/api/querys/dashboard/use-dashboard-stats-query.ts` | **Nuevo** |
| `src/components/containers/dashboard/` | **Nuevo** — container + hook |
| `src/pages/admin/dashboard/index.tsx` | Conectar a datos reales |

**Criterio de éxito:** Dashboard muestra KPIs reales y gráficas con datos de BD.

---

## Etapa 7 — Tracking Público: Conectar API real
**Estado:** ⏳ Pendiente

La página `/tracking` usa `MOCK_PACKAGE_RESULT`. Conectar al endpoint real `GET /api/tracking?tracking=...` que ya existe o crear si no existe.

**Criterio de éxito:** Un cliente puede ingresar un tracking real y ver el estado y eventos de su paquete.

---

## Etapa 8 — Admin Packages Search: Conectar API real
**Estado:** ⏳ Pendiente

La página `/admin/packages` usa `setTimeout` + resultados mock. Conectar al endpoint de búsqueda de paquetes.

**Criterio de éxito:** Búsqueda devuelve paquetes reales de la BD.

---

## Registro de cambios

| Fecha | Etapa | Acción |
|---|---|---|
| 2026-06-24 | — | Plan creado |
