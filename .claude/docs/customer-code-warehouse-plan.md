# Plan: Rediseño de generación de `customer_code` por casillero/ruta

**Estado:** IMPLEMENTADO (2026-07-14, sin commit/push todavía). Las 5 etapas completas.

## Progreso de implementación (2026-07-14)

Preguntas abiertas resueltas con el dueño antes de implementar:
- **Catálogo de rutas**: solo **USA/AEREO** es real hoy (prefijo `MG-2453-C-`). Las otras 3 anticipadas en `MAILBOXES` (USA Marítimo, China, Colombia) quedan sin fila — se agregan cuando exista casillero real contratado.
- **Datos de prueba**: los clientes existentes (8, no 66 como decía una nota vieja) se **actualizaron** al nuevo formato en vez de borrarse.
- **Padding del contador**: 2 dígitos (`00`-`99`), sin tope real — sigue creciendo sin padding (`100`, `101`...) por encima de 99.
- **Contador inicial**: arranca en `0`.
- **`customers.customer_code`**: se **mantiene** como código principal/cache, sin tocar los 22 archivos que ya lo leen (listados, PDFs, tracking, pickers, búsquedas). La tabla nueva es la fuente de verdad para múltiples rutas por cliente a futuro.
- **Nombre de tabla**: `warehouse_routes` (inglés, consistente con el resto del esquema).

### Etapa 1 — Modelo de datos
- **Migración `scripts/013-warehouse-routes.sql`** aplicada en Neon: tabla `warehouse_routes` (`origin`, `package_type`, `code_prefix`, `current_counter`, datos de dirección del casillero nullable, `is_active`, UNIQUE `(origin, package_type)`) + tabla `customer_warehouse_codes` (`customer_id`, `warehouse_route_id`, `code`, `assigned_at`, UNIQUE `(warehouse_route_id, code)`).
- **`origin = 'USA'`** (no `'MIAMI'` como decía el borrador original del plan) — verificado contra el valor real ya usado en `courier_rates.origin` para no crear un segundo vocabulario del mismo dato.
- Ruta sembrada: `USA` / `AEREO` / `MG-2453-C-` / contador `0`.

### Etapa 2 — Generación atómica del código
- Nuevo repo `src/shared/api/repositories/warehouse-routes.repo.ts`: `incrementAndGetCode` (UPDATE atómico con RETURNING, no MAX()+1), `assignCodeToCustomer`, `getActiveRoute`, `advanceCounterIfHigher`, `getAll`.
- **`createCustomerWithAddresses`** (`customers.repo.ts`) reescrito con transacción explícita `BEGIN`/`COMMIT`/`ROLLBACK`: incrementa el contador de la ruta, genera el código formateado, inserta cliente+direcciones (mismo CTE de siempre) con ese código, y registra la fila en `customer_warehouse_codes`. Si algo falla después del incremento, el `ROLLBACK` también revierte el contador.
- **Nota de precisión sobre el plan original**: la fórmula vieja usaba `uuid_generate_v4()`, no `gen_random_uuid()` como decía una nota de otra sesión — verificado directamente en el código antes de reemplazarla.
- **8 clientes de prueba existentes actualizados** (script puntual, no versionado) a `MG-2453-C-01` .. `MG-2453-C-08`, en orden de `created_at`. El contador de la ruta quedó en `8`, listo para que el próximo alta reciba `MG-2453-C-09`.
- **`Customer.warehouse_codes`** (nuevo campo, tipo `CustomerWarehouseCodeDisplay[]`) expuesto por `getCustomerById` vía JOIN a `customer_warehouse_codes` + `warehouse_routes` (incluye código, origin, package_type, y los datos de dirección del casillero para el mensaje de bienvenida). `getPaginatedCustomers` no lo trae (no lo necesita el listado) — cae a `[]` por el mapeo defensivo existente.

### Etapa 3 — Import de clientes reales
- **`importCustomers`** (`customers.repo.ts`) reescrito con la misma transacción explícita: si la fila trae `customer_code` explícito (columna `codigo_magastore` del XLSX, comportamiento ya existente y preservado), se usa tal cual y **se avanza el contador de la ruta** si el código sigue el patrón del prefijo activo (`finalCode.startsWith(route.code_prefix)`) y el sufijo numérico es mayor al contador actual — para que la próxima alta manual no colisione. Si no trae código explícito, genera uno atómico igual que el alta individual.
- El manejo de errores externo (cédula/email duplicados) no se tocó — sigue clasificando por mensaje de Postgres igual que antes.

