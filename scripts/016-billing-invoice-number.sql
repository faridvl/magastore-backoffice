-- Número de factura correlativo y legible (F-0001, F-0002, ...) para poder
-- identificar una factura al hablar con el cliente o anotarla, en vez de usar
-- el UUID. Solo aplica a billing (factura final) — pre_billing es un estimado,
-- no un documento fiscal, y no necesita correlativo.
CREATE SEQUENCE IF NOT EXISTS billing_invoice_number_seq START WITH 1;

ALTER TABLE billing ADD COLUMN IF NOT EXISTS invoice_number integer;

-- Backfill de facturas existentes, en orden de creación, para que el
-- correlativo respete el histórico real.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM billing WHERE invoice_number IS NULL ORDER BY created_at ASC LOOP
    UPDATE billing SET invoice_number = nextval('billing_invoice_number_seq') WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE billing ALTER COLUMN invoice_number SET NOT NULL;
ALTER TABLE billing ALTER COLUMN invoice_number SET DEFAULT nextval('billing_invoice_number_seq');
ALTER TABLE billing ADD CONSTRAINT billing_invoice_number_key UNIQUE (invoice_number);
ALTER SEQUENCE billing_invoice_number_seq OWNED BY billing.invoice_number;
