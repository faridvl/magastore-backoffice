# Rediseño Flujo Órdenes de Envío v2 — Paradigma Paquete-Céntrico

**Estado: EN DISEÑO — NO IMPLEMENTAR AÚN.** Documento de decisiones acordadas con el dueño de Magastore.
Última actualización: 2026-07-12.

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

Nueva ruta `/admin/shipment-orders/[uuid]` (patrón de referencia: `/admin/logistics/[id]`). Contenido:

- Header: ID orden, cliente (link a su detalle), estado.
- **Paquetes de la orden con acción "Quitar paquete"** (nuevo endpoint):
  - Solo permitido con orden ABIERTO y sin factura final.
  - Transaccional (espejo de `consolidatePackages`): `consolidation_id = NULL` + recálculo de `total_weight_lb`.
  - Si existe prefactura → invalidarla/recalcularla (el monto quedó calculado con peso viejo).
- **Card prefactura/factura:** generar, recalcular, confirmar, descargar PDF estimado y PDF factura (los PDFs se mudan del modal a esta página; siguen disponibles también en `/admin/billing`).
- **Botón WhatsApp "Enviar prefactura"** (plantilla 2) → estampa `notified_at`.
- Avance de estado: cerrar / despachar / entregar / reabrir.
- **"Marcar como pagado" también aquí** (CONFIRMADO; se mantiene igualmente en `/admin/billing`).

### Filtros de la lista — pipeline de cobro

Los filtros dejan de ser solo `status` y pasan a estados derivados combinando `consolidations.status` + `pre_billing` + `billing` (datos que ya existen):

| Filtro | Derivación |
|---|---|
| **Pendientes** (default) | `status != 'ENTREGADO'` — cumple pedido del dueño "ver abiertas/cerradas al entrar" |
| **Sin notificar** | Sin prefactura, o prefactura sin `notified_at` |
| **Pendiente de pago** | Prefactura/factura existente y `is_paid = false` |
| **Pagadas** | `billing.is_paid = true` y no entregada — es la cola de "programar despacho" |
| **Historial** | `status = 'ENTREGADO'` |

**CONFIRMADO:** columna nullable `notified_at` en `pre_billing`, estampada al click del botón WhatsApp de cobro. Hace confiable el filtro "Sin notificar" (la alternativa —asumir prefactura generada = notificada— falla justo en el caso que se quiere atrapar: la prefactura generada que nadie envió).

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

1. **Backend quick wins:** validación tracking duplicado, quitar candado una-orden-por-cliente, endpoint quitar-paquete-de-orden, agregar `DESPACHADO` al enum/service, filtro "Pendientes" compuesto, columna `store_name` en packages.
2. **Rediseño listado logística:** filtros Sin orden/Con orden + filtro cliente + selección múltiple mismo-cliente.
3. **Crear orden desde la selección** + redirect al detalle nuevo + página de detalle de orden (reemplaza modal, incluye quitar paquete y PDFs).
4. **WhatsApp:** módulo de plantillas con placeholders, helper `buildWhatsAppUrl`, botones en las 3 ubicaciones + detalle de orden (plantilla 2), evento de bitácora, `notified_at`, filtros pipeline de cobro en órdenes.
5. **Detalle de cliente:** split paquetes pendientes/histórico + botón WhatsApp.
