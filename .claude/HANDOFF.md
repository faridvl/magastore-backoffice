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
- **El cliente nunca sabe que sus paquetes pasan por Panamá** (2026-10-24): rastreo público, plantillas de WhatsApp, correos, PDF y landing no mencionan Panamá ni PTY; la ruta que ve es "Estados Unidos → Costa Rica". En el backoffice "En Panamá" sigue.
- Logo oficial: `D:\Documentos\Docs_Clientes\Magastore\` (versiones transparentes en `public/logo/`).

## En qué estamos
- Migraciones 028–037 aplicadas en dev; producción sigue en 027. El merge a `main` ya no migra: solo muestra el plan, y aplicar es manual desde Actions con confirmación (README, "Migraciones SQL").
- Dos rondas de pruebas contra el API de dev y dos de revisión: sin defectos abiertos.
- Anotaciones de la agenda hechas: sin la tarjeta "Sin costo cargado" en el Operativo; libras, ganancia y "Para Farid" del mes en el Dashboard.
- Operativo rediseñado (`/admin/operations`): "Tu día" en el orden del flujo y "Cobros" (Por avisar / Ya avisados). Los 9 números coinciden con la pantalla a la que lleva cada botón (dev, 2026-10-24). Revisado por qa, revisor de UX y cuestionador; decisiones en `DECISIONS.md`.
- Operativo, reglas confirmadas (2026-10-24): el aviso del paso 3 a una orden sin pagar cuenta como aviso de cobro (el correo automático no); una orden pagada en el paso 2 se marca en rojo a los 2 días desde el pago; "Avisar" y "Armar órdenes" cuentan solo paquetes en Panamá sin orden; los paquetes pasan a EN_TRAMITE al despachar, no al pagar (datos viejos: el rastreo público se guía por la orden). Detalle en `DECISIONS.md`.
- Antes de producción, en la consola de Neon (solo lectura), revisar facturas sin pagar sin estimado (`billing` sin `pre_billing`): no salen en ninguna pestaña de Cobros. En dev no hay.
- El API `/api/dashboard/operations` solo revisa que haya token, no el rol (riesgo 5 de la ficha).

## Entorno local con Docker (rama `feat/docker-local`, sin verificar en Docker)
- Base Postgres 17 + proxy del driver de Neon, persistente (`magastore-local`). Estructura de prod (027) y, con otro comando, 028–036 con el mismo `migrate.mjs` de producción. Datos: solo el seed ficticio de `docker/seed/` (el usuario no quiere copias de dev ni de prod). Comandos y escenarios en README, "Entorno local con Docker".
- Probado sin daemon (PGlite): esquema 001 + 003–036, seed idempotente, la 036 actualiza el estimado; tsc y eslint limpios.
- **Falta, al arrancar Docker** (solo con `arrancar-docker.ps1` de la skill `docker`): `npm run docker:reset`, que el proxy acepte `db.localtest.me` (HTTP y WebSocket del `Pool`), `docker:reset:027` + `docker:migrate`, `dev:docker` en `http://127.0.0.1:3030` con login del usuario de prueba, persistencia tras down/up, capturas (375, 1024, 1280) de Inicio, Órdenes, detalle, finalizada, cliente con personas que reciben y PDF. Después, fijar la imagen del proxy por digest.

## Pase a producción (pendiente, lo hace el usuario)
- **Ya visible en producción:** el rastreo público dice "Recibido en Panamá" / "Bodega Panamá" y devuelve notas internas del operador, y la plantilla de paquetes disponibles dice "bodega en Panamá". Lo corrige el próximo pase (código + migración 037).
- **Correos:** hoy probablemente no llegan a los clientes: con el remitente por defecto `onboarding@resend.dev` Resend solo entrega al dueño de la cuenta. Confirmar en Vercel (`EMAIL_FROM`) o en el panel de Resend. El remitente será `notifications@magastorecr.com` cuando se verifique `magastorecr.com` (pasos en `.claude/docs/email-setup.md`). Pregunta abierta: ¿quieres los dos correos (factura y entrega), solo uno o ninguno?
- **Antes del pase, en producción (solo lectura):** `SELECT code FROM whatsapp_templates WHERE body ~* 'panam|pty'`, `SELECT name, origin FROM courier_rates` y `SELECT origin, address_line, city, state FROM warehouse_routes`: nada que diga Panamá o PTY. Mitigación inmediata sin deploy: editar hoy en Ajustes de producción la plantilla "Paquetes disponibles" para quitar "en Panamá" (la 037 es idempotente y después no hace nada).
- **Antes del pase, en producción (solo lectura), por las reglas del Operativo:**
  1. `SELECT status, count(*) FROM packages WHERE consolidation_id IS NULL GROUP BY status`. Lo normal es solo `PANAMA` (y `ENTREGADO`). `EN_TRAMITE` sin orden ya no se puede crear; los que existan, y los estados viejos (`MIAMI`, `TRANSITO`, `BODEGA_CR`, `DESPACHADO`…), se corrigen uno a uno en Logística > detalle del paquete > Cambiar estado: el selector muestra el estado actual aunque sea viejo y permite pasarlo a "En Bodega Panamá" (o decidir con el usuario si de verdad salió). Mientras existan, un paquete sin orden fuera de `PANAMA` no sale en Paquetes, el Operativo ni el aviso.
  2. `SELECT count(*) FROM billing WHERE is_paid AND paid_at IS NULL` (pagadas sin fecha de pago). Si da más de 0: no pueden marcarse en rojo en "Confirmar y cobrar"; completar `paid_at` a mano con la fecha real, con el usuario.
- **Limitaciones conocidas (cobros):** si se cambia el costo real de entrega (paso 4) después del aviso de cobro, la factura sigue "Ya avisada" con otro monto. El estimado solo se envía en el paso 2: una orden sin pagar y sin aviso en los pasos 3 a 5 sale de "Por avisar" con el aviso del paso 3 ("Avisar y recordar pago", vale también para retiro en oficina) o al pagarse. En los pasos 4 y 5 no hay ninguna acción de aviso de cobro: limitación provisional, no se inventó un mensaje nuevo al cliente.
- **Estado público del paquete (rastreo), sin migrar datos:** ENTREGADO es entregado. EN_TRAMITE o DESPACHADO: sin orden, en camino; con orden, en camino solo si la orden está despachada o entregada, si no "preparando". PANAMA: sin orden, recibido; con orden, "preparando", salvo orden despachada con guía o en el paso 4 o más (en camino). Cualquier otro estado: con orden "preparando", sin orden recibido. Los eventos EN_TRAMITE/DESPACHADO se ocultan si el estado público queda en recibido o preparando.
- **Migración 037** (plantilla sin Panamá): aplicada en dev (2026-10-24; la plantilla de dev ya no decía Panamá, no cambió nada); falta producción.
- **Pregunta abierta (Panamá):** el repo es público y el README, CLAUDE.md, el glosario, los seeds y el historial dicen que los paquetes pasan por Panamá. ¿Lo hacemos privado? (Lo decides tú; borrar el texto no basta por el historial.)
- **Pregunta abierta (seguridad):** varias APIs solo comprueban que exista un token y no lo validan (`/api/logistics`, `customers/[id]/packages`, `dashboard/operations`): con cualquier `Authorization: Bearer x` devuelven paquetes con datos del cliente y el estado "PANAMA". Propuesta: una fase propia que valide el JWT en todos los handlers.
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
