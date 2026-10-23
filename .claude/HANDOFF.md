# Traspaso — Magastore backoffice

## Qué quiere el usuario
- Todo muy probado: recorrer los flujos que pueden romperse y entregar capturas (móvil y escritorio).
- Botones con buen espaciado interno; mensajes para el operador, nada técnico (sin `EN_TRAMITE`, `PANAMA`, `AEREO`); tuteo, no voseo.
- Que cada paso tenga un sentido operativo obvio: una acción principal por paso.
- Filtros del listado de órdenes como en `audiocolors-backoffice`: sección de filtros con varias casillas por grupo, no selects que se cortan.
- Migraciones automáticas con GitHub Actions al aprobar el PR a `main`.

## Reglas de negocio confirmadas
- Quién recibe va aparte de la dirección: el cliente tiene una lista de personas que reciben (mamá, tío…) y en cada orden se elige dirección y persona por separado ("él recibe en X" o "su mamá recibe en X"). Confirmado el 23/10/2026.
- Sección de Incidencias: fuera de alcance por ahora.
- Teléfono del PDF: lo cambia el usuario en Vercel (`NEXT_PUBLIC_WHATSAPP_NUMBER`).
- Logo oficial: sistema de logos del 30/08/2026 en `D:\Documentos\Docs_Clientes\Magastore\` (brand book con los mismos colores que `src/components/landing/tokens.ts`).

## En qué estamos (rama `feat/ui-ordenes-marca`, sin subir)
- PDF de marca (`b7f1ea0`) y workflow de migraciones en main (`73ab4cf`; falta el secreto `DATABASE_URL` en el entorno `production` de GitHub).
- Hallazgos 1–10 corregidos, detalle rediseñado (un paso activo como lista de tareas, resumen al costado, ficha de orden finalizada con historial), filtros con casillas (`FilterBar` común), personas que reciben aparte de la dirección (migración 035 `customer-recipients`, aplicada solo en dev).
- Semántica nueva: paso 3 → 4 deja la orden Despachada; Finalizar la marca Entregada junto con los paquetes. Retiro en oficina sin dirección ni guía.
- Probado en dev con PRB202 (retiro, sin pago y luego pago en efectivo) y PRB203 (Correos, recibe la mamá), móvil y escritorio.

## Observaciones sin cambiar
- Los paquetes pasan a "En trámite" recién al registrar el pago: despachados sin pago siguen "En Panamá" en el rastreo.
- Quedan órdenes de prueba de postventa (PRB101) con 0 paquetes en dev.

## Preguntas abiertas
- Plantillas: el usuario pidió alinearlas con TickTick. Diferencias: seguimiento postventa sin número de orden, pedir y confirmar dirección con otra redacción, estimado con campos vacíos ("Precio x lb:", "Envío:"). Falta su visto bueno al texto final.
- ¿Qué base usa Vercel en producción? Debe ser la misma del secreto `DATABASE_URL` (`ep-blue-sky…`).
