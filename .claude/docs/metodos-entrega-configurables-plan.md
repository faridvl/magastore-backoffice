# Plan: Métodos de entrega configurables (reemplazo del enum `DeliveryMethod`)

**Estado:** PENDIENTE — no se ha escrito código. Última actualización: 2026-07-25.

## Problema

`delivery_method` es hoy un union type fijo con tres valores literales:

```ts
// src/types/logistics/logistics.types.ts:149
export type DeliveryMethod = 'CORREOS_CR' | 'TRACOPA' | 'RETIRO';
```

**El valor `TRACOPA` está conceptualmente mal modelado.** El concepto real del negocio es
**encomienda** — un servicio de transporte terrestre dentro de Costa Rica que puede prestar
Tracopa u otra empresa. Al haberlo fijado con el nombre de un proveedor específico, hoy no
hay forma de dar de alta "Encomienda X" sin tocar código y desplegar.

Confirmado con el dueño (2026-07-25): el alcance elegido es **CRUD de métodos de entrega
configurables**, no un simple renombrado de etiqueta.

### Por qué esto no debe posponerse más

Cada factura confirmada congela el string del método en `billing.delivery_method` y
`pre_billing.delivery_method` como parte de su snapshot. Mientras más facturas se emitan
con `'TRACOPA'` guardado, más caro es cualquier cambio de modelo. **Es el único pendiente
del backlog que empeora con el tiempo.** Hoy el ambiente de pruebas no tiene facturas
reales (confirmado con el dueño), así que es el momento más barato para hacerlo.

## Alcance real: 14 archivos tocan el enum

```
src/components/common/billing-detail-modal/billing-detail-modal.tsx
src/components/containers/billing/billing-container.tsx
src/components/containers/customers/customer-detail/customer-detail-container.tsx
src/components/containers/logistics/logistics-container/logistics-container.tsx
src/components/containers/logistics/logistics-view-detail/logistics-view-detail.tsx
src/components/containers/settings-container/settings-container.tsx
src/components/containers/settings-container/use-delivery-rates.ts
src/components/containers/shipment-orders/shipment-order-detail/shipment-order-detail.tsx
src/components/containers/shipment-orders/shipment-orders-container.tsx
src/components/pdf/billing-invoice.tsx
src/components/pdf/pre-billing-invoice.tsx
src/shared/api/repositories/logistics.repo.ts
src/shared/constants/whatsapp-templates.ts
src/types/logistics/logistics.types.ts
```

Casi todos repiten su propio `Record<DeliveryMethod, string>` con las etiquetas escritas a
mano (`'Tracopa'`, `'Correos de Costa Rica'`, `'Retiro en oficina'`). Esa duplicación es
parte de lo que este plan elimina.

## Etapas

### D1 — Modelo de datos

Nueva tabla `delivery_methods`:

| Columna | Notas |
|---|---|
| `code` | Identificador estable. **Debe conservar los valores actuales** (`CORREOS_CR`, `TRACOPA`, `RETIRO`) |
| `name` | Editable — es lo que ve el operador y sale en PDFs |
| `requires_zone` | Si distingue GAM/Resto para el lookup de `delivery_rates` |
| `is_pickup` | Retiro en oficina: sin cobro de entrega |
| `is_active` | Saca el método de los selectores sin borrarlo |

`delivery_rates.delivery_method` pasa de texto libre a FK.

**Decisión crítica de compatibilidad:** los snapshots ya emitidos
(`billing.delivery_method`, `pre_billing.delivery_method`) guardan el string y **se dejan
intactos**. El `code` sigue siendo el mismo valor, así que una factura vieja resuelve su
nombre correctamente sin reescribir historia. Renombrar `TRACOPA` → "Encomienda Tracopa"
cambia el `name`, nunca el `code`.

Migración de datos:
- `CORREOS_CR` → name "Correos de Costa Rica", `requires_zone = true`
- `TRACOPA` → name "Encomienda Tracopa", `requires_zone` según tarifario
- `RETIRO` → name "Retiro en oficina", `is_pickup = true`

