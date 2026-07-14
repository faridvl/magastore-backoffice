# Tarifas de envío por Correos CR — rangos configurables (análisis y plan)

**Estado: EN IMPLEMENTACIÓN — Etapa 4 completada.** Decisiones acordadas con el dueño de Magastore.
Última actualización: 2026-07-13 (Etapa 4 — método de envío en la orden + desglose — completada, sin commit/push todavía).

## Progreso

### ✅ Etapa 4 — Método de envío elegido al crear la orden (COMPLETADA 2026-07-13, sin commit/push)

- **Cambio de diseño respecto al plan original**: la Etapa 4 originalmente planteaba solo "UI de prefactura" (desglose + confirmación de zona) asumiendo que el método de envío se seguiría eligiendo al generar el estimado. Al revisar el flujo con el dueño surgió que el método debía decidirse **junto con la dirección, al crear la orden** — no varios pasos después — porque la zona GAM/Resto (que determina el precio) ya se fija con la dirección desde ese momento. Se amplió el alcance de esta etapa para cubrir eso.
- **Migración `scripts/011-consolidation-delivery-method.sql`** aplicada en Neon: `consolidations.delivery_method` (TEXT, nullable — órdenes viejas quedan sin valor).
- **Backend**: `ConsolidationsRepository.createConsolidationWithPackages` acepta `deliveryMethod` opcional y lo guarda en el INSERT; nuevo `setDeliveryMethod(uuid, method)` (mismo patrón que `setDeliveryAddress`, solo permitido en `ABIERTO`). `getConsolidationDetail` expone `delivery_method` y `pre_billing_fee_crc` (desglose fee de entrega separado del monto total). Endpoint `/api/consolidations` PATCH nueva acción `set-delivery-method`.
- **`generatePreBilling`** (`logistics.repo.ts`) — el parámetro `deliveryMethod` pasó a ser opcional: si no viene explícito, lee `consolidations.delivery_method`. Si la orden no tiene método guardado (caso viejo) y no se pasa uno explícito, lanza error pidiéndolo — mantiene compatible el fallback del endpoint `/api/logistics?action=pre-billing` (ya no exige `deliveryMethod` en el body).
- **Frontend — flujos de creación de orden** (`customer-detail` y `logistics`, los dos puntos de entrada que agrupan paquetes en una orden nueva): el modal que antes solo pedía dirección (y **solo aparecía si el cliente tenía 2+ direcciones**) ahora **siempre aparece** y pide también el método de envío — el método nunca se puede asumir automáticamente como sí pasaba con la dirección única. Botón "Crear Orden de Envío" deshabilitado hasta elegir ambos.
- **Frontend — detalle de orden** (`shipment-order-detail.tsx`): nueva card "Método de envío" (paralela a "Dirección de entrega"), editable en `ABIERTO` vía modal propio (`showMethodModal`/`handleConfirmMethodChange`, mismo patrón que el modal de dirección). La card de dirección ahora también muestra la zona derivada (`resolveZone(delivery_canton)`) como texto informativo.
- **Botón "Generar Estimado"**: si la orden ya tiene `delivery_method` guardado, genera el estimado directo sin preguntar nada (`handleGenerateEstimateClick`). El modal viejo de "Generar Prefactura" queda solo como fallback para órdenes sin método guardado, y también se reutiliza para "Recalcular" (pre-seleccionado con el método actual de la prefactura).
- **Fuera de alcance** (confirmado en la Etapa 3, sigue igual): no hay tracking de costo/ganancia del tramo local ni override manual auditado del monto.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.
- **Nota preexistente sin tocar**: `src/pages/api/logistics/index.tsx` devuelve siempre 500 en su catch general (no distingue por mensaje de error como sí hace `consolidations/index.ts`) — inconsistencia preexistente, fuera del alcance de esta etapa.
- **Nota para Etapa 5**: cargar el tarifario oficial completo de Correos en `delivery_rates` — hoy la tabla puede estar casi vacía y la mayoría de órdenes seguirán usando el fallback fijo `correos_fee_crc`/`tracopa_fee_crc` hasta que se complete.

### ✅ Etapa 3 — Motor de cálculo (COMPLETADA 2026-07-13, sin commit/push)

