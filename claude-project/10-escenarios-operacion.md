# Escenarios de Operación — Paso a Paso

Flujos completos de las operaciones más comunes en Magastore.

---

## Escenario 1: Registrar un cliente nuevo

**Situación:** Llega un cliente nuevo que quiere usar el servicio de Magastore para importar un paquete desde Amazon.

**Pasos:**

1. Ir a **Clientes → Crear Cliente** (`/admin/customers/create`)
2. Seleccionar el tipo de identificación (ej: FISICA para cédula costarricense)
3. Ingresar el número de cédula
4. Ingresar nombre, apellido, email y teléfono
5. Agregar al menos una dirección de entrega:
   - Seleccionar provincia, cantón y distrito
   - Ingresar la dirección exacta
   - Asignar una etiqueta (ej: "Casa")
   - Marcar como dirección principal
6. Guardar

**Resultado:** El sistema crea el cliente y genera automáticamente su casillero (ej: `MG-A1B2C3-7`). Se le comparte este casillero al cliente para futuras referencias.

---

## Escenario 2: Registrar un paquete que llegó a Miami

**Situación:** Se recibe un paquete en el depósito de Miami y hay que ingresarlo al sistema.

**Pasos:**

1. Ir a **Logística → Registrar Paquete** (`/admin/logistics/create`)
2. Seleccionar el cliente al que pertenece el paquete (buscar por nombre o casillero)
3. Ingresar el número de tracking del transportista (UPS, FedEx, Amazon, etc.)
4. Pesar el paquete e ingresar el peso en libras
5. Seleccionar el tipo de envío (Aéreo o Marítimo)
6. Revisar el preview de cobro que muestra el sistema
7. Agregar notas internas si hay algo relevante (ej: "caja un poco golpeada por fuera")
8. Guardar

**Resultado:** El paquete queda registrado con estado MIAMI. El sistema genera automáticamente el primer evento de rastreo. El cliente ya puede ver su paquete en la página de rastreo.

---

## Escenario 3: Actualizar el estado de un paquete

**Situación:** El paquete llegó a Costa Rica y está en aduana. Hay que actualizar el estado.

**Pasos:**

1. Ir a **Logística** (`/admin/logistics`)
2. Buscar el paquete (por tracking o nombre del cliente)
3. Hacer clic en el paquete para ver su detalle
4. Ir a **Editar** (`/admin/logistics/edit/[id]`)
5. Cambiar el estado a **ADUANA**
6. Agregar notas si aplica (ej: "En revisión aduanera, estimado 3 días hábiles")
7. Guardar

**Resultado:** El estado se actualiza. Se genera automáticamente un nuevo evento de rastreo. El cliente puede ver el cambio en la página de rastreo.

---

## Escenario 4: Consolidar paquetes de un cliente

**Situación:** Un cliente tiene 3 paquetes en bodega de Costa Rica y quiere que se le cobre todo junto.

**Pasos:**

1. Verificar que los 3 paquetes del cliente estén registrados en el sistema
2. Ir a la sección de **Logística** y seleccionar los paquetes del cliente
3. Crear una nueva consolidación con los 3 paquetes
4. El sistema calcula automáticamente el peso total (suma de los 3 paquetes)
5. Cuando esté lista para facturar, cambiar el estado de la consolidación a **CERRADO**

**Resultado:** Los 3 paquetes quedan agrupados en una sola consolidación, con el peso total calculado. Lista para generar la factura.

---

## Escenario 5: Generar una factura y registrar el pago

**Situación:** El cliente tiene una consolidación en estado CERRADO y hay que cobrarle.

**Pasos:**

1. Ir a **Cobros** (`/admin/billing`)
2. Ir al tab **"Por Facturar"**
3. Encontrar la consolidación del cliente
4. Hacer clic en **"Generar Factura"**
5. El sistema crea la factura usando las tarifas actuales:
   - Peso total de la consolidación
   - Precio por libra vigente
   - Tipo de cambio vigente
   - Cargo fijo
6. La factura queda en estado **Pendiente**
7. Cuando el cliente pague, ir a la factura en el tab **"Registros"**
8. Hacer clic en la factura y luego en **"Cobrar Ahora"** o **"Marcar como Pagado"**

**Resultado:** La factura queda marcada como pagada con la fecha del pago registrada.

---

## Escenario 6: El cliente llama para saber el estado de su paquete

**Situación:** Un cliente llama diciendo que su casillero es MG-21642F-13 y quiere saber cuándo le llega su paquete.

**Pasos:**

1. Ir a **Logística** (`/admin/logistics`)
2. Buscar por el casillero "MG-21642F-13" o por el nombre del cliente
3. Ver los paquetes del cliente y sus estados actuales
4. Informar al cliente el estado de cada paquete

**Alternativa para el cliente:** Recordarle que puede rastrear su paquete él mismo en la página de rastreo usando su número de tracking.

---

## Escenario 7: Un paquete llegó dañado

**Situación:** Llega un paquete a Miami con daños visibles. Hay que registrarlo y documentar el daño.

**Pasos:**

1. Registrar el paquete normalmente en **Logística → Crear**
2. En el campo de notas internas, describir el daño observado
3. Tomar foto del daño y subir a un servicio de almacenamiento (Google Drive, etc.)
4. Pegar el enlace de la foto en el campo **URL de evidencia**
5. Guardar el paquete

**Nota:** El daño queda registrado en las notas. En el futuro, cuando se actualice el estado del paquete, si se agrega nueva información en las notas, la nota del daño original se sobreescribe. Se recomienda mantener la mención del daño en todas las actualizaciones posteriores.

---

## Escenario 8: Actualizar las tarifas del servicio

**Situación:** El dólar subió y hay que ajustar el tipo de cambio.

**Pasos:**

1. Ir a **Configuración** (`/admin/settings`)
2. Ver el valor actual del tipo de cambio
3. Ingresar el nuevo valor
4. Guardar

**Resultado:** El sistema actualiza el tipo de cambio y registra en el historial: valor anterior, valor nuevo, quién lo cambió y cuándo. Todas las facturas **futuras** usarán el nuevo tipo de cambio. Las facturas ya emitidas no cambian.

---

## Escenario 9: Buscar un paquete del que solo se sabe el tracking

**Situación:** Un cliente envía por WhatsApp su número de tracking y quiere saber si llegó.

**Pasos (opción 1 — búsqueda interna):**

1. Ir a **Logística** (`/admin/logistics`)
2. Pegar el número de tracking en la barra de búsqueda
3. El sistema muestra el paquete si existe

**Pasos (opción 2 — decirle al cliente que rastree):**

1. Decirle al cliente que entre a la página de rastreo de Magastore
2. Que ingrese su número de tracking
3. El cliente ve el estado actual por sí mismo

---

## Escenario 10: Ver el historial de cambios de tarifas

**Situación:** El dueño quiere saber cuándo y cuánto cambió el precio por libra en los últimos meses.

**Pasos:**

1. Ir a **Configuración** (`/admin/settings`)
2. En la parte inferior de la pantalla ver el historial de cambios
3. El historial muestra: qué cambió, valor anterior, valor nuevo, cuándo y quién lo cambió
4. Se muestran los últimos 15 cambios
