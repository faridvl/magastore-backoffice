-- Siembra el tarifario de Correos de Costa Rica en delivery_rates (Etapa 5 del plan
-- de tarifas). Fuente: volante de tarifas compartido por el dueño (2026-07).
--
-- Filas confirmadas por el volante (cost_crc = costo real que cobra Correos a
-- Magastore; NULL donde el volante dice "por confirmar" — no bloquea facturar,
-- solo deja sin dato la ganancia del tramo local, que está fuera de alcance):
--   0.00-0.99 kg, Resto  -> fee 1400, cost NULL (por confirmar)
--   0.00-0.99 kg, GAM    -> fee 1400, cost NULL (por confirmar)
--   1.00-1.99 kg, Resto  -> fee 1400, cost 5648.94
--   1.00-1.99 kg, GAM    -> fee 1400, cost 4548.93
--   3.00-9.99 kg (ambas zonas, mismo precio en el volante) -> fee 2400, cost 4500
--   10.00-15.00 kg, GAM   -> fee 2400, cost 4300
--   10.00-15.00 kg, Resto -> fee 2400, cost NULL (por confirmar)
--
-- Huecos de rango extrapolados (decisión explícita del dueño, no tarifa oficial
-- de Correos — a corregir cuando se tenga el tarifario completo):
--   2.00-2.99 kg (ambas zonas) -> fee 2400 (agrupado con el tramo liviana/pesada,
--     no con PYME, porque el salto de precio ya ocurre en ese punto)
--   15.01-50.00 kg (ambas zonas) -> fee 2400 (extensión del tramo pesada; > 50 kg
--     cae al fallback fijo correos_fee_crc, caso extremo no cubierto)

INSERT INTO delivery_rates (delivery_method, zone, min_weight_kg, max_weight_kg, fee_crc, cost_crc, is_active) VALUES
  ('CORREOS_CR', 'RESTO', 0.00, 0.99, 1400, NULL, true),
  ('CORREOS_CR', 'GAM',   0.00, 0.99, 1400, NULL, true),
  ('CORREOS_CR', 'RESTO', 1.00, 1.99, 1400, 5648.94, true),
  ('CORREOS_CR', 'GAM',   1.00, 1.99, 1400, 4548.93, true),
  ('CORREOS_CR', 'RESTO', 2.00, 2.99, 2400, NULL, true),
  ('CORREOS_CR', 'GAM',   2.00, 2.99, 2400, NULL, true),
  ('CORREOS_CR', 'RESTO', 3.00, 9.99, 2400, 4500, true),
  ('CORREOS_CR', 'GAM',   3.00, 9.99, 2400, 4500, true),
  ('CORREOS_CR', 'GAM',   10.00, 15.00, 2400, 4300, true),
  ('CORREOS_CR', 'RESTO', 10.00, 15.00, 2400, NULL, true),
  ('CORREOS_CR', 'RESTO', 15.01, 50.00, 2400, NULL, true),
  ('CORREOS_CR', 'GAM',   15.01, 50.00, 2400, NULL, true);
