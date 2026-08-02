-- Dos plantillas nuevas para el detalle de orden de envío.
--
-- SHIPMENT_REQUEST va al PROVEEDOR (no al cliente): es el texto que el operador
-- copia y pega en el chat con el forwarder para pedir que despache los paquetes
-- de una orden. Por eso el flujo que lo usa copia al portapapeles en vez de
-- abrir WhatsApp con el teléfono del cliente, y no marca notified_at — esa
-- columna registra avisos AL CLIENTE.
--
-- El formato original que se pasó agrupaba paquetes de varios clientes en un
-- solo bulto con un único destinatario. Eso se descartó: la solicitud es por
-- orden, y consolidations tiene un solo customer_id. Un bulto multi-cliente no
-- existe como entidad en el modelo.
INSERT INTO whatsapp_templates (code, name, description, body) VALUES
(
  'SHIPMENT_REQUEST',
  'Solicitud de envío al proveedor',
  'Se copia para pegar en el chat con el proveedor y solicitar el despacho de los paquetes de una orden. No se envía al cliente.',
  'Quería solicitar el envío de los siguientes paquetes

*ENVIO {{id_orden}}
Paquetes:
{{lista_trackings}}

Paquetes de {{nombre_cliente}}

DATOS DE ENVIO
NOMBRE: {{nombre_recibe}}
TELEFONO DE QUIEN RECIBE: {{telefono_recibe}}
Cédula: {{cedula}}
PROVINCIA: {{provincia}}
CANTON: {{canton}}
DISTRITO: {{distrito}}
DIRECCION: {{direccion}}'
),
-- SHIPMENT_DISPATCHED va AL CLIENTE, al marcar la orden como DESPACHADO.
--
-- El texto original decía "a través de Correos de CR" fijo y traía la URL de
-- rastreo escrita a mano. Ambas cosas se parametrizaron: si la orden se despacha
-- por Tracopa, un texto fijo mentiría sobre el transportista y daría un link de
-- rastreo que no corresponde. {{metodo_entrega}} sale del catálogo y
-- {{link_rastreo}} de delivery_methods.tracking_url (migración 027), así una
-- sola plantilla sirve para todos los couriers presentes y futuros.
(
  'SHIPMENT_DISPATCHED',
  'Pedido despachado',
  'Se envía al cliente cuando la orden pasa a DESPACHADO, con el número de guía y el enlace de rastreo del transportista.',
  'Estimad@ cliente, le informamos que su pedido ha sido enviado a través de {{metodo_entrega}}. 🚚📬

El número de seguimiento del paquete es: {{numero_guia}}

Puede rastrear el estado de envío de su paquete en el siguiente enlace:
{{link_rastreo}}

Cualquier duda o consulta no dude en contactarnos. 📲

¡Gracias por confiar en nuestro servicio! 🤝🛩️📦'
)
ON CONFLICT (code) DO NOTHING;
