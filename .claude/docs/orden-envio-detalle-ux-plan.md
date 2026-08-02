# Plan: rediseño de acciones en Detalle de Orden de Envío

Estado: **implementado**. Migraciones 026 y 027 aplicadas en dev y prod
(misma base) el 2026-08-02; registradas en `db-migrations.json`.

Pendiente de configuración manual: cargar el enlace de rastreo de Correos de
Costa Rica en Ajustes → Métodos de entrega. Hasta entonces el aviso de despacho
no se ofrece — comportamiento intencional, no un fallo.

Origen: revisión de la pantalla `/admin/shipment-orders/[uuid]` sobre captura
anotada por el dueño. Archivo principal:
`src/components/containers/shipment-orders/shipment-order-detail/shipment-order-detail.tsx`.

## Hallazgo central

De los 7 puntos anotados, **4 ya están implementados**. El problema real no es
falta de funcionalidad sino **ubicación y visibilidad**:

| Anotación | Realidad | Dónde |
|---|---|---|
| "agregar botones para volver a abrir" | Ya existe | línea ~442, **al pie de la página** |
| "botón para despachar / marcar entregado" | Ya existe (`NEXT_STATUS_LABEL`) | línea ~452, al pie |
| "agregar botón para cambiar dirección" | Ya existe | línea ~218, oculto si `status !== ABIERTO` |
| "agregar botón para solicitar envío" | **No existe** | — |

Los dos primeros no se ven porque están debajo de la tarjeta de rentabilidad.
Los dos de edición no se ven porque la orden de la captura está `CERRADO`.

## Alcance acordado

### 1. Barra de acciones en el header (mover, no duplicar)

Las acciones de estado suben al header, junto al badge. Se **quitan del pie**
— decisión explícita del dueño: movidos, no duplicados.

Acciones según estado (`NEXT_STATUS_LABEL` ya tiene la máquina):

- `CERRADO` + no pagada → "Volver a abrir" + "Marcar como Despachado"
- `DESPACHADO` → "Marcar como Entregado"
- `ABIERTO` / `ENTREGADO` → sin acción de avance

**Eliminar NO se incluye** — decisión del dueño: no se agrega a esta pantalla.
Sigue viviendo en el listado.

**Mobile:** el header es hoy `flex-col md:flex-row`. Con 2-3 botones se apila
mal. Propuesta: en móvil la acción principal (avance de estado) a ancho
completo y las secundarias como fila compacta debajo; en `md+` todas en línea
junto al badge. Verificar en iPad, que es el dispositivo de operación real.

### 2. Tarjetas de stats — reemplazar contenido

Hoy muestran Estado · Peso Total · Paquetes. Dos son redundantes:

- **Estado** ya está en el badge del header, a centímetros de distancia.
- **Paquetes** ya está en la lista de abajo, que muestra cada uno.

Propuesta: **Peso total · Monto a cobrar · Estado de pago**. Datos que hoy no
se ven de un vistazo y que el operador necesita al hablar con el cliente.

El monto sale de `billing_total_amount_crc` si hay factura, o
`pre_billing_amount` si solo hay estimado, o `—` si no hay ninguno.

### 3. Cambiar dirección / método con estimado o factura ya generados

Regla acordada: **si ya hay estimado, hay que reabrir la orden primero.**

Implementación: los botones "Cambiar" pasan a estar **siempre visibles** (hoy
se ocultan fuera de `ABIERTO`). Al pulsarlos con estimado o factura existente,
en vez de abrir el modal de edición se muestra un aviso explicando que hay que
volver a abrir la orden.

**Por qué no se permite el cambio directo:** `billing` guarda
`delivery_address_snapshot`, `delivery_fee_crc` y `applied_fee_crc` congelados
al confirmar. Cambiar la dirección después no recalcula la factura — quedaría
una factura afirmando una dirección y una orden mostrando otra, y si la zona
cambia, el fee real cambia y la ganancia registrada queda mal. Reabrir descarta
el estimado (ya lo hace el flujo actual) y fuerza a regenerarlo con los datos
nuevos.

### 4. Nueva plantilla: solicitud de envío al proveedor

**Es un mensaje al proveedor/forwarder, no al cliente.** Se copia al
portapapeles para pegarlo en el chat con el proveedor.

Formato objetivo (provisto por el dueño):

```
Quería solicitar el envío de los siguientes paquetes

*ENVIO 1
Paquetes:
- TBA332299392729
- 1ZW442G13521311043

Paquetes de Carlos Magaña

DATOS DE ENVIO
NOMBRE: CARLOS FERNANDO MAGAÑA GUTIERREZ
TELEFONO DE QUIEN RECIBE: 62048869
Cédula: 117210411
PROVINCIA: SAN JOSE
CANTON: CENTRAL
DISTRITO: EL CARMEN
DIRECCION: ASEMBIS ARANJUEZ 200 METROS NORTE ...
```

