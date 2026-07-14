-- Rediseño de customer_code: de código pseudo-aleatorio a código real por
-- ruta/casillero (ver .claude/docs/customer-code-warehouse-plan.md). Modela
-- cada casillero contratado con el forwarder (origin + package_type, mismo
-- criterio que courier_rates) con su prefijo fijo y contador atómico propio.
CREATE TABLE IF NOT EXISTS warehouse_routes (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  origin TEXT NOT NULL,
  package_type TEXT NOT NULL,
  code_prefix TEXT NOT NULL,
  current_counter INTEGER NOT NULL DEFAULT 0,
  address_line TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (origin, package_type)
);

-- Código real por cliente y ruta. customers.customer_code se mantiene como
-- código principal/cache (no se elimina) para no tocar los 22 archivos que
-- ya lo leen directamente (listados, PDFs, tracking) — esta tabla es la
-- fuente de verdad nueva y soporta múltiples rutas por cliente a futuro.
CREATE TABLE IF NOT EXISTS customer_warehouse_codes (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  warehouse_route_id INTEGER NOT NULL REFERENCES warehouse_routes(id),
  code TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_route_id, code)
);

-- Única ruta real hoy: casillero Miami/Aéreo ya contratado con el forwarder.
-- origin = 'USA' para alinear con el valor ya usado en courier_rates.origin
-- (verificado en Neon: la única fila real hoy es origin='USA', package_type='AEREO').
-- Prefijo y contador confirmados por el dueño (MG-2453-C-00, arranca en 0).
INSERT INTO warehouse_routes (origin, package_type, code_prefix, current_counter, is_active)
VALUES ('USA', 'AEREO', 'MG-2453-C-', 0, true)
ON CONFLICT (origin, package_type) DO NOTHING;