### Etapa 4 — UI del detalle de cliente
- **`MAILBOXES`/`MailboxCard`** (que sintetizaba 4 sufijos ficticios en el frontend sin datos reales en BD) reemplazado por `WAREHOUSE_ROUTE_DISPLAY`/`WarehouseCodeCard`: itera `customer.warehouse_codes` real, con estado vacío ("Este cliente no tiene casillero asignado") si el cliente no tiene ninguno. El mapa de presentación (`label`/`flag`/`color`) queda listo para 3 rutas (USA Aéreo, USA Marítimo, China) aunque solo la primera tenga datos reales hoy; cualquier ruta sin entrada en el mapa cae a un ícono genérico.

### Etapa 5 — Mensaje de bienvenida del casillero (WhatsApp)
- Nueva plantilla `WHATSAPP_TEMPLATE_WAREHOUSE_WELCOME` + `buildWarehouseWelcomeMessage()` en `whatsapp-templates.ts`, mismo mecanismo `interpolate()`/`buildWhatsAppUrl()` ya usado por las otras 2 plantillas.
- Botón de WhatsApp en cada `WarehouseCodeCard` del detalle de cliente — **acción manual**, no se dispara en el flujo de creación (confirmado en las decisiones ya tomadas).
- **Pendiente de datos reales**: `warehouse_routes.address_line/city/state/postal_code/contact_phone` quedaron `NULL` en la siembra — el mensaje muestra `[pendiente de configurar]` / `—` en esos campos hasta que se carguen los datos reales del casillero físico de Miami (decisión explícita: no bloquear la implementación esperando ese dato).

### Verificación
- `tsc --noEmit` limpio, `npm run lint` limpio en todas las etapas.
- Sin commit/push todavía.

---

## Plan original (pre-implementación)

---

## Re-análisis post-órdenes-de-envío (2026-07-13, commit 289dc39) — LISTO PARA ARRANCAR

El bloqueo original ("esperar Etapa 3 de órdenes de envío") está satisfecho: Etapas 1–4 + extras del rediseño de órdenes de envío están completadas y commiteadas (`d13b2d2` → `289dc39`). Solo queda pendiente su Etapa 5 con **alcance reducido** (módulo de plantillas editables + mejoras menores). **Este plan ya puede arrancar en su propio worktree.**

### Qué cambió respecto al relevamiento original

1. **La página de detalle de orden ya existe**: `/admin/shipment-orders/[uuid]` con `shipment-order-detail.tsx` + `use-shipment-order-detail.ts`. El nombre de archivo del PDF descargado (`estimado-<customerCode>-...pdf`) y el display del código en el detalle **se mudaron ahí**: `use-shipment-order-detail.ts:123,131` y `shipment-order-detail.tsx:144,248,278`. Las referencias viejas a `use-shipment-orders.ts:259,267` quedan obsoletas.
2. **Los filtros de búsqueda ILIKE siguen en los mismos 3 repos, líneas nuevas**: `consolidations.repo.ts:155,178`, `billing.repo.ts:43,60`, `logistics.repo.ts:361,377`. El patrón no cambió — el JOIN nuevo aplica igual.
3. **`MAILBOXES`/`MailboxCard` sigue intacto** en `customer-detail-container.tsx:5-37` (uso en `:253-256`, display del código en `:109`), a pesar del rediseño de paquetes en el detalle de cliente (extra post-Etapa 4). El plan de reemplazarlo sigue vigente tal cual.
4. **Los PDFs no cambiaron**: `billing-invoice.tsx:264`, `pre-billing-invoice.tsx:87,133`, `pre-billing-pdf.ts` — las referencias del relevamiento siguen válidas. Tampoco cambió la página `/tracking` ni el listado de clientes. `billing-container.tsx` fue reescrito pero sigue mostrando `customer_code` solo como display (`:55,243,299`).
5. **La fórmula de generación en `customers.repo.ts` no cambió** (solo se agregó un JOIN a consolidations en `getPackagesByCustomer`, irrelevante para este plan).
6. **Sinergia nueva disponible**: ya existe `src/shared/constants/whatsapp-templates.ts` (Etapa 4 de órdenes de envío) con `interpolate()`, `buildWhatsAppUrl()` y plantillas con placeholders `{{var}}`. El mensaje de bienvenida del casillero (sección 5 de este plan) debe implementarse como una plantilla más ahí — el mecanismo ya está resuelto. También existe `src/hooks/use-notify-packages-available.ts` como patrón de referencia para un botón WhatsApp con bitácora.
7. **Picker de registro de paquete**: filtro por código movido a `use-package-calculator.ts:68`; `use-customers.ts:32` sin cambios.
8. **Coordinación con Etapa 5 de órdenes de envío (pendiente)**: su alcance reducido tocaría `whatsapp-templates.ts` (plantillas editables), no `customer-detail-container.tsx` — riesgo de choque bajo. Si van en paralelo, la plantilla de bienvenida de casillero se suma después de (o coordinada con) esa migración.

