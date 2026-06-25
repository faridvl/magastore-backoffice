# Project Status - Magastore Backoffice
Last updated: 2026-06-25 | Last commit: `2af4c68` (fix PDF + rediseño)

> Convencion: Actualizar este archivo en cada commit significativo. Cambiar fecha y hash, ajustar porcentajes y mover items entre secciones conforme avanzan.

---

## Estado Real por Area

### Implementado y Funcional (conectado a DB real)

| Area | Notas |
|---|---|
| Autenticacion | JWT 12h, bcrypt, HOC SSR. Roles: ADMIN (acceso total) / OPERADOR (solo logistics, consolidaciones, clientes) |
| Listado de clientes | Paginado, busqueda con debounce 400ms |
| Creacion de cliente | INSERT atomico con CTE (cliente + direcciones) |
| Edicion de cliente | PUT /api/customers/[id] — nombre, apellidos, email, telefono, is_active, direcciones |
| Detalle de cliente | Solo lectura + boton Editar que activa formulario inline |
| Listado de paquetes | Paginado, filtro por status, busqueda |
| Registro de paquetes | Preview usa system_settings; factura tambien lee system_settings desde Etapa 1 |
| Actualizacion de status | Sin state-machine - cualquier a cualquier |
| Consolidacion de paquetes | Transaccional BEGIN/COMMIT, recalcula peso |
| Detalle de paquete | Lee system_settings para tarifas; cliente y casillero desde JOIN |
| Configuracion del sistema | Singleton system_settings con correos_fee_crc y tracopa_fee_crc; auditoria campo por campo |
| Generacion de factura | Lee tarifas de system_settings; delivery_method elegido al facturar; delivery_fee_crc en billing |
| PDF de factura | GET /api/billing/pdf?uuid= genera PDF con react-pdf; boton Descargar PDF en modal de detalle |
| Listado de facturas | Paginado, busqueda, filtro pagado/pendiente |
| Detalle de factura | Desglose: flete + envio local + total, boton Marcar pagado |
| Marcar pago | PATCH /api/billing?uuid=, actualiza is_paid + paid_at |
| Eventos de paquete | Trigger DB trg_package_status_history escribe en package_events automaticamente |
| Notificaciones por email | Resend: email al cliente al entregar paquete y al generar factura. Template HTML con logo placeholder. |
| Historial de tarifas | settings_history campo por campo, con nombre de operador |
| Gestion de consolidaciones | Listar, crear, detalle con paquetes, asignar paquetes, avanzar estado (state machine) |

---

### Parcialmente Real / Con Advertencias

| Area | Problema | Impacto |
|---|---|---|
| Preview de creacion de paquetes | No incluye costo de envio local (metodo no conocido aun) | Cliente ve monto diferente al de la factura final. Bajo riesgo. |
| Panel financiero en detalle | Calculo estimado con tarifas vigentes, no billing.total_amount_crc si ya existe factura | Puede mostrar monto distinto si las tarifas cambiaron. |
| Preview de creacion de paquetes | No incluye costo de envio local (metodo no conocido aun) | Cliente ve monto diferente al de la factura final. Bajo riesgo. |
| Notificacion al entregar | logistics.service.ts:152-154 es solo console.log | Cuando status llega a ENTREGADO, el cliente no es notificado |

---

### Mockeado / No Implementado

| Pagina / Feature | Realidad |
|---|---|
| Dashboard (/admin/dashboard) | Implementado con datos reales — KPIs + graficas desde /api/dashboard/stats |
| Tracking publico (/tracking) | GET /api/tracking?q= conectado a DB real; timeline con lifecycle steps |
| Paquetes admin (/admin/packages) | setTimeout + mock results. Proposito no claro vs /admin/logistics |
| PDF de factura | Implementado — ver fila en Implementado |
| /admin/billing/:id | Ruta definida en routes.ts, pagina no existe (detalle va en modal) |
| Multi-rol | Implementado: ADMIN / OPERADOR. Script SQL 004 ejecutado en Neon 2026-06-25 |
| Direccion de entrega en factura | billing no guarda la direccion del cliente |
| /admin/billing/:id | Ruta definida en routes.ts, pagina no existe (detalle va en modal) |
| /admin/billing/reports | Ruta definida, pagina no existe |
| Paquetes admin (/admin/packages) | setTimeout + mock results. Proposito no claro vs /admin/logistics |