- **Alcance acotado con el dueño:** esta etapa resuelve únicamente `fee_crc` (lo que se le cobra al cliente). El costo real de Correos/Tracopa (`cost_crc`) y el tracking de ganancia/pérdida del tramo local (análogo a `courier_rate_usd` vs `courier_cost_usd` del tramo Panamá) quedan explícitamente fuera — no se agregó `applied_cost_crc` a `pre_billing`/`billing`, ni el evento WARNING de bitácora que proponía el punto 5 de "Decisiones acordadas". Se retoma en una etapa futura si se decide trackear esa ganancia.
- **Mapeo cantón→zona**: `GAM_CANTONS` + `resolveZone()` en `costa-rica-locations.ts` — 31 cantones oficiales de la Gran Área Metropolitana; cualquier cantón fuera de esa lista resuelve a `RESTO`. Reutiliza `normalize()` ya existente en el archivo (case/tilde-insensitive).
- **Lookup de tarifa**: `DeliveryRatesRepository.findMatchingRate(deliveryMethod, zone, weightKg)` (`delivery-rates.repo.ts`) — busca la fila activa cuyo rango `[min_weight_kg, max_weight_kg]` cubra el peso, para ese método + zona (o `zone IS NULL` si el método no distingue zona). `assertNoOverlap` de la Etapa 2 garantiza que nunca hay más de un match posible.
- **`generatePreBilling`** (`logistics.repo.ts`) reemplazó el switch fijo por: obtener el cantón desde `delivery_address_id` de la orden (o la dirección default del cliente si la orden no fijó una — mismo fallback que ya usaba `confirmPreBilling` para el snapshot), derivar zona con `resolveZone`, convertir el peso cobrado de lb a kg con `settings.kg_per_lb`, y buscar la tarifa con `findMatchingRate`. **Sin match** (rango no cubierto por ninguna fila activa) cae al fallback fijo `correos_fee_crc`/`tracopa_fee_crc` — no bloquea, tal como decía el punto 5 de "Decisiones acordadas". `RETIRO` sigue en `deliveryFee = 0` sin tocar `delivery_rates`.
- **`confirmPreBilling` no requirió cambios** — ya copiaba `pre_billing.delivery_fee_crc` como snapshot hacia `billing`; el monto ya resuelto por rango viaja igual que antes.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.
- **Nota para etapas futuras**: sigue pendiente la Etapa 4 (UI de prefactura — mostrar de dónde salió el monto, override manual auditado, confirmación de zona) y la Etapa 5 (cargar el tarifario oficial completo de Correos en `delivery_rates`, hoy la tabla puede estar vacía y todo cae al fallback fijo).

### ✅ Etapa 2 — Modelo de datos + CRUD de tarifas (COMPLETADA 2026-07-13, sin commit/push)

