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
**Estado:** Completada — 2026-06-25 — commit `411ec6c`

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
**Estado:** Completada — 2026-06-25 — commit `411ec6c`

Incluye:
- `PackageType` enum (`AEREO` / `MARITIMO`) en `logistics.types.ts`; todos los campos `package_type: string` migrados al enum
- `logistics.repo.ts`: fallback `'Aereo'` → `PackageType.AEREO`
- `use-package-calculator.ts` y `create-package-container.tsx`: usan el enum, eliminado `.toUpperCase() as any`
- Script `scripts/003-normalize-package-type.sql` ejecutado en Neon

---

## Etapa 10 — Edicion de cliente
**Estado:** Completada — 2026-06-25 — commit `ae16355`

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
**Estado:** Completada — 2026-06-25 — commit `a931fc8`

### Cambios
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/components/pdf/billing-invoice.tsx` | Nuevo | Componente react-pdf con encabezado, cliente, paquetes, desglose y total |
| `src/pages/api/billing/pdf.ts` | Nuevo | GET auth, renderToBuffer, retorna application/pdf con Content-Disposition |
| `src/shared/api/mutations/billing/use-billing.ts` | Modificar | handleDownloadPdf + isDownloadingPdf via fetch + blob URL |
| `src/components/containers/billing/billing-container.tsx` | Modificar | Boton "Descargar PDF" con FileDown icon en modal de detalle |

### Criterio de exito
Desde el detalle de una factura se puede descargar un PDF con: datos del cliente, peso, tarifa, envio local y total en CRC.

---

## Etapa 12 — Multi-rol (ADMIN / OPERADOR)
**Estado:** Completada — 2026-06-25 — commit `411ec6c`

### Cambios
| Archivo | Tipo | Cambio |
|---|---|---|
| `scripts/004-users-role-column.sql` | Nuevo | ADD COLUMN role en users, DEFAULT 'ADMIN' |
| `src/types/auth/auth.ts` | Modificar | Agregar OPERADOR a UserRole enum |
| `src/shared/api/repositories/user.repo.ts` | Modificar | SELECT role explicitamente (no SELECT *) |
| `src/shared/api/services/auth.service.ts` | Modificar | Leer user.role de DB en lugar de hardcodear 'ADMIN' |
| `src/shared/constants/sidebar.ts` | Modificar | Agregar adminOnly: true a dashboard, billing, settings |
| `src/components/common/sidebar/desktop-sidebar/use-sidebar.ts` | Modificar | Leer role desde cookie (eliminar dependencia de /api/auth/me) |
| `src/components/common/sidebar/desktop-sidebar/desktop-sidebar.tsx` | Modificar | Filtrar NAVIGATION_PATHS por isAdmin |
| `src/pages/admin/dashboard/index.tsx` | Modificar | authorizeServerSidePage con adminOnly: true |
| `src/pages/admin/billing/index.tsx` | Modificar | authorizeServerSidePage con adminOnly: true |
| `src/pages/admin/settings/index.tsx` | Modificar | authorizeServerSidePage con adminOnly: true |

### Criterio de exito
Un usuario con rol OPERADOR puede registrar paquetes y cambiar estados, pero no puede ver tarifas ni facturas. El sidebar se adapta al rol automaticamente.

---

## Etapa 13 — Notificaciones por email
**Estado:** Completada — 2026-06-25 — commit `PENDIENTE`

### Proveedor: Resend
Variables en `.env.local`: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_LOGO_URL` (opcional).
Documentacion completa: `.claude/docs/email-setup.md`

### Cambios
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/lib/email-templates.ts` | Nuevo | Templates HTML con estilos inline: `renderDeliveryEmail` + `renderInvoiceEmail` |
| `src/lib/email.ts` | Nuevo | Cliente Resend: `sendDeliveryNotification` + `sendInvoiceNotification` |
| `src/shared/api/repositories/logistics.repo.ts` | Modificar | Agregar `getPackageCustomerInfo` y `getConsolidationCustomerInfo` |
| `src/shared/api/services/logistics.service.ts` | Modificar | Reemplazar `console.log`; agregar notif en `createInvoice` |
| `src/pages/api/email/test.ts` | Nuevo | POST auth-protegido para enviar email de prueba |

### Criterio de exito
- Cuando un paquete llega a `ENTREGADO`, el cliente recibe email con tracking number.
- Cuando se genera una factura, el cliente recibe email con total en CRC.
- Endpoint `POST /api/email/test` permite previsualizar el template.

---

## Etapa 14 — Toast notifications (reemplazar alert() del navegador)
**Estado:** Completada — 2026-06-25 — commit `b51755f`

### Objetivo
Reemplazar todos los `alert()` del navegador con un componente de toast elegante que se descarte solo. Mejora UX significativamente.

### Libreria propuesta: `sonner`
Compatible con Next.js 14 + Tailwind. Instalar: `npm install sonner`.

### Archivos a crear/modificar
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/pages/_app.tsx` | Modificar | Agregar `<Toaster richColors position="top-right" />` |
| `src/components/containers/logistics/use-package-calculator.ts` | Modificar | Reemplazar `alert('Completa los campos...')` y `alert('✅ Registrado')` con `toast.error()` / `toast.success()` |
| `src/shared/api/mutations/` | Revisar todos | Agregar `toast.error(error.message)` en los `onError` de mutaciones que aun no muestren feedback |

