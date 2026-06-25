# Plan de Desarrollo — Magastore Backoffice
Ultima actualizacion: 2026-06-25

Cada etapa termina con `npm run lint` limpio y funcionalidad verificada.
Al completar cada etapa: actualizar este archivo + `README.md` (seccion Pendientes) + `.claude/docs/status.md`.

---

## Etapa 0 — Commit del trabajo actual (package detail view)
**Estado:** Completada — 2026-06-24 — commit `124e9bd`

---

## Etapa 1 — Billing: Capa de datos (Backend core)
**Estado:** Completada — 2026-06-24 — commit `6782647`

---

## Etapa 2 — Billing: Capa API
**Estado:** Completada — 2026-06-24 — commit `2ec6aca`

---

## Etapa 3 — Billing: React Query Hooks
**Estado:** Completada — 2026-06-24 — commit `93c3d32`

---

## Etapa 4 — Billing: UI (Container + Page)
**Estado:** Completada — 2026-06-24 — commit `17ae1ba`

---

## Etapa 5 — Delivery fees + Package Detail con datos reales
**Estado:** Completada — 2026-06-24 — commit `168517f`

Incluye:
- delivery_method (CORREOS_CR / TRACOPA / RETIRO) en billing
- correos_fee_crc y tracopa_fee_crc en system_settings
- Package detail leyendo tarifas de system_settings y cliente desde JOIN
- Scripts SQL 001 y 002 (ejecutados en Neon el 2026-06-25)

---

## Etapa 6 — Dashboard: KPIs y graficas con datos reales
**Estado:** Completada — 2026-06-25 — commit `6e44051`

### Objetivo
Reemplazar todos los valores hardcodeados del dashboard con datos reales de la DB.

### Endpoint nuevo
`GET /api/dashboard/stats` — sin paginacion, un solo objeto con todo.

Retorna:
- `packagesThisMonth`: COUNT paquetes del mes actual
- `pendingBillingCRC`: SUM billing.total_amount_crc WHERE is_paid = false
- `activeCustomers`: COUNT customers WHERE is_active = true
- `recentPackages`: ultimos 5 paquetes con tracking, cliente y status
- `revenueByMonth`: ultimos 6 meses agrupados por mes (para grafica)
- `packagesByStatus`: COUNT por cada PackageStatus (para grafica de dona)

### Archivos a crear/modificar
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/shared/api/repositories/dashboard.repo.ts` | Nuevo | 1 funcion: `getDashboardStats()` con todas las queries en Promise.all |
| `src/shared/api/services/dashboard.service.ts` | Nuevo | 1 funcion: delegacion directa al repo |
| `src/pages/api/dashboard/stats.ts` | Nuevo | GET only, auth + 405 + 401 |
| `src/shared/api/querys/dashboard/use-dashboard-stats-query.ts` | Nuevo | staleTime 2min (datos de hoy cambian mas rapido) |
| `src/components/containers/dashboard/use-dashboard.ts` | Nuevo | Hook — consume query, mapea a formato de graficas |
| `src/components/containers/dashboard/dashboard-container.tsx` | Nuevo | Reemplaza la pagina actual; KPIs + graficas |
| `src/pages/admin/dashboard/index.tsx` | Modificar | Thin page: authorizeServerSidePage + DashboardContainer |

### Criterio de exito
Dashboard muestra numeros reales. Las graficas tienen datos de los ultimos 6 meses.

---

## Etapa 7 — Tracking publico: conectar API real
**Estado:** Completada — 2026-06-25 — commit `pending`

### Objetivo
La pagina `/tracking` usa `MOCK_PACKAGE_RESULT`. Conectar al endpoint real para que el cliente pueda consultar su paquete.

### Archivos a revisar primero
- `src/pages/tracking/index.tsx` — ver exactamente que usa el mock y como llama `handleSearch`
- `src/pages/api/logistics/index.tsx` — verificar si ya existe una ruta de tracking publico o hay que crearla

### Archivos a crear/modificar
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/pages/api/tracking/index.ts` | Nuevo o verificar | GET publico (sin auth) por tracking_number; llama a `getTrackingHistory` del repo |
| `src/pages/tracking/index.tsx` | Modificar | Reemplazar `MOCK_PACKAGE_RESULT` con fetch real al endpoint |

