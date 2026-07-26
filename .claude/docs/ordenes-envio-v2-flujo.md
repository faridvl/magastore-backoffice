# Rediseño Flujo Órdenes de Envío v2 — Paradigma Paquete-Céntrico

**Estado: COMPLETO — Etapas 1–4 completadas y commiteadas.** Documento de decisiones acordadas con el dueño de Magastore.
Última actualización: 2026-07-25. No hay Etapa 5 de código — el encabezado anterior quedó desactualizado; todo lo previsto para ella se resolvió como "Extras post-Etapa 3/4" (ver Etapa 4, línea ~94). Todo commiteado hasta `289dc39` (más `9406650`, `fa7e0a9`, `4450498` de trabajo relacionado posterior).

**Único pendiente restante, no de código:** el texto exacto de la Plantilla 2 de WhatsApp ("Enviar prefactura", ver Etapa 4) sigue siendo un borrador — falta que el dueño lo apruebe y decida si agrega datos de pago (SINPE/cuenta).

## Progreso

### ✅ Etapa 1 — Backend quick wins (COMPLETADA 2026-07-13, commit d13b2d2)

- Migración `scripts/008-shipment-orders-v2.sql` aplicada en Neon: `packages.store_name`, `pre_billing.notified_at`, índice único `packages_tracking_number_key` (verificado sin duplicados previos).
- `ConsolidationStatus` (`logistics.types.ts`) ahora incluye `DESPACHADO`. El CHECK constraint de `consolidations.status` en DB ya lo soportaba de antes.
- `STATUS_TRANSITIONS` en `consolidations.service.ts`: `ABIERTO → CERRADO → DESPACHADO → ENTREGADO`.
- Candado "una orden ABIERTO por cliente" eliminado (`createConsolidation`, reabrir). Endpoint `check-open` y UI de warning removidos del modal de creación.
- Validación de tracking duplicado: chequeo previo en `logistics.service.ts` (`existsByTrackingNumber`) + fallback al código de error `23505` de Postgres (el índice único es el candado real).
- Endpoint "quitar paquete de orden": `DELETE /api/consolidations` con `{ action: 'unassign-package', packageUuid }`. Bloqueado si la orden no está ABIERTO o ya tiene factura. Elimina la prefactura asociada (snapshot obsoleto por cambio de peso) — decisión tomada: eliminar, no dejarla desactualizada.
- Filtro `PENDIENTES` (ABIERTO + CERRADO) en el listado de órdenes — ahora es el filtro default al entrar a `/admin/shipment-orders`, cumpliendo el pedido del dueño.
- Campo `store_name` (Tienda/Proveedor) agregado al formulario de registro de paquete, tipos, repo y query de disponibles/detalle de orden.
- Bug corregido de paso: el botón "Marcar como despachado" en la lista de órdenes llamaba a `ConsolidationStatus.ENTREGADO` en vez de `DESPACHADO` (arrastre de cuando el estado no existía). Ya corregido en `use-shipment-orders.ts`.
- UI: `STATUS_LABELS`/`STATUS_COLORS`/`NEXT_STATUS_LABEL`/`STATUS_FILTERS` actualizados con 4 estados; botón "Quitar paquete" (ícono X) visible en el detalle de la orden cuando `status === ABIERTO && !hasBilling`.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio (solo 2 warnings preexistentes de a11y en PDFs, no relacionados).
- **Nota de arquitectura:** la capa de dominio conserva el nombre `consolidations` (tabla, repo, service) intencionalmente — solo la UI/hooks/rutas usan "shipment-orders". Ver commit fc2c1e4.

### ✅ Etapa 2 — Rediseño listado `/admin/logistics` (COMPLETADA 2026-07-13, commit 7d7e193)

