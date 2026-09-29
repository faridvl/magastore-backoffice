# Plan: Step-by-step en Órdenes de Envío

Estado: **implementado, pendiente de aplicar la migración en Neon y probar
manualmente**. Acordado con el dueño sobre pizarra (foto) + conversación de
alineación. `tsc --noEmit` y `npm run lint` limpios sobre el código nuevo.

**Pendiente antes de dar por cerrado:**
- Aplicar `scripts/030-consolidation-current-step.sql` en Neon (dev y prod) y
  registrar en `db-migrations.json` — junto con verificar si 028/029 ya están
  aplicadas ahí, dato que no se pudo confirmar desde este entorno.
- Probar el flujo completo en la app real: crear orden → confirmar dirección →
  generar estimado (avanza a paso 2) → agregar paquete en paso 2 (recalcula) →
  avanzar a paso 3 con el modal de pago → despachar → entregar (stepper
  desaparece). Y el camino de reabrir desde paso 2.
- Revisar en Neon si existen órdenes `CERRADO` sin `pre_billing` (caso límite
  documentado abajo, sin resolver por el backfill automático).

Origen: el dueño quiere que el detalle de orden deje de ser una pantalla con
acciones sueltas repartidas y pase a ser un asistente de pasos donde el operador
"solo le da Siguiente, Siguiente, Siguiente".

## Decisiones acordadas

