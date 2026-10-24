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

`FACTURADA_SIN_PAGAR` exige factura emitida y sin pagar; "Sin pagar (con estimados)" sigue
incluyendo órdenes sin factura. Cobros del Operativo usa el primero para que "Ver todas" muestre
exactamente las mismas facturas.

## Cobros: "Enviar estimado" solo en el paso Cobro (2026-10-24)

El botón de la tarjeta usa el mismo verbo que la fila "Estimado enviado al cliente" del detalle,
que solo existe en el paso 2; las pestañas "Por avisar"/"Ya avisados" se quedan. "Por avisar"
incluye facturas sin pagar con estimado sin enviar en cualquier paso (2 a 5) para que una
factura no desaparezca al finalizar la orden; en los pasos 3 a 5 la tarjeta abre la factura.
Provisional: falta que el usuario diga si "Avisar y recordar pago" del paso 3 cuenta como aviso.

## Participaciones de Farid en mes equivocado: no se corrigen (2026-10-24)

Las participaciones de ganancia ya registradas en un mes que no corresponde se dejan como están,
por decisión del usuario. No se escriben migraciones ni scripts para moverlas.