- Chips "En Panamá / En Trámite / Todos" eliminados de la toolbar. Reemplazados por `Sin orden` (default al entrar en modo Activos) / `Con orden`, derivados de `consolidation_id IS NULL/IS NOT NULL`. La columna "Estado" de la tabla se mantiene igual (PANAMA/EN_TRAMITE/ENTREGADO por fila) — solo se quitó el filtro de arriba.
- `getPaginatedPackages` (`logistics.repo.ts`) extendido con `consolidationFilter` y `customerUuid`, con `LEFT JOIN consolidations` para exponer `consolidation_uuid`/`consolidation_status` por paquete. En la vista "Con orden" aparece una columna "Orden" con badge clickeable que lleva al detalle de esa orden.
- Filtro por cliente nuevo (dropdown simple con `useCustomersQuery`, que ya trae todos los clientes en una sola llamada sin paginación).
- Selección múltiple de paquetes en la vista "Sin orden": checkbox por fila (tabla) y por card (mobile). Candado de mismo-cliente aplicado en dos capas — **visual** (checkbox `disabled` + fila/card atenuada con `opacity-40` para los paquetes de otro cliente distinto al ya seleccionado, tanto en tabla/tablet como en cards mobile) y **defensivo** (`handleToggleSelect` en el hook bloquea igual con toast si se intentara forzar).
- **Selección persiste entre páginas** (comportamiento confirmado con el dueño 2026-07-13): cambiar de página con "Siguiente/Anterior" NO limpia `selectedUuids`. La barra flotante de selección indica cuántos de los seleccionados no están en la página visible actual, ej. "5 paquetes seleccionados (3 en otras páginas)", para que no parezca que se perdieron. Sí se limpia la selección al cambiar de viewMode (Activos/Historial), de filtro Sin orden/Con orden, o de cliente — esos cambian el universo de paquetes visibles de raíz.
- **Endpoint atómico nuevo** `createConsolidationWithPackages` (`consolidations.repo.ts`/`.service.ts`): una sola transacción crea la orden, valida mismo-cliente, asigna paquetes y recalcula peso. `POST /consolidations` acepta `packageUuids` opcional sin romper el flujo simple existente (crear orden vacía, usado en el modal viejo de `/admin/shipment-orders`).
- Botón "Crear orden de envío" en la barra flotante de selección → crea la orden y redirige a `/admin/shipment-orders?uuid=<uuid>`. `use-shipment-orders.ts` ahora lee `router.query.uuid` al montar (`router.isReady`) para auto-abrir el panel de detalle — es un puente hasta que exista la página dedicada `/admin/shipment-orders/[uuid]` en Etapa 3.
- Botón "Notificar por WhatsApp" en la barra de selección: **NO implementado a propósito** — es Etapa 4. El punto de extensión natural es esa misma barra flotante (`logistics-container.tsx`, junto al botón "Crear orden de envío").
- **Fix UX post-entrega (2026-07-13):** en modo selección (Sin orden), click en la fila/card ya NO navega al detalle del paquete — solo marca/desmarca el checkbox. Esto se centralizó en `handleRowClick(pkg, selectionModeActive)` dentro de `use-logistics.tsx`, usado tanto por `onRowClick` de `NewTable` como por el `onClick` de las cards mobile. Para ver el detalle a propósito, el tracking number es ahora un botón/link explícito con `stopPropagation` (en la columna "Tracking / ID" de la tabla y en la card mobile cuando `showSelection` está activo).
- **Persistencia de selección en `sessionStorage`** (clave `logistics:selectedUuids`, ver `use-logistics.tsx`): sobrevive a un "back" del navegador tras entrar al detalle de un paquete, o a un refresh accidental de la pestaña. Se limpia sola cuando `selectedUuids` queda vacío (al limpiar selección o al crear la orden exitosamente). Si se toca este hook a futuro, tener presente que la lectura inicial usa lazy `useState(readStoredSelection)` — un SSR/hidratación mismatch no aplica aquí porque el componente es client-only vía `authorizeServerSidePage`, pero si se reutiliza este patrón en una página con SSR real hay que revisarlo.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio (solo los 2 warnings preexistentes de a11y en PDFs).

### ✅ Etapa 3 — Página de detalle de orden + simplificación del flujo de cierre (COMPLETADA 2026-07-13, commit cb15d59)

- Nueva ruta `/admin/shipment-orders/[uuid]` como página real (patrón `/admin/logistics/[id]`), reemplazando el panel/modal `DetailModal` controlado por `selectedUuid`. Container + hook dedicados en `src/components/containers/shipment-orders/shipment-order-detail/`.
- Movido a la página nueva: card prefactura/factura (generar, recalcular, confirmar, descargar PDF), avance de estado (despachar/entregar/reabrir), quitar-paquete. `/admin/shipment-orders` (lista) recortado: sin botón "Nueva Orden de Envío" ni modal de elegir cliente, sin modal "Asignar Paquetes" (la creación ya vive en logística desde Etapa 2). `use-shipment-orders.ts` quedó solo con estado de lista; el efecto de lectura de `router.query.uuid` se eliminó junto con `selectedUuid`.
- Redirects actualizados: `use-logistics.tsx` (post-creación) y `logistics-container.tsx` (badge "Orden" en vista Con orden) apuntan a `/admin/shipment-orders/<uuid>` en vez de `?uuid=`.
- **Cambio de flujo acordado con el dueño (fricción detectada: "cerrar" + "generar prefactura" eran 2 clicks separados sin razón real, porque `generatePreBilling` nunca validó `status`):** generar el estimado ahora **auto-cierra la orden `ABIERTO → CERRADO`** en la misma transacción (`LogisticsRepository.generatePreBilling`, `logistics.repo.ts`). Se elimina el botón manual "Cerrar orden de envío"; `STATUS_TRANSITIONS['ABIERTO']` pasa a `null` en `consolidations.service.ts`. La generación de prefactura bloquea si la orden ya está `DESPACHADO`/`ENTREGADO`.
- Flujo resultante: **Generar Estimado (auto: CERRADO) → cliente paga → Marcar como pagado → Marcar como Despachado → Marcar como Entregado.**
- **Reabrir seguro:** al reabrir (`CERRADO → ABIERTO`, `ConsolidationsRepository.updateConsolidationStatus`), si existe una prefactura sin confirmar se elimina automáticamente (quedó calculada con el peso/paquetes de ese momento); si ya existe factura o la prefactura está confirmada, el reabrir se bloquea con error — evita invalidar un snapshot que el cliente ya aceptó o pagó.
- **"Marcar como pagado"** agregado al detalle de la orden (además de `/admin/billing`), reutilizando `useMarkPaidMutation` sin cambios.
- **Aviso de vigencia del estimado:** la card de prefactura pendiente de confirmación muestra un texto explicando que el monto se calculó con las tarifas vigentes al generarlo y que hay que "Recalcular" si las tarifas cambiaron y el PDF ya se compartió con el cliente — el PDF de prefactura no se cachea, se renderiza en vivo desde `pre_billing` en cada descarga (`pages/api/billing/pre-billing-pdf.ts`), así que nunca queda desactualizado por caché, pero sí puede quedar desactualizado el PDF ya enviado si no se recalcula antes de reenviarlo.
- Limpieza de código huérfano causado por el recorte del listado: eliminados `use-create-shipment-order-mutation.ts`, `use-assign-packages-mutation.ts`, `use-available-packages-query.ts` y su import residual en `use-unassign-package-mutation.ts`.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio (solo los 2 warnings preexistentes de a11y en PDFs).

### ✅ Extra post-Etapa 3 — Dirección de entrega por orden (COMPLETADO 2026-07-13, commit 9406650)

