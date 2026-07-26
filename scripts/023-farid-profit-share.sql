-- Participación de Farid sobre la ganancia. Es un reparto de la utilidad que el
-- sistema ya calcula (billing.profit_crc = cobro − costo courier − costo entrega),
-- NO un rubro que se suma al cobro: el cliente paga exactamente lo mismo que antes.
-- Un cliente AL_COSTO deja ganancia ₡0 y por lo tanto participación ₡0, sin caso
-- especial en el código.
--
-- farid_share_percent vive en system_settings pero deliberadamente NO se incluye en
-- el UPDATE de settings.repo.ts: es un acuerdo societario, no una tarifa operativa.
-- Cambiarlo requiere tocar la BD a propósito. La UI lo muestra en solo lectura.
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS farid_share_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00;

-- Una fila por orden de envío. Se escribe al generar el estimado (status ESTIMADO)
-- y se recongela al confirmar la factura (status FACTURADO).
--
-- El UNIQUE sobre consolidation_id es la pieza clave: generatePreBilling es
-- re-ejecutable (el operador puede recalcular el estimado n veces), así que el
-- registro se hace por UPSERT y una recalculación sobreescribe en vez de duplicar.
-- Sin esto la sumatoria mensual contaría el mismo envío varias veces.
--
-- status distingue plata proyectada de plata real: un estimado que nunca se factura
-- no es ingreso. Los reportes suman FACTURADO como cifra oficial del mes y muestran
-- ESTIMADO aparte, en vez de mezclarlos en un solo total inflado.
--
-- period es YYYY-MM derivado de la fecha del estimado y se recalcula a la fecha de
-- la factura al confirmar: un envío estimado a fin de mes y facturado el siguiente
-- pertenece al mes en que se cobró.
--
-- has_unknown_cost se propaga desde el mismo criterio de billing (018): si el costo
-- real de entrega no se conocía, la ganancia no lo descuenta y la participación
-- calculada queda por encima de la real. Se marca en vez de asumir cero en silencio.
CREATE TABLE IF NOT EXISTS profit_shares (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  consolidation_id INTEGER NOT NULL UNIQUE REFERENCES consolidations(id) ON DELETE CASCADE,
  billing_id INTEGER REFERENCES billing(id),
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ESTIMADO',
  revenue_crc NUMERIC(12,2) NOT NULL DEFAULT 0,
  courier_cost_crc NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_cost_crc NUMERIC(12,2),
  profit_base_crc NUMERIC(12,2) NOT NULL DEFAULT 0,
  share_percent NUMERIC(5,2) NOT NULL,
  share_crc NUMERIC(12,2) NOT NULL DEFAULT 0,
  has_unknown_cost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profit_shares_status_check CHECK (status IN ('ESTIMADO', 'FACTURADO')),
  CONSTRAINT profit_shares_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

CREATE INDEX IF NOT EXISTS idx_profit_shares_period ON profit_shares (period);
CREATE INDEX IF NOT EXISTS idx_profit_shares_status ON profit_shares (status);

-- Desglose por paquete: cuánto se ganó con cada uno. El cobro al cliente se factura
-- por la orden completa (peso agregado, con peso mínimo y fee de entrega únicos), así
-- que a nivel paquete no existe un cobro propio real: se prorratea por peso.
-- costo_crc sí es dato real del paquete (courier_cost_usd * tc_banco).
--
-- Se borra y reinserta junto con el UPSERT del padre — de ahí el ON DELETE CASCADE.
CREATE TABLE IF NOT EXISTS profit_share_packages (
  id SERIAL PRIMARY KEY,
  profit_share_id INTEGER NOT NULL REFERENCES profit_shares(id) ON DELETE CASCADE,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  weight_lb NUMERIC(10,2) NOT NULL DEFAULT 0,
  revenue_crc NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_crc NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit_crc NUMERIC(12,2) NOT NULL DEFAULT 0,
  share_crc NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profit_share_packages_share ON profit_share_packages (profit_share_id);
CREATE INDEX IF NOT EXISTS idx_profit_share_packages_package ON profit_share_packages (package_id);

-- Estado de pago por mes: la fila "Junio 2026" que se marca como pagada en Reportes.
-- Se crea sola la primera vez que se marca un período (no hace falta precargar meses).
-- Un mes sin fila es un mes no pagado.
CREATE TABLE IF NOT EXISTS profit_share_periods (
  id SERIAL PRIMARY KEY,
  period TEXT NOT NULL UNIQUE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  paid_by_name TEXT,
  paid_amount_crc NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profit_share_periods_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);
