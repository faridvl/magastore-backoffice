# DECISIONS.md

Por qué el repo está como está. Una entrada fechada por decisión; las anteriores a este archivo
quedaron en `.claude/docs/` y en los mensajes de commit.

## Migraciones de producción: push a `main` solo planifica (2026-10-24)

Antes el merge a `main` aplicaba solo todas las pendientes. Ahora el push calcula y muestra el
plan; aplicar es un Run workflow manual con `aplicar` y `confirmar` = `<última versión>@<sha>`
del plan revisado, y el script verifica que el plan y el commit no cambiaron. Se prefirió a
revisores requeridos: con un solo colaborador, escribir qué versión y qué commit se aplican ata
la aprobación a lo revisado.

## Sondas de solo lectura en la primera corrida (2026-10-24)

Mientras la base no tiene `schema_migrations`, el punto de partida sale de `db-migrations.json`
(prod = 027). Dev tiene 028–036 sin esa tabla y daría el mismo plan, así que antes de aceptarlo
se comprueba que nada de 028–035 exista ya; si existe, se detiene.

## Environment `db-production` propio, no `production` (2026-10-24)

GitHub ya tiene "Production" y "Preview", creados por Vercel, y los nombres no distinguen
mayúsculas. Un environment aparte evita mezclar los despliegues de Vercel con el secreto de la
base y permite limitarlo a la rama `main`.

## La base esperada se valida antes de conectar (2026-10-24)

`EXPECTED_DATABASE_HOST` y `EXPECTED_DATABASE_NAME` (variables del environment) se comparan con
`DATABASE_URL` antes de abrir la conexión; ya conectado se revisan `current_database()` y las
tablas base. El repo es público y los logs de Actions también: nunca se imprime la URL, el host,
el nombre de la base ni datos.

## Contexto corto: `CLAUDE.md` índice que importa solo `HANDOFF` y `RULES` (2026-10-24)

El `CLAUDE.md` de 348 líneas en inglés se partió en `RULES.md` (reglas duras, se carga siempre) y
`ARCHITECTURE.md` (a pedido). Las reglas genéricas ya están en las skills `estandares-*` y no se
repiten; `RULES.md` dice dónde este legado se aparta de ellas.

## Textos en el JSX, sin migrar a `TEXT`/`es.json` (2026-10-24)

`es.json` y `TEXT` quedaron de otra app y ninguna pantalla los usa. Migrar pantalla por pantalla
dejaría el repo con dos sistemas a la vez; si se adopta i18n, se hace como tarea propia.

## Permisos del repo sin `git push` (2026-10-24)

`.claude/settings.json` permitía `git push *` sin preguntar. Se quitó, y quedan en `ask` push y
los comandos de migración (`migrate.mjs`, `dbmigrate`), en línea con las reglas globales.

## Operativo: "Tu día" con nombres de tarea, no de paso (2026-10-24)

Las filas dicen lo que hay que hacer, en el orden del flujo: Avisar paquetes que llegaron, Armar
órdenes, Generar estimados (paso 1), Confirmar y cobrar (2), Despachar (3), Finalizar entregas (4)
y Hacer seguimiento. Cada número sale de las mismas condiciones SQL que la pantalla a la que lleva
la fila. Los chips del listado de Órdenes conservan los nombres de paso (Confirmación, Cobro,
Despacho, Cierre): cambiarlos tocaría otra pantalla que el operador ya conoce.

## "Confirmar y cobrar": desglose y antigüedad solo de lo no pagado (2026-10-24)

El conteo sigue igual al listado `?step=COBRO&paid=ALL`, pero el subtítulo separa por confirmar,
por cobrar y pagadas (que aún falta pasar a despacho). Por pedido del usuario, "La más vieja sin
pagar" y el rojo solo miran las no pagadas; las pagadas que se quedan en el paso 2 no se marcan.

## Antigüedad de Despachar y Finalizar desde `dispatched_at` (2026-10-24)

`dispatched_at` se fija al pasar del paso 2 al 3 (`updateStatus`, CERRADO→DESPACHADO) y es la única
fecha confiable de entrada al paso 3; `updated_at` cambia con cualquier edición y se quitó como
respaldo. Para el paso 4 no existe fecha de entrada: se cuenta desde el despacho.

## Filtro de pago "Con factura sin pagar" (2026-10-24)

`FACTURADA_SIN_PAGAR` (hoy alias de "Por cobrar") exige factura emitida y sin pagar. Cobros del
Operativo lo usa para que "Ver todas" muestre exactamente las mismas facturas.