### Notas
- El endpoint de tracking es publico — NO requiere token. Verificar que no tenga `CookiesManager.getAccessToken`.
- `getTrackingHistory` en `logistics.repo.ts` ya hace el JOIN con customers y los eventos. Reusar tal cual.
- El campo `events` viene del trigger `trg_package_status_history` — no hay que insertar nada.

### Criterio de exito
Ingresar un tracking_number real en `/tracking` muestra el estado y la bitacora del paquete.

---

## Etapa 8 — UI Gestion de Consolidaciones
**Estado:** Completada — 2026-06-25 — commit `4edb5b3`

Esta es la etapa mas compleja del MVP. Sin esta UI, el operador no puede usar el flujo principal.

### Flujo completo que debe funcionar
```
Crear consolidacion -> Agregar paquetes -> Cerrar consolidacion -> Despachar -> Facturar (ya existe en billing)
```

Incluye:
- Tipos: ConsolidationListItem, ConsolidationDetail, ConsolidationPackage, AvailablePackage, CreateConsolidationInput, UpdateConsolidationStatusInput, AssignPackagesToConsolidationInput
- Backend: consolidations.repo.ts + consolidations.service.ts + /api/consolidations (GET/POST/PATCH)
- Queries: use-consolidations-query, use-consolidation-detail-query, use-available-packages-query
- Mutations: use-create-consolidation-mutation, use-update-consolidation-status-mutation, use-assign-packages-mutation
- UI: use-consolidations.ts + consolidations-container.tsx + /admin/consolidations page
- Rutas y sidebar: routesPrivate.admin.consolidations + item "Consolidaciones" con icono Boxes
- State machine en service: ABIERTO→CERRADO→DESPACHADO→ENTREGADO (solo avanzar)
- Boton Asignar Paquetes: paquetes sin consolidacion del mismo cliente, con checkboxes
- Boton Cerrar consolidacion deshabilitado si no tiene paquetes

### Sub-etapa 8A — API de consolidaciones (backend)
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/shared/api/repositories/consolidations.repo.ts` | Nuevo | `createConsolidation`, `getPaginatedConsolidations`, `getConsolidationDetail`, `updateConsolidationStatus` |
| `src/shared/api/services/consolidations.service.ts` | Nuevo | Validaciones de transicion de estado (ABIERTO->CERRADO->DESPACHADO->ENTREGADO) |
| `src/pages/api/consolidations/index.ts` | Nuevo | GET (lista + detalle), POST (crear), PATCH (cambiar estado) |

### Sub-etapa 8B — React Query hooks
| Archivo | Tipo |
|---|---|
| `src/shared/api/querys/consolidations/use-consolidations-query.ts` | Nuevo |
| `src/shared/api/querys/consolidations/use-consolidation-detail-query.ts` | Nuevo |
| `src/shared/api/mutations/consolidations/use-create-consolidation-mutation.ts` | Nuevo |
| `src/shared/api/mutations/consolidations/use-update-consolidation-status-mutation.ts` | Nuevo |

### Sub-etapa 8C — UI
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/components/containers/consolidations/use-consolidations.ts` | Nuevo | Hook con estado: page, search, statusFilter, selectedUuid |
| `src/components/containers/consolidations/consolidations-container.tsx` | Nuevo | Lista + modal crear + panel detalle con cambio de estado |
| `src/pages/admin/consolidations/index.tsx` | Nuevo | Thin page |

### Criterio de exito
El operador puede: crear una consolidacion, asignarle paquetes (ya existe en logistics), cambiar el estado manualmente, y desde billing facturarla.

---

## Etapa 9 — Normalizacion de package_type
**Estado:** Completada — 2026-06-25 — commit `pending`

Incluye:
- `PackageType` enum (`AEREO` / `MARITIMO`) en `logistics.types.ts`; todos los campos `package_type: string` migrados al enum
- `logistics.repo.ts`: fallback `'Aereo'` → `PackageType.AEREO`
- `use-package-calculator.ts` y `create-package-container.tsx`: usan el enum, eliminado `.toUpperCase() as any`
- Script `scripts/003-normalize-package-type.sql` ejecutado en Neon

