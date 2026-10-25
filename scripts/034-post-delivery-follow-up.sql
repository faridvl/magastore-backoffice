-- Postventa: tres mensajes de WhatsApp posteriores a la entrega.
--
-- 1. Seguimiento (por orden): se manda unos días después del despacho para
--    confirmar que todo llegó bien. follow_up_sent_at alimenta el filtro
--    "Seguimiento pendiente" del listado de órdenes.
-- 2. Reseña (por orden): solo después del seguimiento, porque el texto asume
--    que el cliente respondió que todo llegó bien.
-- 3. Fidelización (por cliente): invitación a volver para clientes inactivos.
--    Se compara contra el último paquete: si el cliente volvió a comprar y
--    luego quedó inactivo otra vez, corresponde invitarlo de nuevo.
ALTER TABLE consolidations ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ;
ALTER TABLE consolidations ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS win_back_sent_at TIMESTAMPTZ;

-- Parcial: el filtro solo mira órdenes finalizadas sin seguimiento, que son
-- pocas frente al histórico completo.
CREATE INDEX IF NOT EXISTS idx_consolidations_follow_up_pending
  ON consolidations (dispatched_at)
  WHERE current_step = 5 AND follow_up_sent_at IS NULL;

-- El enlace de reseñas va escrito en el texto, no como variable: todavía no
-- está definido y se completa editando la plantilla en Ajustes → Plantillas.
INSERT INTO whatsapp_templates (code, name, description, body) VALUES
(
  'POST_DELIVERY_FOLLOW_UP',
  'Seguimiento postventa',
  'Se envía al cliente unos días después del despacho para confirmar que su pedido llegó bien.',
  'Hola, {{nombre}}! 👋🏻

Queríamos confirmar que tu pedido haya llegado correctamente. 📦

¿Todo llegó bien?

Si tienes alguna duda o necesitas ayuda con tu pedido, estamos a tu disposición.

*MAGASTORE 📦✈️*'
),
(
  'REVIEW_REQUEST',
  'Solicitud de reseña',
  'Se envía después del seguimiento, cuando el cliente confirmó que todo llegó bien. Reemplaza (link de reseñas) por el enlace real.',
  '💯 ¡Nos alegra saber que todo llegó bien, {{nombre}}!

Tu experiencia es muy importante para nosotros. Si quedaste satisfecho con el servicio de MAGASTORE, ¿nos ayudarías dejando una reseña o compartiendo brevemente tu experiencia? ⭐

👉 (link de reseñas)

Tu opinión nos ayuda a seguir mejorando y también permite que más personas conozcan nuestro servicio.

¡Muchas gracias por confiar en nosotros!

*MAGASTORE 📦✈️*'
),
(
  'CUSTOMER_WIN_BACK',
  'Invitación a volver (fidelización)',
  'Se envía a clientes inactivos para invitarlos a volver a comprar con MAGASTORE.',
  '🛍️ Cuando vuelvas a comprar por internet, aquí estaremos para ayudarte. 😊

Puedes contar con MAGASTORE para traer tus compras desde Estados Unidos de forma rápida, segura y confiable. 📦✈️

Y si necesitas ayuda para realizar una compra, también contamos con Compras Asistidas. 🛒

¡Será un gusto ayudarte nuevamente, {{nombre}}! 💙

*MAGASTORE 📦✈️*'
)
ON CONFLICT (code) DO NOTHING;