## Cobros: "Enviar estimado" solo en el paso Cobro (2026-10-24)

El botón de la tarjeta usa el mismo verbo que la fila "Estimado enviado al cliente" del detalle,
que solo existe en el paso 2; las pestañas "Por avisar"/"Ya avisados" se quedan. "Por avisar"
incluye facturas sin pagar con estimado sin enviar en cualquier paso (2 a 5) para que una
factura no desaparezca al finalizar la orden; en los pasos 3 a 5 la tarjeta abre la factura.
Provisional: falta que el usuario diga si "Avisar y recordar pago" del paso 3 cuenta como aviso.

## Participaciones de Farid en mes equivocado: no se corrigen (2026-10-24)

Las participaciones de ganancia ya registradas en un mes que no corresponde se dejan como están,
por decisión del usuario. No se escriben migraciones ni scripts para moverlas.

## Entorno local con Docker: proxy del driver de Neon y `neonConfig` solo con host local (2026-10-24)

La app usa `neon()` (HTTP) y `migrate.mjs` usa `Pool` (WebSocket); ambos solo hablan con el proxy
de Neon. Se suma `local-neon-http-proxy` en el compose (un solo contenedor sirve HTTP y WebSocket)
y `src/lib/db.ts` ajusta `neonConfig` únicamente cuando el host de la URL es exactamente
`db.localtest.me` (el proxy no acepta otros, y así hay menos superficie en código que corre en Vercel). Con un host de Neon no cambia nada, así que Vercel y
producción quedan idénticos. El script real de migraciones no se toca: un envoltorio precarga la
misma configuración con `node --import`.

## La base local 027 se construye con 001 + 003..027 (2026-10-24)

`scripts/prod/001-schema.sql` es una introspección del 2026-07-17 y no llega a 027. Para tener la
estructura de producción sin copiar datos se aplica el 001 y luego las migraciones 003..027 con
`psql`. La única incompatibilidad es la 016 (`ADD CONSTRAINT billing_invoice_number_key` ya existe
en el 001): el script de creación borra esa restricción justo antes de correrla, sin editar la
migración ni el 001. También se crea el usuario de prueba antes de las siguientes: la 033 aborta si
`users` está vacía. No se crea `schema_migrations`, para que el envoltorio tome el punto de partida
de `db-migrations.json` (prod) como en producción.

## Seed ficticio en lugar de copiar datos (2026-10-24)

Una copia de Neon traería datos de clientes reales a la computadora y el repo es público. Los
escenarios se escriben en SQL versionado (`docker/seed/`), idempotente y con fechas relativas a hoy.
Los montos salen de las tarifas y de los paquetes con la fórmula del README, no a mano, para que
las pantallas no muestren incoherencias.

## `next dev` contra Docker con `distDir` aparte (2026-10-24)

`dev:docker` corre en el puerto 3030 con `NEXT_DIST_DIR=.next-docker` (`next.config.mjs` usa
`process.env.NEXT_DIST_DIR || '.next'`, sin variable no cambia nada) para no pisar el `.next` de
un `next dev` en la misma carpeta. Se niega si la URL no es la local. `RESEND_API_KEY` va con una
clave inválida y no con cadena vacía: el constructor de Resend lanza con vacío, lo que rompería
todo handler que importe `lib/email.ts`; con una clave inválida nunca se envía un correo.

## Seed: el primer usuario firma las facturas y la 036 es el requisito (2026-10-24)

El seed atribuye las facturas al primer usuario de la tabla (el de prueba) y se niega si la base
no está en 036 o no es la de Docker. Dos casos del seed son comportamiento real y no errores: el
hueco de 1,99 a 2,00 kg en las tarifas de Correos (una orden de 4,40 lb cae al monto fijo de
`system_settings`) y los tramos de Correos "por confirmar", que dejan ganancia incompleta.

## Entorno Docker: diferencias aceptadas con producción y host `db.localtest.me` (2026-10-24)

El ensayo del pase corre sobre tablas vacías (no prueba los rellenos de 030, 033, 035 y 036 sobre
datos reales), como superusuario `postgres` (Neon usa un dueño sin superusuario) y sobre un esquema
que es la introspección de julio más 003–027, sin cambios manuales ni plantillas editadas en
Ajustes. El usuario de prueba se crea antes de la 033 porque falla con `users` vacía. La URL local
usa `db.localtest.me` porque el proxy deduce el endpoint del primer tramo del host y valida el
resto contra `localtest.me`. Los `.sql` se leen con LF (el checkout de Windows los trae con CRLF y
la 036 compara contenido); `.env.docker.local` vive en la raíz del checkout principal porque la
base es una sola; los teléfonos del seed son `+506 0000-00NN` para que ningún WhatsApp llegue a
alguien real.

