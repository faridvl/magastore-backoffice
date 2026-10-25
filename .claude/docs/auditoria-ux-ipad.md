# Auditoría de UX en iPad (2026-10-24)

Usuario: operador no técnico; dispositivo principal **iPad horizontal (1024×768) con el menú
abierto** (~770 px de contenido). También iPad vertical (768), celular (375) y escritorio (1280).
Capturas y mediciones: `%TEMP%\mg-capturas\ux\` (sufijos `-ipadH`, `-ipadV`, `-cel`, `-esc`).

**Alcance decidido por el usuario:** se corrige todo, incluido "Pulir".

## Causa raíz

`lg` vale 924 px (`tailwind.config.js`) y se activa por el ancho de la ventana. Con el menú de
231 px al contenido le quedan ~770 px, pero recibe el diseño de escritorio: grillas de 3-4
columnas, tablas completas, paneles laterales. Por eso varias pantallas se ven peor en iPad
horizontal que en vertical (a 768 el menú se esconde y `lg` no aplica). `xl` vale 1366: ningún
iPad llega a `xl`.

## Veredicto

- **No listas para iPad:** ficha del cliente (Información, Actividad, Editar), listado de órdenes,
  listado de facturación, listado y detalle de paquetes, listado de clientes, Tarifas, Reportes.
- **Rotas también en iPad vertical:** casilleros de la ficha, listado de órdenes, número de factura
  en Facturación, tabla de Farid en Reportes, fila nueva de Tarifas.
- **Con ajustes:** detalle de orden (pasos 1-5), crear cliente, nuevo ingreso de carga, Proveedores,
  Tipos de cliente, Métodos de entrega, Plantillas, modales.
- **Listas:** Inicio (salvo el nombre en el menú) y el buscador.

## 1. Ficha del cliente (`customer-detail-container.tsx`)

**Bloquea**
1. Columna izquierda de ~150 px en 1024: nombre que se sale, cédula partida, teléfono y correo en 3
   líneas, badges partidos, "Editar cliente" en 2 líneas. Cambiar `md:grid-cols-3 lg:grid-cols-4`
   (l. 245) por `grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]`; bajo `xl` el perfil es una
   cabecera horizontal: fila 1 iniciales, nombre (`text-xl break-words`), código, tipo y estado con
   badges `whitespace-nowrap`; fila 2 `grid sm:grid-cols-3` con cédula, teléfono
   (`whitespace-nowrap`) y correo (`break-words`); "Editar cliente" a la derecha con 44 px.
2. Tarjeta de casillero (`WarehouseCodeCard`, l. 80-145): el código y el courier no se ven (texto
   `min-w-0 truncate` junto a acciones `flex-shrink-0`); la bandera emoji sale como "US" en Windows;
   en 768 el basurero se sale. Rediseño: una tarjeta por fila (`xl:grid-cols-2` solo si el
   contenido pasa de 1100 px); fila 1 ícono lucide por tipo (`Plane`/`Ship`) + courier
   (`text-sm font-bold`, sin mayúsculas) + ruta en gris ("USA · Aéreo"); fila 2 código
   `font-mono text-xl font-black break-all`, nunca `truncate`; fila 3 (`border-t pt-3 flex flex-wrap
   gap-2`) "Enviar por WhatsApp" y "Copiar código" con texto siempre, "Quitar" discreto a la
   derecha con su confirmación, todo a 44 px. Quitar `WAREHOUSE_ROUTE_DISPLAY.flag`, el `'📦'` y
   `uppercase text-[9px]`.
3. Métricas cortadas: "Libras 2…" (25.00 lb) y "Facturado ₡…" (₡54.011). Quitar `truncate`
   (l. 481, 488, 495), `whitespace-nowrap text-lg`, grilla `grid-cols-1 sm:grid-cols-3` bajo `xl`,
   libras con coma ("25 lb" o "25,0 lb") como en Inicio.

**Molesta**
4. "Personas que reciben": dos párrafos (l. 540 y `customer-recipients-list.tsx:154`). Bajo el
   título: "Quién puede recibir los paquetes por el cliente." Vacío: "Solo recibe el cliente." +
   botón "Agregar persona". "Editar"/"Eliminar" a 44 px.
5. Tarjeta de dirección: texto y badge se salen en 1024; se lee "Principal PRINCIPAL". `min-w-0
   break-words`; si la etiqueta ya es "Principal" no repetir el badge, si no el badge dice "Por defecto".
6. Grilla de abajo (`lg:grid-cols-2`, l. 503): "Perfil operativo" solo en media columna, valores
   pegados ("Registro26/6/2026"). Pasar a `xl:`, valor `whitespace-nowrap`, fila `gap-3`; mejor, las
   fechas en una línea de la cabecera ("Cliente desde 26/6/2026 · último paquete 29/9/2026").
7. Cliente sin dirección: tarjeta vacía. Mostrar "Aún no tiene dirección" + "Agregar dirección".
8. Pestaña Actividad: botón "WhatsApp" activo con 0 paquetes (esconder) y debe decir "Avisar por
   WhatsApp"; píldoras con estado crudo "DESPACHADO"/"CERRADO" (l. 669-671): usar las etiquetas del
   detalle; "Crear orden de envío" y "Limpiar" a 44 px.
9. Editar: "Socio / Fa…" cortado (`customer-edit-form.tsx:180`, quitar `truncate`); selects de
   dirección cortados (se resuelve con el punto 1); título "Editar Cliente" en verde parece enlace:
   `text-slate-900`.

**Pulir**
10. Título del header: el nombre del cliente en vez de "Detalle de Cliente".
11. Pestañas sin mayúsculas: "Información" y "Actividad".
12. Celular: cabecera compacta para que las pestañas queden en la primera pantalla.

## 2. Clientes: listado y crear (`customers-container.tsx`, `create-customer-container.tsx`)

**Bloquea**
1. Tabla de 889 px en 701 visibles (738 en 702 en vertical): "Estado" e "Invitar a volver" fuera,
   con scroll lateral. Identificación `hidden xl:table-cell` (l. 56) o, mejor, tarjetas (l. 185-270)
   en `md:grid-cols-2` hasta `xl`.

**Molesta**
2. Crear cliente: tipo por defecto sin marcar (preseleccionar "Regular" con radio y borde naranja
   como en Editar); placeholders de poco contraste (`placeholder:text-slate-400`, fondo blanco con
   borde); placeholders "Ej. Alexander / Pierce" → "Ej. María / Rodríguez Mora".
3. Botones partidos o chicos: "Cancelar", "Registrar cliente" (`uppercase tracking-widest
   text-[10px]`), "+ AÑADIR", filtros segmentados de 33 px. Botón normal, sin mayúsculas, 44 px.

**Pulir**
4. Mayúsculas de título ("Nuevo Cliente", "Tipo de Cliente", "Direcciones de Entrega", "Directorio
   de Clientes"); "Tipo identificación" vs "Tipo de ID" → "Tipo de identificación"; "AEREO" → "Aéreo".

## 3. Listado de órdenes (`shipment-orders-container.tsx`)

**Bloquea**
1. Nombre en 3 líneas y "Pendiente de pago" partido y fuera de su etiqueta (badge l. 212-220 sin
   `whitespace-nowrap`), en 1024 y 768. Tarjetas hasta `xl` (`md:hidden` → `xl:hidden`,
   `hidden md:block` → `hidden xl:block`) en `md:grid-cols-2`. En escritorio: Cliente con
   `min-w-[220px]`, quitar "#ID" (dato interno), badges `whitespace-nowrap`.
2. El filtro por defecto "Sin pagar (con estimados)" trae órdenes "Finalizada" con "Sin estimado".
   Que el resultado respete el filtro, o que no venga preaplicado.

**Molesta**
3. El estado de pago tiene 6 nombres entre pantallas ("Pendiente de pago", "Estimado pendiente",
   "Sin estimado", "Pendiente", "Sin factura", "PENDIENTE", "PAGADO", "Pagada"). Fijar 4: "Sin
   estimado", "Estimado enviado", "Por cobrar", "Pagada".
4. El paso "Cierre" en rosa/rojo (`STEP_COLORS`, l. 63) parece error: violeta o gris; rojo solo
   para atrasos.
5. "Quitar filtro" 28×28, "Limpiar" 55×32, "Anterior/Siguiente" 33 px → 44. "1 paquete(s)" →
   "1 paquete" / "2 paquetes".

## 4. Detalle de orden, pasos 1-5 (`shipment-order-detail.tsx`, `step-sections/*`)

**Bloquea**
1. Paso 1: "Peso" y "Paquetes" dicen 0.00 lb pero el paquete pesa 3.00 lb (orden 0ee32e09). Ambos
   deben leer el peso de los paquetes asignados.
2. Paso 4: el badge dice "Entregado" mientras el paso pide "Finalizar orden" (orden cd0da029).
   Mientras no esté finalizada, "En camino".

**Molesta**
3. El badge del encabezado usa otro vocabulario ("Abierto", "Cerrado", "En camino", "Entregado"):
   quitarlo (el stepper ya dice el paso) o usar los nombres del listado.
4. "Ver factura" aparece dos o tres veces: dejar una. En su modal, "Marcar como Pagado" queda bajo
   el pliegue en 768 de alto y el motivo de deshabilitado va en `title`: mostrar "Elige cómo pagó
   para marcarla pagada" y pie fijo.
5. Paso 3: "Avisar pago al cliente" y "Aviso al cliente" se confunden: el segundo pasa a "Aviso de
   despacho".
6. Paso 5: "Se despachó hoy" pero el historial dice 23/10/2026 (hoy 24/10). Revisar el cálculo de
   días con `America/Costa_Rica` (verificar con qa).
7. Modales del detalle (Dirección, Guía, Costo real, Ver factura): el fondo no cubre los 24 px de
   arriba. Portal en `body` con `z-[60]`.
8. "Agregar paquetes" vacío: solo "Cerrar". "Costo real": "Guardar" deshabilitado con el campo vacío.
9. Números: "0.00 lb"/"6.30 lb" con punto vs "33,1" en Inicio; "3 paquete(s)"; fechas "29/09/2026"
   vs "29/9/2026". Un solo `formatWeight` con coma y un solo `formatBusinessDate`.

**Pulir**
10. Títulos de modal en MAYÚSCULAS; correo en mayúsculas en el modal de factura; "Total a Cancelar".
11. Encabezado del paso 3: badge y "Ver factura" en `flex-wrap items-center gap-2`.
12. "Rentabilidad · solo interno" y "Postventa" con etiquetas de 9-10 px grises.

## 5. Paquetes (`logistics-container.tsx`, `logistics-view-detail.tsx`, `create-package-container.tsx`)

**Bloquea**
1. Detalle en 1024 (`lg:grid-cols-3`, l. 140, 197, 206): monto partido "₡7.2 / 30", "Correos de
   Costa Rica" letra por letra, tarjetas de ~110 px, badge "FACTURADO" fuera. `xl:` en las tres
   grillas y montos `whitespace-nowrap`.
2. Listado en 1024: "EN PANAMÁ" partido, columna "Orden" fuera de pantalla. Badge `whitespace-nowrap`
   y "En Panamá"; "Info. envío" `hidden xl:table-cell` o tarjetas hasta `xl`. Casilla de 20×20: la
   celda entera con `<label>` de 44 px.

**Molesta**
3. Dos acciones principales: "Registrar paquete" principal, "Avisar por WhatsApp" secundaria con
   borde; acomodar en 768.
4. Modal de aviso: el texto dice "Enviar" y los botones "Reenviar" → "Toca Enviar o Reenviar junto a
   cada cliente".
5. Nuevo ingreso: "Cálculo en vivo" ₡0 antes de datos (mostrar "—"); "TC banco (₡ por $)",
   "Tracking", "Lbs" → "Tipo de cambio del banco", "Número de rastreo", "lb"; inputs de menos de
   16 px de texto (iOS hace zoom).
6. Mismo lugar con 3 nombres ("Paquetes", "Gestión de Paquetes", "Volver a logística", "Nuevo
   Ingreso de Carga"): "Paquetes" y "Registrar paquete".
7. `/admin/packages` ("Buscador Logístico", "Rastreo de Operaciones"): "Rastrear paquete" en botón,
   título y tarjeta.

**Pulir**
8. "PANAMA" sin tilde, "Tracking number oficial", "Sin notas internas." en cursiva, "#88" interno.

## 6. Facturación y Reportes (`billing-container.tsx`, `billing-reports-container.tsx`)

**Bloquea**
1. Facturación en 1024: "F- / 0040" partido, código de cliente partido, "CORREOS / DE COSTA / RICA",
   columna "Orden" cortada. `whitespace-nowrap` en número y código, entrega como subtítulo hasta
   `xl`, o tarjetas hasta `xl`.
2. Reportes en 1024 y 768: tabla de Farid de 867 px en 701; "Estado" (Pagado/Pendiente) cortada.
   Tarjetas por mes hasta `xl`, o quitar "Ganancia base" y "En estimados" bajo `xl`.

**Molesta**
3. "Facturación" / "Gestión de Cobros" / H1 "Facturación": header "Facturación", sin H1 repetido.
4. Reportes repite números (Facturado dos veces, Ganancia tres): una fila de 4 datos (Facturado,
   Cobrado, Por cobrar, Ganancia) y la tabla.
5. Ganancia en naranja como "Pendiente" → verde o negro. Íconos (i) que solo explican con hover:
   una línea bajo el título o quitarlos.
6. Filtros de 31 px con texto de 9 px; fechas con otro estilo que "Período" de Paquetes y Órdenes:
   el mismo selector de período.

## 7. Configuración

**Bloquea**
1. Tarifas (`settings-container.tsx:161`, `lg:flex-row` con panel `w-64`): contenido de ~425 px;
   la fila nueva de tarifas por rango es inutilizable (select de ~40 px, campos de ~20 px,
   Guardar/Cancelar fuera de vista y solo íconos); "Correos de Costa Rica" en 4 líneas; historial
   corta "Usuario". `xl:flex-row`, "Simulación" arriba bajo `xl`, agregar tarifa en un modal con un
   campo por fila y botones con texto.

**Molesta**
2. Cuatro nombres para couriers ("Proveedores", "Tarifas de Courier", "Couriers y Casilleros", "Ir a
   Couriers y Casilleros", "Configurarlo en Couriers"): usar "Couriers". El menú "Tarifas" abre
   "Configuración del Sistema".
3. Botones de ícono de 35×35 sin texto en Proveedores, Tipos y Métodos: interruptor con etiqueta
   "Activo" y "Editar" con texto a 44 px; badge "Inactivo" en el courier desactivado.
4. Términos internos: "CORREOS_CR", "TRACOPA", "kg por libra 0,453592" (constante, no editable),
   "backoffice", "prefactura".
5. Formulario de courier: placeholders en mayúsculas que parecen datos → "Ej. Doral" en gris.
6. Edición de plantilla: "Tocá una para insertarla donde tenés el cursor" es voseo
   (`whatsapp-template-detail.tsx:180`) → "Toca una para insertarla en el mensaje". "Volver a
   plantillas" de 15 px de alto y botones del editor de 31×31.

**Pulir**
7. Título del header repetido en la tarjeta (Métodos, Tipos, Plantillas). "Método de envío" vs
   "Método de entrega": "Método de entrega".

## 8. Inicio, Operativo y menú

**Molesta**
1. Menú "Dashboard" vs pantalla "Inicio" (`src/shared/constants/sidebar.ts`). Regla: el header
   repite el nombre del menú, sin "Gestión de" ni "Directorio de". Pares a corregir: Clientes,
   Paquetes, Órdenes de envío, Facturación, Reportes, Tarifas, Couriers. En celular el header corta
   títulos a 120 px (`header.tsx:55`).
2. Menú: grupos cerrados con títulos de 10 px en mayúsculas grises; abrir "Operaciones" por defecto,
   títulos a 12 px `slate-500`; ítems en mayúscula inicial solamente ("Órdenes de envío").
3. Inicio: "Últimos 6 meses" muestra 4 y el gráfico no tiene valores: monto sobre cada punto o
   "Desde julio".
4. Operativo (lo cambia otro trabajo): rojo en casi todas las filas pierde significado; la tarjeta
   "Facturada" usa "Enviar estimado".

**Botón de la playa abajo a la derecha:** React Query Devtools (`src/pages/_app.tsx:95`). No va en
builds de producción, pero en desarrollo tapa contenido. `buttonPosition="top-left"` o activarlo
solo con `NEXT_PUBLIC_RQ_DEVTOOLS=1`.

## Textos (skill `redaccion`)

| Pantalla | Actual | Propuesto |
|---|---|---|
| Ficha, Personas que reciben | Dos párrafos ("Quienes pueden recibir…" + "Solo recibe el cliente. Agrega a un familiar…") | "Quién puede recibir los paquetes por el cliente." Vacío: "Solo recibe el cliente." + "Agregar persona" |
| Ficha, Casilleros | "Ya tiene casillero en todos los couriers configurados." | quitar |
| Ficha, Historial | "Todos los paquetes del cliente, en cualquier estado." | quitar |
| Crear/editar cliente | "Nombre, apellidos, cédula y direcciones se guardan en mayúsculas…" | quitar |
| Crear cliente, casilleros | "Se le genera un código por cada courier que marques. Solo podrá recibir…" | "Se crea un código por cada courier que marques." |
| Crear cliente, código | "Formato: MGA-2453-C-00 — déjalo vacío para generarlo automáticamente." | "Déjalo vacío y se asigna solo." |
| Tipo de cliente | "Define cómo se le cobra el flete. La entrega local… siempre se cobra completa." | "Define cuánto paga por libra." |
| Tipos, Socio | "Solo paga lo que costó traer el paquete. Magastore no gana nada — para socios y familia" | "Paga solo el costo, sin ganancia." |
| Crear cliente, direcciones | "Opcional — se pueden agregar después…" + vacío largo | "Aún no hay direcciones" + "Agregar dirección" |
| Importar clientes | "Carga masiva desde archivo Excel, descargar template" | "Sube un Excel. Descargar plantilla" |
| Orden p1, paquetes | "Es el único paquete de la orden: no se puede quitar…" | "Una orden necesita al menos un paquete." |
| Orden, ¿Quién recibe? | "Elige al cliente o a otra persona. Se usa en la solicitud…" | "Elige quién recibe este envío." |
| Orden p4, costo real | 31 palabras | "Lo que cobró el transportista. Si es menos, se indica el vuelto." |
| Orden p5, postventa | "Se despachó hoy. El seguimiento suele hacerse a partir del día 3…" | "Haz el seguimiento desde el día 3." |
| Paquetes, aviso | "Toca "Enviar" junto a cada cliente para abrir su mensaje de WhatsApp." | "Toca Enviar junto a cada cliente." |
| Nuevo ingreso | "Si el peso es menor a 1.00lb, el sistema cobrará automáticamente…" | "Menos de 1 lb se cobra como 1 lb." |
| Tarifas, costo courier | 25 palabras | "Se configura en cada courier." + "Ir a Couriers" |
| Tarifas, Farid | 35 palabras | "20 % de la ganancia de cada envío. Ver en Reportes" |
| Tarifas, aviso | "Los cambios aplican de forma inmediata a nuevos registros." | "Aplica a las facturas nuevas." |
| Couriers | 28 palabras | quitar |
| Couriers, formulario | "Dirección que se le comparte al cliente para recibir su mercancía, y prefijo…" | "Lo que recibe el cliente en su bienvenida." |
| Métodos | "Catálogo usado al crear órdenes de envío y facturar…" | quitar |
| Plantillas, lista | Descripciones de 17-25 palabras | Una línea por plantilla ("Al pedir el envío, antes de tener guía." / "Al registrar el pago." / "Al despachar, con la guía.") |
| Plantilla, variables | "…Tocá una para insertarla donde tenés el cursor." | "Toca una para insertarla en el mensaje." |
| Plantilla, aviso | "Solo se pueden usar estas variables. Cualquier otra se enviaría vacía…" | "Solo se aceptan estas variables." |
| Detalle de paquete | "Solo visible para personal autorizado" / "Tracking number oficial" | quitar / "Número de rastreo" |
| Todas las listas | "Sin registros", "Total registros" | "No hay resultados" + "Limpiar filtros"; "10 órdenes" |

## Patrones que se repiten (arreglar una vez)

1. Layouts en `lg:` con menú de 231 px: pasar a `xl:` o usar container queries
   (`@tailwindcss/container-queries` con `@container` en `<main>`).
2. Tabla/tarjetas en `md`: llevar el corte a `xl` y tarjetas en `md:grid-cols-2`; `NewTable` con
   `minWidth` por columna y badges `whitespace-nowrap`.
3. `min-w-0 truncate` junto a acciones `flex-shrink-0`: el dato clave nunca va truncado; va arriba
   y entero, las acciones en una fila aparte.
4. Un solo `Badge` con `whitespace-nowrap`, sin mayúsculas forzadas, con etiquetas de un mapa por
   dominio (estado de pago, paso de la orden, estado del paquete).
5. Mayúsculas y `text-[9px]/[10px] tracking-widest` en botones, pestañas, etiquetas y títulos:
   variantes de `Typography` y `Button` en minúsculas, 12 px mínimo.
6. Objetivos táctiles de 27-36 px: `Button` con `min-h-[44px]` por defecto.
7. Nombres: menú = header; cada concepto con una sola palabra (Paquetes, Couriers, Método de
   entrega, Estimado, Factura).
8. Números: `formatWeight` con coma y "lb"; `formatBusinessDate` con un solo formato.
9. Modales del detalle de orden sin portal: un `Modal` común con título en minúsculas y pie fijo.

## Sin revisar

Safari/WebKit real; estados de carga y error de casi todas las listas; listas con 0 o muchos
elementos, nombres de más de 40 letras y montos de 7 cifras; acciones que envían o guardan; el
Operativo (en cambio).
