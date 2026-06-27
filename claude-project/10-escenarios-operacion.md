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
5. Seleccionar nivel de lealtad (Regular por defecto)
6. Agregar al menos una dirección de entrega:
   - Seleccionar provincia, cantón y distrito
   - Ingresar la dirección exacta
   - Asignar una etiqueta (ej: "Casa")
   - Marcar como dirección principal
7. Guardar

**Resultado:** El sistema crea el cliente y genera automáticamente su casillero (ej: `MG-A1B2C3-7`). Se le comparte este casillero al cliente para futuras referencias.

---

## Escenario 2: Importar múltiples clientes desde Excel

**Situación:** Se tiene una lista de 20 clientes nuevos en una hoja de cálculo y se quieren registrar todos a la vez.

**Pasos:**

1. Ir a **Clientes** (`/admin/customers`)
2. Hacer clic en **"Descargar Template"** para obtener el formato correcto
3. Llenar el Excel con los datos de los clientes (un cliente puede tener varias filas si tiene múltiples direcciones)
4. Hacer clic en **"Importar Clientes"**
5. Arrastrar el archivo o buscarlo con el selector
6. Revisar el resumen: cuántos se importaron exitosamente y cuáles fallaron (con el motivo del error)

**Resultado:** Los clientes válidos quedan registrados. Los que fallan (cédula duplicada con conflicto, datos inválidos) se reportan individualmente sin cancelar los demás.

---

## Escenario 3: Registrar un paquete que llegó a Miami

**Situación:** Se recibe un paquete en el depósito de Miami y hay que ingresarlo al sistema.

**Pasos:**

1. Ir a **Logística → Registrar Paquete** (`/admin/logistics/create`)
2. Seleccionar el cliente al que pertenece el paquete (buscar por nombre o casillero)
3. Ingresar el número de tracking del transportista (UPS, FedEx, Amazon, etc.)
4. Pesar el paquete e ingresar el peso en libras (**número entero, mínimo 1**)
5. Seleccionar el tipo de envío (Aéreo o Marítimo)
6. Revisar el preview de cobro que muestra el sistema
7. Agregar notas internas si hay algo relevante (ej: "caja un poco golpeada por fuera")
8. Guardar

**Resultado:** El paquete queda registrado con estado MIAMI. El sistema genera automáticamente el primer evento de rastreo. El cliente ya puede ver su paquete en la página de rastreo.

---

## Escenario 4: Actualizar el estado de un paquete

**Situación:** El paquete llegó a Costa Rica y está en aduana. Hay que actualizar el estado.

**Pasos:**

1. Ir a **Logística** (`/admin/logistics`)
2. Buscar el paquete (por tracking o nombre del cliente)
3. Hacer clic en el paquete para ver su detalle
4. Cambiar el estado a **ADUANA**
5. Agregar notas si aplica (ej: "En revisión aduanera, estimado 3 días hábiles")
6. Guardar

**Resultado:** El estado se actualiza. Se genera automáticamente un nuevo evento de rastreo. El cliente puede ver el cambio en la página de rastreo.

---

## Escenario 5: Consolidar paquetes de un cliente

**Situación:** Un cliente tiene 3 paquetes en bodega de Costa Rica y hay que agruparlos para cobrarlos juntos.

**Pasos:**

1. Ir a **Consolidaciones** (`/admin/consolidations`)
2. Hacer clic en **"Nueva Consolidación"**
3. Buscar y seleccionar el cliente
4. Confirmar — la consolidación se crea en estado ABIERTO con peso 0
5. Hacer clic en la consolidación recién creada para abrir el detalle
6. Hacer clic en **"Asignar Paquetes"**
7. Seleccionar los 3 paquetes del cliente y confirmar
8. El sistema recalcula automáticamente el peso total (suma de los 3)
9. Cuando esté lista para facturar, hacer clic en **"Cerrar consolidación"** → pasa a CERRADO

**Resultado:** Los 3 paquetes quedan agrupados en una sola consolidación, con el peso total calculado. Lista para generar la factura.

---

## Escenario 6: Generar una factura y registrar el pago

**Situación:** El cliente tiene una consolidación en estado CERRADO y hay que cobrarle.

**Pasos:**

1. Ir a **Cobros** (`/admin/billing`)
2. Ir al tab **"Por Facturar"**
3. Encontrar la consolidación del cliente
4. Hacer clic en **"Generar Factura"**
5. Seleccionar el **método de entrega**:
   - **Correos de Costa Rica** (₡2,900)
   - **Tracopa / Encomienda** (₡2,500)
   - **Retiro en bodega** (₡0)
6. El sistema crea la factura usando las tarifas actuales
7. La factura queda en estado **Pendiente**
8. Cuando el cliente pague, ir a la factura en el tab **"Registros"**
9. Hacer clic en la factura y luego en **"Cobrar Ahora"**

**Resultado:** La factura queda marcada como pagada con la fecha del pago registrada.

---

## Escenario 7: El cliente llama para saber el estado de su paquete

**Situación:** Un cliente llama diciendo que su casillero es MG-21642F-13 y quiere saber cuándo le llega su paquete.

**Pasos:**

1. Ir a **Logística** (`/admin/logistics`)
2. Buscar por el casillero "MG-21642F-13" o por el nombre del cliente
3. Ver los paquetes del cliente y sus estados actuales
4. Informar al cliente el estado de cada paquete

**Alternativa para el cliente:** Recordarle que puede rastrear su paquete él mismo en la página de rastreo usando su número de tracking.

---

## Escenario 8: Un paquete llegó dañado

**Situación:** Llega un paquete a Miami con daños visibles. Hay que registrarlo y documentar el daño.

**Pasos:**

1. Registrar el paquete normalmente en **Logística → Crear**
2. En el campo de notas internas, describir el daño observado
3. Tomar foto del daño y subir a un servicio de almacenamiento (Google Drive, etc.)
4. Pegar el enlace de la foto en el campo **URL de evidencia**
5. Guardar el paquete

**Nota:** El daño queda registrado en las notas. En el futuro, cuando se actualice el estado del paquete, si se agrega nueva información en las notas, la nota del daño original se sobreescribe. Se recomienda mantener la mención del daño en todas las actualizaciones posteriores.

---

## Escenario 9: Actualizar las tarifas del servicio

**Situación:** El dólar subió y hay que ajustar el tipo de cambio.

**Pasos:**

1. Ir a **Configuración** (`/admin/settings`)
2. Ver el valor actual del tipo de cambio
3. Ingresar el nuevo valor
4. Guardar

**Resultado:** El sistema actualiza el tipo de cambio y registra en el historial: valor anterior, valor nuevo, quién lo cambió y cuándo. Todas las facturas **futuras** usarán el nuevo tipo de cambio. Las facturas ya emitidas no cambian.

---

## Escenario 10: Buscar un paquete del que solo se sabe el tracking

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

## Escenario 11: Ver el historial de cambios de tarifas

**Situación:** El dueño quiere saber cuándo y cuánto cambió el precio por libra en los últimos meses.

**Pasos:**

1. Ir a **Configuración** (`/admin/settings`)
2. En la parte inferior de la pantalla ver el historial de cambios
3. El historial muestra: qué cambió, valor anterior, valor nuevo, cuándo y quién lo cambió
4. Usar la paginación para ver cambios más antiguos