---

## Pendientes (Etapas 14-18)

| Etapa | Descripcion | Prioridad |
|---|---|---|
| Etapa 14 | Toast notifications: reemplazar alert() con sonner | Alta — UX |
| Etapa 15 | Seguridad: JWT sin fallback + validacion consolidacion mismo cliente | Alta — seguridad |
| Etapa 16 | Billing: direccion de entrega en factura + pagina /admin/billing/reports | Media |
| Etapa 17 | State machine en status de paquetes (solo avanzar, no retroceder) | Baja |
| Etapa 18 | Rate limiting en POST /api/auth/login | Requerido antes de produccion publica |

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
| Autenticacion | 98% | Funciona; falta rate limiting. Multi-rol implementado |
| Clientes | 98% | CRUD completo incluyendo edicion; sin eliminacion (no requerida) |
| Logistica (paquetes) | 85% | CRUD + status + UI consolidaciones; falta notificaciones, PDF |
| Consolidaciones | 90% | Listar, crear, detalle, asignar paquetes, avanzar estado |
| Facturacion | 92% | Generar + listar + marcar pagado + PDF descargable; falta address en factura, bulk |
| Configuracion | 100% | Scripts ejecutados - correos_fee_crc y tracopa_fee_crc en DB |
| Dashboard | 90% | KPIs y graficas con datos reales; falta datos de costos/ganancias netas |
| Tracking publico | 90% | Conectado a DB real; falta test con paquetes con events reales |
| Notificaciones | 90% | Resend: email al entregar y al facturar. Falta: verificar dominio en produccion |

### Resumen Global

| Escenario | % |
|---|---|
| Para uso interno minimo (operadores con guia) | ~87% |
| Para demo (datos reales, sin algunos flujos) | ~85% |
| MVP completo (tracking + dashboard) | ~70% |
| Producto completo (notificaciones pendientes) | ~72% |

---

## Viabilidad General

El sistema es viable como herramienta interna con 2 condiciones restantes:
1. Un operador capacitado (consolidaciones via API o DB directa hasta que haya UI)
2. Completar la UI de consolidaciones antes del primer mes de operacion

Los scripts SQL ya estan ejecutados en Neon - el esquema de DB esta al dia.

No es viable para usuarios externos: el cliente no puede consultar su paquete y no hay comunicacion automatica ni PDF.

Fortalezas: billing con snapshot de tarifas (facturas historicas estables), auditoria en settings_history, consolidacion transaccional, arquitectura limpia.

---

## Historial de Etapas

| Etapa | Descripcion | Estado |
|---|---|---|
| Etapas 0-5 | Billing completo, delivery fees, package detail | Completadas |
| Etapa 6 | Dashboard con datos reales | Completada |
| Etapa 7 | Tracking publico conectado a API real | Completada |
| Etapa 8 | UI consolidaciones: listar, crear, asignar, avanzar estado | Completada |
| Etapa 9 | Normalizacion package_type enum | Completada |
| Etapa 10 | Edicion de cliente | Completada |
| Etapa 11 | PDF de factura descargable | Completada |
| Etapa 12 | Multi-rol ADMIN / OPERADOR | Completada |
| Etapa 13 | Notificaciones por email (Resend) | Completada |

---

## Historial de Migraciones SQL

| Script | Descripcion | Estado |
|---|---|---|
| 001-delivery-fees-settings.sql | ADD COLUMN correos_fee_crc, tracopa_fee_crc en system_settings; SET profit_per_lb = 2.00 | Ejecutado 2026-06-25 |
| 002-billing-delivery-columns.sql | ADD COLUMN delivery_method, delivery_fee_crc en billing | Ejecutado 2026-06-25 |
| 003-normalize-package-type.sql | Normalizar package_type a AEREO / MARITIMO + enum PackageType en tipos | Ejecutado 2026-06-25 |
| 004-users-role-column.sql | ADD COLUMN role VARCHAR(20) DEFAULT 'ADMIN' en users | Ejecutado 2026-06-25 |