### D2 — Backend

Repo + service + API handler siguiendo el patrón de `courier-rates` / `customer-types`
(ver archivos creados en esta sesión como referencia directa).

Punto de cambio principal en `logistics.repo.ts` → `generatePreBilling`:

```ts
// Antes: lista fija de métodos que cobran entrega
if (deliveryMethod === 'CORREOS_CR' || deliveryMethod === 'TRACOPA') { ... }
// Después: consultar is_pickup del método
```

### D3 — CRUD `/admin/delivery-methods`

Pantalla de mantenimiento. Sidebar → grupo "Administrativo".

**No permitir eliminar** un método con tarifas o facturas asociadas — solo desactivar
(mismo criterio ya aplicado en `customer-types.service.ts`).

### D4 — Reemplazar labels hardcodeados

Los 14 archivos pasan a leer el `name` desde BD en vez de su `Record` local. Incluye
`whatsapp-templates.ts:DELIVERY_METHOD_LABELS`, que hoy tiene `'Tracopa'` escrito a mano y
alimenta la variable `{{metodo_entrega}}` de la plantilla "Estimado listo".

### D5 — Tipos

`DeliveryMethod` deja de ser union type. **Va último a propósito**: es lo que toca PDFs
(`billing-invoice.tsx`, `pre-billing-invoice.tsx`) y la página pública de tracking, donde
un error es visible para el cliente final.

## Riesgos

- **PDFs y tracking público** son customer-facing. Validar visualmente antes de dar por
  cerrada D5.
- **`resolveZone`** (`shared/constants/costa-rica-locations.ts`) resuelve GAM/Resto por
  cantón; su interacción con `requires_zone` debe verificarse en el lookup de tarifas.
- **Facturas históricas**: si algún método se renombra, verificar que el detalle de una
  factura vieja siga mostrando el nombre correcto vía JOIN por `code`.

---

# Contexto: qué se completó antes de este plan (sesión 2026-07-25)

Todo lo siguiente está **implementado y verificado** (`tsc --noEmit` y `npm run lint`
limpios en cada etapa), pero **sin commitear** al cierre de la sesión.

## Migraciones aplicadas en Neon

| Script | Qué hace |
|---|---|
| `017-packages-cost-not-null.sql` | `NOT NULL` en `packages.courier_cost_usd` y `tc_banco` |
| `018-billing-profit-snapshot.sql` | `courier_cost_crc`, `delivery_cost_crc`, `profit_crc`, `has_unknown_cost` en `billing` |
| `019-customer-types.sql` | Tabla `customer_types` + `customers.customer_type_id` + snapshots de regla en `pre_billing`/`billing` |
| `020-courier-rates-default.sql` | `courier_rates.is_default` + índice único parcial |
| `021-whatsapp-templates.sql` | Tabla `whatsapp_templates` con las 3 plantillas sembradas |

## Ganancia congelada al facturar

El problema original: la ganancia se recalculaba en cada render mezclando snapshot de
tarifas con datos en vivo del paquete, así que editar un `courier_cost_usd` viejo alteraba
retroactivamente la ganancia de una factura ya emitida.

- `confirmPreBilling` ahora calcula y persiste `courier_cost_crc`, `delivery_cost_crc`,
  `profit_crc` y `has_unknown_cost` dentro de su transacción.
- `ProfitCard` se dividió en `BilledProfitCard` (lee el snapshot, etiqueta "Ganancia final")
  y `EstimatedProfitCard` (recalcula en vivo, etiqueta "Estimado").
- Reportes: `SUM(b.profit_crc)` reemplazó el cálculo con `COALESCE(pb.delivery_cost_crc, 0)`,
  que **inflaba la ganancia** tratando como cero los costos de Correos sin confirmar. Ahora
  se cuenta aparte y se avisa en pantalla.

## Costo de courier obligatorio

