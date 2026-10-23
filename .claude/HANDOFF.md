# Traspaso — Magastore backoffice

## Qué quiere el usuario
- Todo muy probado: recorrer los flujos que pueden romperse y entregar capturas (móvil y escritorio).
- Botones con buen espaciado interno; mensajes para el operador, nada técnico (sin `EN_TRAMITE`, `PANAMA`, `AEREO`); tuteo, no voseo.
- Que cada paso tenga un sentido operativo obvio: una acción principal por paso.
- Filtros del listado de órdenes como en `audiocolors-backoffice`: sección de filtros con varias casillas por grupo, no selects que se cortan.
- Migraciones automáticas con GitHub Actions al aprobar el PR a `main`.

## Reglas de negocio confirmadas
- La dirección a veces no es del cliente: la recibe otra persona (mamá, tío…). Cada dirección necesita "quién recibe" (nombre, teléfono, cédula) guardado, no solo editable en la solicitud al proveedor.
- Sección de Incidencias: fuera de alcance por ahora.
- Teléfono del PDF: lo cambia el usuario en Vercel (`NEXT_PUBLIC_WHATSAPP_NUMBER`).
- Logo oficial: sistema de logos del 30/08/2026 en `D:\Documentos\Docs_Clientes\Magastore\` (brand book con los mismos colores que `src/components/landing/tokens.ts`).

## En qué estamos (rama `feat/ui-ordenes-marca`)
- Hecho: PDF de factura y estimado con negro/dorado y logo secundario (`b7f1ea0`).
- Recorrido completo probado con el cliente PRB201 en dev. Hallazgos:
  1. Crear orden desde Paquetes: cliente sin dirección queda trabado (no ofrece agregar).
  2. Retiro en oficina exige dirección.
  3. Paso 3: "Siguiente" marca la orden y los paquetes como ENTREGADO al cargar la guía (el rastreo público dice "Entregado" con el paquete en camino).
  4. Cierre: el botón del vuelto dice "Marcar entregado".
  5. Rentabilidad finalizada: "Costo entrega" no refleja el costo real cargado (los números no suman).
  6. Finalizada no muestra paquetes, dirección, guía ni pago.
  7. Escritorio 1280 px: la columna Cierre queda cortada.
  8. "Atrás" en paso 2 y quitar paquete no piden confirmación.
  9. Guardar guía vacía cierra sin aviso; montos con espacio (`₡27 867`) en vez de `₡27.867`.
  10. Al confirmar pago se abren dos cosas a la vez (aviso al cliente y solicitud al proveedor).
- Producción y dev son bases distintas; producción tiene aplicadas hasta la 027.

## Decidido el 23/10/2026
- Migraciones: workflow en `main` con registro en la tabla `schema_migrations` de la base; punto de partida = lo que `db-migrations.json` tiene en prod (hasta 027). Hecho y probado en dev; falta que el usuario cargue el secreto.
- Paso 3: "Siguiente" deja la orden en camino (Despachado); Entregado recién al finalizar en el Cierre.
- Retiro en oficina se crea sin dirección.
- Quién recibe: nombre, teléfono y cédula, opcionales por dirección; vacíos = datos del cliente.

## Qué sigue
1. Corregir hallazgos 1–10 y rediseñar la UI de órdenes (pasos, filtros).
2. "Quién recibe" por dirección (migración nueva).

## Preguntas abiertas
- ¿Qué base usa Vercel en producción? Debe ser `ep-blue-sky…`, la misma del secreto `DATABASE_URL`.
