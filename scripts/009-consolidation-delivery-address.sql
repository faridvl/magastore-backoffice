-- Dirección de entrega elegida para la orden de envío (fija hasta que se genera el
-- estimado). Se usa para el snapshot de billing.delivery_address_snapshot en vez de
-- depender de cuál dirección esté marcada is_default en el cliente en ese momento.
ALTER TABLE consolidations
  ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL;