## Cortes de layout por el ancho real del contenido: `xl` = 1200 y `2xl` = 1400 (2026-10-24)

En iPad horizontal (1024) con el menú abierto (231 px) al contenido le quedan ~770 px, pero `lg`
(924) le daba el diseño de escritorio. Los layouts de contenido pasaron de `lg:` a `xl:`, y `xl`
bajó de 1366 (ningún iPad ni el escritorio de 1280 lo alcanzaba) a 1200: un escritorio de 1280
(~1050 px de contenido) recibe el de escritorio y los iPad hasta 1180 (~950) el de tablet. El menú y
el header siguen en `lg`. Las tablas más anchas (Órdenes, Facturación) muestran sus columnas
secundarias desde `2xl` = 1400. Se descartaron las container queries: muchos modales son
`fixed inset-0` sin portal dentro del contenido y la contención de `container-type` en Safari no
se puede verificar aquí.

## Componentes comunes de UX: Badge, Modal, EmptyState, mapas de estado y formato (2026-10-24)

Un solo `Badge` (`whitespace-nowrap`, sin mayúsculas, 12 px) con etiquetas de
`src/shared/constants/status-labels.ts`: estado de pago con cuatro nombres ("Sin estimado",
"Estimado enviado", "Por cobrar", "Pagada"), paso de la orden (el cierre en gris, el rojo queda
para atrasos) y estado del paquete. `Modal` con portal a `body`, `z-[60]`, pie fijo y bloqueo del
scroll del contenedor `[data-scroll-root]` (la app no desplaza `body`). `Button` y objetivos
táctiles a 44 px. Peso con `formatWeight` ("25,5 lb", "7,35 lb": coma y hasta dos decimales, para que el peso cobrado coincida con el PDF) y fechas con
`formatBusinessDate` (dd/mm/aaaa). React Query Devtools solo con `NEXT_PUBLIC_RQ_DEVTOOLS=1`.
Los mapas se conectan pantalla por pantalla (Órdenes y Facturación en la fase 1; el estado del
paquete en clientes, paquetes e Inicio en sus fases).

## Estimado creado pero sin avisar: "Sin estimado" (2026-10-24)

El SQL llama ESTIMADO_PENDIENTE a toda orden con prefactura y sin factura, avisada o no. Con los
cuatro nombres fijados, "Estimado enviado" solo se muestra si `pre_billing.notified_at` tiene
valor; si no, el badge dice "Sin estimado" y el monto "Estimado sin enviar". Decir "enviado" de
un estimado que nadie mandó haría que la operadora no avise el cobro. La regla vive en
`getPaymentStatus` (`status-labels.ts`).

## Sin hamburguesa en pantallas con Volver, bajo `lg` (2026-10-24)

En celular el título quedaba en 142 px. Desde una ficha o un formulario se vuelve al listado, que
sí tiene el menú.

## El cliente nunca ve Panamá (decisión del usuario, 2026-10-24)

El casillero opera en Panamá, pero el cliente no debe saberlo: nada que vea o reciba (rastreo
público y su API, plantillas de WhatsApp, correos, PDF, landing) menciona Panamá ni PTY. El API
público de rastreo traduce `PANAMA` a `RECEIVED` ("Recibido en bodega") y devuelve solo estado,
fechas, peso y el nombre con la inicial del apellido: ya no expone notas internas, evidencia,
ubicaciones, `uuid` ni código de cliente (cualquiera con el número de rastreo puede consultarlo). La 037 corrige la plantilla guardada
solo si conserva la frase original (criterio de la 036). El editor de plantillas avisa si alguien
escribe "Panamá", sin bloquear el guardado. En el backoffice "En Panamá" se mantiene.

## Rastreo público: "Preparando tu envío" y búsqueda tolerante sin confundir clientes (2026-10-24)

Un paquete que sigue en bodega pero ya está en una orden se muestra como "Preparando tu envío"
(`PREPARING`): decirle "escríbenos para pedir el envío" a quien ya lo pidió lo confunde. La búsqueda
prueba primero el número exacto y después sin mayúsculas ni espacios; si la segunda encuentra dos
paquetes, responde "no encontrado" para no mostrar el nombre de otra persona. En la bienvenida del
casillero `{{ruta_label}}` es la ruta ("Estados Unidos · Aéreo") y no el nombre del courier, que
puede delatar el país.

