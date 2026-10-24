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