Hallazgo durante revisión del detalle de orden: el sistema no mostraba a qué dirección se entrega el envío, y `confirmPreBilling` tomaba la dirección `is_default` del cliente **en el momento de confirmar** — no necesariamente la que el cliente pidió para esa orden específica.

- **Migración `scripts/009-consolidation-delivery-address.sql`** aplicada en Neon: `consolidations.delivery_address_id` (FK a `customer_addresses`, nullable, `ON DELETE SET NULL`).
- **Al crear la orden** (`createConsolidationWithPackages`): si el cliente tiene una sola dirección registrada, se asigna automáticamente sin preguntar. Si tiene 2+, el frontend (`use-logistics.tsx` → `handleCreateOrder`) consulta `/api/customers/[id]/addresses` antes de crear y abre un modal para que el operador elija — la creación queda bloqueada (`deliveryAddressId` requerido) hasta que se elige una.
- **Editable solo mientras `ABIERTO`**: nuevo endpoint `PATCH /api/consolidations` con `action: 'set-delivery-address'` (`ConsolidationsRepository.setDeliveryAddress`) — bloquea el cambio si la orden ya está `CERRADO`+ (coherente con que generar el estimado es la "foto final" del flujo). Card "Dirección de entrega" + botón "Cambiar" en la página de detalle, con el mismo selector reutilizado.
- **`getConsolidationDetail`** extendido con JOIN a `customer_addresses` — expone `delivery_address_id`, `delivery_address_label`, `delivery_exact_address`, `delivery_district`, `delivery_canton`, `delivery_province` en `ConsolidationDetail`.
- **`confirmPreBilling`** (`logistics.repo.ts`) ahora usa `consolidation.delivery_address_id` para el snapshot de `billing.delivery_address_snapshot`, con fallback a la dirección `is_default` del cliente solo si la orden no tiene ninguna asignada (no debería pasar en órdenes nuevas, pero cubre órdenes creadas antes de este cambio).
- Tipos: `CreateConsolidationWithPackagesInput.deliveryAddressId?` y los 5 campos `delivery_*` nuevos en `ConsolidationDetail`.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.

### ✅ Extra post-Etapa 3 (2) — Copy y columnas de pago (COMPLETADO 2026-07-13, commit 9406650)

Feedback del dueño tras probar el flujo: el `status` logístico (ABIERTO/CERRADO/DESPACHADO/ENTREGADO) no dice nada sobre si el cliente ya pagó, y el botón "Confirmar y Facturar" sonaba como si el pago ya hubiera ocurrido cuando en realidad solo emite la factura (pendiente de pago).

- **Copy corregido:** el botón naranja en el detalle de la orden pasa de "Confirmar y Facturar" a **"Confirmar Estimado"** (`shipment-order-detail.tsx`) — deja claro que ese paso emite la factura oficial a partir del estimado ya aceptado, sin insinuar que ya se cobró.
- **Listado `/admin/shipment-orders` — 2 columnas nuevas** (adelantadas de lo que iba a ser parte del pipeline de cobro de Etapa 4, porque comparten el mismo JOIN):
  - **Monto:** muestra el monto de la factura si ya existe; si no, el de la prefactura; si no hay ninguno, `—`. Etiqueta chica indica si es "Factura" o "Estimado".
  - **Pago:** badge derivado — `Sin estimado` (no hay pre_billing ni billing) / `Pendiente de pago` (hay billing, `is_paid = false`) / `Pagado` (`is_paid = true`).
  - `getPaginatedConsolidations` (`consolidations.repo.ts`) extendido con `LEFT JOIN pre_billing` + `LEFT JOIN billing` (relación 1:1 por `consolidation_id`, sin fan-out con el `COUNT(p.id)` de paquetes).
  - Tipo `ConsolidationListItem` extendido con `payment_status: ConsolidationPaymentStatus`, `display_amount_crc`, `is_billing_amount`.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.
- **Resuelto en el extra (3) siguiente:** agregar/quitar paquetes desde el detalle de la orden ya está implementado — ver abajo.

### ✅ Extra post-Etapa 3 (3) — Filtros por pago, agregar/quitar paquetes, limpieza de datos de prueba (COMPLETADO 2026-07-13, commit 9406650)

- **Filtros del listado `/admin/shipment-orders` reemplazados**: de status logístico (Pendientes/Abiertos/Cerrados/Despachados/Entregados/Todos) a filtros por pago — **Pendientes de pago / Pagadas / Entregadas / Todas** (`ShipmentOrderPaymentFilter` enum en `use-shipment-orders.ts`). `getPaginatedConsolidations` reescrito para filtrar por `billing.is_paid`/`consolidations.status = ENTREGADO` en vez de por `status` logístico crudo. **Nota:** el alcance de "Pendientes de pago" se amplió después (ver Extra (4) abajo) para incluir también las órdenes sin factura generada.
- **`ConsolidationPaymentStatus` y `ShipmentOrderPaymentFilter` convertidos a `enum`** (antes `type` unions/string literals) — consistente con `ConsolidationStatus`/`PackageStatus`.
- **No se puede quitar el único paquete de una orden** (`unassignPackage` en `consolidations.service.ts`): si `package_count <= 1`, error explícito indicando usar "Eliminar orden" en su lugar. UI: botón "Quitar" oculto cuando queda 1 paquete, con nota explicativa.
- **Agregar paquetes desde el detalle de la orden** (reintroducido, existía antes de Etapa 3 y se había quitado): nuevo método `ConsolidationsRepository.assignPackages` — valida mismo cliente + paquete sin orden previa, recalcula `total_weight_lb`, invalida la prefactura si existía (mismo criterio que quitar). Endpoint `PATCH /api/consolidations` con `action: 'assign-packages'`. Botón "Agregar paquetes" + modal en la página de detalle, visible solo si `status === ABIERTO`.
- **Copy corregido**: el botón naranja "Confirmar y Facturar" en el detalle de la orden pasa a **"Confirmar Estimado"** — el paso emite la factura pendiente de pago, no confirma que ya se cobró.
- **Limpieza de datos de prueba en Neon** (ambiente sin producción activa): eliminadas 3 órdenes que quedaron en estados imposibles con el flujo actual (factura sin prefactura previa, CERRADO sin ningún estimado, DESPACHADO sin haber facturado nunca) — paquetes liberados, `billing`/`pre_billing` asociados eliminados. Quedan 5 órdenes válidas.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.