## Cobros: qué cuenta como aviso (2026-10-24)

Una factura sin pagar pasa a "Ya avisados" si se le mandó el estimado (`pre_billing.notified_at`)
o el aviso del paso 3 (`consolidations.customer_notified_shipment_at`; en una orden sin pagar la
plantilla lleva el monto pendiente y pide el comprobante). El correo automático al confirmar la
factura no cuenta: depende de que el cliente tenga correo y Resend esté configurado, y falla en
silencio. No hizo falta migración: la fecha del aviso del paso 3 ya se guarda. El Operativo
(`operations.repo.ts`) y el filtro `notified` del listado de Órdenes (`consolidations.repo.ts`)
usan el mismo criterio; cambiar uno es cambiar el otro.

## Orden pagada que sigue en el paso 2: rojo desde 2 días (2026-10-24)

Se cuentan días de calendario de Costa Rica desde `billing.paid_at`
(`PAID_AWAITING_DISPATCH_STALE_DAYS`). Es una línea aparte en "Confirmar y cobrar": la antigüedad
de lo no pagado sigue su propio umbral.

## Panamá en el backoffice y paquetes en trámite al despachar (2026-10-24)

En el backoffice "En Panamá" es correcto. "Avisar" y "Armar órdenes" del Operativo, el modal de
aviso, los paquetes asignables y la vista de Paquetes (Logística, activos sin orden) cuentan solo
paquetes `PANAMA` sin orden. Los paquetes pasan a `EN_TRAMITE` al despachar (cargar la guía, o
pasar del paso 3 al 4, que cubre el retiro en oficina), no al marcar la factura como pagada.
Datos viejos: no se migran; el rastreo público deriva el estado con la regla de la orden (abajo).

## `packages.updated_at` no existe y no se crea (2026-10-24)

`bulkUpdateStatus` escribía una columna que ninguna migración crea; fallaba al cambiar el estado
de varios paquetes. Se quitó la escritura: nada lee esa fecha y el cambio de estado queda en
`package_events` por el trigger de la tabla.

## Paquetes sin orden no pueden estar en trámite; la orden manda sobre la pantalla (2026-10-24)

El servidor rechaza armar o agregar a una orden paquetes que no estén en Panamá y sin orden, y
rechaza pasar a "En trámite" un paquete sin orden (detalle del paquete y `bulk-status`; la
pantalla ya no lo ofrece). Quitar un paquete de su orden o borrar la orden lo devuelve a Panamá.
Cambiar el estado de una orden ya no confía en el `currentStatus` del cuerpo: se lee de la base y
si difiere responde 409 "La orden cambió. Recarga la página.". Si la orden vuelve a ABIERTO o
CERRADO, sus paquetes en trámite vuelven a Panamá en la misma sentencia. Rastreo público (regla exacta): ENTREGADO es entregado; EN_TRAMITE o DESPACHADO sin orden va en camino y con orden solo si la orden está despachada o entregada, si no "preparando"; PANAMA sin orden es recibido y con orden "preparando", salvo orden despachada con guía o en el paso 4 o más (en camino); cualquier otro estado con orden "preparando" y sin orden recibido. Los eventos EN_TRAMITE/DESPACHADO se ocultan si el estado público es recibido o preparando. El cambio de estado de la orden exige el estado esperado en el `WHERE` del UPDATE; si no devuelve fila, 409.

## Órdenes: listado sin filtro por defecto, Monto sin estado y orden sin paquetes bloqueada (2026-10-24)

El listado entra sin filtros: "Sin pagar" preaplicado escondía órdenes sin que el operador lo notara. Monto dice solo la cifra y su origen ("Estimado" o "Factura"); el estado de pago lo dice únicamente la columna Pago, con los cuatro nombres. Peso y paquetes del listado y del detalle salen de la suma de los paquetes asignados, no del peso guardado en la orden. El servidor rechaza generar o confirmar el estimado, pasar a Cierre, despachar y finalizar una orden sin paquetes ("La orden no tiene paquetes..."). Autoría de la 033: el detalle trae `billing_paid_by_backfilled` y no se muestra "por ..." si el autor es el del backfill. Los días desde el despacho se cuentan por fecha de negocio de Costa Rica (`businessDaysSince`). Se quitó el badge de estado del encabezado del detalle (el stepper ya dice el paso; un status heredado ENTREGADO contradecía el paso 4) y "Ver factura" aparece una sola vez por pantalla. En el paso 3, "Aviso al cliente" pasa a "Aviso de despacho" y la fila que envía la guía a "Guía y rastreo al cliente".

