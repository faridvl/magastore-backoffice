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
- **Chequeo de migraciones en cada PR a `main`** (`.github/workflows/migraciones-pr.yml`, check `migraciones`): lista las migraciones nuevas en el resumen y en un comentario del PR, y falla si se edita una migración de main o la numeración no es seguida. Falta verlo correr en el PR #7 y, si se quiere que bloquee, marcarlo como requerido en la protección de `main` (hoy `main` no tiene protección).
- **Corrección de UX para iPad** (`.claude/docs/auditoria-ux-ipad.md`, todo el informe con Pulir). En develop: patrones comunes y cortes (`xl`=1200, `2xl`=1400), "el cliente nunca ve Panamá", ficha y listado de clientes, reglas del Operativo, casillero con "Copiar mensaje", filtros de Clientes como Órdenes (sin Importar), Órdenes (listado, detalle pasos 1-5, errores de lógica) y Paquetes (listado, detalle, registrar, rastrear). Evidencia: `%TEMP%/mg-capturas/evidencia/` y `%TEMP%/mg-capturas/ux-*/`.
- Facturación y Reportes rehechos (filtros como Órdenes y Clientes, totales que cuadran con cada filtro, Reportes por día de Costa Rica, Farid con estado visible).
- **Regla provisional (Reportes):** "Marcar pagado" de la participación de Farid queda deshabilitado para el mes en curso ("Se liquida al cerrar el mes"). Elegida por ser la más conservadora; confirmar con el dueño.
- **Pregunta abierta (Reportes):** "Cobrado" suma lo cobrado de las facturas emitidas en el mes (por fecha de emisión), no la plata que entró en el mes (fecha de pago). Una factura del 30/09 pagada el 05/10 cuenta en setiembre. ¿Es lo que el dueño quiere leer, o hace falta una vista de caja por fecha de pago?
- **Tres "Por cobrar" de todas las fechas** no cuentan exactamente lo mismo: Operativo (facturas sin pagar con estimado), Órdenes "Por cobrar" (orden con factura sin pagar) y Facturación sin filtros (todas las facturas sin pagar). Coinciden mientras no haya facturas sin estimado ni dos facturas por orden; consultas para comprobarlo en "Antes del pase".
- **Configuración, menú, nombres del header e Inicio (fase 5):** fuera por decisión del dueño ("Configuración no se integra"). Lo hecho y revisado por UX quedó en el parche `%TEMP%/mg-capturas/parches/fase5-configuracion-menu-inicio.patch` (incluye el botón principal en teal-700 por contraste, el menú con "Inicio" y grupos de 44 px, y el aviso de cambios sin guardar).
- **Pendientes de UX en componentes comunes** (no se tocaron para no chocar con otro trabajo): métodos de pago cortados en el modal de factura ("Transferenci", `payment-method-picker`); "Admin (histórico)" en `billing-detail-modal` cuando la autoría es heredada; punto suelto en el subtítulo de la factura sin correo; título del aviso "Notificar paquetes disponibles" → "Avisar paquetes que llegaron"; "Ver 0 resultados" habilitado en `FilterBar`; "0 registros" en el pie de `NewTable` mientras carga; botón principal verde claro (contraste 2:1) mientras no entre el parche de la fase 5.
- **Verificado solo con tsc, lint y PGlite** (última ronda del cuestionador en Órdenes y Paquetes): desglose del WhatsApp del estimado con el peso congelado del estimado; seguimiento por días de calendario de CR en ficha, Operativo y listado; bloqueo del cambio de peso con factura; estimado que vuelve a "sin avisar" si cambia el monto; estimado y factura sin duplicarse con doble clic; validación de ids en `/api/consolidations` y `/api/logistics`; rastreo del backoffice con varias coincidencias (409). Sin probar con datos: agregar paquetes a una orden con factura (409; qa no tuvo permiso de escritura) y las facturas por cobrar reales (en dev las 33 están pagadas).
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
- **Correos:** hoy probablemente no llegan a los clientes: con el remitente por defecto `onboarding@resend.dev` Resend solo entrega al dueño de la cuenta. Confirmar en Vercel (`EMAIL_FROM`) o en el panel de Resend. El remitente será `notifications@magastorecr.com` cuando se verifique `magastorecr.com` (pasos en `.claude/docs/email-setup.md`). Un solo correo: comprobante de factura pagada, que el operador envía con un botón desde la factura (decisión del dueño, 2026-10-24). Apagado (`EMAIL_NOTIFICATIONS_ENABLED`) hasta verificar el dominio; pasos en `.claude/docs/email-setup.md`. Dev tiene `consolidations.invoice_email_number` sin uso, de una migración descartada.
- **Antes del pase, en producción (solo lectura):** `SELECT code FROM whatsapp_templates WHERE body ~* 'panam|pty'`, `SELECT name, origin FROM courier_rates` y `SELECT origin, address_line, city, state FROM warehouse_routes`: nada que diga Panamá o PTY. Mitigación inmediata sin deploy: editar hoy en Ajustes de producción la plantilla "Paquetes disponibles" para quitar "en Panamá" (la 037 es idempotente y después no hace nada).
- **Antes del pase, en producción (solo lectura), por las reglas del Operativo:**
  1. `SELECT status, count(*) FROM packages WHERE consolidation_id IS NULL GROUP BY status`. Lo normal es solo `PANAMA` (y `ENTREGADO`). `EN_TRAMITE` sin orden ya no se puede crear; los que existan, y los estados viejos (`MIAMI`, `TRANSITO`, `BODEGA_CR`, `DESPACHADO`…), se corrigen uno a uno en Logística > detalle del paquete > Cambiar estado: el selector muestra el estado actual aunque sea viejo y permite pasarlo a "En Bodega Panamá" (o decidir con el usuario si de verdad salió). Mientras existan, un paquete sin orden fuera de `PANAMA` no sale en Paquetes, el Operativo ni el aviso.
  2. `SELECT count(*) FROM billing WHERE is_paid AND paid_at IS NULL` (pagadas sin fecha de pago). Si da más de 0: no pueden marcarse en rojo en "Confirmar y cobrar"; completar `paid_at` a mano con la fecha real, con el usuario.