1. **3 pasos, no 4.** El P1 original de la pizarra ("crea orden / asigna
   paquetes") se elimina: la orden nace con paquetes asignados, así que un paso
   para eso ya está cumplido al existir la orden. Además "Agregar paquetes" pasa
   al header y está disponible durante el flujo, lo que vuelve innecesario un
   paso dedicado.
2. **El step se persiste** en columna propia (`current_step`). El operador cierra
   el navegador y la orden se reabre en el paso donde iba.
3. **El Siguiente valida.** No deja avanzar hasta que las acciones del paso estén
   completas.
4. **El estimado se autogenera** al avanzar del paso 1 al 2 — deja de ser un
   botón que el operador aprieta.
5. **"Back" ≡ "volver a abrir orden".** No hay retroceso barato que solo mueva el
   indicador: retroceder deshace lo que el paso produjo. Por eso el botón no se
   llama "Atrás" en ningún lado.
6. **Si el cliente ya pagó, no se puede volver a abrir.** Regla explícita del
   dueño. Ya está implementada hoy y se conserva.
7. **Finalizado deja la pantalla como está hoy** — sin stepper.

## Los 3 pasos

| Step | Nombre | Acción del operador | Siguiente habilitado cuando | Al darle Siguiente |
|---|---|---|---|---|
| 1 | Confirmar con el cliente | Confirmar dirección y método. El cliente responde "envíalo" o "espero más paquetes" | Hay `delivery_address_id` **y** `delivery_method` | Genera estimado + cierra orden (`ABIERTO → CERRADO`) → paso 2 |
| 2 | Cobro | Enviar PDF / WhatsApp, esperar pago | Hay estimado generado | Modal "¿está pagada?" (registra, no bloquea) → paso 3 |
| 3 | Despacho | Solicitar envío al proveedor, marcar despachado | Proveedor confirmó | Notificar despacho → Fin |
| — | Fin | — | — | Pantalla actual sin stepper |

**Paso 1 no es un atraso.** Si el cliente dice "espero más paquetes", la orden se
queda ahí indefinidamente y el operador le suma paquetes desde el header hasta
que el cliente dé el visto bueno. Las órdenes en paso 1 son órdenes en
acumulación, no un backlog.

**El modal de pago del paso 2→3 no bloquea.** Hay clientes —pocos— que pueden
solicitar el envío sin haber pagado. El modal registra pagada sí/no y deja pasar
igual. Esto es lo que hace que el pago no pueda ser un step: una orden puede
estar en paso 3 o finalizada y seguir sin pagar.

**Notificado no bloquea** el avance del paso 2 al 3 (decisión por defecto, no
objetada): se muestra como pendiente. El filtro "sin notificar" ya existe para
cazar las que se saltaron.

## Volver a abrir — reglas

- Desde paso 2 → paso 1: **permitido si no está pagada**. Borra el estimado.
- Desde paso 2 estando pagada: **no**.
- Desde paso 3: **no** — el proveedor ya tiene la solicitud, el sistema no puede
  deshacer ese mensaje.

Va como acción secundaria en el header, nunca al lado del Siguiente, con su
nombre completo ("Volver a abrir orden") y confirmación que diga qué se pierde.
Si se pone como flecha "Atrás", el operador lo usa como navegación para "ver" el
paso anterior y destruye el estimado sin querer.

## Agregar paquetes

Header, disponible en **paso 1 y paso 2**, no en paso 3 (despachar con un paquete
que el proveedor no tiene en el bulto no tiene sentido).

En paso 2 hay estimado vigente: agregar un paquete lo deja viejo. Hoy el código
**borra** la prefactura al agregar paquetes (`assignPackages`). Con el flujo nuevo
debe **recalcularla en el lugar**, manteniendo la orden en paso 2, y avisar que
hay que reenviar el PDF si ya se compartió. Decisión por defecto, no objetada.

## Filtros del listado — 3 ejes combinables

Hoy es un enum único de 5 valores (`ShipmentOrderPaymentFilter`) que mezcla las
tres dimensiones en ramas mutuamente excluyentes. Se parte en tres parámetros
independientes.

| Eje | Valores | UI |
|---|---|---|
| Step | Paso 1 / Paso 2 / Paso 3 / Finalizadas / Todas | Chips horizontales, siempre visibles |
| Pago | Todas / Pagadas / Sin pagar | Toggle de 3 estados |
| Notificación | Todas / Notificadas / Sin notificar | Toggle de 3 estados |

**Por qué no tres dropdowns** (el dueño los propuso y preguntó por alternativas):
el patrón de dropdown sirve cuando hay muchos valores por eje o selección
múltiple. Acá hay 4-5 pasos y dos ejes que son sí/no — un dropdown son dos clics
y un panel flotante para algo que se resuelve con un toggle a la vista. Los chips
además comunican la progresión 1→2→3, cosa que un dropdown destruye al volverlos
lista plana. Y no existe componente `Select`/`Dropdown` en
`src/components/common/`, así que serían tres componentes nuevos con
click-outside, teclado y foco.

**Mobile:** chips de step con scroll horizontal (como ya están hoy) + botón
`Filtros (n)` con contador que abre panel con pago, notificación y fechas.

Extras: chip "limpiar filtros" cuando hay algo activo fuera del default, y estado
vacío que nombre la combinación ("No hay órdenes en paso 2 sin pagar") en vez de
un "Sin resultados" genérico.

## Cambios por archivo

### Base de datos

**`scripts/030-consolidation-current-step.sql`** (nuevo)

- `ALTER TABLE consolidations ADD COLUMN current_step SMALLINT NOT NULL DEFAULT 1`
- CHECK constraint `current_step BETWEEN 1 AND 4` (4 = finalizada).
- Backfill de las órdenes existentes derivado del estado actual:
  - `status = 'ENTREGADO'` → 4
  - `status = 'DESPACHADO'` → 3
  - `status = 'CERRADO'` → 2
  - `status = 'ABIERTO'` → 1
- Índice `idx_consolidations_current_step` para el filtro del listado.
- Registrar en `db-migrations.json` al aplicar.

**Hallazgo previo a la migración:** `scripts/` tiene `028-address-confirmation-template.sql`
y `029-address-request-template.sql` que **no figuran en `db-migrations.json`**
(el registro corta en 027). Hay que confirmar si están aplicadas en Neon antes de
crear la 030, o la numeración y el registro quedan inconsistentes. No lo corrijo
por mi cuenta — es dato para verificar.

### Tipos

**`src/types/logistics/logistics.types.ts`**

- `ShipmentOrderStep` enum: `CONFIRMACION = 1`, `COBRO = 2`, `DESPACHO = 3`, `FINALIZADA = 4`.
- `ConsolidationListItem` y `ConsolidationDetail`: agregar `current_step`.
- Filtros: tres tipos nuevos (`StepFilter`, `PaidFilter`, `NotifiedFilter`)
  reemplazando `ShipmentOrderPaymentFilter`.

### Backend

**`src/shared/api/repositories/consolidations.repo.ts`**

- `getPaginatedConsolidations`: reemplazar las 4 ramas de `paymentFilter` por
  tres condiciones componibles (step / paid / notified). Mismo patrón
  `AND (NOT ${flag} OR <condición>)` ya usado, pero sin exclusión mutua entre
  ejes. Aplicar también a la query de `COUNT(*)`.
- `SELECT con.current_step` en ambas queries.
- Método nuevo `advanceStep(uuid, fromStep)` — avanza y valida que el step actual
  sea el esperado (evita doble click y avances desde pantalla vieja).
- `updateConsolidationStatus` (reabrir): además de borrar el estimado, devolver
  `current_step` a 1.

**`src/shared/api/services/consolidations.service.ts`**

- `STEP_REQUIREMENTS`: validador por paso que devuelve si se puede avanzar y el
  motivo si no.
- `advanceStep`: valida requisitos, ejecuta el efecto del paso (paso 1 → dispara
  `generatePreBilling`, que ya auto-cierra la orden), persiste el step.
- `listConsolidations`: firma nueva con los tres filtros.

**`src/pages/api/consolidations/index.ts`**

- `PATCH` con `action: 'advance-step'`.
- `GET`: leer `step`, `paid`, `notified` de la query en vez de `payment`.

### Frontend

**`src/components/common/`** — componente nuevo `order-stepper/` con la figurita
de pasos. Paleta del proyecto: `slate-900` para el paso activo, `emerald` para
completados, `slate-200/400` para pendientes, `rounded-2xl`/`rounded-[2rem]`,
`text-[10px] font-black uppercase tracking-widest` en labels — mismos tokens que
usa hoy `shipment-order-detail.tsx`.

**`src/components/containers/shipment-orders/shipment-order-detail/`**

- `use-shipment-order-detail.ts`: estado del stepper, `handleAdvanceStep`,
  validación por paso, modal de pago en 2→3.
- `shipment-order-detail.tsx`: stepper arriba, botón Siguiente primario, cards
  existentes reorganizadas por paso (mostrar solo las del paso actual + resumen
  de las anteriores). "Volver a abrir" como secundario en header. "Agregar
  paquetes" en header con su regla de visibilidad. En paso 4 (finalizada),
  render actual sin cambios.
- Los botones que hoy existen sueltos ("Generar Estimado", "Confirmar Estimado",
  "Solicitar envío", "Marcar como Despachado") se absorben en el Siguiente de su
  paso — se mueven, no se duplican (mismo criterio que el rediseño anterior).

**`src/components/containers/shipment-orders/`**

- `use-shipment-orders.ts`: tres estados de filtro independientes, sincronía con
  query params, reset de página al cambiar cualquiera.
- `shipment-orders-container.tsx`: chips de step + dos toggles + panel mobile con
  contador. Columna "Paso" en la tabla reemplazando o acompañando al badge de
  status.

**`src/shared/api/querys/shipment-orders/use-shipment-orders-query.ts`**

- Cache key con los tres filtros (hoy lleva `paymentFilter`). Mantener
  `placeholderData: (prev) => prev`.

## Riesgos

- **El invariante "el motor de prefactura/factura no se toca" sigue vigente.** El
  paso 1 dispara `generatePreBilling` tal como está; no se reescribe el cálculo.
- **Órdenes existentes en estados mixtos:** el backfill las coloca por `status`,
  pero una orden `CERRADO` sin estimado (posible tras reabrir) caería en paso 2
  sin cumplir el requisito de haber generado estimado. Verificar en Neon cuántas
  hay y decidir si el backfill las manda a paso 1.
- **Doble efecto en el paso 1:** si `generatePreBilling` falla a mitad, el step no
  debe avanzar. El avance y la generación van en la misma transacción o el step
  se persiste después de confirmar que el estimado existe.
- **Invalidación de cache:** ya documentada como incompleta en
  `ordenes-envio-v2-flujo.md` (avanzar estado no invalida el listado). Al tocar
  estos hooks conviene cerrarla, pero es trabajo adicional a declarar.

## Orden de implementación sugerido

1. Migración 030 + backfill (verificando antes lo de 028/029).
2. Tipos + repo + service + endpoint (backend completo, testeable por API).
3. Filtros del listado (3 ejes) — independiente del stepper, se puede validar solo.
4. Componente stepper + reorganización del detalle.
5. `tsc --noEmit` + `npm run lint` + prueba manual del flujo completo.