## Estimado: el peso sale de los paquetes asignados (2026-10-24)

`generatePreBilling` calcula el peso con la suma de `packages.weight_lb` de la orden, no con `consolidations.total_weight_lb`, que puede quedar desactualizado (una orden con 0 guardado y 3 lb reales se estimaba con el mínimo). El mínimo de `system_settings` y el resto de la fórmula no cambian. Confirmar la factura ya usa el snapshot `pre_billing.total_weight_charged`, así que hereda el peso correcto. Desde el Operativo, el detalle resalta la fila del estimado 2,5 s y solo hace scroll si no se ve (`block: nearest`).

## Órdenes: filtro de pago con los cuatro nombres y Monto "—" sin estimado (2026-10-24)

El filtro "Pago" ofrece exactamente Sin estimado, Estimado enviado, Por cobrar y Pagada, con las mismas reglas SQL que `getPaymentStatus` (un estimado sin `notified_at` cuenta como Sin estimado), así que cada fila filtrada lleva el badge elegido. `paid=FACTURADA_SIN_PAGAR` (Operativo) y `SIN_PAGAR` quedan como alias de POR_COBRAR; la regla de Por cobrar es la de antes, así que los números del Operativo no cambian. Con "Sin estimado" el Monto muestra "—" aunque haya un borrador: el monto del estimado se ve en el detalle. Las órdenes sin paquetes se rechazan con `EmptyOrderError` y responden 409.

## Órdenes: seguimiento por día de calendario, estimado y factura sin duplicados, peso bloqueado con factura (2026-10-24)

"Seguimiento pendiente" (listado y Operativo) cuenta días de calendario de Costa Rica entre 3 y 30 desde el despacho, con la misma expresión que la ficha (`businessDaysSince`). `generatePreBilling` actualiza el estimado existente y solo inserta con `INSERT … SELECT … WHERE NOT EXISTS`; `confirmPreBilling` inserta la factura igual y, si ya existe, responde 409. Si el monto de un estimado ya avisado cambia al recalcular o al agregar paquetes, `notified_at` vuelve a nulo en la misma sentencia (el cliente no vio la cifra nueva). Cambiar el peso de un paquete se rechaza con 409 si la orden ya tiene factura; con solo estimado se permite y el peso de la orden se actualiza en la misma sentencia. El mensaje de WhatsApp del estimado usa el peso cobrado congelado en `pre_billing.total_weight_charged`.

## Casillero: "Copiar mensaje" copia la bienvenida completa (pedido del dueño, 2026-10-24)

"Copiar" ya no copia solo el código: copia el mismo mensaje de bienvenida que abre WhatsApp, armado
por una sola función para los dos botones (ruta neutra, sin courier ni Panamá). Las acciones son
discretas ("WhatsApp", "Copiar mensaje") y "Quitar" va aparte, arriba, con confirmación.

## Clientes: filtros como Órdenes, sin Importar y búsqueda fuera de la URL (pedido del dueño, 2026-10-24)

El listado usa el mismo `FilterBar` que Órdenes (estado y tipo, chips y "Limpiar"), con estado, tipo y
página en la URL para que atrás los conserve. La búsqueda se guarda en `sessionStorage` y no en la
URL: puede ser una cédula o un teléfono y no debe quedar en historial ni logs. Se quitó la
importación desde Excel completa (pantalla, API, servicio) y la librería `xlsx`, que nadie más usaba.

## Paquetes: el paso de la orden en vez de su estado y búsqueda de rastreo tolerante (2026-10-24)

Las tarjetas, la columna Orden y el detalle del paquete muestran el paso ("Orden en Cobro") y no el
estado interno ("Orden cerrada"), igual que el detalle de la orden. Rastrear paquete del backoffice
usa el criterio del rastreo público: exacto, luego sin mayúsculas ni espacios; con dos coincidencias
pide escribirlo exacto (409) en vez de elegir uno.

## Configuración, menú e Inicio fuera de esta entrega (decisión del dueño, 2026-10-24)

"Configuración no se integra". El trabajo de esa fase (Tarifas, Couriers, Tipos, Métodos, Plantillas,
menú, nombres del header, Inicio y el botón principal en teal-700) quedó como parche fuera del repo,
revisado por UX, para retomarlo cuando el dueño lo pida.