- **Migración `scripts/010-delivery-rates.sql`** aplicada en Neon: tabla `delivery_rates` (`delivery_method`, `zone` nullable, `min_weight_kg`, `max_weight_kg`, `fee_crc`, `cost_crc` nullable = "por confirmar", `is_active`) + `system_settings.kg_per_lb` (default `0.453592`, el valor real de conversión, para no afectar nada si queda sin editar). Usa `gen_random_uuid()` (extensión `pgcrypto`, confirmada como la que ya usa el resto del esquema — no `uuid_generate_v4()`).
- **Backend nuevo dominio** `delivery-rates`: tipo `DeliveryRate`/`DeliveryRateInput`/`DeliveryZone` (`logistics.types.ts`), `DeliveryRatesRepository` (`delivery-rates.repo.ts`) con `getAll`/`create`/`update`/`toggleActive`, `DeliveryRatesService` (`delivery-rates.service.ts`), endpoint `GET/POST/PATCH /api/delivery-rates`.
- **Validación de solapamiento de rangos (prohibida, tal como se confirmó):** `create`/`update` en el repo verifican que `[min_weight_kg, max_weight_kg]` no se solape con ninguna otra fila **activa** del mismo `delivery_method` + `zone` (incluyendo el caso `zone IS NULL` para métodos sin distinción de zona) antes de escribir — si hay conflicto, rechaza con el rango y el id de la fila que choca. Motivo: sin esto, dos rangos solapados matchearían el mismo peso en el lookup que hará `generatePreBilling` en la Etapa 3, y el monto facturado dependería del orden interno de la consulta SQL en vez de una regla de negocio.
- **`system_settings`**: `SystemSettings` type + `updateSettings` (repo) + array `fields` de `settings.service.ts` extendidos con `kg_per_lb` — queda con historial de auditoría igual que los demás parámetros.
- **Frontend** — `use-delivery-rates-query.ts` + `use-delivery-rate-mutations.ts` (create/update/toggle, todas invalidan `DELIVERY_RATES_KEY`). Nuevo hook `use-delivery-rates.ts` (co-ubicado en `settings-container/`) maneja el estado de **edición inline** (draft por fila, se guarda al confirmar con ✓, no en cada tecla) tanto para editar una fila existente como para dar de alta una nueva.
- **UI**: en `settings-container.tsx`, los 2 `SettingInput` fijos de `correos_fee_crc`/`tracopa_fee_crc` (Card "Entrega local") se reemplazaron por un input de conversión "Kg por libra" + una card nueva con tabla de tarifas por rango (Método, Zona, Rango kg, Cobro cliente, Costo real, Activo/Inactivo con toggle, Editar). Fila de alta con el mismo componente `DeliveryRateRow` que la edición. El sidebar de "Simulación" ya no muestra `correos_fee_crc`/`tracopa_fee_crc` como monto fijo (ya no lo son) — muestra el conteo de tarifas activas.
- **Nota importante:** `correos_fee_crc`/`tracopa_fee_crc` **no se eliminaron** de `system_settings` — siguen existiendo en el tipo/tabla/service para servir de fallback en `generatePreBilling` cuando un método no tenga ninguna fila en `delivery_rates` (decisión ya acordada en el plan). Simplemente dejaron de tener UI de edición directa; ya no son la fuente de verdad del cobro cuando hay tarifas por rango cargadas.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.
- **Nota para Etapa 3**: el motor de cálculo (`generatePreBilling` en `logistics.repo.ts`) todavía usa `correos_fee_crc`/`tracopa_fee_crc` fijos — el lookup por rango contra `delivery_rates` es el siguiente paso. El mapeo cantón→zona GAM/Resto (para poder derivar `zone` automáticamente de la dirección de la orden) tampoco existe todavía.

### ✅ Etapa 1 — Direcciones estructuradas (COMPLETADA 2026-07-13, sin commit/push)

- **Dataset oficial** `src/shared/constants/costa-rica-locations.ts` (nuevo): 7 provincias, ~130 cantones/distritos de la división territorial de Costa Rica, con `getCantons()`, `getDistricts()`, y `resolveLocation()` (matching case/tilde-insensitive que devuelve los nombres oficiales exactos o `null`).
- **Componente compartido** `src/components/common/location-select-fields/location-select-fields.tsx`: 3 `<select>` encadenados (provincia → cantón → distrito). Cambiar provincia resetea cantón/distrito; cambiar cantón resetea distrito. Recibe `selectClassName`/`labelClassName` para adaptarse al estilo visual de cada formulario sin duplicar la lógica de encadenamiento.
- **Integrado en 2 formularios** (reemplazando los `<input>` de texto libre que existían):
  - Crear cliente (`create-customer-container.tsx` + `use-create-customer.ts` — `handleAddressChange` ahora resetea cantón/distrito en cascada).
  - Editar cliente (`customer-edit-form.tsx` + `use-customer-detail.ts` — mismo reset en cascada en `handleEditAddress`).
- **Import masivo** (`use-import-customers.ts` + `customers.service.ts`): la validación de "no vacío" se reemplazó por `resolveLocation()` — fila con combinación provincia/cantón/distrito que no matchea el catálogo oficial se rechaza con mensaje explícito señalando la fila. Los valores se normalizan al nombre oficial exacto (corrige mayúsculas/tildes) antes de insertar.
- **Validación backend agregada donde no existía ninguna**: `registerCustomer` y `editCustomer` (`customers.service.ts`) ahora validan y normalizan cada dirección contra el dataset vía `validateAndNormalizeAddress()` — antes no había ninguna validación de contenido de dirección en crear/editar cliente individual (solo en import).
- **Migración de datos existentes**: los 10 registros reales en `customer_addresses` fueron normalizados contra el catálogo oficial (7 con mapeo "mejor esfuerzo" a la combinación válida más cercana — ej. "Sabana/Nunciatura" → San José/San José/Mata Redonda, "Guadalupe" como cantón → San José/Goicoechea/Guadalupe; 3 filas vacías → San José/San José/Carmen como default). Aplicado directamente en Neon vía script puntual (no versionado, mismo patrón usado en sesiones anteriores).
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.
- **Nota para Etapa 2**: el mapeo cantón→zona GAM/Resto sigue sin existir — es el siguiente paso, ahora con la garantía de que todo cantón nuevo que se capture (desde hoy en adelante) viene del catálogo oficial, no de texto libre arbitrario.