**Sigue pendiente antes de tocar código:** reconciliar el catálogo real de rutas (las 4 en `MAILBOXES`: USA Aéreo, USA Marítimo, China, Colombia vs. las 2 mencionadas originalmente: Miami, China) — ver pregunta abierta #6.

---

## Contexto / problema actual

Hoy `customer_code` se genera en `customers.repo.ts:43` (y su equivalente en `importCustomers`, línea ~283) así:

```sql
'MG-' || UPPER(SUBSTRING(uuid_generate_v4()::text FROM 31)) || '-' || nextval(pg_get_serial_sequence('customers', 'customer_id'))
```

Esto produce un código pseudo-aleatorio (`MG-A1B2-<serial_id>`), no el patrón real que la empresa usa con su proveedor de reenvío:

```
MG-2453-C-<contador>
```

`2453` es un valor **fijo y opaco** (no se descompone ni se deriva, es simplemente el código de casillero que la empresa ya tiene contratado con el forwarder de Miami). No hay otra ruta activa hoy, pero a futuro habrá más (China marítimo, Miami marítimo), cada una con su propio prefijo fijo y su propio contador independiente — igual que hoy `courier_rates` ya modela múltiples rutas vía `origin` + `package_type`.

`customer_code` es hoy una columna única en `customers` (1 código por cliente). El requisito real es que el código identifique **la ruta/casillero**, no solo al cliente — un cliente que reciba de dos rutas a futuro necesitaría dos códigos.

---

## Decisiones ya tomadas (confirmadas con el usuario)

1. **El patrón es una constante por ruta**, no una fórmula derivada. No hace falta "entender" el significado de 2453, solo tratarlo como dato de configuración.
2. **Los 66 clientes actuales son de prueba y son descartables.** No hay que migrar/preservar compatibilidad retro con ellos. La base se puede limpiar antes de producción.
3. **El código es universal por cliente actualmente**, pero también debe poder identificar de qué ruta/origen viene un **paquete** — no es solo un dato de cliente, es un dato de logística.
4. **En producción, el administrador va a cargar clientes reales que ya tienen su código asignado** en su sistema actual (fuera de esta app). El import debe poder recibir ese código explícito, no generarlo — el import ya soporta esto parcialmente vía columna `codigo_magastore` en `use-import-customers.ts:57`.
5. **El mensaje de bienvenida del casillero (WhatsApp) NO es parte del flujo de creación de cliente.** Es una acción manual y separada: el administrador decide si copiar/enviar el mensaje, desde el detalle del cliente. No se dispara automáticamente al crear.
6. **Los datos del casillero (dirección física, ciudad, estado, código postal, teléfono, prefijo, contador) se modelan en una tabla nueva**, con mantenimiento propio a futuro — mismo espíritu que `courier_rates`, que ya modela "costo courier por ruta" (`origin` + `package_type`). Esta tabla nueva sería el registro paralelo de "casillero por ruta", relacionado pero no fusionado con `courier_rates`.
7. **Concurrencia no es un riesgo real hoy** (1–2 usuarios del sistema), pero el mecanismo de contador debe ser atómico igualmente (`UPDATE ... SET counter = counter + 1 RETURNING counter` en vez de `MAX()+1` en aplicación) porque es la forma correcta y no cuesta más esfuerzo implementarlo bien.
8. **Vale la pena adaptar el sistema ahora** para que agregar una ruta nueva a futuro (China marítimo, Miami marítimo) sea solo "agregar una fila de configuración", no un cambio de código.

---

## Diseño propuesto

### 1. Tabla nueva: `warehouse_routes` (nombre tentativo)