### ✅ Extra post-Etapa 3 (4) — Reabrir con factura sin pagar + 3 chips de pago (COMPLETADO 2026-07-13, commit 9406650)

Pedido del dueño: una orden "Pendiente de pago" (ya facturada, sin cobrar) no se podía reabrir para agregar/quitar paquetes — el guard de la Etapa 3 bloqueaba el reabrir en cuanto existía `billing`, sin importar si estaba pagada o no.

- **`updateConsolidationStatus`** (`consolidations.repo.ts`): reabrir ahora solo se bloquea si la factura ya está **pagada** (`billing.is_paid = true`). Si existe factura sin pagar, se elimina (junto con la prefactura) al reabrir — mismo criterio de snapshot-obsoleto ya usado en el resto del flujo. UI: botón "Volver a abrir" oculto si `isPaid`; el texto del modal de confirmación distingue si se perderá una factura o solo un estimado.
- **Filtro "Pendientes de pago" ampliado**: antes solo incluía órdenes con `billing` sin pagar; ahora agrupa **todo lo que el operador debe seguir moviendo hacia el cobro** — `ABIERTO` sin nada generado, `CERRADO` con estimado sin confirmar, `CERRADO` con factura sin pagar (excluye `ENTREGADO`). Esto es necesario para que una orden recién reabierta (que vuelve a `ABIERTO` sin estimado) no desaparezca del filtro default.
- **`ConsolidationPaymentStatus` ahora tiene 4 valores** (antes 3): `SIN_ESTIMADO` (nada generado) / `ESTIMADO_PENDIENTE` (prefactura sin confirmar, nuevo) / `PENDIENTE_PAGO` (factura sin pagar) / `PAGADO`. El chip "Pago" en el listado ahora distingue las 3 etapas previas al pago, no solo 2.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.

### ✅ Etapa 4 — WhatsApp: plantillas, botones, bitácora, filtro pipeline de cobro (COMPLETADA 2026-07-13, commit 9406650)

- **Módulo de plantillas** `src/shared/constants/whatsapp-templates.ts` (nuevo, no existía nada similar en el proyecto): `interpolate()`, `buildWhatsAppUrl(phone, message)` (limpia el teléfono guardado en formato `+506 XXXX-XXXX`, antepone `506` si falta, arma el link `wa.me`), constantes `WHATSAPP_TEMPLATE_PACKAGES_AVAILABLE`/`WHATSAPP_TEMPLATE_PREBILLING_READY` con los textos ya acordados, y builders `buildPackagesAvailableMessage`/`buildPreBillingReadyMessage` que arman el mensaje final a partir de los datos reales.
- **Hook compartido** `src/hooks/use-notify-packages-available.ts`: dado un cliente, consulta `GET /consolidations?availablePackages=<id>` (endpoint ya existente de Etapa 2/3), arma el mensaje de plantilla 1 con TODOS los paquetes sin orden del cliente (no solo un subconjunto — regla ya acordada), abre `wa.me`, y llama a `POST /logistics?action=log-notified` para dejar bitácora. Reutilizado en las 3 ubicaciones de la plantilla 1.
- **Bitácora:** nuevo método `LogisticsRepository.logPackagesNotified` (`logistics.repo.ts`) — inserta un evento `INFO` "Cliente notificado de disponibilidad por WhatsApp" en `package_events` **por cada paquete** incluido en el mensaje (no un evento genérico). Expuesto vía `LogisticsService.logPackagesNotified` y `POST /api/logistics?action=log-notified`.
- **Ubicación 1 — `/admin/logistics`:** botón "Notificar por WhatsApp" en la barra flotante de selección, junto a "Crear orden de envío" (`logistics-container.tsx`/`use-logistics.tsx`). Aparece con la selección activa (para identificar el cliente), pero el mensaje siempre incluye todos los paquetes sin orden de ese cliente, no solo los tildados.
- **Ubicación 2 — toast post-registro de paquete:** `use-package-calculator.ts` → `handleSave` ahora captura `selectedCustomer` antes de resetear el formulario y agrega un botón de acción a `toast.success('Paquete registrado', { action: {...} })` (Sonner) que dispara la notificación — no se rediseñó la pantalla, se aprovechó el botón de acción nativo del toast.
- **Ubicación 3 — detalle de cliente:** botón "WhatsApp" junto al bloque "Paquetes Activos" en `customer-detail-container.tsx`/`use-customer-detail.ts`. **Nota importante:** este botón usa el hook compartido (que consulta paquetes *sin orden*), no la lista `activePackages` que ya existía ahí (esa mezcla paquetes sin orden y paquetes ya asignados a una orden en curso — no sirve para la plantilla 1).
- **Split pendientes/histórico en detalle de cliente:** ya existía antes de esta etapa (`activePackages` vs `historyPackages`/`filteredHistory` en `use-customer-detail.ts`, con UI ya separada en dos bloques) — la doc original decía que faltaba, pero al revisar el código ya estaba resuelto. Etapa 5 queda reducida a temas que no sean ese split.
- **Plantilla 2 — botón "Enviar prefactura"** en el detalle de la orden (`shipment-order-detail.tsx`): agregado junto al botón "PDF" en ambas variantes de la card (estimado confirmado y estimado pendiente de confirmación). Label cambia a "Reenviar" si `pre_billing_notified_at` ya existe, con tooltip mostrando la fecha.
- **`notified_at`:** nuevo método `ConsolidationsRepository.markPreBillingNotified` (`consolidations.repo.ts`) — estampa `pre_billing.notified_at = NOW()`. Expuesto vía `ConsolidationsService.markPreBillingNotified` y `PATCH /api/consolidations` con `action: 'notify-pre-billing'`. Se llama automáticamente al hacer click en "WhatsApp"/"Reenviar" en el detalle de la orden.
- **Filtro "Sin notificar"** agregado a `ShipmentOrderPaymentFilter` (ahora 5 valores: `SIN_NOTIFICAR`, `PENDIENTE_PAGO`, `PAGADO`, `ENTREGADO`, `ALL`) — derivado de `pre_billing.uuid IS NOT NULL AND pre_billing.notified_at IS NULL`. `getPaginatedConsolidations` extendido con el JOIN a `pre_billing` también en la query de `COUNT(*)` (antes solo estaba en la query principal).
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.
- **Pendiente de aprobación del dueño (no implementado, solo el mecanismo está listo):** el texto exacto de la Plantilla 2 sigue siendo el borrador ya redactado — falta que el dueño lo apruebe y decida si agrega datos de pago (SINPE/cuenta).

