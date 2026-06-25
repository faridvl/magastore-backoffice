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
- KPIs rápidos: paquetes del mes, por cobrar, ganancia neta, clientes activos
- Gráfico de crecimiento de ganancias (ingresos vs costos por mes)
- Gráfico de top clientes por volumen
- Tabla de actividad reciente de paquetes
- Calculadora rápida de cotización para un cliente

**Acciones disponibles:**
- Acceso rápido a registrar un nuevo ingreso de paquete
- Enlace a la página pública de rastreo
- Ver historial completo de paquetes

---

## Lista de Paquetes / Logística (`/admin/logistics`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Tabla de todos los paquetes registrados
- Columnas: tracking, cliente, peso, tipo, estado, fecha
- Barra de búsqueda (por tracking o nombre de cliente)
- Filtros por estado del paquete

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
- Peso en libras
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

**Acciones disponibles:**
- Ver el historial completo de eventos
- Ir a editar el paquete

---

## Editar Paquete (`/admin/logistics/edit/[id]`)

**Quién accede:** Operadores autenticados.

**Qué permite:**
- Cambiar el estado del paquete (actualizar a la siguiente etapa del ciclo)
- Modificar notas internas
- Agregar o cambiar URL de evidencia fotográfica
- Modificar el peso

---

## Lista de Clientes (`/admin/customers`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Tabla de todos los clientes registrados
- Columnas: nombre, código/casillero, email, teléfono, estado
- Barra de búsqueda
- Filtro por estado (activos / inactivos / todos)

**Acciones disponibles:**
- Buscar clientes por nombre, casillero o email
- Filtrar por estado activo/inactivo
- Hacer clic en un cliente para ver su detalle
- Botón para registrar un nuevo cliente

---

## Crear Cliente (`/admin/customers/create`)

**Quién accede:** Operadores autenticados.

**Qué hace:**
- Formulario para registrar un nuevo cliente
- El casillero se genera automáticamente al guardar

**Datos a ingresar:**
- Tipo de documento de identidad
- Número de documento
- Nombre y apellido
- Email
- Teléfono
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

## Cobros / Billing (`/admin/billing`)

**Quién accede:** Operadores autenticados.

**Qué muestra:**
- Lista de todas las facturas generadas
- Estado de cada factura (pagada / pendiente)
- Métricas: total por cobrar, facturas pagadas, pendientes, eficiencia de cobro
- Tab "Por Facturar": consolidaciones que aún no tienen factura

**Acciones disponibles:**
- Buscar facturas por nombre de cliente o casillero
- Filtrar por estado de pago (todas / pagadas / pendientes)
- Filtrar por período (semana / mes / todo el tiempo)
- Ver detalle de una factura
- Marcar una factura como pagada ("Cobrar Ahora")
- Generar factura para una consolidación pendiente

---

## Configuración de Tarifas (`/admin/settings`)

**Quién accede:** Operadores autenticados (ADMIN).

**Qué muestra:**
- Formulario con las 4 tarifas del sistema
- Preview del precio en colones con las tarifas actuales
- Historial de los últimos 15 cambios de tarifas

**Acciones disponibles:**
- Modificar precio por libra, tipo de cambio, cargo fijo y peso mínimo
- Guardar los cambios (se registran automáticamente en el historial)

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
- Muestra el estado de pago del paquete

**Qué NO muestra:** Información financiera interna, notas del operador, datos de otros clientes.
