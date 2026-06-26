# Project Status - Magastore Backoffice
Last updated: 2026-06-26 | Last commit: `44d5544`

Actualizar fecha y hash en cada commit significativo.
Para el plan detallado de etapas pendientes: `development-plan.md`.

---

## Funciona con datos reales

Auth (con rate limiting 5 intentos/min por IP) · Clientes CRUD completo (incluyendo edicion y multiples direcciones) · Registro y actualizacion de status de paquetes · Consolidaciones (crear, asignar paquetes, ciclo ABIERTO→ENTREGADO) · Facturacion (generar con snapshot de tarifas y direccion de entrega, listar, marcar pagado, PDF descargable) · Reportes mensuales de facturacion · Dashboard KPIs y graficas · Tracking publico · Notificaciones email Resend · Multi-rol ADMIN/OPERADOR · Toast notifications en todos los mutations · Historial de tarifas auditado · Buscador de paquetes por tracking number (/admin/packages)

---

## Roto o incompleto

| Area | Problema | Etapa que lo arregla |
|---|---|---|
| Detalle de paquete — editar peso | Implementado (Etapa 19) — PATCH `/logistics?uuid=X` `action=weight` | — |
| Detalle de paquete — cambio de estado | Implementado (Etapa 20) — panel inline con select, nota obligatoria, ubicacion opcional | — |
| Detalle de paquete — bitacora | Funcional; requiere trigger `trg_package_status_history` activo en Neon (script 005) | — |
| Detalle de paquete — panel financiero | Implementado (Etapa 21) — muestra total real en verde si hay factura, estimado en gris si no | — |
| `/admin/packages` | Implementado — buscador real por tracking number con datos de billing y cliente | — |
| State machine en status | Descartada — flujo opcional | — |

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
| 006 billing-address-snapshot | Ejecutado 2026-06-26 |