### ✅ Extra post-Etapa 4 — Rediseño de paquetes en detalle de cliente (COMPLETADO 2026-07-13, commit 289dc39)

Feedback del dueño: el bloque único "Paquetes Activos" mezclaba paquetes sin orden con paquetes ya asignados a una orden en curso, sin mostrar a cuál orden pertenecían — y no permitía seleccionar/crear una orden desde ahí (a diferencia de `/admin/logistics`).

- **Backend:** `getPackagesByCustomer` (`customers.repo.ts`) extendido con `LEFT JOIN consolidations` — expone `uuid`, `consolidation_uuid`, `consolidation_status` por paquete (antes no traía ni el `uuid` del paquete). Tipo `CustomerPackage` actualizado con los mismos campos.
- **Bloque único dividido en dos**, ambos derivados client-side de `activePackages` (status != ENTREGADO) filtrando por `consolidation_uuid`:
  - **"Paquetes Sin Orden"**: seleccionables (checkbox), con barra de selección "Crear orden de envío" que aparece al tildar 1+. Reutiliza el mismo endpoint atómico de la Etapa 2 (`createConsolidationWithPackages`) y el mismo flujo de selección de dirección de entrega (modal si el cliente tiene 2+ direcciones) ya construido en `/admin/logistics` — literalmente el mismo patrón, sin el candado de mismo-cliente (aquí no hace falta, ya se sabe de qué cliente se trata). Al crear, redirige al detalle de la orden nueva.
  - **"En Órdenes Activas"**: solo lectura, cada fila muestra un badge clickeable con el status de su orden que navega a `/admin/shipment-orders/<uuid>`.
- El bloque "Historial de Paquetes" (entregados) no cambió.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.

### ✅ Extra post-Etapa 4 (2) — Auditoría end-to-end + cierre de la ruta de facturación paralela (COMPLETADO 2026-07-13, commit 289dc39)

Pedido del dueño: análisis completo end-to-end de logística/órdenes/detalle de orden/clientes para detectar inconsistencias antes de seguir. Hallazgo más grave: **`/admin/billing` tenía una pestaña "Por Facturar" que generaba facturas por fuera del flujo de estimado**, saltándose `pre_billing` por completo — contradecía el invariante "el motor de prefactura/factura no se toca". Como la orden se auto-cierra (`CERRADO`) al generar el estimado, toda orden con estimado recién generado y sin confirmar aparecía también ahí, y el botón "Facturar" de esa pestaña recalculaba tarifas frescas (ignorando el monto ya congelado/compartido) y usaba la dirección `is_default` del cliente en vez de `delivery_address_id` de la orden (el mismo bug ya corregido en `confirmPreBilling`, sin arreglar en esta segunda ruta).

**Decisión del dueño:** eliminar solo la pestaña "Por Facturar" (y todo lo que la sostenía); la pestaña "Registros" (única ahora) se mantiene intacta como panel de facturación — ver qué falta cobrar, filtrar por pago, descargar PDF, detalle de factura, "Marcar como pagado". Se agregó, además, distinción visual: **columna "Orden" nueva** en la tabla de Registros con badge de status de la orden (mismos colores que `/admin/shipment-orders`) y link directo a su detalle.

