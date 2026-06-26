-- Etapa 16: Snapshot de dirección de entrega en factura
-- Agrega columna delivery_address_snapshot a billing para guardar
-- la dirección predeterminada del cliente al momento de facturar.

ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot TEXT;