---

## El problema

Correos de Costa Rica aumentó todas sus tarifas y cobra por **rango de peso (kg) + zona (GAM/Resto) + tipo de carga**, pero el sistema modela el envío por Correos como **un solo número fijo** (`system_settings.correos_fee_crc`) que `generatePreBilling` suma sin mirar el peso. Fuente: tabla de tarifas compartida por el dueño (volante de Correos, 2026-07).

### Datos conocidos de la tabla de Correos

| Tipo de carga | Zona | Peso | Cobro al cliente ("nuestra tarifa") | Costo real (lo que cobra Correos) |
|---|---|---|---|---|
| Carga PYME | Resto | 0–0.99 kg | ₡1,400 | POR CONFIRMAR |
| Carga PYME | Resto | 1–1.99 kg | ₡1,400 | ₡5,648.94 |
| Carga PYME | GAM | 0–0.99 kg | ₡1,400 | POR CONFIRMAR |
| Carga PYME | GAM | 1–1.99 kg | ₡1,400 | ₡4,548.93 |
| Carga liviana | — | 3–9.99 kg | ₡2,400 | ₡4,500 |
| Carga pesada | GAM | 10–15 kg | ₡2,400 | ₡4,300 |
| Carga pesada | Resto | 10–15 kg | ₡2,400 | POR CONFIRMAR |

Huecos de la fuente (el volante dice "algunos de los aumentos"): falta el rango 2–2.99 kg y qué pasa arriba de 15 kg (~33 lb — alcanzable con órdenes consolidadas). **Resolución acordada: no son problema de diseño — el administrador los resuelve agregando/ajustando filas en la pantalla de tarifas cuando tenga el tarifario oficial completo.**

---

## Hallazgos clave (acotan el alcance)

1. **Lo que se cobra al cliente varía SOLO por rango de peso** (₡1,400 hasta ~2 kg, ₡2,400 de 3–15 kg). No depende de la zona. → La facturación al cliente no necesita zona ni direcciones normalizadas; ese es el cambio urgente y es chico.
2. **Lo que Correos cobra a Magastore (costo) varía por rango + zona GAM/Resto**, y ahí viven los "POR CONFIRMAR". Es dato de ganancia/analítica, nullable, no bloquea facturar.
3. **No existe precio por cantón.** La zona es binaria (GAM/Resto). El cantón solo clasifica la dirección vía un mapeo estático (~31 cantones GAM). No hay mantenimiento de precios por cantón.
4. **El tipo de carga (PYME/liviana/pesada) se deriva del peso** — no es una elección del operador.

---

## Decisiones acordadas

1. **Tabla generalizada `delivery_rates`** (no específica de Correos): `delivery_method`, `zone` (nullable), rango de peso, `fee_crc` (cobro al cliente), `cost_crc` (costo real, **nullable = "por confirmar"**), `is_active`. Tracopa y métodos futuros la reutilizan; mientras un método no tenga filas, usa su tarifa fija actual (`tracopa_fee_crc`) como fallback.
2. **Se guardan ambas tarifas por rango** (cobro y costo) para calcular ganancia/gasto del tramo local por orden — mismo patrón que el tramo Panamá→CR (`price_per_lb` vs `courier_rate_usd`).
3. **Conversión kg↔lb configurable** en la pantalla de tarifas ("1 lb = X kg"), auditada en `settings_history` como el resto. El sistema pesa en lb; Correos cobra por kg.
4. **Todo configurable por el administrador**: rangos, huecos y "por confirmar" se resuelven editando filas — sin reglas quemadas en código.
5. **Sin match, sin bloquear:**
   - Falta el **costo** (`cost_crc` NULL): la prefactura sale normal; ganancia de esa orden = "N/D" + evento WARNING en bitácora ("costo de Correos pendiente para este rango").
   - Falta la **tarifa al cliente** (ningún rango cubre el peso): el operador ingresa el monto manualmente → se guarda con marca de origen manual + evento en bitácora.