#### Decisión de alcance: por orden, un solo cliente

El ejemplo original agrupaba paquetes de tres clientes en un solo bulto
("Paquetes de Carlos Magaña, Sandra Navarro, Farid Villacis") con un único
destinatario. **Eso se descartó explícitamente**: la solicitud es por orden, con
el cliente asociado a esa orden.

Consecuencia a tener presente: `consolidations` es de un solo cliente
(`customer_id`), así que el modelo actual soporta esto sin cambios. Un bulto
multi-cliente no existe como entidad y no se va a crear.

#### Código de plantilla

`SHIPMENT_REQUEST`, sumado a `WHATSAPP_TEMPLATE_CODES` en
`shared/constants/whatsapp-template-vars.ts`.

#### Variables propuestas

| Variable | Fuente | Notas |
|---|---|---|
| `lista_trackings` | `detail.packages` | Un tracking por línea con guion |
| `nombre_cliente` | `customer_name` | Para la línea "Paquetes de ..." |
| `nombre_recibe` | `customer_name` | Quien recibe |
| `telefono_recibe` | `customer_phone` | Ya está en `ConsolidationDetail` |
| `cedula` | `customers.id_card` | **No disponible hoy — ver abajo** |
| `provincia` | `delivery_province` | Ya en el detalle |
| `canton` | `delivery_canton` | Ya en el detalle |
| `distrito` | `delivery_district` | Ya en el detalle |
| `direccion` | `delivery_exact_address` | Ya en el detalle |
| `cantidad_paquetes` | `detail.packages.length` | |
| `peso_total` | `total_weight_lb` | |
| `id_orden` | uuid corto | Para el "*ENVIO 1" |

**Bloqueante menor:** `cedula` no está en `ConsolidationDetail` — `id_card`
vive en `customers` pero no se selecciona en la query del detalle. Requiere
agregar la columna al SELECT de `getConsolidationDetail` en
`consolidations.repo.ts` y al tipo `ConsolidationDetail`.

#### Comportamiento del botón

- Ubicación: tarjeta de **Método de envío**, junto a "Cambiar".
- Acción: **copiar al portapapeles**, no abrir WhatsApp. Reusa
  `copyWhatsAppMessage` de `shared/constants/whatsapp-templates.ts`, que ya
  maneja el fallback de Safari/iPad.
- Sin registro en bitácora: es comunicación con el proveedor, no con el cliente
  (a diferencia de `log-notified`, que marca `packages.notified_at`).
- Si la orden no tiene dirección asignada, el mensaje saldría incompleto —
  avisar en vez de copiar un texto con campos vacíos.

#### Registro en el editor de plantillas

`whatsapp-template-detail.tsx` tiene `PREVIEW_VALUES` para la vista previa. Las
variables nuevas deben agregarse ahí o la preview muestra el `{{placeholder}}`
crudo.

### 5. Nueva plantilla: aviso de despacho al cliente

Mensaje al **cliente** avisando que su pedido ya salió, con el número de guía y
el link de rastreo del courier.

Texto base provisto por el dueño:

```
Estimad@ cliente, le informamos que su pedido ha sido enviado a través de
Correos de CR. 🚚📬

El número de seguimiento del paquete es: EZ292332205CR

Puede rastrear el estado de envío de su paquete en el siguiente enlace:
https://correos.go.cr/rastreo/

Cualquier duda o consulta no dude en contactarnos. 📲

¡Gracias por confiar en nuestro servicio! 🤝🛩️📦
```

Código de plantilla: `SHIPMENT_DISPATCHED`.

#### Dónde vive el botón

En la acción **"Marcar como Despachado"**. El estado `DESPACHADO` es
exactamente el momento en que este mensaje aplica —
`consolidations.service.ts` ya modela `CERRADO → DESPACHADO → ENTREGADO`.

Esto además resuelve un problema de secuencia: **la guía de Correos no existe
antes de despachar** — la emite el courier al recibir el bulto. Por eso el
número se pide en el modal de confirmación de despacho (el modal
`quickActionTarget === 'dispatch'` ya existe, no hay pantalla nueva), y el
botón de WhatsApp aparece después, cuando ya hay guía que comunicar.

#### Guía de rastreo: dónde se guarda

Hoy **no se guarda en ningún lado**. Va en `consolidations`, no en `packages`:
la guía la emite el courier **por bulto despachado**, y el bulto es la orden
completa. Guardarla por paquete obligaría a repetir el mismo valor N veces.

