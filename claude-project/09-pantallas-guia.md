# Guía de Pantallas

Descripción de cada pantalla del sistema Magastore: qué muestra, qué acciones permite y cómo navegar.

---

## Login (`/login`)

**Quién accede:** Operadores internos de Magastore.

**Qué hace:**
- Formulario de email y contraseña
- Al ingresar correctamente, redirige al dashboard
- Si las credenciales son incorrectas, muestra error

**Datos necesarios:** Email y contraseña del operador.

---

## Dashboard / Inicio (`/admin/dashboard`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- KPIs reales desde la base de datos: paquetes del mes, monto por cobrar, ingresos del mes, clientes activos
- Gráfica de ingresos mensuales (últimos 6 meses, basada en facturas pagadas)
- Gráfica de top clientes por volumen de facturación
- Tabla de actividad reciente: últimos 5 paquetes registrados con su estado y monto de factura
- Empty state en la tabla de actividad cuando no hay paquetes registrados

---

## Lista de Paquetes / Logística (`/admin/logistics`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Lista de todos los paquetes registrados (tabla en desktop, cards en mobile)
- Columnas: tracking, cliente, peso, tipo, estado, fecha
- Barra de búsqueda (por tracking o nombre de cliente)
- Filtros por estado del paquete
- Filtro de rango de fechas: Desde / Hasta (cada uno en su propia fila en mobile)

**Acciones disponibles:**
- Buscar paquetes
- Filtrar por estado (MIAMI, TRANSITO, ADUANA, BODEGA_CR, ENTREGADO)
- Hacer clic en un paquete para ver su detalle
- Botón para registrar un nuevo paquete

---

## Registrar Paquete (`/admin/logistics/create`)

**Quién accede:** Operadores autenticados.

**Qué hace:**
- Formulario para ingresar un nuevo paquete al sistema
- Muestra en tiempo real el costo estimado para el cliente mientras se ingresa el peso

**Datos a ingresar:**
- Cliente (selección del cliente al que pertenece el paquete)
- Número de tracking del transportista
- Peso en libras (**solo enteros ≥ 1**, sin decimales)
- Tipo de envío (Aéreo / Marítimo)
- Notas internas (opcional)

**Preview de cobro:** Muestra el cálculo estimado del cobro usando las tarifas actuales, incluyendo si aplica el peso mínimo.

---

## Detalle de Paquete (`/admin/logistics/[id]`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Todos los datos del paquete
- Información del cliente propietario
- Estado actual
- Historial de eventos de rastreo
- Panel de información financiera (peso, tarifa estimada, total)
- Campo editable de peso (solo enteros ≥ 1)

**Acciones disponibles:**
- Cambiar el estado del paquete
- Editar el peso registrado
- Agregar notas internas y URL de evidencia

---

## Lista de Clientes (`/admin/customers`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Tabla de todos los clientes registrados (tabla en desktop, cards en mobile)
- Columnas: nombre, código/casillero, email, teléfono, estado
- Barra de búsqueda
- Filtro por estado (activos / inactivos / todos)

**Acciones disponibles:**
- Buscar clientes por nombre, casillero o email
- Filtrar por estado activo/inactivo
- Hacer clic en un cliente para ver su detalle
- **Descargar Template** — descarga el archivo Excel con el formato para importar clientes
- **Importar Clientes** — abre el modal para cargar un archivo Excel con clientes
- **Nuevo Cliente** — va al formulario de creación

*En mobile, los tres botones (Template, Importar, Nuevo Cliente) se muestran apilados en columna a ancho completo.*

---

## Crear Cliente (`/admin/customers/create`)

**Quién accede:** Operadores autenticados.

**Qué hace:**
- Formulario para registrar un nuevo cliente
- El casillero se genera automáticamente al guardar
- En mobile el formulario se muestra en una sola columna

**Datos a ingresar:**
- Tipo de documento de identidad
- Número de documento
- Nombre y apellido
- Email
- Teléfono
- Nivel de lealtad (Regular / VIP / Diamond)
- Al menos una dirección (provincia, cantón, distrito, dirección exacta, etiqueta)

---

## Detalle de Cliente (`/admin/customers/[id]`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Toda la información del cliente
- Su casillero/código
- Sus direcciones registradas
- Sus paquetes en el sistema

---

## Gestión de Órdenes de Envío (`/admin/shipment-orders`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Lista de todas las órdenes de envío (tabla en desktop, cards en mobile)
- Columnas: cliente, casillero, estado, peso total, cantidad de paquetes, fecha
- Empty state cuando no hay órdenes de envío que coincidan con los filtros

**Filtros disponibles:**
- Búsqueda por nombre de cliente o casillero
- Filtro por estado: Todos / Abiertos / Cerrados / Despachados / Entregados
- Filtro de fechas: Desde y Hasta (cada uno en su propia fila)

*En mobile, el toolbar se organiza en filas: búsqueda → botón nueva orden de envío → filtros de estado → fecha Desde → fecha Hasta.*

**Acciones disponibles:**
- Crear nueva orden de envío (seleccionar cliente)
- Ver detalle de una orden de envío (panel lateral/modal)
- Asignar paquetes a una orden de envío abierta
- Avanzar el estado de la orden de envío

**Modal de detalle:**
- Muestra cliente, estado, peso total y lista de paquetes asignados
- Botón "Asignar Paquetes" (solo si está ABIERTO)
- Botón de avance de estado según el estado actual

---

## Cobros / Billing (`/admin/billing`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Lista de todas las facturas generadas
- Estado de cada factura (pagada / pendiente)
- Métricas: total por cobrar, facturas pagadas, pendientes, eficiencia de cobro
- Tab "Por Facturar": órdenes de envío que aún no tienen factura

**Acciones disponibles:**
- Buscar facturas por nombre de cliente o casillero
- Filtrar por estado de pago (todas / pagadas / pendientes)
- Ver detalle de una factura
- Marcar una factura como pagada ("Cobrar Ahora")
- Generar factura para una orden de envío pendiente (seleccionando método de entrega)
- Descargar PDF de la factura

---

## Configuración de Tarifas (`/admin/settings`)

**Quién accede:** Operadores autenticados (ADMIN).

**Qué muestra:**
- Formulario con las tarifas de flete internacional (precio/lb, tipo de cambio, ganancia/lb, peso mínimo)
- Formulario con tarifas de entrega local (Correos CR, Tracopa)
- Panel de simulación: precio por libra en CRC y ganancia estimada con las tarifas actuales
- Historial completo de cambios de tarifas con paginación

**Acciones disponibles:**
- Modificar cualquiera de las tarifas
- Guardar los cambios (se registran automáticamente en el historial)

*En mobile, el historial usa un paginador en 2 filas: total de registros arriba, navegación abajo.*

---

## Buscador Logístico Admin (`/admin/packages`)

**Quién accede:** Operadores autenticados.

**Qué hace:**
- Buscador avanzado de paquetes por tracking o código
- Muestra información detallada del paquete encontrado: cliente, peso, tipo, estado, información financiera, notas

**Diferencia con `/admin/logistics`:** Esta pantalla está orientada a búsqueda puntual de un paquete específico. La pantalla de logística muestra la lista completa con filtros.

---

## Rastreo Público (`/tracking`)

**Quién accede:** Cualquier persona (sin login).

**Qué hace:**
- Campo de búsqueda por número de tracking
- Muestra el estado actual y el historial de eventos del paquete
- Muestra información del cliente (nombre, casillero)

**Qué NO muestra:** Información financiera interna, notas del operador, datos de otros clientes.