Modela cada combinación ruta/casillero con su prefijo fijo y contador:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial/uuid | PK |
| `origin` | text | Ej. `MIAMI`, `CHINA` — debe alinear con `courier_rates.origin` |
| `package_type` | text (enum `PackageType`) | `AEREO` \| `MARITIMO` — alinea con `courier_rates.package_type` |
| `code_prefix` | text | Constante fija, ej. `MG-2453-C-` |
| `current_counter` | integer | Se incrementa atómicamente en cada alta |
| `address_line` | text | Dirección física del casillero (para mensaje bienvenida) |
| `city` | text | Ej. `Doral` |
| `state` | text | Ej. `Florida` |
| `postal_code` | text | Ej. `33172-1615` |
| `contact_phone` | text | Ej. `+1 786-360-2816` |
| `is_active` | boolean | Para poder desactivar una ruta sin borrarla |
| `created_at` | timestamp | |

Nota: se usa `origin` + `package_type` como llave conceptual, igual que `courier_rates`, para que ambas tablas puedan cruzarse cuando se necesite (ej. "tarifa + casillero para esta ruta").

### 2. Relación cliente ↔ código de casillero

Dado que hoy solo hay una ruta activa (Miami aéreo) pero el modelo debe soportar múltiples rutas por cliente a futuro, dos opciones:

- **Opción A (mínima, recomendada para "ahora"):** mantener `customer_code` en `customers` como está, pero generarlo desde `warehouse_routes` (join a la única ruta activa por defecto). Cuando se active una segunda ruta, se migra este campo a una tabla de unión.
- **Opción B (completa, preparada para el futuro real):** crear tabla `customer_warehouse_codes` (`customer_id`, `warehouse_route_id`, `code`, `assigned_at`) — un cliente puede tener 0..N códigos, uno por ruta que use. `customers.customer_code` quedaría deprecado o se usaría solo como "código principal/default" para mostrar en listados.

Dado que el usuario indicó que vale la pena preparar el sistema para el futuro, **Opción B es la recomendada**, aunque implica más superficie de cambio (nueva tabla + ajuste de tipos + UI de detalle de cliente para listar códigos por ruta, similar a como hoy se listan direcciones).

### 3. Generación atómica del código

Reemplazar la expresión SQL actual por una función/CTE que:
1. Hace `UPDATE warehouse_routes SET current_counter = current_counter + 1 WHERE origin = $1 AND package_type = $2 RETURNING current_counter, code_prefix`.
2. Compone `code_prefix || contador` (definir si el contador lleva padding, ej. `00`, `01` — el ejemplo del usuario mostraba `MGA-2453-C-00`).
3. Inserta ese código en `customers.customer_code` (Opción A) o en `customer_warehouse_codes` (Opción B).

Esto reemplaza el `nextval(pg_get_serial_sequence(...))` actual por un contador propio de la tabla nueva, desacoplado del `customer_id` serial.

### 4. Import de clientes reales (producción)

- El import (`importCustomers` en `customers.repo.ts`) ya acepta `customer_code` explícito por fila (`meta.customer_code ?? <generado>`) — este comportamiento se mantiene.
- Falta decidir: cuando se importa un cliente con código explícito, ¿se debe también avanzar el `current_counter` de la ruta correspondiente para que no colisione con la próxima alta manual? Recomendado: sí, tomar el número más alto importado por ruta y dejar `current_counter` en ese valor al finalizar el import masivo.

### 5. Mensaje de bienvenida del casillero (feature separada, no bloqueante)

- Botón/acción manual en el detalle de cliente ("Copiar datos de casillero" / "Enviar por WhatsApp" tipo `wa.me/<numero>?text=...`).
- La plantilla del mensaje usa los datos de `warehouse_routes` (dirección, ciudad, estado, CP, teléfono) + `first_name`/`last_name`/`customer_code` del cliente.
- No se dispara en el flujo de creación — es una acción explícita y posterior del administrador.
- Se implementa después de que la tabla `warehouse_routes` y el código existan, ya que depende de esos datos.

---

## Impacto (archivos que este cambio tocaría, cuando se aplique)

