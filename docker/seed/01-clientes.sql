-- Escenario 01: clientes, direcciones, personas que reciben y casilleros.
-- Todo inventado: nombres, cédulas, correos (@ejemplo.test) y teléfonos.
-- Teléfonos en el rango +506 0000-00NN, que no se asigna en Costa Rica: ningún WhatsApp llega a nadie.
-- Idempotente: ids fijos y ON CONFLICT DO UPDATE. Antes de sembrar se borra lo que se creó desde la app
-- para los clientes y órdenes del seed (solo por sus ids fijos), para dejar los escenarios como nuevos.

CREATE OR REPLACE FUNCTION pg_temp.ago(days numeric) RETURNS timestamptz
  LANGUAGE sql AS $$ SELECT now() - days * interval '1 day' $$;
CREATE OR REPLACE FUNCTION pg_temp.cust(n int) RETURNS uuid
  LANGUAGE sql AS $$ SELECT ('c0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
CREATE OR REPLACE FUNCTION pg_temp.addr(n int) RETURNS uuid
  LANGUAGE sql AS $$ SELECT ('a0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
CREATE OR REPLACE FUNCTION pg_temp.recip(n int) RETURNS uuid
  LANGUAGE sql AS $$ SELECT ('b0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- Limpieza de lo creado desde la app sobre los clientes y órdenes del seed.
DROP TABLE IF EXISTS pg_temp._seed_orders;
CREATE TEMP TABLE _seed_orders AS
SELECT id FROM consolidations
WHERE uuid::text LIKE 'd0000000-0000-4000-8000-%'
   OR customer_id::text LIKE 'c0000000-0000-4000-8000-%';

DELETE FROM profit_shares WHERE consolidation_id IN (SELECT id FROM _seed_orders);
DELETE FROM billing WHERE consolidation_id IN (SELECT id FROM _seed_orders);
DELETE FROM pre_billing WHERE consolidation_id IN (SELECT id FROM _seed_orders);
DELETE FROM packages
WHERE (customer_id::text LIKE 'c0000000-0000-4000-8000-%' OR consolidation_id IN (SELECT id FROM _seed_orders))
  AND uuid::text NOT LIKE 'e0000000-0000-4000-8000-%';
DELETE FROM consolidations
WHERE customer_id::text LIKE 'c0000000-0000-4000-8000-%'
  AND uuid::text NOT LIKE 'd0000000-0000-4000-8000-%';
DELETE FROM customer_addresses
WHERE customer_id::text LIKE 'c0000000-0000-4000-8000-%' AND id::text NOT LIKE 'a0000000-0000-4000-8000-%';
DELETE FROM customer_recipients
WHERE customer_id::text LIKE 'c0000000-0000-4000-8000-%' AND id::text NOT LIKE 'b0000000-0000-4000-8000-%';
DELETE FROM customer_warehouse_codes
WHERE customer_id::text LIKE 'c0000000-0000-4000-8000-%' AND uuid::text NOT LIKE 'c1000000-0000-4000-8000-%';

-- Tipos de cliente: Regular y Socio / Familia vienen de la migración 019.
INSERT INTO customer_types (name, billing_mode, discount_percent)
VALUES ('Cliente frecuente', 'DESCUENTO', 10.00)
ON CONFLICT (name) DO UPDATE SET billing_mode = EXCLUDED.billing_mode, discount_percent = EXCLUDED.discount_percent;

INSERT INTO customers (
  id, id_card, id_type, first_name, last_name, email, phone, customer_code,
  is_active, created_at, updated_at, customer_type_id, win_back_sent_at
)
SELECT
  pg_temp.cust(v.n), v.id_card, v.id_type, v.first_name, v.last_name, v.email, v.phone, v.code,
  v.is_active, pg_temp.ago(v.created_days), pg_temp.ago(v.created_days),
  (SELECT id FROM customer_types WHERE name = v.type_name), NULL
FROM (VALUES
  -- 1: con paquetes en Panamá sin orden y sin avisar; tres órdenes.
  (1, '1-0987-0654', 'FISICA', 'Valeria', 'Mora Quesada', 'valeria.mora@ejemplo.test', '+506 0000-0001', 'MGA-2453-C-01', true, 120, 'Regular'),
  -- 2: ya avisado; también tiene casillero CPF.
  (2, '4-0123-0456', 'FISICA', 'Andrés', 'Solano Chacón', 'andres.solano@ejemplo.test', '+506 0000-0002', 'MGA-2453-C-02', true, 110, 'Regular'),
  -- 3: sin ninguna dirección registrada.
  (3, '1-1020-0304', 'FISICA', 'Mariana', 'Ulate Brenes', 'mariana.ulate@ejemplo.test', '+506 0000-0003', 'MGA-2453-C-03', true, 30, 'Regular'),
  -- 4: varias direcciones y varias personas que reciben.
  (4, '1-0765-0432', 'FISICA', 'Jorge', 'Arias Villalobos', 'jorge.arias@ejemplo.test', '+506 0000-0004', 'MGA-2453-C-04', true, 150, 'Regular'),
  -- 5: sin apellido (la columna es obligatoria: queda vacía).
  (5, '2-0456-0789', 'FISICA', 'Sofía', '', 'sofia.sinapellido@ejemplo.test', '+506 0000-0005', 'MGA-2453-C-05', true, 20, 'Regular'),
  -- 6: nombre muy largo.
  (6, '1-0345-0678', 'FISICA', 'María de los Ángeles del Socorro', 'Fernández de la Cuesta y Rodríguez-Villalobos Castro', 'maria.nombrelargo@ejemplo.test', '+506 0000-0006', 'MGA-2453-C-06', true, 75, 'Regular'),
  -- 7: inactivo, último paquete hace más de 60 días (pendiente de invitar a volver).
  (7, '3-0234-0567', 'FISICA', 'Esteban', 'Rojas Campos', 'esteban.rojas@ejemplo.test', '+506 0000-0007', 'MGA-2453-C-07', false, 300, 'Regular'),
  -- 8: persona jurídica con envíos de millones de colones.
  (8, '3-101-123456', 'JURIDICA', 'Importadora La Ceiba', 'S.A.', 'compras@laceiba.ejemplo.test', '+506 0000-0008', 'MGA-2453-C-08', true, 200, 'Regular'),
  -- 9: socio, se cobra al costo.
  (9, '1-0567-0890', 'FISICA', 'Laura', 'Campos Jiménez', 'laura.campos@ejemplo.test', '+506 0000-0009', 'MGA-2453-C-09', true, 180, 'Socio / Familia'),
  -- 10: dos tarifas de courier en una orden; también tiene casillero CPF.
  (10, '5-0123-0456', 'FISICA', 'Daniela', 'Pérez Rojas', 'daniela.perez@ejemplo.test', '+506 0000-0010', 'MGA-2453-C-10', true, 60, 'Regular'),
  -- 11: cliente frecuente con 10 % de descuento.
  (11, '1-0678-0901', 'FISICA', 'Roberto', 'Vargas Salas', 'roberto.vargas@ejemplo.test', '+506 0000-0011', 'MGA-2453-C-11', true, 95, 'Cliente frecuente'),
  -- 12: DIMEX, recién registrado y sin movimientos.
  (12, '155812345678', 'DIMEX', 'Carlos', 'Mendoza Ruiz', 'carlos.mendoza@ejemplo.test', '+506 0000-0012', 'MGA-2453-C-12', true, 2, 'Regular')
) AS v(n, id_card, id_type, first_name, last_name, email, phone, code, is_active, created_days, type_name)
ON CONFLICT (id) DO UPDATE SET
  id_card = EXCLUDED.id_card,
  id_type = EXCLUDED.id_type,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  customer_code = EXCLUDED.customer_code,
  is_active = EXCLUDED.is_active,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  customer_type_id = EXCLUDED.customer_type_id,
  win_back_sent_at = NULL;

-- Casilleros: el código principal de cada cliente en la ruta de Aéreo USA y tres códigos en CPF.
INSERT INTO customer_warehouse_codes (uuid, customer_id, warehouse_route_id, code, assigned_at)
SELECT
  ('c1000000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid,
  pg_temp.cust(v.cust_n),
  (SELECT id FROM warehouse_routes WHERE courier_rate_id = v.courier_id),
  v.code,
  pg_temp.ago(v.days)
FROM (VALUES
  (1, 1, 1, 'MGA-2453-C-01', 120), (2, 2, 1, 'MGA-2453-C-02', 110), (3, 3, 1, 'MGA-2453-C-03', 30),
  (4, 4, 1, 'MGA-2453-C-04', 150), (5, 5, 1, 'MGA-2453-C-05', 20), (6, 6, 1, 'MGA-2453-C-06', 75),
  (7, 7, 1, 'MGA-2453-C-07', 300), (8, 8, 1, 'MGA-2453-C-08', 200), (9, 9, 1, 'MGA-2453-C-09', 180),
  (10, 10, 1, 'MGA-2453-C-10', 60), (11, 11, 1, 'MGA-2453-C-11', 95), (12, 12, 1, 'MGA-2453-C-12', 2),
  (13, 2, 2, 'CPF285-01', 100), (14, 5, 2, 'CPF285-02', 15), (15, 10, 2, 'CPF285-03', 55)
) AS v(n, cust_n, courier_id, code, days)
ON CONFLICT (uuid) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  warehouse_route_id = EXCLUDED.warehouse_route_id,
  code = EXCLUDED.code,
  assigned_at = EXCLUDED.assigned_at;

-- Direcciones. El cliente 3 no tiene ninguna; el 4 tiene tres.
INSERT INTO customer_addresses (id, customer_id, province, canton, district, exact_address, is_default, address_label)
SELECT pg_temp.addr(v.n), pg_temp.cust(v.cust_n), v.province, v.canton, v.district, v.exact_address, v.is_default, v.label
FROM (VALUES
  (1, 1, 'San José', 'Escazú', 'San Rafael', 'Casa 14, 300 metros al norte del parque', true, 'Casa'),
  (2, 2, 'Heredia', 'Heredia', 'Mercedes', 'Condominio Los Almendros, casa 7', true, 'Casa'),
  (3, 4, 'San José', 'San José', 'Carmen', 'Apartamento 3B, edificio Torre Sur', true, 'Casa'),
  (4, 4, 'Heredia', 'Heredia', 'Mercedes', 'Oficentro Las Palmas, local 12', false, 'Trabajo'),
  (5, 4, 'Limón', 'Pococí', 'Guápiles', 'Finca La Esperanza, 2 km al este del cruce', false, 'Finca familiar'),
  (6, 5, 'Cartago', 'Cartago', 'Oriental', '100 metros sur de la basílica, casa verde', true, 'Casa'),
  (7, 6, 'Guanacaste', 'Liberia', 'Liberia', 'Barrio Los Cerros, casa 22', true, 'Casa'),
  (8, 7, 'San José', 'Desamparados', 'Desamparados', 'Calle principal, portón negro', true, 'Casa'),
  (9, 8, 'Alajuela', 'Alajuela', 'San José', 'Zona industrial, bodega 5', true, 'Bodega'),
  (10, 9, 'San José', 'Moravia', 'San Vicente', 'Residencial El Prado, casa 9', true, 'Casa'),
  (11, 10, 'Puntarenas', 'Puntarenas', 'Chacarita', 'Frente a la escuela, casa blanca', true, 'Casa'),
  (12, 11, 'San José', 'Santa Ana', 'Santa Ana', 'Condominio Valle Verde, casa 31', true, 'Casa'),
  (13, 12, 'Alajuela', 'Alajuela', 'Alajuela', 'Urbanización Los Pinos, casa 4', true, 'Casa')
) AS v(n, cust_n, province, canton, district, exact_address, is_default, label)
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  province = EXCLUDED.province,
  canton = EXCLUDED.canton,
  district = EXCLUDED.district,
  exact_address = EXCLUDED.exact_address,
  is_default = EXCLUDED.is_default,
  address_label = EXCLUDED.address_label;

-- Personas que reciben por el cliente 4.
INSERT INTO customer_recipients (id, customer_id, full_name, phone, id_card)
SELECT pg_temp.recip(v.n), pg_temp.cust(v.cust_n), v.full_name, v.phone, v.id_card
FROM (VALUES
  (1, 4, 'Rosa Villalobos Mora', '+506 0000-0013', '1-0432-0765'),
  (2, 4, 'Luis Arias Solís', '+506 0000-0014', '1-0321-0654'),
  (3, 4, 'Camila Arias Villalobos', '+506 0000-0015', '1-1234-0987')
) AS v(n, cust_n, full_name, phone, id_card)
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  id_card = EXCLUDED.id_card;
