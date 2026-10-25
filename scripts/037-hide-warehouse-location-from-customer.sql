-- 037-hide-warehouse-location-from-customer.sql
--
-- El cliente no debe saber en qué país está la bodega. El aviso de paquetes
-- disponibles (021) decía "nuestra bodega en Panamá".
--
-- Solo se cambia esa frase y solo donde todavía está: si el texto se editó en
-- Ajustes y ya no la tiene, no se toca; el resto del mensaje se conserva tal cual.
--
-- Idempotente: reejecutarla no encuentra la frase y no cambia nada.

UPDATE whatsapp_templates
SET body = replace(body, 'nuestra bodega en Panamá', 'nuestra bodega'), updated_at = NOW()
WHERE code = 'PACKAGES_AVAILABLE' AND body LIKE '%nuestra bodega en Panamá%';
