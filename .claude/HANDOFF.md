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
- Migraciones 028–036 aplicadas en dev; producción sigue en 027 y las aplica el workflow al hacer merge a `main`.
- Dos rondas de pruebas contra el API de dev y dos de revisión: sin defectos abiertos.
- Anotaciones de la agenda hechas: sin la tarjeta "Sin costo cargado" en el Operativo; libras, ganancia y "Para Farid" del mes en el Dashboard.
- Dashboard "Operativo" revisado: números inflados por paquetes entregados, enlaces que no coinciden con la tarjeta, nada del flujo de órdenes, tablas con scroll lateral en iPad y celular, botones chicos, sin "Reintentar". Propuesta: lista "Tu día" en el orden del flujo + panel de cobros. **Esperando decisión** (todo junto o primero números y enlaces).

## Pendiente
- Secreto `DATABASE_URL` del entorno `production` en GitHub y revisar qué base usa Vercel (lo dejó para después).
- Favicon, íconos de la PWA y splash de iOS con el logo nuevo.
- Crear orden y confirmar factura usan `BEGIN` sobre HTTP de Neon, que no es una transacción real.
- El API de personas que reciben guarda el teléfono tal cual llega; la máscara es solo de la interfaz.