| Capa | Archivo | Cambio |
|---|---|---|
| DB | Neon (sin migraciones versionadas en repo) | Crear tabla `warehouse_routes` (+ `customer_warehouse_codes` si Opción B); seed de la ruta Miami/Aéreo con prefijo `MG-2453-C-` |
| Types | `src/types/customer/customer.types.ts` | Nuevo tipo `WarehouseRoute`, ajuste de `Customer`/`CustomerInput` si se adopta Opción B |
| Types | `src/types/logistics/logistics.types.ts` | Posible referencia cruzada si se liga a `origin`/`package_type` existentes |
| Repo | `src/shared/api/repositories/customers.repo.ts` | Reemplazar la expresión SQL de generación de código (línea 43 y línea 283); nuevo método `getActiveWarehouseRoute` / `incrementRouteCounter` |
| Repo | nuevo `src/shared/api/repositories/warehouse-routes.repo.ts` (si se decide mantenimiento propio) | CRUD de rutas/casilleros |
| Service | `src/shared/api/services/customers.service.ts` | Orquestar la obtención de ruta + generación de código dentro de la creación de cliente |
| Import | `src/components/containers/customers/import/use-import-customers.ts` + `customers.repo.ts:importCustomers` | Confirmar comportamiento de avance del contador tras import masivo |
| UI | `src/components/containers/customers/customer-detail/customer-detail-container.tsx` | Mostrar código(s) de casillero por ruta; botón de mensaje de bienvenida (copiar/WhatsApp) |
| Docs | `CLAUDE.md` (tabla de entidades) | Agregar `warehouse_routes` a la tabla de "Main Entities" una vez implementado |

---

## Decisiones confirmadas (2026-07-13)

- **Modelo de datos: Opción B.** Se crea tabla de unión `customer_warehouse_codes` (`customer_id`, `warehouse_route_id`, `code`, `assigned_at`) desde el inicio. Un cliente puede tener un código por cada ruta que use. `customers.customer_code` queda deprecado o se usa como código principal/default para listados — a definir en implementación.
- **Formato del contador: con padding fijo.** Ej. `MG-2453-C-00`, `MG-2453-C-01`. Falta definir cuántos dígitos de padding (2 dígitos según el ejemplo del usuario, pero confirmar si soporta pasar de 99).

## Impacto en flujos existentes (relevado 2026-07-13)

Auditoría completa de todos los usos de `customer_code` en el repo. Este cambio **no es aislado** — toca 22 archivos en 6 dominios.

### Hallazgo clave: el problema ya se sintió y se parchó a mano

`src/components/containers/customers/customer-detail/customer-detail-container.tsx:4-37` ya tiene una constante `MAILBOXES` hardcodeada (`USA Aéreo` → sufijo `A`, `USA Marítimo` → `M`, `China` → `CH`, `Colombia` → `CO`) y un componente `MailboxCard` que arma `` `${customer.customer_code}-${suffix}` `` **en el frontend**, solo para mostrar/copiar, sin que exista dato real en BD por ruta. Es la prueba de que la necesidad de "un código por ruta" ya existe hoy y está resuelta con un invento visual — la tabla `customer_warehouse_codes` reemplaza esto con datos reales. **Este componente se reescribe** como parte del cambio (deja de sintetizar sufijos y lista los códigos reales por ruta desde la BD). Nota: las 4 rutas que ya anticipó el negocio (USA Aéreo, USA Marítimo, China, Colombia) no coinciden 1:1 con las 2 mencionadas en este plan (Miami, China) — hay que reconciliar el catálogo real de rutas antes de implementar.

### `customer_code` usado como filtro de búsqueda SQL (no solo display)

Tres repositorios hacen `... OR c.customer_code ILIKE ${searchTerm}` contra `customers.customer_code` directamente:
- `src/shared/api/repositories/logistics.repo.ts:330,336,352` — búsqueda de paquetes (admin)
- `src/shared/api/repositories/consolidations.repo.ts:110,119,126,138,166,198` — búsqueda de órdenes de envío
- `src/shared/api/repositories/billing.repo.ts:25,42,59,80,113,127` — búsqueda de facturación

Si el código pasa a vivir en `customer_warehouse_codes` (Opción B), estas tres queries necesitan un `JOIN` adicional para poder seguir buscando por código — no alcanza con cambiar la tabla origen.

### Se imprime en documentos oficiales (PDFs)

- `src/components/pdf/billing-invoice.tsx:264` y `src/components/pdf/pre-billing-invoice.tsx:87,133` — imprimen `customer_code` como "N.º de casillero" en la cabecera de ambos PDFs (factura y pre-factura/estimado).
- `src/pages/api/billing/pre-billing-pdf.ts:22,35,41` — arma los datos del PDF con ese campo.

