-- Tipos de cliente configurables con su regla de cobro. Reemplaza el "tier"
-- decorativo (Regular/VIP/Diamond) que existía solo en el formulario y nunca
-- llegaba a la BD ni afectaba el cálculo.
--
-- billing_mode:
--   NORMAL    → precio de lista (system_settings.price_per_lb). Default.
--   AL_COSTO  → el flete internacional se cobra al costo real del courier
--               (courier_cost_usd * tc_banco), sin margen. Para socios y familia:
--               la entrega local (Correos/encomienda) SÍ se cobra completa.
--   DESCUENTO → discount_percent % de descuento sobre el flete únicamente.
--               La entrega local nunca se descuenta (es traslado de costo).
CREATE TABLE IF NOT EXISTS customer_types (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  name TEXT NOT NULL UNIQUE,
  billing_mode TEXT NOT NULL DEFAULT 'NORMAL',
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_types_billing_mode_check
    CHECK (billing_mode IN ('NORMAL', 'AL_COSTO', 'DESCUENTO')),
  CONSTRAINT customer_types_discount_range
    CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

-- Tipo por defecto: todos los clientes actuales quedan como NORMAL.
INSERT INTO customer_types (name, billing_mode, discount_percent)
VALUES ('Regular', 'NORMAL', 0)
ON CONFLICT (name) DO NOTHING;

INSERT INTO customer_types (name, billing_mode, discount_percent)
VALUES ('Socio / Familia', 'AL_COSTO', 0)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type_id INTEGER REFERENCES customer_types(id);

-- Clientes existentes → Regular (NORMAL), preservando el comportamiento actual.
UPDATE customers
SET customer_type_id = (SELECT id FROM customer_types WHERE name = 'Regular')
WHERE customer_type_id IS NULL;

-- Snapshot de la regla aplicada al facturar: igual que applied_rate_usd, el
-- estimado y la factura congelan cómo se cobró, para que cambiar el % de un
-- tipo mañana no altere retroactivamente documentos ya emitidos.
ALTER TABLE pre_billing ADD COLUMN IF NOT EXISTS applied_billing_mode TEXT;
ALTER TABLE pre_billing ADD COLUMN IF NOT EXISTS applied_discount_percent NUMERIC(5,2);
ALTER TABLE billing ADD COLUMN IF NOT EXISTS applied_billing_mode TEXT;
ALTER TABLE billing ADD COLUMN IF NOT EXISTS applied_discount_percent NUMERIC(5,2);
