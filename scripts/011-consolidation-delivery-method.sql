-- Método de envío elegido al crear la orden (junto con la dirección de entrega),
-- en vez de recién preguntarlo al generar el estimado. Nullable: órdenes viejas
-- quedan sin valor y generatePreBilling sigue aceptando un método explícito como
-- fallback en ese caso.
ALTER TABLE consolidations
  ADD COLUMN IF NOT EXISTS delivery_method TEXT;
