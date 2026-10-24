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
