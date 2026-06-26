-- Agrega columna address_id a packages para registrar la dirección de entrega seleccionada
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL;