- **Eliminado (frontend):** pestaña/tabs de `billing-container.tsx`, modal "Método de Entrega", `pendingColumns`, `useGenerateInvoiceMutation`, `usePendingConsolidationsQuery`, tipo `ActiveBillingTab`. `use-billing.ts` reescrito sin `activeTab`/`invoiceTarget`/`pendingConsolidations`.
- **Eliminado (backend):** `BillingRepository.getPendingConsolidations`, `BillingService.getPendingConsolidations`, rama `pending=true` de `GET /api/billing`, `LogisticsRepository.generateBilling`, `LogisticsService.createInvoice`, rama `case 'invoice'` de `POST /api/logistics`. Tipo `PendingConsolidation` eliminado (sin más consumidores). `PENDING_CONSOLIDATIONS_KEY` quitado de la invalidación en `useUpdateShipmentOrderStatusMutation` (Etapa 3).
- **Agregado:** `getPaginatedBilling` (`billing.repo.ts`) extendido con `con.status AS consolidation_status` — `BillingListItem` ahora incluye `consolidation_status`. Columna "Orden" en la tabla (desktop) y badge en las cards (mobile) de `/admin/billing`, con link a `/admin/shipment-orders/<uuid>`.
- Verificado: `tsc --noEmit` limpio, `npm run lint` limpio.
- **Otros hallazgos de la auditoría, documentados pero NO corregidos en este cambio** (fuera del alcance pedido — solo se cerró la ruta paralela de facturación):
  - Invalidación de cache incompleta: generar/confirmar estimado y despachar (en `use-shipment-order-detail.ts`) solo invalidan el detalle de la orden, no el listado de órdenes ni el listado de logística — pueden quedar datos viejos en pantalla sin refresh manual.
  - Editar peso/status de un paquete no invalida el detalle de la orden a la que pertenece.
  - `markBillingAsPaid` (`billing.repo.ts`) tiene un `UPDATE consolidations SET status='CERRADO' WHERE status='ABIERTO'` que nunca aplica en el flujo nuevo (la orden ya está `CERRADO` mucho antes de pagar) — no-op inofensivo, remanente del modelo viejo.
  - Filtro default "Pendientes de pago" en `/admin/shipment-orders` incluye órdenes sin ningún estimado generado (`SIN_ESTIMADO`) — puede confundir a un operador nuevo.
  - Badges de status de orden en el detalle de cliente y en logística no traducían/coloreaban el status (mostraban el enum crudo) — **no corregido en este cambio**, sigue pendiente ahí (solo se corrigió/agregó en la columna nueva de `/admin/billing`).
  - Código muerto ya identificado y no tocado: `getOpenConsolidationForCustomer`/endpoint `check-open`, `consolidatePackages`/`countMismatchedPackages`/`processConsolidation`/`case 'consolidate'` (sistema viejo orden-céntrico).
  - Duplicación de lógica: el flujo "crear orden + elegir dirección" está copiado línea por línea entre `use-logistics.tsx` y `use-customer-detail.ts` — candidato a extraer a un hook compartido.

### ⬜ Etapa 5 — Detalle de cliente: mejoras adicionales + módulo de plantillas editables (pendiente, alcance reducido)

Alcance original ("split pendientes/histórico + botón WhatsApp") ya resuelto en Etapa 4 (el split ya existía, el botón se agregó). Queda pendiente solo si el dueño pide algo adicional — por ejemplo, la sección de administración de plantillas editables mencionada en "Extras confirmados" más abajo (hoy las plantillas son constantes de código, no editables desde la UI).

---

## Contexto

El dueño definió el flujo objetivo:

```
Panamá confirma paquetes disponibles
  → Estado: Paquetes disponibles
  → Notificación al cliente (WhatsApp, manual)
  → Cliente decide: enviar ahora / esperar más paquetes / separar envíos / cambiar dirección
  → Sistema crea la Orden de Envío
  → Sistema genera la Prefactura
  → Cliente paga
  → Se programa el despacho
  → Entrega
```

**Cambio de paradigma:** hoy el sistema es orden-céntrico (creo orden → le asigno paquetes desde modal). El flujo nuevo es paquete-céntrico (veo paquetes sin orden → selecciono → notifico o creo orden con ellos).

**Invariante acordado:** el motor de prefactura/factura NO se toca (snapshots de tarifas, PDFs, email de factura, `/admin/billing`, marcar pagado).

---

## Reglas de negocio confirmadas

1. **1 cliente → N órdenes de envío.** Eliminar el candado `getOpenConsolidationForCustomer` en `consolidations.service.ts` (createConsolidation y validación al reabrir). Desaparece el warning "ya tiene una orden abierta" del flujo de creación.
2. **1 paquete → 1 orden de envío.** Ya se cumple estructuralmente (`packages.consolidation_id` es FK simple, no N:N). Sin cambio de esquema.
3. **La agrupación de paquetes se origina en `/admin/logistics`**, no en el módulo de órdenes.
4. Los paquetes seleccionados para agrupar deben ser **del mismo cliente** (candado en UI + validación existente `countMismatchedPackages` en el service se mantiene).

---

## Rediseño `/admin/logistics`

- **Filtros principales nuevos:** `Sin orden` (default al entrar) / `Con orden` — derivan de `consolidation_id IS NULL / IS NOT NULL`. Reemplazan los chips actuales de estado (En Panamá / En Trámite / Todos).
- **Filtro por cliente** (nuevo, adicional a la búsqueda de texto).
- **A validar con el dueño:** mantener el toggle Activos/Historial para que "Con orden" no mezcle órdenes activas con paquetes entregados hace meses. Propuesta: los filtros nuevos viven dentro de "Activos".
- **Selección múltiple** de paquetes en la vista "Sin orden", restringida a un mismo cliente (bloquear selección cross-cliente en UI).
- **Acciones sobre la selección:**
  1. **Crear orden de envío** con los paquetes seleccionados → al crear, redirigir al detalle de la orden nueva.
  2. **Notificar por WhatsApp** (ver sección WhatsApp).

Nota técnica: `getPaginatedPackages` en `logistics.repo.ts` hoy no lee `consolidation_id` ni hace join con `consolidations` — hay que extenderlo para los filtros nuevos y para mostrar a qué orden pertenece cada paquete en la vista "Con orden".

---

## Notificación WhatsApp — SIN API (acordado explícitamente)

**Mecanismo:** link `https://wa.me/<numero>?text=<mensaje URL-encoded>` vía `window.open`. Abre WhatsApp (Web/app) con el chat del cliente y el mensaje precargado. **El admin envía manualmente** — nada automático, sin API de WhatsApp, sin costo, sin cuenta business.

- Teléfono ya existe en BD (`customers.phone`, formato consistente `+506 0000-0000` por máscara del formulario) → normalizar con strip de no-dígitos.
- `encodeURIComponent` maneja saltos de línea, emojis y asteriscos de negrita de WhatsApp sin problema.