Migración: `consolidations.tracking_code TEXT` + `dispatched_at TIMESTAMPTZ`.
Ambas nullable — las órdenes históricas no las tienen y "Retiro en oficina"
nunca va a tener guía.

**La guía es opcional** (decisión del dueño): se puede despachar sin ella y
agregarla después. Consecuencias a implementar:
- El campo en el modal de despacho no bloquea la confirmación.
- El botón de WhatsApp **solo aparece si hay guía** — sin número el mensaje no
  tiene sentido.
- Debe existir forma de agregar/editar la guía después de despachar.
- Si el método tiene `is_pickup = true`, no se pide guía en absoluto.

#### Link de rastreo: configurable por método, no hardcodeado

`delivery_methods` ya es una tabla configurable (migración 022) con
`CORREOS_CR`, `TRACOPA`, `RETIRO` y flags como `is_pickup`. El link va ahí:

`ALTER TABLE delivery_methods ADD COLUMN tracking_url TEXT;`

- `CORREOS_CR` → `https://correos.go.cr/rastreo/`
- `TRACOPA` → su URL, o `NULL` si no tiene
- `RETIRO` → `NULL`

Así **un solo mensaje sirve para todos los couriers** y agregar uno nuevo se
resuelve desde Ajustes sin tocar código — que es el motivo por el que esa tabla
existe.

**Corrección al texto original:** dice "a través de Correos de CR" fijo. Si se
despacha por Tracopa, el mensaje miente. Debe usar `{{metodo_entrega}}`.

#### Variables

`nombre`, `metodo_entrega`, `numero_guia`, `link_rastreo`, `id_orden`,
`cantidad_paquetes`.

## Archivos a tocar

1. `scripts/026-shipment-templates.sql` — seed de `SHIPMENT_REQUEST` y
   `SHIPMENT_DISPATCHED`.
2. `scripts/027-dispatch-tracking.sql` — `consolidations.tracking_code` +
   `dispatched_at`; `delivery_methods.tracking_url` + seed de la URL de Correos.
3. `shared/constants/whatsapp-template-vars.ts` — códigos + `TEMPLATE_VARIABLES`.
4. `shared/constants/whatsapp-templates.ts` — constantes de respaldo +
   `buildShipmentRequestMessage` + `buildShipmentDispatchedMessage`.
5. `shared/api/repositories/consolidations.repo.ts` — `id_card` al SELECT del
   detalle; persistir `tracking_code` / `dispatched_at` al avanzar a DESPACHADO.
6. `shared/api/services/consolidations.service.ts` — aceptar la guía opcional en
   la transición a DESPACHADO.
7. `shared/api/repositories/delivery-methods.repo.ts` + su service — exponer y
   editar `tracking_url`.
8. `types/logistics/logistics.types.ts` — `customer_id_card`, `tracking_code`,
   `dispatched_at` en `ConsolidationDetail`.
9. `types/` de delivery methods — `tracking_url`.
10. `containers/shipment-orders/shipment-order-detail/shipment-order-detail.tsx` —
    header con acciones, stats nuevas, botones siempre visibles, botón de
    solicitud, campo de guía en el modal de despacho, botón de aviso de despacho.
11. `containers/shipment-orders/shipment-order-detail/use-shipment-order-detail.ts` —
    handlers de copia, del aviso de "reabrir primero" y del despacho con guía.
12. `containers/whatsapp-templates/whatsapp-template-detail/whatsapp-template-detail.tsx` —
    `PREVIEW_VALUES` de las variables nuevas.
13. Container de Ajustes → Métodos de entrega — campo para editar `tracking_url`.

## Criterios de éxito

- Las acciones de estado están en el header y **ya no** al pie (movidas).
- Las stats no repiten estado ni cantidad de paquetes.
- Intentar cambiar dirección/método con estimado generado muestra el aviso de
  reabrir, y no modifica nada.
- La solicitud de envío se copia con todos los campos llenos y es editable
  desde Ajustes → Plantillas.
- Se puede despachar sin guía; el aviso de despacho solo aparece cuando hay
  número que comunicar.
- El link de rastreo sale de `delivery_methods.tracking_url`, no del texto de la
  plantilla: despachar por Tracopa no debe producir un mensaje que diga Correos.
- Verificado en móvil e iPad, no solo en desktop.

## Fuera de alcance

- Botón de eliminar en el detalle (descartado por el dueño).
- Solicitud multi-cliente / bulto que agrupe varias órdenes (descartado).
- Recalcular la factura al cambiar dirección después de facturar.