Antes `courier_cost_usd` podía quedar NULL en silencio (`calculations.courierCostUSD || null`
convertía 0 en NULL). Cerrado en tres capas: UI, servicio y `NOT NULL` en BD. Se eliminó la
opción "Sin tarifa / manual" del selector.

## Couriers y casilleros unificados

`/admin/courier-rates` — un courier son dos cosas inseparables que comparten la clave
natural `(origin, package_type)`: su tarifa (`courier_rates`) y su casillero
(`warehouse_routes`: prefijo de código + dirección física). Ahora se administran juntos.

- `is_default` reemplazó la heurística que buscaba por nombre (`name.includes('aéreo')`),
  que se rompía en silencio al renombrar una tarifa.
- Registrar un paquete **bloquea** si el cliente no tiene casillero en la ruta de ese
  courier; el modal ofrece asignarlo y reintenta sin perder lo cargado (409 con
  `code: MISSING_WAREHOUSE_CODE`).
- La card "Costo courier — Panamá" de `/admin/settings` editaba dos campos huérfanos de
  `system_settings` que ya no alimentaban ningún cálculo. Reemplazada por un enlace.

## Tipos de cliente

`/admin/customer-types` — reemplaza el `tier` decorativo (Regular/VIP/Diamond) que se
capturaba en el formulario y nunca llegaba a la BD.

| Modo | Efecto sobre el flete |
|---|---|
| `NORMAL` | Tarifa de lista |
| `AL_COSTO` | `SUM(courier_cost_usd × tc_banco)` — sin margen. Socios y familia |
| `DESCUENTO` | `%` configurable |

**La entrega local se cobra completa en los tres modos** — es traslado de costo, no margen
(decisión del dueño). La regla se congela en `applied_billing_mode` / `applied_discount_percent`.

`AL_COSTO` **bloquea** el estimado si algún paquete no tiene costo: facturar ₡0 en silencio
sería regalar el envío.

Pendiente menor: Carlos y Farid siguen como "Regular" en BD. Cambiarlos a "Socio / Familia"
desde el detalle del cliente.

## Plantillas de WhatsApp configurables

`/admin/whatsapp-templates` (lista) + `/admin/whatsapp-templates/[uuid]` (edición).

**Son 3 plantillas usadas en 4 lugares** — "Paquetes disponibles" se envía desde dos sitios.

- Editor con formato real que inserta **sintaxis de WhatsApp** (`*negrita*`, `_cursiva_`,
  `~tachado~`, ` ```mono``` `), no HTML: WhatsApp no interpreta etiquetas y el cliente vería
  las marcas crudas.
- Vista previa sobre fondo estilo chat, con variables reemplazadas por datos de muestra.
  Usa `dangerouslySetInnerHTML`, por eso escapa `<`, `>`, `&` **antes** de convertir marcadores.
- Catálogo de variables por plantilla (`whatsapp-template-vars.ts`). Guardar una variable
  fuera del set se bloquea en UI y backend — se enviaría vacía al cliente.
- Las constantes originales quedan como respaldo si la query no cargó. Verificado que el
  texto sembrado es idéntico carácter por carácter.
- Se agregó `{{monto}}` a "Estimado listo". **No se agregó número de factura**: el
  `invoice_number` se genera al confirmar, y ese mensaje se envía antes.

## Otros arreglos

- **Colisión de queryKey**: dos hooks distintos usaban `'courier-rates'` con formas de
  respuesta distintas (array plano vs `{data}`), causando
  `.find is not a function`. El nuevo pasó a `'courier-rates-admin'`.
- **`ApiServiceClient`** descartaba todo el cuerpo del error salvo `message`, impidiendo
  distinguir un 409 de un 500. Ahora preserva los campos extra y el `status`.
- **Badge de tipo de cliente** en detalle de cliente y de orden (este último solo si no es
  NORMAL — un cliente estándar no necesita explicación).

## Descartado del backlog

- **Backfill de `profit_crc`**: innecesario, no hay facturas en producción.
- **Courier "Prueba" sin casillero**: dato de prueba del dueño, no un pendiente.