---

## Etapa 10 — Edicion de cliente
**Estado:** Completada — 2026-06-25 — commit pending

### Cambios
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/types/customer/customer.types.ts` | Modificar | Agregar `CustomerAddressUpdateInput` y `CustomerUpdateInput` |
| `src/shared/api/repositories/customers.repo.ts` | Modificar | Agregar `checkEmailTakenByOther` y `updateCustomer(id, data)` |
| `src/shared/api/services/customers.service.ts` | Modificar | Agregar `editCustomer` con validaciones |
| `src/pages/api/customers/[id]/index.tsx` | Modificar | Agregar handler PUT |
| `src/shared/api/mutations/customers/use-update-customer-mutation.ts` | Nuevo | Hook con invalidacion de cache |
| `src/components/containers/customers/customer-detail/use-customer-detail.ts` | Modificar | Estado de edicion + handlers |
| `src/components/containers/customers/customer-detail/customer-edit-form.tsx` | Nuevo | Formulario de edicion con inputs y toggle is_active |
| `src/components/containers/customers/customer-detail/customer-detail-container.tsx` | Modificar | Integrar modo edicion |

### Criterio de exito
Desde el detalle del cliente se puede editar nombre, apellidos, email, telefono, estado activo, y direcciones (editar existentes + agregar nuevas).

---

## Etapa 11 — PDF de factura
**Estado:** Pendiente

### Dependencia
Instalar `@react-pdf/renderer` o similar.

### Cambios
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/pages/api/billing/pdf.ts` | Nuevo | GET con uuid, genera PDF en memoria y retorna como blob |
| `src/components/containers/billing/billing-container.tsx` | Modificar | Agregar boton "Descargar PDF" en detalle de factura |

### Criterio de exito
Desde el detalle de una factura se puede descargar un PDF con: datos del cliente, peso, tarifa, envio local y total en CRC.

---

## Etapa 12 — Multi-rol (ADMIN / OPERADOR)
**Estado:** Pendiente

### Cambios
- Agregar `OPERADOR` a `UserRole` enum
- `authorizeServerSidePage` debe distinguir roles
- Operadores: acceso a logistics y consolidaciones. Sin acceso a settings, billing, ni dashboard financiero.

### Criterio de exito
Un usuario con rol OPERADOR puede registrar paquetes y cambiar estados, pero no puede ver tarifas ni facturas.

---

## Etapa 13 — Notificaciones por email
**Estado:** Pendiente

### Dependencia
Configurar servicio de email (Resend, SendGrid o similar). Agregar `EMAIL_API_KEY` a `.env.local`.

### Cambios
- Reemplazar `console.log` en `logistics.service.ts:152-154` con llamada real al servicio de email
- Template de email: "Tu paquete [tracking] fue entregado"
- Considerar notificar tambien al generar factura

### Criterio de exito
Cuando un paquete llega a status `ENTREGADO`, el cliente recibe un email automatico.

---

## Limites del Plan

| Hasta | Resultado |
|---|---|
| Etapa 5 | Sistema usable internamente por operadores con guia |
| Etapa 8 (actual) | MVP completo: el operador puede operar el flujo entero sin acceso a DB |
| Etapa 11 | Producto completo sin notificaciones |
| Etapa 13 | Producto completo |

---

## Registro de cambios

| Fecha | Etapa | Accion |
|---|---|---|
| 2026-06-24 | — | Plan creado |
| 2026-06-24 | Etapas 0-4 | Billing completo: tipos, repo, service, API, hooks, UI |
| 2026-06-24 | Etapa 5 | Delivery fees + package detail con datos reales |
| 2026-06-25 | — | Scripts SQL 001 y 002 ejecutados en Neon |
| 2026-06-25 | — | Etapas 6-13 detalladas con criterios de exito |
| 2026-06-25 | Etapa 9 | Normalizar package_type: enum + script SQL 003 ejecutado |
| 2026-06-25 | Etapa 10 | Edicion de cliente: PUT endpoint + mutation + formulario inline |
