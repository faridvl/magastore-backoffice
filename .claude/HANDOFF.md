# Traspaso — Magastore backoffice

## Qué quiere el usuario
- Todo muy probado: recorrer los flujos que pueden romperse y entregar capturas (móvil, iPad y escritorio). El iPad (app instalada, sin WhatsApp) es el dispositivo principal.
- El operador no es técnico: mensajes claros, tuteo, sin términos internos. Pocas palabras en las tareas, una acción principal por paso.
- Prioridad a lo pendiente en TickTick (proyecto "🏪 MagaStore").
- Todo a `develop`, sin push ni PR hasta que lo pida.

## Reglas de negocio confirmadas
- Quién recibe va aparte de la dirección: el cliente tiene personas que reciben y en cada orden se elige dirección y persona por separado.
- Paso 3 → 4 deja la orden Despachada; Finalizar la marca Entregada junto con sus paquetes. Retiro en oficina: sin dirección, guía ni persona que recibe.
- Plantillas de WhatsApp alineadas con los textos de TickTick (migración 036). La reseña va sin enlace: el cliente responde por WhatsApp.
- Incidencias: fuera de alcance por ahora.
- Logo oficial: `D:\Documentos\Docs_Clientes\Magastore\` (versiones transparentes en `public/logo/`).

## En qué estamos
- Migraciones 028–036 aplicadas en dev; producción sigue en 027. El merge a `main` ya no migra: solo muestra el plan, y aplicar es manual desde Actions con confirmación (README, "Migraciones SQL").
- Dos rondas de pruebas contra el API de dev y dos de revisión: sin defectos abiertos.
- Anotaciones de la agenda hechas: sin la tarjeta "Sin costo cargado" en el Operativo; libras, ganancia y "Para Farid" del mes en el Dashboard.
- Dashboard "Operativo" revisado: números inflados por paquetes entregados, enlaces que no coinciden con la tarjeta, nada del flujo de órdenes, tablas con scroll lateral en iPad y celular, botones chicos, sin "Reintentar". Propuesta: lista "Tu día" en el orden del flujo + panel de cobros. **Esperando decisión** (todo junto o primero números y enlaces).

## Entorno local con Docker (rama `feat/docker-local`, sin verificar en Docker)
- Base Postgres 17 + proxy del driver de Neon, persistente (`magastore-local`). Estructura de prod (027) y, con otro comando, 028–036 con el mismo `migrate.mjs` de producción. Datos: solo el seed ficticio de `docker/seed/` (el usuario no quiere copias de dev ni de prod). Comandos y escenarios en README, "Entorno local con Docker".
- Probado sin daemon (PGlite): esquema 001 + 003–036, seed idempotente, la 036 actualiza el estimado; tsc y eslint limpios.
- **Falta, al arrancar Docker** (solo con `arrancar-docker.ps1` de la skill `docker`): `npm run docker:reset`, que el proxy acepte `db.localtest.me` (HTTP y WebSocket del `Pool`), `docker:reset:027` + `docker:migrate`, `dev:docker` en `http://127.0.0.1:3030` con login del usuario de prueba, persistencia tras down/up, capturas (375, 1024, 1280) de Inicio, Órdenes, detalle, finalizada, cliente con personas que reciben y PDF. Después, fijar la imagen del proxy por digest.

## Pase a producción (pendiente, lo hace el usuario)
- **Pregunta abierta:** qué base usa Vercel en producción (`MAGASTORE_DB_POSTGRES_URL` del entorno Production de Vercel).
- **Antes del primer merge a `main`**, en GitHub → Settings → Environments → New environment `db-production` (no usar "Production": es de Vercel):
  1. Deployment branches → Selected branches → `main`.
  2. Environment secret `DATABASE_URL` = la URL de Vercel de arriba.
  3. Environment variables `EXPECTED_DATABASE_HOST` y `EXPECTED_DATABASE_NAME`, copiadas de la URL de **Vercel** (host y lo que va después de la `/`), no de la que pegaste en el secreto.
  Si el merge llega antes, GitHub crea el environment vacío y sin regla de rama: configurarlo igual.
- Antes de aplicar, en la consola de Neon (solo lectura) confirmar que producción va en 027:
  `SELECT column_name FROM information_schema.columns WHERE table_name='consolidations' AND column_name='current_step'` → sin filas. Si el plan dice "la base ya tiene cambios de…", no aplicar.
- **Merge fuera del horario del operador** y aplicar apenas salga el plan: Actions → "Migraciones de producción" → Run workflow en `main`, `aplicar` ✓, `confirmar` = el texto `<versión>@<sha>` que muestra el resumen del plan. Entre el deploy de Vercel y la migración fallan Órdenes, estimados y su PDF, confirmar factura, marcar pagado, reportes de facturación y personas que reciben (y el Inicio, si se sube el Operativo). El código actual de `main` sí funciona con las columnas nuevas.
- Si un apply falla a medias, lanzar un Run workflow nuevo; "Re-run failed jobs" falla cerrado.
- La rama local `feat/ui-ordenes-marca` trae el workflow viejo (aplica sin confirmar): no mergearla tal cual.

## Riesgos de las migraciones 028–036 sobre datos reales
- 033 atribuye todas las facturas viejas al usuario más antiguo (`authorship_backfilled = true`). El modal de factura lo muestra como histórico, pero el resumen de la orden finalizada (`finalized-summary.tsx`) y el tooltip de reportes (`billing-reports-container.tsx`) muestran "por <ese usuario>": corregir antes de producción.
- 030 deja las órdenes viejas DESPACHADO en el paso 3 (piden guía para avanzar) y las ENTREGADO en 5; las despachadas hace 3 a 30 días salen en "Seguimiento pendiente".
- 036 reemplaza el estimado (`PREBILLING_READY`) si tiene el texto original o conserva una línea que termina en "Envío:" o "Precio x lb:", aunque el resto se haya editado en Ajustes.
- 035 borra columnas que no existen en producción: sin pérdida.

## Otros pendientes
- Favicon, íconos de la PWA y splash de iOS con el logo nuevo.
- Crear orden y confirmar factura usan `BEGIN` sobre HTTP de Neon, que no es una transacción real.
- El API de personas que reciben guarda el teléfono tal cual llega; la máscara es solo de la interfaz.

## Sin verificar (2026-10-24, migraciones a producción en dos pasos)

Se probó con un Postgres local simulando producción en 027. Falta:
- La corrida real del workflow en GitHub Actions (plan en push a `main` y Run workflow con
  confirmación); no se validó con actionlint.
- La conexión a Neon con TLS real y los datos reales de producción.
- Corregir la autoría que deja la 033 en `finalized-summary.tsx` y el tooltip de
  `billing-reports-container.tsx` antes de aplicar en producción.
