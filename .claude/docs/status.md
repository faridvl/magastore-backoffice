# Project Status - Magastore Backoffice
Last updated: 2026-06-25 | Last commit: `b51755f`

Actualizar fecha y hash en cada commit significativo.
Para el plan detallado de etapas pendientes: `development-plan.md`.

---

## Funciona con datos reales

Auth · Clientes CRUD completo (incluyendo edicion y multiples direcciones) · Registro y actualizacion de status de paquetes · Consolidaciones (crear, asignar paquetes, ciclo ABIERTO→ENTREGADO) · Facturacion (generar con snapshot de tarifas, listar, marcar pagado, PDF descargable) · Dashboard KPIs y graficas · Tracking publico · Notificaciones email Resend · Multi-rol ADMIN/OPERADOR · Toast notifications en todos los mutations · Historial de tarifas auditado

---

## Roto o incompleto

| Area | Problema | Etapa que lo arregla |
|---|---|---|
| Detalle de paquete — editar peso | `handleSaveFinancial` es un stub, no llama API | 19 |
| Detalle de paquete — cambio de estado | No hay UI real; `/edit/[id]` es 100% mock con datos hardcoded | 20 |
| Detalle de paquete — bitacora | Depende del trigger `trg_package_status_history` en Neon; pendiente verificar | 20 |
| Detalle de paquete — panel financiero | Siempre muestra estimado, nunca `billing.total_amount_crc` real. JOIN billing sin LIMIT 1 | 21 |
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
| 005 package-events-trigger | **Pendiente verificar** — puede que ya exista en Neon |