### Plantilla 1 — Paquetes disponibles (pre-orden)

Plantilla del dueño (textual):

```
📦 Estimado(a), [Nombre del Cliente].

Le informamos que actualmente tiene los siguientes paquetes disponibles en nuestra bodega en Panamá:

* [Proveedor / Tienda] – [Peso]
* [Proveedor / Tienda] – [Peso]

*Peso total disponible:* [XX.XX] lb

Antes de programar su envío a Costa Rica, agradecemos nos indique cómo desea proceder:

1️⃣ Enviar todos los paquetes disponibles.
2️⃣ Esperar la llegada de más paquetes para consolidarlos en un solo envío.
3️⃣ Separar los paquetes en diferentes envíos.
4️⃣ Actualizar la dirección de entrega (si aplica).

Una vez recibamos su confirmación, prepararemos su envío y le enviaremos la prefactura correspondiente.

Quedamos atentos a su respuesta. Será un gusto asistirle.

*MAGASTORE 📦✈️*
```

- El mensaje **siempre lista TODOS los paquetes sin orden del cliente** (no solo los seleccionados / recién creados). Reutiliza `getAvailablePackagesForCustomer`.
- **Requiere campo nuevo `store_name` (proveedor/tienda) en `packages`** + input en el formulario de registro. DECIDIDO: se agrega. Fallback si viene vacío: mostrar tracking number.

### Plantilla 2 — Cobro / prefactura lista (por orden)

Mismo mecanismo wa.me. Vive en el detalle de la orden de envío. **BAJA PRIORIDAD / opcional:** el dueño ya genera y envía el PDF de la prefactura por su cuenta como respaldo del monto, así que este mensaje NO necesita el detalle de monto/medios de pago — solo un aviso corto de que el estimado está listo. No bloquea ninguna etapa de implementación.

Borrador simple (placeholder, ajustable sin fricción vía la sección de plantillas editables a futuro):

```
📦 Estimado(a), [Nombre del Cliente].

Su envío #[ID Orden] ya tiene el estimado listo (adjunto el PDF).

Peso total: [XX.XX] lb
Método de entrega: [Correos CR / Tracopa / Retiro en oficina]

Quedamos atentos a su confirmación para proceder.

*MAGASTORE 📦✈️*
```

No requiere aprobación previa del dueño para empezar a implementar — es texto de bajo riesgo y editable después.

### Ubicaciones del botón "Notificar por WhatsApp" (plantilla 1)

1. **Toolbar de selección** en `/admin/logistics` (vista "Sin orden").
2. **Pantalla/toast de éxito post-registro de paquete** — ya se sabe de quién es el paquete; el mensaje lista todos sus disponibles.
3. **Detalle del cliente** (CONFIRMADO) — además, el detalle del cliente debe mostrar **paquetes pendientes (sin orden) y el histórico** separados (el detalle ya muestra paquetes desde commit ed7d09d; falta el split pendientes/histórico).

### Extras confirmados

- **Bitácora:** al pulsar el botón, `INSERT` en `package_events` tipo `INFO`: "Cliente notificado de disponibilidad por WhatsApp". Para la plantilla 2, el registro va a nivel de orden (ver `notified_at` abajo).
- **Plantillas editables a futuro:** habrá una sección de administración para que el admin edite los mensajes. Por ahora NO va a BD, pero el código debe quedar listo para migrar: **centralizar las plantillas en un solo módulo** (ej. `src/shared/constants/whatsapp-templates.ts`) con placeholders tipo `{{nombre}}`, `{{lista_paquetes}}`, `{{peso_total}}`, `{{monto}}` y una función de interpolación. Migrar a `system_settings`/tabla propia después será solo cambiar la fuente del string.

---

## Rediseño `/admin/shipment-orders`

### Desaparece de esta pantalla

- Botón "Nueva Orden de Envío" + modal de elegir cliente.
- Modal "Asignar Paquetes".
- (La creación y asignación viven ahora en logística; una orden nunca nace vacía.)

### El detalle pasa de modal a PÁGINA

**IMPLEMENTADO.** `/admin/shipment-orders/[uuid]` (patrón de referencia: `/admin/logistics/[id]`). Contenido real, con dos diferencias respecto a lo planeado originalmente en esta sección:

- Header: cliente, estado, dirección de entrega (editable si ABIERTO — no estaba en el plan original, se agregó como extra post-Etapa 3).
- **Paquetes de la orden con "Quitar paquete" y "Agregar paquetes"** (ambos implementados, "Agregar" no estaba en el plan original de esta sección pero se pidió como extra): ABIERTO y sin factura, transaccional, recalcula `total_weight_lb`, invalida la prefactura si existía. **No se puede quitar el único paquete de la orden** (extra post-Etapa 3 (3)).
- **Card prefactura/factura:** generar, recalcular, confirmar (botón "Confirmar Estimado", no "Confirmar y Facturar"), descargar PDF estimado. PDF de factura final se descarga desde `/admin/billing` (no se migró a esta página).
- **Botón WhatsApp "Enviar prefactura"** (plantilla 2) → **PENDIENTE, es Etapa 4.** No implementado aún.
- Avance de estado: **ya NO existe "cerrar" como acción manual** — generar el estimado auto-cierra la orden (ver "Etapa 3" arriba). Quedan: despachar / entregar / reabrir.
- **"Marcar como pagado" también aquí** — implementado (además de `/admin/billing`).

### Filtros de la lista — pipeline de cobro

**IMPLEMENTADO (ver "Extra post-Etapa 3 (3)" arriba), distinto de la propuesta original de esta sección:** los filtros son **Pendientes de pago / Pagadas / Entregadas / Todas** (`ShipmentOrderPaymentFilter`), derivados de `billing.is_paid` + `consolidations.status = ENTREGADO`. El default al entrar es **Pendientes de pago**, no "Pendientes" (ese filtro por status logístico ya no existe en este listado).