6. **Zona GAM/Resto derivada del cantón de la dirección de entrega DE LA ORDEN** (`consolidations.delivery_address_id`, existe desde script 009), con confirmación manual cuando no se pueda derivar.
7. **Direcciones estructuradas como prerequisito de la derivación**: provincia/cantón/distrito pasan de texto libre a dropdowns encadenados con dataset oficial de CR. Alcance: crear cliente, editar dirección, import masivo, y plan para datos viejos en texto libre.
8. **Snapshots intactos**: `pre_billing`/`billing` siguen guardando el monto resuelto (+ el costo nuevo). PDFs, listados, tracking y emails no cambian — facturas pasadas estables.
9. **Tracopa/Encomienda queda como está** (demostrativo). Futuro: desactivar métodos u ocultarlos si su tarifa es 0.

---

## Etapas propuestas

### ✅ Etapa 1 — Direcciones estructuradas (completada — ver Progreso arriba)
Dropdowns provincia→cantón→distrito (dataset oficial CR estático en el repo) en crear cliente, editar dirección e import. Estrategia para datos existentes en texto libre (normalización o zona "desconocida" con confirmación manual). Vale por sí sola como mejora de calidad de datos.

### ✅ Etapa 2 — Modelo de datos + CRUD de tarifas (completada — ver Progreso arriba)
Migración `delivery_rates` + campo de conversión kg/lb en `system_settings` (+ historial). Reemplazar el input fijo "Correos de Costa Rica" en `settings-container.tsx` por una tabla editable (alta/edición/activar-desactivar, ambas columnas de tarifa, `cost_crc` vacío permitido). **Pendiente todavía dentro del alcance original de esta etapa:** el mapeo estático cantón→GAM no se implementó — se dejó para la Etapa 3, ya que solo tiene sentido junto con el lookup real en `generatePreBilling` que lo va a consumir.

### ✅ Etapa 3 — Motor de cálculo (completada — ver Progreso arriba)
Lookup por rango en `generatePreBilling` (`logistics.repo.ts`) — **un solo punto**: la vía duplicada `generateBilling` fue eliminada en el cierre de facturación paralela (commit 289dc39). **Nota de alcance:** solo se resolvió `fee_crc`; el campo de costo (`cost_crc`/ganancia del tramo local) no se implementó en esta etapa por decisión explícita — queda para una etapa futura si se decide trackearlo.

### ✅ Etapa 4 — Método de envío en la orden (completada — ver Progreso arriba)
Alcance ampliado respecto al plan original: el método de envío se decide al crear la orden (junto con la dirección), no al generar el estimado. `consolidations.delivery_method` nuevo, editable desde el detalle de la orden. Zona GAM/Resto derivada visible junto a la dirección. **Fuera de alcance:** desglose de costo/ganancia del tramo local y override manual auditado del monto (ver nota de la Etapa 3).

### ⬜ Etapa 5 — Carga de datos y limpieza
Sembrar `delivery_rates` con el tarifario oficial completo de Correos (los "por confirmar" con `cost_crc = NULL`). Decidir destino de `correos_fee_crc` (fallback documentado o remover). Desglose en PDFs si aplica.

---

## Reanálisis post órdenes de envío v2 (2026-07-13)

El rediseño de órdenes (etapas 1-5) quedó completo en main y **simplificó este plan**:

- **`generateBilling` eliminado** (cierre de facturación paralela, 289dc39): el switch de tarifas `CORREOS_CR → correos_fee_crc` existe solo en `generatePreBilling`. Antes había que tocar 2 funciones duplicadas; ahora 1.
- **`consolidations.delivery_address_id`** (script 009): cada orden fija su dirección de entrega → ancla precisa para derivar zona GAM/Resto (mejor que "dirección default del cliente", que era la asunción original).
- **Selector de método de envío reubicado** a `shipment-order-detail.tsx:~482` + estado en `use-shipment-order-detail.ts`. El riesgo de conflicto que obligaba a esperar ya no existe.
- WhatsApp usa el método solo como etiqueta (`{{metodo_entrega}}`) — sin impacto en montos.
- Reabrir orden elimina prefactura no confirmada — compatible: el estimado se regenera con lookup fresco.

## Pendientes antes de implementar

1. **Tarifario oficial completo de Correos** (rango 2–2.99 kg, >15 kg, los "por confirmar") — no cambia el diseño, solo los datos a cargar en Etapa 5. El admin puede arrancar con los datos parciales de la tabla de arriba.
2. **Worktree `tarifas-correos-rangos` quedó sobre historia reescrita** (base = etapa 1 vieja, sin commits propios): al implementar, resetear su rama sobre el main actual o recrear el worktree — trivial, no hay nada que mergear.
