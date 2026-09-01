-- Plantilla hermana de ADDRESS_CONFIRMATION: la de confirmación se usa cuando ya
-- hay dirección guardada, esta cuando el cliente todavía no tiene ninguna y hay
-- que pedírsela antes de poder generar el estimado.
--
-- Magañex mencionó que este texto ya existe como /SolicitudDatosEnvio en el
-- WhatsApp de operación. Acá se deja una redacción equivalente siguiendo el
-- estilo de las demás plantillas; al ser editable desde Ajustes, puede
-- reemplazarse por el texto exacto sin tocar código ni volver a desplegar.
--
-- Solo lleva {{nombre}}: los datos de entrega son justamente lo que no tenemos.
INSERT INTO whatsapp_templates (code, name, description, body) VALUES
(
  'ADDRESS_REQUEST',
  'Solicitud de datos de envío',
  'Se copia para pedirle al cliente los datos de entrega cuando todavía no tiene ninguna dirección registrada.',
  'Hola, {{nombre}}! 👋🏻

Para coordinar la entrega de tu envío necesitamos los siguientes datos:

Nombre de quien recibe:
Cédula:
Teléfono:
Provincia:
Cantón:
Distrito:
Dirección exacta:

En cuanto los recibamos preparamos tu orden y te enviamos el estimado. ✅

*MAGASTORE 📦✈️*'
)
ON CONFLICT (code) DO NOTHING;
