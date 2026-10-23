-- 035-address-recipient.sql
--
-- Quién recibe en cada dirección. A veces el paquete no lo recibe el cliente
-- sino un familiar (mamá, tío) en otra casa: esos datos van en la solicitud al
-- proveedor, la confirmación con el cliente y la factura. Opcionales: vacíos
-- significan que recibe el propio cliente.
--
-- ADITIVO: columnas nuevas nullable, sin tocar filas existentes.

ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS recipient_id_card TEXT;
