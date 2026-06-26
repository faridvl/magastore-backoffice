# Project Status - Magastore Backoffice
Last updated: 2026-06-26 | Last commit: pendiente (Etapa 21)

Actualizar fecha y hash en cada commit significativo.
Para el plan detallado de etapas pendientes: `development-plan.md`.

---

## Funciona con datos reales

Auth · Clientes CRUD completo (incluyendo edicion y multiples direcciones) · Registro y actualizacion de status de paquetes · Consolidaciones (crear, asignar paquetes, ciclo ABIERTO→ENTREGADO) · Facturacion (generar con snapshot de tarifas, listar, marcar pagado, PDF descargable) · Dashboard KPIs y graficas · Tracking publico · Notificaciones email Resend · Multi-rol ADMIN/OPERADOR · Toast notifications en todos los mutations · Historial de tarifas auditado

---

## Roto o incompleto

| Area | Problema | Etapa que lo arregla |
|---|---|---|
| Detalle de paquete — editar peso | Implementado (Etapa 19) — PATCH `/logistics?uuid=X` `action=weight` | — |
| Detalle de paquete — cambio de estado | Implementado (Etapa 20) — panel inline con select, nota obligatoria, ubicacion opcional | — |
| Detalle de paquete — bitacora | Funcional; requiere trigger `trg_package_status_history` activo en Neon (script 005) | — |
| Detalle de paquete — panel financiero | Implementado (Etapa 21) — muestra total real en verde si hay factura, estimado en gris si no | — |
| `/admin/packages` | Mock con setTimeout; proposito duplica `/admin/logistics` | Sin etapa asignada |
| `/admin/billing/reports` | Ruta definida, pagina no existe | 16 |
| Direccion de entrega en factura | `billing` no guarda la direccion del cliente | 16 |
| State machine en status | Cualquier operador puede poner ENTREGADO desde MIAMI | 17 |
| Rate limiting en login | Sin proteccion contra fuerza bruta | 18 |

---

## Advertencias tecnicas

- `billing.applied_fee_crc` puede ser 0 en facturas antiguas — campo misleading pero no rompe nada
- Preview de registro de paquete no incluye fee de envio local (metodo desconocido al registrar) — monto diferente al de la factura final, bajo riesgo
- Sin state machine: cualquier estado a cualquier otro sin validacion

---

## Migraciones SQL

| Script | Estado |
|---|---|
| 001 delivery-fees-settings | Ejecutado 2026-06-25 |
| 002 billing-delivery-columns | Ejecutado 2026-06-25 |
| 003 normalize-package-type | Ejecutado 2026-06-25 |
| 004 users-role-column | Ejecutado 2026-06-25 |
| 005 package-events-trigger | Ejecutado 2026-06-25 |
