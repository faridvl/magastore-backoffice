-- Tarifas de envío local (Correos CR, Tracopa) por rango de peso + zona, en vez de
-- un monto fijo por método (system_settings.correos_fee_crc/tracopa_fee_crc). Cobro
-- al cliente (fee_crc) y costo real que cobra el proveedor (cost_crc, nullable =
-- "por confirmar") se guardan por separado para poder calcular ganancia del tramo
-- local, igual que ya se hace con price_per_lb vs courier_rate_usd en el tramo
-- Panamá→CR. zone es NULL cuando el método no distingue zona.
CREATE TABLE IF NOT EXISTS delivery_rates (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  delivery_method TEXT NOT NULL,
  zone TEXT,
  min_weight_kg NUMERIC NOT NULL,
  max_weight_kg NUMERIC NOT NULL,
  fee_crc NUMERIC NOT NULL,
  cost_crc NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Factor de conversión kg↔lb configurable (el sistema pesa en lb, Correos cobra por
-- kg). Default al valor real para no afectar cálculos existentes si queda sin editar.
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS kg_per_lb NUMERIC NOT NULL DEFAULT 0.453592;
