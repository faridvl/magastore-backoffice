-- Plantilla para confirmar con el cliente la dirección que ya tenemos guardada,
-- antes de generar el estimado. Va AL CLIENTE, pero se copia al portapapeles en
-- vez de abrir WhatsApp: el operador suele estar ya en la conversación y pegar
-- ahí es más directo que reabrir el chat.
--
-- Es el primer trozo del flujo de confirmación de dirección: entrega el texto,
-- sin registrar estado de confirmación ni bloquear el estimado. Ese gating es
-- una etapa aparte y reutilizará este mismo builder.
--
-- Los campos de destino salen de la dirección ya asignada a la orden. Si la
-- orden no tiene dirección el flujo ni siquiera ofrece el botón — pedir que
-- confirme una dirección vacía no tiene sentido.
INSERT INTO whatsapp_templates (code, name, description, body) VALUES
(
  'ADDRESS_CONFIRMATION',
  'Confirmación de dirección',
  'Se copia para pedirle al cliente que confirme la dirección de entrega registrada, antes de generar el estimado.',
  '📍 Tenemos registrada la siguiente dirección de entrega:

Nombre: {{nombre_recibe}}
Cédula: {{cedula}}
Teléfono: {{telefono_recibe}}
Provincia: {{provincia}}
Cantón: {{canton}}
Distrito: {{distrito}}
Dirección: {{direccion}}

¿Deseas que utilicemos estos mismos datos para este envío? ✅

Si deseas el envío a otra dirección, indícanos los datos.

*MAGASTORE 📦✈️*'
)
ON CONFLICT (code) DO NOTHING;
