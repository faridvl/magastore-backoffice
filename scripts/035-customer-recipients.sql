-- 035-customer-recipients.sql
--
-- Quién recibe, separado de dónde. Un cliente puede tener varias personas que
-- reciben por él (mamá, tío) y en cada orden se elige dirección y persona por
-- separado: "él recibe en X" o "su mamá recibe en X". Atarlo a la dirección
-- obligaba a repetir la misma casa por cada persona.
--
-- consolidations.recipient_id NULL significa que recibe el propio cliente.
-- ON DELETE SET NULL: borrar a una persona no deja órdenes apuntando a nada;
-- la factura ya emitida conserva el nombre en su copia de la dirección.
--
-- ADITIVO. Los DROP ... IF EXISTS quitan columnas de quién recibe por dirección
-- si existieran; donde no existen no hacen nada.

CREATE TABLE IF NOT EXISTS customer_recipients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  id_card     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_recipients_customer ON customer_recipients (customer_id);

ALTER TABLE consolidations
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES customer_recipients(id) ON DELETE SET NULL;

ALTER TABLE customer_addresses DROP COLUMN IF EXISTS recipient_name;
ALTER TABLE customer_addresses DROP COLUMN IF EXISTS recipient_phone;
ALTER TABLE customer_addresses DROP COLUMN IF EXISTS recipient_id_card;