### Criterio de exito
Ningun `alert()` o `window.alert()` en el codebase. Errores y confirmaciones aparecen como toasts que se descartan solos.

---

## Etapa 15 — Seguridad: JWT sin fallback + validacion de consolidacion por cliente
**Estado:** Completada — 2026-06-25 — commit `b51755f`

### Objetivo
Dos mejoras de seguridad/correctitud que no requieren UI.

### Cambio 1: JWT_SECRET obligatorio
**Archivo:** `src/shared/api/services/auth.service.ts`

Cambiar la linea que usa `|| 'clave_secreta_por_defecto'` por:
```typescript
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not configured');
```
Si la variable no esta, el login falla con 500 (correcto) en lugar de firmar tokens con un secret conocido publicamente.

### Cambio 2: Validar mismo cliente al asignar paquetes a consolidacion
**Archivo:** `src/shared/api/services/consolidations.service.ts`

Antes de llamar al repo para asignar paquetes, verificar que todos los packageUuids pertenezcan al mismo customer_id que la consolidacion. Si no, retornar error 400. Previene mezclar paquetes de distintos clientes en una misma consolidacion.

### Criterio de exito
- `POST /api/auth/login` retorna 500 claro si `JWT_SECRET` no esta en `.env.local`.
- Asignar paquetes de otro cliente a una consolidacion retorna 400 con mensaje explicativo.

---

## Etapa 16 — Mejoras de facturacion: direccion de entrega + reportes
**Estado:** Pendiente

### Objetivo
Dos features de billing que estan en las rutas pero sin implementar.

### Feature 1: Direccion de entrega en factura
Actualmente `billing` no guarda la direccion del cliente. Al generar la factura, hacer snapshot de `customer_addresses.exact_address` (la `is_default`) en un nuevo campo `billing.delivery_address_snapshot TEXT`.

**Archivos:**
- Script SQL nuevo: `scripts/005-billing-address-snapshot.sql` — ADD COLUMN
- `logistics.repo.ts:generateBilling` — leer direccion default del cliente y guardarla
- `src/components/pdf/billing-invoice.tsx` — mostrar la direccion en el PDF

### Feature 2: Pagina de reportes `/admin/billing/reports`
La ruta esta definida en `routes.ts` pero la pagina no existe. Implementar vista con:
- Total facturado por mes (tabla + grafica de barras simple)
- Total pagado vs pendiente
- Filtro por rango de fechas

**Archivos:** repo query, API handler GET `/api/billing/reports`, query hook, container, pagina.

### Criterio de exito
- El PDF de factura incluye la direccion de entrega del cliente.
- `/admin/billing/reports` muestra datos reales de facturacion por mes.

---

## Etapa 17 — State machine en status de paquetes
**Estado:** Pendiente (baja prioridad — no bloquea operaciones)

### Objetivo
Actualmente `updatePackageStatus` permite pasar de cualquier estado a cualquier otro. Un operador puede poner `ENTREGADO` sin pasar por `BODEGA_CR`. Agregar validacion en el service.

### Transiciones validas
```
MIAMI -> TRANSITO -> ADUANA -> BODEGA_CR -> ENTREGADO
```
Solo avanzar (no retroceder). Si el status actual no permite la transicion al nuevo, retornar 400.

**Archivo:** `src/shared/api/services/logistics.service.ts:updateStatus`

### Criterio de exito
Intentar poner `ENTREGADO` a un paquete en `MIAMI` retorna 400 con mensaje claro.

---

## Etapa 18 — Rate limiting en login
**Estado:** Pendiente (requerido antes de produccion publica)

### Objetivo
`POST /api/auth/login` no tiene rate limiting. Un atacante puede hacer fuerza bruta sin limite.

### Opcion recomendada: `upstash/ratelimit` + Redis (ya disponible en Vercel/Upstash gratis)
Alternativa simple sin infra extra: contador en memoria con `Map<ip, {count, resetAt}>` — funciona para un solo servidor, no para deployments distribuidos.

**Archivo:** `src/pages/api/auth/login.ts`

### Criterio de exito
Mas de 5 intentos fallidos desde la misma IP en 1 minuto retorna 429 con mensaje claro.

---

## Limites del Plan

| Hasta | Resultado |
|---|---|
| Etapa 5 | Sistema usable internamente por operadores con guia |
| Etapa 8 | MVP completo: el operador puede operar el flujo entero sin acceso a DB |
| Etapa 11 | Producto completo sin notificaciones |
| Etapa 13 | Producto completo |
| Etapa 15 | Producto completo con seguridad basica |
| Etapa 18 | Listo para exposicion publica |

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
| 2026-06-25 | Etapa 13 | Notificaciones Resend: delivery + invoice + test endpoint |
| 2026-06-25 | — | Etapas 14-18 agregadas: toast, seguridad, billing mejoras, state machine, rate limiting |