**Diferencia clave con la idea original de la tabla de abajo:** el filtro **"Sin notificar"** (que dependía de `pre_billing.notified_at`) **NO se implementó** — quedó pendiente para Etapa 4, junto con el resto de WhatsApp, porque `notified_at` recién tiene sentido una vez exista el botón que lo estampe (plantilla 2). Tabla de referencia original (a revisar al implementar Etapa 4, puede que ya no aplique tal cual dado que "Pendientes" por status dejó de ser el filtro base):

| Filtro | Derivación |
|---|---|
| ~~Pendientes (default)~~ | Reemplazado por "Pendientes de pago" (ver arriba) |
| **Sin notificar** (pendiente Etapa 4) | Sin prefactura, o prefactura sin `notified_at` |
| Pendiente de pago | ✅ implementado |
| Pagadas | ✅ implementado |
| Historial / Entregadas | ✅ implementado |

**CONFIRMADO:** columna nullable `notified_at` en `pre_billing` (ya existe en BD desde Etapa 1, migración 008) — falta el botón que la estampe (Etapa 4).

---

## Estados

- **`ConsolidationStatus` — agregar `DESPACHADO`.** Hoy la UI y la doc (`04-ordenes-de-envio.md`) ya lo asumen (`ABIERTO → CERRADO → DESPACHADO → ENTREGADO`) pero el enum en `logistics.types.ts` y `STATUS_TRANSITIONS` en `consolidations.service.ts` siguen en 3 estados — pulsar "Despachar" hoy tira "Transición inválida". Con el flujo nuevo es el paso post-pago, deja de ser cosmético. Requiere: enum + transiciones del service + labels/colores UI + verificar constraint en DB.
- **`PackageStatus` — NO se agrega estado nuevo.** `PANAMA` ya representa "disponible en bodega Panamá" (el registro del paquete ES la confirmación de Panamá). Esto protege el tracking público, que muestra estos estados al cliente.

---

## Otros fixes confirmados (anotaciones del dueño, 2026-07-04)

1. **Validación de tracking duplicado** al registrar paquete — hoy `createPackage` hace INSERT directo sin chequear (`logistics.repo.ts:24`). Agregar chequeo previo + idealmente índice único en DB.
2. **Quitar paquete de una orden** — cubierto arriba (detalle de orden).
3. **Default del listado de órdenes = pendientes (abiertas + cerradas)** — hoy el default es solo `ABIERTO`; cubierto con el filtro "Pendientes".

---

## Preguntas resueltas (confirmadas 2026-07-12)

1. ✅ El toggle Activos/Historial de logística se mantiene como contenedor de los filtros nuevos.
2. ✅ `notified_at` en `pre_billing`, estampado al click del botón WhatsApp de cobro — marcador oficial de "orden notificada".
3. ✅ Plantilla 2: borrador redactado (arriba). Pendiente solo: aprobación del texto por el dueño + datos de pago (SINPE/cuenta).
4. ✅ "Marcar como pagado" también desde el detalle de la orden (además de `/admin/billing`).

---

## Boceto de etapas (orden por dependencias, a formalizar en development-plan.md al arrancar)

1. ✅ **Backend quick wins:** validación tracking duplicado, quitar candado una-orden-por-cliente, endpoint quitar-paquete-de-orden, agregar `DESPACHADO` al enum/service, filtro "Pendientes" compuesto, columna `store_name` en packages.
2. ✅ **Rediseño listado logística:** filtros Sin orden/Con orden + filtro cliente + selección múltiple mismo-cliente.
3. ✅ **Crear orden desde la selección** + redirect al detalle nuevo + página de detalle de orden (reemplaza modal, incluye quitar/agregar paquete). Además: auto-cierre al generar estimado (ya no hay "cerrar" manual), dirección de entrega por orden, filtros de listado por pago en vez de por status, PDFs de estimado en la página de detalle (factura final sigue en `/admin/billing`).
4. ✅ **WhatsApp:** módulo de plantillas con placeholders, helper `buildWhatsAppUrl`, botones en las 3 ubicaciones (toolbar de selección en logística, toast post-registro de paquete, detalle de cliente) + botón en detalle de orden (plantilla 2), evento de bitácora en `package_events`, `notified_at` en `pre_billing`, filtro "Sin notificar" agregado al listado de órdenes (ahora 5 filtros de pago).
5. ⬜ **Detalle de cliente (alcance reducido):** el split pendientes/histórico ya existía antes de esta etapa; queda pendiente solo si el dueño pide algo adicional (ej. plantillas editables desde UI).

### Pendientes concretos para retomar en otra sesión

- Texto de la Plantilla 2 (cobro/prefactura lista) es un borrador — falta aprobación final del dueño + decidir si incluye datos de pago (SINPE/cuenta) antes de usarlo en producción. El mecanismo (botón, `notified_at`, mensaje) ya está implementado con el borrador actual.
- El PDF de la **factura final** (no el estimado) no se agregó a la página de detalle de la orden — sigue existiendo solo en `/admin/billing`. No fue pedido explícitamente, mencionarlo si hace falta.
- **Plantillas editables desde UI**: hoy `whatsapp-templates.ts` son constantes de código. El doc original preveía una sección de administración para editarlas sin tocar código — no implementada, no fue pedida explícitamente en Etapa 4.
- Nadie ha probado el flujo completo end-to-end en el navegador todavía (todo validado con `tsc`/`lint`, no con `npm run dev` manual) — recomendable antes de un commit grande. Esto incluye no haber probado el link real de `wa.me` con un teléfono real.
- Nada de lo hecho en Etapas 2, 3, 4 + extras está commiteado/pusheado todavía.
