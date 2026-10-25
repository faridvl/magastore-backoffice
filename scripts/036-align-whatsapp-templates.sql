-- 036-align-whatsapp-templates.sql
--
-- Textos de plantillas definidos por el negocio y corrección del estimado, que
-- mandaba "Precio x lb:" y "Envío:" vacíos.
--
-- Pedir y confirmar dirección, y la reseña, se reemplazan completas: en
-- producción nacen en este mismo lote (028, 029, 034), no hay ediciones que
-- perder. La reseña va sin enlace: el cliente responde por WhatsApp. El resto
-- solo se toca si tiene el texto original o el defecto conocido, para no pisar
-- ajustes hechos desde Ajustes.
--
-- Idempotente: reejecutarla deja el mismo texto.

UPDATE whatsapp_templates SET body = $tpl$📍 Para preparar tu envío, necesitamos los siguientes datos de entrega:

Nombre completo:
Cédula:
Teléfono de quien recibe:
Provincia:
Cantón:
Distrito:
Dirección exacta:

Por favor, verifica que los datos sean correctos antes de enviarlos. ✅$tpl$, updated_at = NOW()
WHERE code = 'ADDRESS_REQUEST';

UPDATE whatsapp_templates SET body = $tpl$📍 Tenemos registrada esta dirección:

Nombre: {{nombre_recibe}}
Cédula: {{cedula}}
Teléfono: {{telefono_recibe}}
Provincia: {{provincia}}
Cantón: {{canton}}
Distrito: {{distrito}}
Dirección: {{direccion}}

¿Utilizamos esta dirección para tu envío? ✅

Si necesitas cambiarla, indícanos la nueva dirección.$tpl$, updated_at = NOW()
WHERE code = 'ADDRESS_CONFIRMATION';

UPDATE whatsapp_templates SET body = $tpl$💯 ¡Nos alegra saber que todo llegó bien, {{nombre}}!

Tu experiencia es muy importante para nosotros. Si quedaste satisfecho con el servicio de MAGASTORE, ¿nos ayudarías dejando una reseña o compartiendo brevemente tu experiencia? ⭐

Tu opinión nos ayuda a seguir mejorando y también permite que más personas conozcan nuestro servicio.

¡Muchas gracias por confiar en nosotros!

*MAGASTORE 📦✈️*$tpl$,
  description = 'Se envía después del seguimiento, cuando el cliente confirmó que todo llegó bien. El cliente responde por WhatsApp.',
  updated_at = NOW()
WHERE code = 'REVIEW_REQUEST';

UPDATE whatsapp_templates SET body = $tpl$📦 Estimado(a), {{nombre}}.

Su envío #{{id_orden}} ya tiene el estimado listo (adjunto el PDF).

*Detalle de sus paquetes:*
{{desglose_paquetes}}

Envío internacional: {{monto_envio}}
{{descuento}}
{{metodo_entrega}}: {{monto_entrega}}
*Total a pagar: {{monto}}*

Peso total: {{peso_total}} lb

Quedamos atentos a su confirmación para proceder.

*MAGASTORE 📦✈️*$tpl$, updated_at = NOW()
WHERE code = 'PREBILLING_READY'
  AND (
    body ~ ('(Precio x lb|Envío):[ ]*(' || chr(10) || '|$)')
    OR body = $orig$📦 Estimado(a), {{nombre}}.

Su envío #{{id_orden}} ya tiene el estimado listo (adjunto el PDF).

Peso total: {{peso_total}} lb
Método de entrega: {{metodo_entrega}}

Quedamos atentos a su confirmación para proceder.

*MAGASTORE 📦✈️*$orig$
  );

-- Seguimiento: el número de orden que pide TickTick, solo si todavía no está.
UPDATE whatsapp_templates
SET body = replace(body, 'tu pedido haya llegado', 'tu pedido #{{id_orden}} haya llegado'), updated_at = NOW()
WHERE code = 'POST_DELIVERY_FOLLOW_UP' AND body NOT LIKE '%{{id_orden}}%';

-- Paquetes disponibles: unidad del peso, solo donde falta.
UPDATE whatsapp_templates
SET body = regexp_replace(body, '\{\{peso_total\}\}(?! ?lb)', '{{peso_total}} lb', 'g'), updated_at = NOW()
WHERE code = 'PACKAGES_AVAILABLE' AND body ~ '\{\{peso_total\}\}(?! ?lb)';

-- Bienvenida de casillero: si el título se editó en Ajustes con "Aéreo — Estados
-- Unidos" fijo, se cambia por la ruta, que también sirve a casilleros de otro origen.
UPDATE whatsapp_templates
SET body = replace(body, '*Casillero Aéreo — Estados Unidos* 🇺🇸', '*Casillero {{ruta_label}}*'), updated_at = NOW()
WHERE code = 'WAREHOUSE_WELCOME' AND body LIKE '%Casillero Aéreo — Estados Unidos%';
