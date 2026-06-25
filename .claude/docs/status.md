# Project Status - Magastore Backoffice
Last updated: 2026-06-25 | Last commit: `pending` (Etapa 9 - Normalización package_type)

> Convencion: Actualizar este archivo en cada commit significativo. Cambiar fecha y hash, ajustar porcentajes y mover items entre secciones conforme avanzan.

---

## Estado Real por Area

### Implementado y Funcional (conectado a DB real)

| Area | Notas |
|---|---|
| Autenticacion | JWT 12h, bcrypt, HOC SSR en todas las paginas admin. Un solo rol: ADMIN |
| Listado de clientes | Paginado, busqueda con debounce 400ms |
| Creacion de cliente | INSERT atomico con CTE (cliente + direcciones) |
| Detalle de cliente | Solo lectura |
| Listado de paquetes | Paginado, filtro por status, busqueda |
| Registro de paquetes | Preview usa system_settings; factura tambien lee system_settings desde Etapa 1 |
| Actualizacion de status | Sin state-machine - cualquier a cualquier |
| Consolidacion de paquetes | Transaccional BEGIN/COMMIT, recalcula peso |
| Detalle de paquete | Lee system_settings para tarifas; cliente y casillero desde JOIN |
| Configuracion del sistema | Singleton system_settings con correos_fee_crc y tracopa_fee_crc; auditoria campo por campo |
| Generacion de factura | Lee tarifas de system_settings; delivery_method elegido al facturar; delivery_fee_crc en billing |
| Listado de facturas | Paginado, busqueda, filtro pagado/pendiente |
| Detalle de factura | Desglose: flete + envio local + total, boton Marcar pagado |
| Marcar pago | PATCH /api/billing?uuid=, actualiza is_paid + paid_at |
| Eventos de paquete | Trigger DB trg_package_status_history escribe en package_events automaticamente |
| Historial de tarifas | settings_history campo por campo, con nombre de operador |
| Gestion de consolidaciones | Listar, crear, detalle con paquetes, asignar paquetes, avanzar estado (state machine) |

---

### Parcialmente Real / Con Advertencias

| Area | Problema | Impacto |
|---|---|---|
| Preview de creacion de paquetes | No incluye costo de envio local (metodo no conocido aun) | Cliente ve monto diferente al de la factura final. Bajo riesgo. |
| Panel financiero en detalle | Calculo estimado con tarifas vigentes, no billing.total_amount_crc si ya existe factura | Puede mostrar monto distinto si las tarifas cambiaron. |
| Estado de pago en detalle | estadoPago hardcodeado como PENDIENTE en use-logistics-detail.ts:25 | No refleja el estado real del billing. |
| Notificacion al entregar | logistics.service.ts:152-154 es solo console.log | Cuando status llega a ENTREGADO, el cliente no es notificado |

---

### Mockeado / No Implementado

| Pagina / Feature | Realidad |
|---|---|
| Dashboard (/admin/dashboard) | Implementado con datos reales — KPIs + graficas desde /api/dashboard/stats |
| Tracking publico (/tracking) | GET /api/tracking?q= conectado a DB real; timeline con lifecycle steps |
| Paquetes admin (/admin/packages) | setTimeout + mock results. Proposito no claro vs /admin/logistics |
| PDF de factura | No existe ninguna generacion de PDF |
| /admin/billing/:id | Ruta definida en routes.ts, pagina no existe (detalle va en modal) |
| Multiples roles | UserRole solo tiene ADMIN. Sin operadores ni supervisores |
| Direccion de entrega en factura | billing no guarda la direccion del cliente |
| /admin/billing/:id | Ruta definida en routes.ts, pagina no existe (detalle va en modal) |
| /admin/billing/reports | Ruta definida, pagina no existe |
| Paquetes admin (/admin/packages) | setTimeout + mock results. Proposito no claro vs /admin/logistics |

---

## Bloqueadores para MVP (No Negociables)

### 1. Pagina publica de tracking

/tracking es lo que ve el cliente final. Actualmente retorna mock data. Sin esto los clientes no pueden auto-consultar.

### 2. Dashboard con datos reales

KPIs de paquetes hoy, ingresos del mes, consolidaciones pendientes. Con mock data no tiene valor operativo.