- **Antes del pase, en producción (solo lectura), por Órdenes:**
  1. Órdenes vacías atascadas (ya no se pueden crear, pero pueden existir): `SELECT uuid, status, current_step FROM consolidations con WHERE current_step BETWEEN 2 AND 4 AND NOT EXISTS (SELECT 1 FROM packages p WHERE p.consolidation_id = con.id)`. Si hay, decidir con el usuario si se borran a mano.
  2. Estimados o facturas duplicados: `SELECT consolidation_id, COUNT(*) FROM billing GROUP BY 1 HAVING COUNT(*) > 1` y lo mismo sobre `pre_billing`. Sin restricción única en la base queda una ventana mínima con dos peticiones simultáneas.
  3. Facturas sin pagar sin estimado: `SELECT COUNT(*) FROM billing b WHERE b.is_paid = false AND NOT EXISTS (SELECT 1 FROM pre_billing pb WHERE pb.consolidation_id = b.consolidation_id)`. Si da más de 0, el "Por cobrar" del Operativo no coincide con el de Facturación.
- **Limitaciones conocidas (cobros):** si se cambia el costo real de entrega (paso 4) después del aviso de cobro, la factura sigue "Ya avisada" con otro monto. El estimado solo se envía en el paso 2: una orden sin pagar y sin aviso en los pasos 3 a 5 sale de "Por avisar" con el aviso del paso 3 ("Avisar y recordar pago", vale también para retiro en oficina) o al pagarse. En los pasos 4 y 5 no hay ninguna acción de aviso de cobro: limitación provisional, no se inventó un mensaje nuevo al cliente.
- **Estado público del paquete (rastreo), sin migrar datos:** ENTREGADO es entregado. EN_TRAMITE o DESPACHADO: sin orden, en camino; con orden, en camino solo si la orden está despachada o entregada, si no "preparando". PANAMA: sin orden, recibido; con orden, "preparando", salvo orden despachada con guía o en el paso 4 o más (en camino). Cualquier otro estado: con orden "preparando", sin orden recibido. Los eventos EN_TRAMITE/DESPACHADO se ocultan si el estado público queda en recibido o preparando.
- **Migración 037** (plantilla sin Panamá): aplicada en dev (2026-10-24; la plantilla de dev ya no decía Panamá, no cambió nada); falta producción.
- **Pregunta abierta (Panamá):** el repo es público y el README, CLAUDE.md, el glosario, los seeds y el historial dicen que los paquetes pasan por Panamá. ¿Lo hacemos privado? (Lo decides tú; borrar el texto no basta por el historial.)
- **Pregunta abierta (seguridad):** varias APIs solo comprueban que exista un token y no lo validan (`/api/logistics`, `customers/[id]/packages`, `dashboard/operations`): con cualquier `Authorization: Bearer x` devuelven paquetes con datos del cliente y el estado "PANAMA". Propuesta: una fase propia que valide el JWT en todos los handlers.
- **Verificado por el dueño (2026-10-24):**
  - Base de producción: host `ep-blue-sky-aivra1o1-pooler.c-4.us-east-1.aws.neon.tech`, base `neondb`; distinta de la de desarrollo (`ep-falling-morning-aiwemn6e`).
  - Environment `db-production` creado en GitHub: solo la rama `main`, con el secreto `DATABASE_URL` y las variables `EXPECTED_DATABASE_HOST` y `EXPECTED_DATABASE_NAME` (verificado por API).
  - Consultas de solo lectura en producción, todo bien: sigue en la 027 (`current_step` no existe); los paquetes sin orden son solo `PANAMA` (5); no hay facturas pagadas sin `paid_at`; no hay facturas duplicadas por orden.
  - **Lo único que falta para el pase:** el merge del PR faridvl/magastore-backoffice#7 fuera del horario del operador y, después, Run workflow con `aplicar` y `confirmar`.