Con un código por ruta, hay que decidir **cuál código mostrar** en la factura: el de la ruta real del paquete facturado, no un "código principal" arbitrario. Esto requiere que la factura sepa la ruta del paquete/orden, dato que hoy no se propaga explícitamente en esa dirección.

### Página pública `/tracking`

- `src/pages/tracking/index.tsx:28,204-206` — muestra `customer_code` bajo el nombre del cliente. **No es el lookup key** (la búsqueda es por `tracking_number`), así que el riesgo es bajo, pero igual hay que decidir qué código mostrar si el cliente tiene varios.

### Nombre de archivo de PDF descargado

- `src/components/containers/shipment-orders/use-shipment-orders.ts:259,267` — el PDF de pre-factura se descarga con nombre `estimado-<customerCode>-<uuid>.pdf`. Sigue funcionando igual siempre que se elija un código válido para pasar a esa función.

### Pickers de cliente (client-side filter, bajo riesgo)

Tres lugares filtran una lista de clientes ya cargada en memoria por `customer_code` con `.includes()`:
- `src/components/containers/logistics/use-package-calculator.ts:66` (registro de paquete)
- `src/components/containers/shipment-orders/use-shipment-orders.ts:104` (armar orden de envío)
- `src/components/containers/customers/list-customers/use-customers.ts:32` (listado principal)

Si `customer_code` deja de venir en el objeto `Customer` tal cual, estos tres necesitan ajustarse para leer el código desde la nueva estructura (o seguir usando un "código principal" de conveniencia).

### Confirmado que NO afecta

- **Emails** (`src/lib/email-templates.ts`) — no usan `customer_code` en ninguna plantilla.
- **Cache keys de React Query** — las keys (`['customers']`, `['customers', 'dropdown']`) no incluyen el código, así que no hay invalidación que ajustar por este motivo.
- **Export a Excel/CSV** — no existe una feature de export que lo use; solo el **import** XLSX lo consume (columna opcional `codigo_magastore`, ya cubierto en la sección de import de este plan).

### Import ya soporta código explícito (confirmado, sin cambios de comportamiento esperados)

`checkCustomerCodeExists` (`customers.repo.ts:211-214`) valida unicidad contra `customers.customer_code` hoy. Con Opción B, esta validación de unicidad se movería a `customer_warehouse_codes` (único por ruta, no global) — un mismo código no debería repetirse dentro de la misma ruta, pero conceptualmente ya no es "único en toda la tabla customers".

## Alcance real del cambio (actualizado tras el relevamiento)

Dado el impacto medido arriba, este cambio deja de ser "solo tocar la fórmula SQL de generación" y pasa a ser un cambio estructural de mediano alcance:
- 3 queries de búsqueda con nuevos JOINs
- 2 PDFs que necesitan decidir qué código imprimir según contexto (ruta del paquete/orden)
- 1 componente de UI que se reescribe completo (`MailboxCard`/`MAILBOXES`)
- 3 pickers de cliente que necesitan ajuste menor
- Reconciliar el catálogo de rutas ya anticipado en la UI (4 rutas) contra el propuesto en este plan (2 rutas)

## Preguntas abiertas para cuando se aplique el cambio

1. **Dígitos de padding del contador:** ¿fijo en 2 (`00`–`99`) con reglas para cuando supere 99, o se define con más margen desde el inicio (ej. 3 dígitos)?
2. **¿Se limpia la BD de los 66 clientes de prueba antes de aplicar este cambio, o conviven códigos viejos y nuevos hasta el reset previo a producción?**
3. **Nombre final de la tabla/entidad** (`warehouse_routes` es tentativo — podría alinearse mejor con el vocabulario del negocio, ej. `casilleros`).
4. **¿El `current_counter` arranca en 0 o en 1 para la ruta Miami/Aéreo?**
5. **Migración de `customers.customer_code` existente:** ¿se elimina la columna una vez migrado a `customer_warehouse_codes`, o se mantiene como campo derivado/cache para no tocar todos los lugares que hoy leen `customer.customer_code` directamente (listados, PDFs de facturación, tracking)?
6. **Catálogo real de rutas:** reconciliar las 4 rutas ya anticipadas en `MAILBOXES` (USA Aéreo, USA Marítimo, China, Colombia) contra las 2 mencionadas originalmente por el usuario (Miami, China) — ¿cuáles son realmente activas/planeadas y con qué prefijo cada una?
