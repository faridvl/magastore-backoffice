# Plan: auditoría de autoría (quién hizo qué)

Estado: **pendiente** — no implementado. Documento de planificación.

## Problema

El sistema no registra qué usuario ejecutó la mayoría de las acciones. Hoy la
autoría existe **solo en dos lugares**, y ninguno cubre paquetes ni facturas:

| Qué | Tabla | Columna |
|---|---|---|
| Cambios de tarifas | `settings_history` | `changed_by_name` (default `'Admin'`) |
| Pago mensual de la participación | `profit_share_periods` | `paid_by_name` |

Todo lo demás queda sin autor:

| Acción | Tabla | Situación |
|---|---|---|
| Registrar un paquete | `packages` | Solo `created_at`, sin autor |
| Editar peso / costo / notas | `packages` | Sin traza |
| Cambiar estado del paquete | `package_events` | La tabla no tiene columna de usuario |
| Generar estimado | `pre_billing` | Sin autor |
| Confirmar y facturar | `billing` | Sin autor |
| Marcar factura como pagada | `billing` | `paid_at` sí, **quién no** |
| Crear / editar cliente | `customers` | Sin traza |
| Armar orden de envío | `consolidations` | Sin traza |

### Los dos huecos más caros

1. **Quién marcó una factura como pagada.** `markBillingAsPaid`
   (`billing.repo.ts`) además mueve los paquetes a `EN_TRAMITE` y cierra la
   orden — tres efectos sobre plata y estado, cero traza de autor.
2. **Quién cambió el peso o el costo de un paquete.** Son los valores que
   determinan la ganancia (`profit_crc`). Hoy un cambio ahí es indistinguible
   entre operadores.

### Deuda existente a no repetir

- `system_settings.updated_by uuid` existe en el schema pero **está muerta**:
  ningún UPDATE la escribe. No usarla como referencia de patrón.
- `settings_history.changed_by_name` guarda el **nombre como texto**, no un FK.
  Dos operadores homónimos, o un usuario renombrado, vuelven la traza ambigua.
  El patrón nuevo debe guardar **`user_id` (FK a `users`) además del nombre**:
  el FK es la identidad estable, el nombre es el snapshot legible que sobrevive
  aunque el usuario se borre o se renombre.

## Dato disponible hoy

La información ya viaja en cada request; solo no se persiste.

- El JWT lleva `{ id, email }` — `auth.service.ts:20-24`. **El `id` está
  disponible**, que es lo que habilita el FK.
- `CookiesManager.getUserName(context)` devuelve el nombre; la cookie guarda
  `SESSION_USER_NAME` y `SESSION_USER_ROLE`, **pero no el id**.
- Patrón ya en uso en handlers:
  `const userName = CookiesManager.getUserName(context) || 'Usuario API';`
  — `api/billing/profit-share-paid.ts:35`, `api/settings/index.ts:23`.

**Consecuencia de diseño:** para obtener el `user_id` no alcanza la cookie —
hay que decodificar el JWT en el handler. Conviene un helper único
(ej. `getActor(context) → { id, name }`) en vez de repetir la decodificación en
cada endpoint, y que ese helper sea la única puerta de entrada a la autoría.

## Alcance propuesto

### Migración `026-audit-authorship.sql`

Cada tabla recibe el par `(user_id FK, user_name text)`:

- `packages` → `created_by_id`, `created_by_name`, `updated_by_id`, `updated_by_name`
- `package_events` → `actor_id`, `actor_name`
- `billing` → `created_by_id`, `created_by_name` (quién emitió la factura),
  `paid_by_id`, `paid_by_name` (quién la marcó pagada)
- `pre_billing` → `created_by_id`, `created_by_name`
- `consolidations` → `created_by_id`, `created_by_name`
- `customers` → `created_by_id`, `created_by_name`

### Backfill: usuario 1 como default

Requisito explícito del dueño: **no dejar nada en NULL**. Las filas históricas
se atribuyen al usuario 1 (el admin original), que en la práctica es quien
operó el sistema hasta ahora.

```sql
-- El id real se resuelve en la migración, no se hardcodea a ciegas:
-- users.id es uuid, así que se toma el usuario más antiguo.
-- Si users está vacía la migración debe fallar ruidosamente, no dejar NULL.
```

Puntos a decidir al implementar:

- **`NOT NULL` + `DEFAULT`, o nullable?** Con backfill a usuario 1, se puede
  poner `NOT NULL`. Es lo que garantiza que no vuelva a aparecer un NULL por un
  endpoint que se olvidó de pasar el actor. El costo es que un flujo sin sesión
  (cron, trigger) necesita un actor explícito — ver abajo.
- **Riesgo de atribución falsa.** Atribuir el histórico al usuario 1 hace que
  registros que quizá creó otro operador aparezcan a su nombre. Para plata esto
  puede ser peor que un NULL honesto. **Mitigación recomendada:** agregar
  `authorship_backfilled boolean DEFAULT false`, marcar `true` en las filas del
  backfill, y que la UI muestre esas como "Admin (histórico)" en vez de
  afirmar autoría real.

### Casos sin sesión de usuario

Dos flujos escriben sin que haya un operador detrás:

1. **Trigger de `package_events`** (`005-package-events-trigger.sql`) — corre en
   la BD, donde no hay sesión HTTP. Opciones: pasar el actor con
   `SET LOCAL app.actor_id` desde el repositorio antes del UPDATE, o dejar que
   el trigger escriba un actor de sistema.
2. **Cron de inactividad de clientes** (desactiva clientes con +40 días sin
   paquetes) — no tiene usuario. Debe escribir un actor de sistema explícito,
   no el usuario 1: no fue una persona.

Recomendación: sembrar un usuario `SISTEMA` dedicado para estos casos, así el
FK se cumple sin mentir sobre quién actuó.

### Capas a tocar (por cada acción auditada)

Siguiendo el flujo del proyecto:

1. Handler en `src/pages/api/` — resuelve el actor vía el helper nuevo.
2. Service — recibe el actor como parámetro explícito (mismo patrón que
   `updateSystemSettings(newData, userName)`).
3. Repository — persiste `(id, name)` en el INSERT/UPDATE.
4. Tipos en `src/types/` — agregar los campos a las interfaces.
5. UI — mostrar el autor donde importe: detalle de paquete (bitácora), detalle
   de factura, listado de facturas.

## Orden sugerido

Se puede entregar por etapas; **la primera ya da el mayor valor**:

1. **Facturas** — `billing.created_by_*` y `paid_by_*`. Es el hueco de plata.
2. **Paquetes** — `created_by_*` / `updated_by_*`, que es lo que mueve la ganancia.
3. **Bitácora** — `package_events.actor_*`, incluida la resolución del trigger.
4. **Resto** — `pre_billing`, `consolidations`, `customers`.

## Criterios de éxito

- Ninguna columna de autoría queda en NULL tras la migración.
- Toda acción nueva sobre facturas y paquetes registra `user_id` + `user_name`.
- El histórico backfilleado es distinguible del dato real (flag o etiqueta UI).
- Los flujos sin persona (cron, trigger) se atribuyen a un actor de sistema,
  no al usuario 1.
- El detalle de factura muestra quién la emitió y quién la marcó pagada.
