-- Escenario 00: configuración del negocio (tarifas, couriers, casilleros, métodos y tarifas de entrega).
-- Datos ficticios pero verosímiles. Idempotente: se puede correr las veces que haga falta.
-- Las plantillas de WhatsApp las crean las migraciones 021 a 036: aquí no se tocan.

-- Tarifas generales (fila única, id fijo).
INSERT INTO system_settings (
  id, price_per_lb, exchange_rate, min_weight, correos_fee_crc, tracopa_fee_crc,
  courier_rate_usd, courier_insurance_usd, kg_per_lb, farid_share_percent, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000', 6.50, 520.00, 1.00, 4500, 3000,
  2.30, 0.50, 0.453592, 20.00, now()
)
ON CONFLICT (id) DO UPDATE SET
  price_per_lb = EXCLUDED.price_per_lb,
  exchange_rate = EXCLUDED.exchange_rate,
  min_weight = EXCLUDED.min_weight,
  correos_fee_crc = EXCLUDED.correos_fee_crc,
  tracopa_fee_crc = EXCLUDED.tracopa_fee_crc,
  courier_rate_usd = EXCLUDED.courier_rate_usd,
  courier_insurance_usd = EXCLUDED.courier_insurance_usd,
  kg_per_lb = EXCLUDED.kg_per_lb,
  farid_share_percent = EXCLUDED.farid_share_percent,
  updated_at = EXCLUDED.updated_at;

-- Historial de cambios de tarifas.
INSERT INTO settings_history (id, parameter_name, old_value, new_value, changed_at, changed_by_name)
VALUES
  ('5e000000-0000-4000-8000-000000000001', 'exchange_rate', 515.00, 520.00, now() - interval '12 days', 'Usuario de prueba'),
  ('5e000000-0000-4000-8000-000000000002', 'price_per_lb', 6.00, 6.50, now() - interval '45 days', 'Usuario de prueba'),
  ('5e000000-0000-4000-8000-000000000003', 'min_weight', 0.50, 1.00, now() - interval '90 days', 'Usuario de prueba')
ON CONFLICT (id) DO UPDATE SET
  parameter_name = EXCLUDED.parameter_name,
  old_value = EXCLUDED.old_value,
  new_value = EXCLUDED.new_value,
  changed_at = EXCLUDED.changed_at,
  changed_by_name = EXCLUDED.changed_by_name;

-- Tarifas de courier. La primera es la predeterminada.
INSERT INTO courier_rates (id, uuid, name, origin, package_type, rate_usd, insurance_usd, is_active, is_default)
VALUES
  (1, 'ca000000-0000-4000-8000-000000000001', 'Aéreo USA', 'USA', 'AEREO', 2.3000, 0.5000, true, true),
  (2, 'ca000000-0000-4000-8000-000000000002', 'CPF', 'USA', 'AEREO', 2.6000, 0.4000, true, false),
  (3, 'ca000000-0000-4000-8000-000000000003', 'Marítimo USA', 'USA', 'MARITIMO', 1.2000, 0.3000, true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  origin = EXCLUDED.origin,
  package_type = EXCLUDED.package_type,
  rate_usd = EXCLUDED.rate_usd,
  insurance_usd = EXCLUDED.insurance_usd,
  is_active = EXCLUDED.is_active;
SELECT setval('courier_rates_id_seq', GREATEST((SELECT max(id) FROM courier_rates), 3));

-- Casilleros (uno por courier). El contador arranca en lo ya asignado a los clientes del escenario 01.
INSERT INTO warehouse_routes (
  id, uuid, origin, package_type, code_prefix, current_counter, address_line, city, state,
  postal_code, contact_phone, is_active, courier_rate_id
) VALUES
  (1, 'a2000000-0000-4000-8000-000000000001', 'USA', 'AEREO', 'MGA-2453-C-', 12,
   '1000 Calle Ejemplo', 'Doral', 'Florida', '33100', '+1 305-555-0100', true, 1),
  (2, 'a2000000-0000-4000-8000-000000000002', 'USA', 'AEREO', 'CPF285-', 3,
   '2000 Avenida Muestra', 'Miami', 'Florida', '33101', '+1 305-555-0101', true, 2)
ON CONFLICT (courier_rate_id) DO UPDATE SET
  origin = EXCLUDED.origin,
  package_type = EXCLUDED.package_type,
  code_prefix = EXCLUDED.code_prefix,
  current_counter = GREATEST(warehouse_routes.current_counter, EXCLUDED.current_counter),
  address_line = EXCLUDED.address_line,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  postal_code = EXCLUDED.postal_code,
  contact_phone = EXCLUDED.contact_phone,
  is_active = EXCLUDED.is_active;
SELECT setval('warehouse_routes_id_seq', GREATEST((SELECT max(id) FROM warehouse_routes), 2));

-- Métodos de entrega: las migraciones ya crean Correos, Tracopa y Retiro en oficina (is_pickup).
-- Se completan los enlaces de rastreo y se suma una mensajería local sin zonas.
UPDATE delivery_methods SET tracking_url = 'https://correos.go.cr/rastreo/' WHERE code = 'CORREOS_CR';
UPDATE delivery_methods SET tracking_url = 'https://tracopa.ejemplo.test/rastreo/' WHERE code = 'TRACOPA';
INSERT INTO delivery_methods (code, name, requires_zone, is_pickup, is_active, tracking_url)
VALUES ('MENSAJERIA', 'Mensajería local', false, false, true, 'https://mensajeria.ejemplo.test/guia/')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  requires_zone = EXCLUDED.requires_zone,
  is_pickup = EXCLUDED.is_pickup,
  is_active = EXCLUDED.is_active,
  tracking_url = EXCLUDED.tracking_url;

-- Tarifas de entrega. Las de Correos ya las siembra la migración 012 (con tramos "por confirmar"
-- sin costo real: sirven para probar la ganancia incompleta). Tracopa y mensajería se agregan aquí.
INSERT INTO delivery_rates (uuid, delivery_method, zone, min_weight_kg, max_weight_kg, fee_crc, cost_crc, is_active)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'TRACOPA', 'GAM',   0.00,  9.99, 3000, 2500, true),
  ('d1000000-0000-4000-8000-000000000002', 'TRACOPA', 'RESTO', 0.00,  9.99, 3500, 3000, true),
  ('d1000000-0000-4000-8000-000000000003', 'TRACOPA', 'GAM',  10.00, 50.00, 4500, 3800, true),
  ('d1000000-0000-4000-8000-000000000004', 'TRACOPA', 'RESTO', 10.00, 50.00, 5500, 4800, true),
  ('d1000000-0000-4000-8000-000000000005', 'MENSAJERIA', NULL, 0.00, 50.00, 2000, 1500, true)
ON CONFLICT (uuid) DO UPDATE SET
  delivery_method = EXCLUDED.delivery_method,
  zone = EXCLUDED.zone,
  min_weight_kg = EXCLUDED.min_weight_kg,
  max_weight_kg = EXCLUDED.max_weight_kg,
  fee_crc = EXCLUDED.fee_crc,
  cost_crc = EXCLUDED.cost_crc,
  is_active = EXCLUDED.is_active;
