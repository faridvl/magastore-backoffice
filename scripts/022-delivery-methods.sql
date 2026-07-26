-- Reemplaza el union type fijo DeliveryMethod ('CORREOS_CR' | 'TRACOPA' | 'RETIRO')
-- por un catálogo editable. El motivo: 'TRACOPA' está modelado con el nombre de un
-- proveedor específico cuando el concepto real de negocio es "encomienda" (transporte
-- terrestre local, que puede prestar Tracopa u otra empresa) — no había forma de dar de
-- alta un método nuevo sin tocar código y desplegar.
--
-- code es el identificador estable: billing.delivery_method y pre_billing.delivery_method
-- ya guardan estos strings como snapshot en facturas emitidas y se dejan intactos —
-- renombrar el name nunca cambia el code, así una factura vieja sigue resolviendo su
-- nombre correctamente vía JOIN.
CREATE TABLE IF NOT EXISTS delivery_methods (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  requires_zone BOOLEAN NOT NULL DEFAULT true,
  is_pickup BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO delivery_methods (code, name, requires_zone, is_pickup)
VALUES
  ('CORREOS_CR', 'Correos de Costa Rica', true, false),
  ('TRACOPA', 'Encomienda Tracopa', true, false),
  ('RETIRO', 'Retiro en oficina', false, true)
ON CONFLICT (code) DO NOTHING;

-- delivery_rates.delivery_method pasa de texto libre a FK por code. No se puede usar
-- una FK a un UUID/id porque el snapshot en billing/pre_billing ya usa el code como
-- texto; se valida con un CHECK contra delivery_methods.code en su lugar, ya que
-- delivery_rates seguirá consultándose por ese texto en findMatchingRate.
ALTER TABLE delivery_rates
  ADD CONSTRAINT delivery_rates_delivery_method_fkey
  FOREIGN KEY (delivery_method) REFERENCES delivery_methods(code);