- **Antes del primer merge a `main`**, en GitHub → Settings → Environments → New environment `db-production` (no usar "Production": es de Vercel):
  1. Deployment branches → Selected branches → `main`.
  2. Environment secret `DATABASE_URL` = la URL de Vercel de arriba.
  3. Environment variables `EXPECTED_DATABASE_HOST` y `EXPECTED_DATABASE_NAME`, copiadas de la URL de **Vercel** (host y lo que va después de la `/`), no de la que pegaste en el secreto.
  Si el merge llega antes, GitHub crea el environment vacío y sin regla de rama: configurarlo igual.
- Antes de aplicar, en la consola de Neon (solo lectura) confirmar que producción va en 027:
  `SELECT column_name FROM information_schema.columns WHERE table_name='consolidations' AND column_name='current_step'` → sin filas. Si el plan dice "la base ya tiene cambios de…", no aplicar.
- **Merge fuera del horario del operador** y aplicar apenas salga el plan: Actions → "Migraciones de producción" → Run workflow en `main`, `aplicar` ✓, `confirmar` = el texto `<versión>@<sha>` que muestra el resumen del plan. Entre el deploy de Vercel y la migración fallan Órdenes, Paquetes (listado y detalle leen el paso de la orden), Facturación (lee el paso de la orden y el método de pago, de la 030 y la 033), estimados y su PDF, confirmar factura, marcar pagado, reportes de facturación y personas que reciben (y el Inicio, si se sube el Operativo). El código actual de `main` sí funciona con las columnas nuevas.
- Si un apply falla a medias, lanzar un Run workflow nuevo; "Re-run failed jobs" falla cerrado.
- La rama local `feat/ui-ordenes-marca` trae el workflow viejo (aplica sin confirmar): no mergearla tal cual.

## Riesgos de las migraciones 028–036 sobre datos reales
- 033 atribuye todas las facturas viejas al usuario más antiguo (`authorship_backfilled = true`). Corregido: el resumen de la orden finalizada ya no dice "por …" si la autoría es heredada (`authorship_backfilled AND payment_method IS NULL`). El "por …" de Reportes es el pago de la participación de Farid, que la 033 no toca.
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
