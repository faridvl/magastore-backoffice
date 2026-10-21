-- Variante del aviso de envío solicitado para órdenes que todavía no están
-- pagadas: el operador puede solicitar el envío sin pago (pocos clientes), y en
-- ese caso el aviso aprovecha para recordar el monto pendiente.
INSERT INTO whatsapp_templates (code, name, description, body) VALUES
(
  'SHIPMENT_REQUESTED_CUSTOMER_UNPAID',
  'Envío solicitado con pago pendiente (aviso al cliente)',
  'Se envía al cliente al solicitar el envío al transportista cuando la orden todavía no está pagada. Recuerda el monto pendiente.',
  'Hola, {{nombre}}! 👋🏻

Te contamos que tu envío ya fue solicitado al transportista. 🚚📦

Recuerda que tienes pendiente el pago de *{{monto}}*. Cuando lo realices, envíanos el comprobante por este medio. 🧾

En cuanto tengamos el número de guía te lo compartimos para que puedas rastrearlo.

*MAGASTORE 📦✈️*'
)
ON CONFLICT (code) DO NOTHING;
