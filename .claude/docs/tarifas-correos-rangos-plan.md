# Tarifas de envío por Correos CR — rangos configurables (análisis y plan)

**Estado: EN IMPLEMENTACIÓN — Etapa 1 completada.** Decisiones acordadas con el dueño de Magastore.
Última actualización: 2026-07-13 (Etapa 1 — Direcciones estructuradas — completada, sin commit/push todavía).

## Progreso

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

### ⬜ Etapa 1 — Direcciones estructuradas
Dropdowns provincia→cantón→distrito (dataset oficial CR estático en el repo) en crear cliente, editar dirección e import. Estrategia para datos existentes en texto libre (normalización o zona "desconocida" con confirmación manual). Vale por sí sola como mejora de calidad de datos.

### ⬜ Etapa 2 — Modelo de datos + CRUD de tarifas
Migración `delivery_rates` + campo de conversión kg/lb en `system_settings` (+ historial). Reemplazar el input fijo "Correos de Costa Rica" en `settings-container.tsx` por una tabla editable (alta/edición/activar-desactivar, ambas columnas de tarifa, `cost_crc` vacío permitido). Mapeo estático cantón→GAM.

### ⬜ Etapa 3 — Motor de cálculo
Lookup por rango en `generatePreBilling` (`logistics.repo.ts`) — **un solo punto**: la vía duplicada `generateBilling` fue eliminada en el cierre de facturación paralela (commit 289dc39). Cuidados:
- `generatePreBilling` ahora auto-cierra la orden (`ABIERTO → CERRADO`) en la misma transacción y bloquea en `DESPACHADO`/`ENTREGADO` — preservar intacto.
- El campo nuevo de costo debe copiarse también en `confirmPreBilling` hacia `billing` (copia snapshot, no recalcula).
- Fallback al escalar fijo si el método no tiene filas en `delivery_rates`.
- Lógica "sin match" del punto 5 de decisiones.

### ⬜ Etapa 4 — UI de prefactura
En `shipment-order-detail.tsx` / `use-shipment-order-detail.ts` (la página `/admin/shipment-orders/[uuid]` — el selector de método ya vive ahí, no en el modal viejo): desglose fee/costo/ganancia del tramo local, override manual auditado, y confirmación/corrección de zona junto a la card de dirección de entrega que ya existe.

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