### 3. UI de gestion de consolidaciones

Flujo: crear consolidacion -> agregarle paquetes -> cerrarla -> despacharla -> facturarla. La API existe pero no hay UI.

---

## Consideraciones Importantes

- Sin state machine: cualquier operador puede poner ENTREGADO sin pasar por BODEGA_CR
- JWT hardcoded fallback en auth.service.ts:19 si no hay JWT_SECRET en .env - critico para produccion
- Sin rate limiting en POST /api/auth/login
- billing.applied_fee_crc siempre = 0 en nuevas facturas - campo misleading pero no rompe nada
- La factura no guarda la direccion de entrega del cliente
- Sin comunicacion con el cliente en ningun punto del flujo
- La consolidacion no valida que todos los paquetes sean del mismo cliente

---

## Porcentajes de Completitud

### Por Capa Tecnica

| Capa | % Real | Notas |
|---|---|---|
| Base de datos / esquema | 100% | Scripts 001-003 ejecutados; esquema completo |
| API Routes | 88% | Falta /api/dashboard, /api/tracking real |
| Autenticacion | 95% | Funciona; falta rate limiting y roles multiples |
| Clientes | 90% | CRUD completo; falta edicion |
| Logistica (paquetes) | 85% | CRUD + status + UI consolidaciones; falta notificaciones, PDF |
| Consolidaciones | 90% | Listar, crear, detalle, asignar paquetes, avanzar estado |
| Facturacion | 80% | Generar + listar + marcar pagado; falta PDF, address, bulk |
| Configuracion | 100% | Scripts ejecutados - correos_fee_crc y tracopa_fee_crc en DB |
| Dashboard | 90% | KPIs y graficas con datos reales; falta datos de costos/ganancias netas |
| Tracking publico | 90% | Conectado a DB real; falta test con paquetes con events reales |
| Notificaciones | 0% | Solo console.log |

### Resumen Global

| Escenario | % |
|---|---|
| Para uso interno minimo (operadores con guia) | ~87% |
| Para demo (datos reales, sin algunos flujos) | ~85% |
| MVP completo (tracking + dashboard) | ~70% |
| Producto completo (PDF, notificaciones, multi-rol) | ~42% |

---

## Viabilidad General

El sistema es viable como herramienta interna con 2 condiciones restantes:
1. Un operador capacitado (consolidaciones via API o DB directa hasta que haya UI)
2. Completar la UI de consolidaciones antes del primer mes de operacion

Los scripts SQL ya estan ejecutados en Neon - el esquema de DB esta al dia.

No es viable para usuarios externos: el cliente no puede consultar su paquete y no hay comunicacion automatica ni PDF.

Fortalezas: billing con snapshot de tarifas (facturas historicas estables), auditoria en settings_history, consolidacion transaccional, arquitectura limpia.

---

## Proximas Etapas Propuestas

| Etapa | Descripcion | Prioridad |
|---|---|---|
| Etapa 6 | Dashboard con datos reales (GET /api/dashboard/stats) | Alta |
| Etapa 7 | Conectar tracking publico a API real | Alta |
| Etapa 8 | UI de gestion de consolidaciones (listar, crear, cambiar estado) | Alta |
| Etapa 9 | Normalizacion de package_type (script SQL + fix en INSERT) | Media |
| Etapa 10 | Edicion de cliente | Media |
| Etapa 11 | PDF de factura (react-pdf o similar) | Media |
| Etapa 12 | Multi-rol (ADMIN / OPERADOR) | Baja |
| Etapa 13 | Notificaciones reales (email) | Baja |

---

## Historial de Migraciones SQL

| Script | Descripcion | Estado |
|---|---|---|
| 001-delivery-fees-settings.sql | ADD COLUMN correos_fee_crc, tracopa_fee_crc en system_settings; SET profit_per_lb = 2.00 | Ejecutado 2026-06-25 |
| 002-billing-delivery-columns.sql | ADD COLUMN delivery_method, delivery_fee_crc en billing | Ejecutado 2026-06-25 |
| 003-normalize-package-type.sql | Normalizar package_type a AEREO / MARITIMO + enum PackageType en tipos | Ejecutado 2026-06-25 |
