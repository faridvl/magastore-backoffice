# Preguntas Frecuentes (FAQ)

Recopilación de las preguntas más comunes sobre el funcionamiento del sistema Magastore.

---

## Sobre clientes

**¿Cómo busco a un cliente en el sistema?**
Ve a Clientes (`/admin/customers`), usa la barra de búsqueda para buscar por nombre, casillero (ej: MG-ABCD12-5) o email.

**¿Puedo tener dos clientes con la misma cédula?**
No. El sistema rechaza el registro si el número de documento ya existe.

**¿Puedo eliminar un cliente?**
No. Los clientes solo se pueden desactivar. Sus datos e historial se conservan.

**¿Qué hago si un cliente cambió de dirección?**
Puedes agregar una nueva dirección a su perfil y marcarla como principal. La dirección anterior queda guardada en el historial.

**¿Puedo cambiar el casillero de un cliente?**
No. El casillero se genera automáticamente y es permanente.

**¿Cómo importo varios clientes a la vez?**
Descarga el template Excel con el botón "Descargar Template", llénalo con los datos y luego usa "Importar Clientes" para subirlo. El sistema agrupa filas con la misma cédula en un solo cliente con múltiples direcciones.

**¿Qué pasa si en el Excel hay una cédula que ya existe en el sistema?**
Si los datos coinciden (mismo nombre y email), el sistema puede actualizar las direcciones. Si hay conflicto (mismo número pero diferente nombre o email), ese cliente se rechaza con un error y los demás del lote se importan igualmente.

---

## Sobre paquetes

**¿Puedo ingresar el peso de un paquete con decimales (ej: 2.5 lbs)?**
No. El sistema solo acepta libras como números enteros (1, 2, 3...). Si el paquete pesa una fracción, redondear al entero más cercano.

**¿Cuál es el peso mínimo que puedo registrar?**
1 libra. El sistema bloquea valores menores.

**¿Qué pasa si ingreso mal el peso de un paquete?**
Puedes corregirlo editando el paquete desde su vista de detalle. Si ya se generó una factura para la consolidación que contiene ese paquete, el cambio de peso no afectará la factura ya emitida.

**¿Puedo cambiar el cliente de un paquete?**
No está disponible. El cliente se asigna al crear el paquete y no puede modificarse.

**¿Cuántos paquetes puede importar un cliente al mismo tiempo?**
No hay límite en el sistema.

**¿Un paquete puede estar en dos consolidaciones?**
No. Un paquete solo puede pertenecer a una consolidación a la vez.

**¿Puedo ver el historial de cambios de estado de un paquete?**
Sí. En el detalle del paquete se muestra el historial de eventos con fechas y descripciones.

**¿Qué información ve el cliente en el rastreo público?**
Ve el estado actual, el historial de eventos (fechas, ubicaciones, descripciones) pero NO ve información de costos ni notas internas.

---

## Sobre consolidaciones

**¿Tengo que consolidar todos los paquetes para facturar?**
Sí, en el modelo de Magastore la facturación se hace a nivel de consolidación. Los paquetes deben agruparse antes de generar una factura.

**¿Puedo consolidar paquetes de diferentes clientes?**
Técnicamente el sistema lo permite pero es un error — siempre consolide paquetes del mismo cliente.

**¿Puedo agregar un paquete a una consolidación cerrada?**
No. Solo se pueden agregar paquetes a consolidaciones en estado ABIERTO.

**¿Puedo cerrar una consolidación sin paquetes?**
No. El botón de cerrar está deshabilitado si la consolidación no tiene paquetes asignados.

**¿Puedo remover un paquete de una consolidación?**
No está disponible en la interfaz actual. Una vez asignado, el paquete no se puede remover de la consolidación.

**¿Puedo eliminar una consolidación?**
No está disponible. Las consolidaciones son permanentes una vez creadas.

---

## Sobre facturación

**¿Cómo sé cuánto le voy a cobrar a un cliente?**
Al registrar el paquete, el sistema muestra un preview del cobro estimado (flete). La factura definitiva depende también del método de entrega que se seleccione al facturar.

**¿Por qué el monto en el preview puede diferir del monto en la factura?**
Dos razones: (1) las tarifas pueden haber cambiado entre el registro del paquete y la facturación, y (2) el preview no incluye la tarifa de entrega local, que se suma al generar la factura.

**¿Qué métodos de entrega existen y cuánto cuestan?**
- Correos de Costa Rica: ₡2,900
- Tracopa / Encomienda: ₡2,500
- Retiro en bodega: ₡0 (gratis)

**¿Puedo generar la factura antes de que el paquete llegue a Costa Rica?**
Técnicamente sí, pero la práctica recomendada es facturar cuando la consolidación esté en estado CERRADO o superior.

**¿Puedo modificar el monto de una factura?**
No. Una vez generada, el monto no se puede cambiar.

**¿Puedo anular una factura?**
No está disponible en el sistema actual.

**¿Qué pasa si marco una factura como pagada por error?**
No hay forma de "desmarcar" un pago en el sistema actual. Contacta al administrador del sistema si necesitas corregir esto a nivel de base de datos.

**¿El sistema acepta múltiples métodos de pago?**
No. El sistema solo registra si la factura fue pagada (sí/no) pero no el método de pago (efectivo, transferencia, etc.).

---

## Sobre tarifas

**¿Con qué frecuencia debo actualizar el tipo de cambio?**
Depende de la política de la empresa. Se recomienda actualizarlo cuando haya variaciones significativas del mercado que afecten la rentabilidad.

**¿Los cambios de tarifa afectan facturas ya emitidas?**
No. Cada factura guarda una copia de las tarifas del momento en que fue generada.

**¿Quién puede cambiar las tarifas?**
Solo los operadores con rol de administrador (ADMIN).

**¿Dónde veo el historial de cambios de tarifas?**
En la pantalla de Configuración (`/admin/settings`), en la parte inferior aparece el historial completo con paginación.

**¿Puedo configurar el costo de retiro en bodega?**
No. El retiro en bodega siempre es gratuito y no tiene campo de configuración.

---

## Sobre acceso y seguridad

**¿Puedo tener múltiples usuarios administradores?**
Sí. El sistema admite múltiples cuentas de operador.

**¿Cuánto dura la sesión antes de vencer?**
La sesión dura 12 horas. Después de ese tiempo, el operador debe volver a iniciar sesión.

**¿Un cliente puede acceder al backoffice?**
No. Los clientes solo tienen acceso a la página pública de rastreo, que no requiere login.

---

## Sobre la página de rastreo pública

**¿Necesita cuenta el cliente para rastrear su paquete?**
No. La página de rastreo es pública, solo necesita el número de tracking.

**¿El cliente puede ver cuánto le van a cobrar en el rastreo?**
No. El rastreo público solo muestra el estado y los eventos del paquete.

**¿Con qué número rastrea el cliente?**
Con el número de tracking del transportista (UPS, FedEx, Amazon, etc.) que fue ingresado al registrar el paquete.
