-- Plantilla nueva: aviso al CLIENTE de que su envío fue solicitado al
-- transportista, distinta de SHIPMENT_DISPATCHED (migración 026), que se
-- manda cuando la orden ya está DESPACHADO y trae guía + link de rastreo.
--
-- Esta se manda ANTES: al copiar la solicitud al proveedor (paso 3 del
-- wizard), cuando todavía no hay guía confirmada. Por eso NO menciona número
-- de rastreo — prometer un dato que no existe generaría más confusión que
-- confianza. La guía real se le avisa después, con SHIPMENT_DISPATCHED, que
-- no se toca.
INSERT INTO whatsapp_templates (code, name, description, body) VALUES
(
  'SHIPMENT_REQUESTED_CUSTOMER',
  'Envío solicitado (aviso al cliente)',
  'Se envía al cliente al solicitar el envío al transportista, antes de tener guía confirmada. La guía se avisa después con la plantilla de despacho.',
  'Hola, {{nombre}}! 👋🏻

Te contamos que tu envío ya fue solicitado al transportista. 🚚📦

En cuanto tengamos el número de guía te lo compartimos para que puedas rastrearlo.

*MAGASTORE 📦✈️*'
)
ON CONFLICT (code) DO NOTHING;
