-- Escenario 02: paquetes y órdenes de envío en cada paso del flujo.
-- La facturación (estimados, facturas, cobro) de estas órdenes va en 03.
-- Fechas relativas a hoy; ids fijos (órdenes 1..19, paquetes 1..39) y ON CONFLICT DO UPDATE.
--
-- Órdenes (n: cliente, paso):
--   1: 3, paso 1 sin dirección          2: 4, paso 1 con dirección y persona que recibe
--   3: 1, paso 2 estimado sin confirmar 4: 2, paso 2 factura sin pagar y sin avisar
--   5: 6, paso 2 factura avisada (18 d) 6: 8, paso 2 factura avisada (35 d)
--   7: 10, paso 2 estimado avisado 22 d 8: 5, paso 2 factura pagada
--   9: 2, paso 3 con guía               10: 1, paso 3 sin guía y sin pagar (Tracopa)
--  11: 10, paso 3 retiro en oficina     12: 4, paso 4 con ajuste del costo de envío
--  13: 2, paso 5 hace 10 d (seguimiento pendiente)   14: 1, paso 5 hace 20 d (seguimiento pendiente)
--  15: 4, paso 5 hace 45 d, con seguimiento y reseña 16: 8, paso 2 con montos de millones
--  17: 11, paso 2 factura del último día del mes anterior, 11:00 p. m. hora de Costa Rica
--  18: 10, paso 1 con paquetes de dos tarifas de courier   19: 9, paso 2 cliente que paga al costo

CREATE OR REPLACE FUNCTION pg_temp.ago(days numeric) RETURNS timestamptz
  LANGUAGE sql AS $$ SELECT now() - days * interval '1 day' $$;
CREATE OR REPLACE FUNCTION pg_temp.cust(n int) RETURNS uuid
  LANGUAGE sql AS $$ SELECT ('c0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
CREATE OR REPLACE FUNCTION pg_temp.addr(n int) RETURNS uuid
  LANGUAGE sql AS $$ SELECT ('a0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
CREATE OR REPLACE FUNCTION pg_temp.recip(n int) RETURNS uuid
  LANGUAGE sql AS $$ SELECT ('b0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
-- Hora local de Costa Rica del último día del mes anterior (p. ej. 23 = 11:00 p. m.).
CREATE OR REPLACE FUNCTION pg_temp.prev_month_end(hours numeric) RETURNS timestamptz
  LANGUAGE sql AS $$
    SELECT ((date_trunc('month', now() AT TIME ZONE 'America/Costa_Rica') - interval '1 day')
            + hours * interval '1 hour') AT TIME ZONE 'America/Costa_Rica'
  $$;

-- Órdenes de envío.
INSERT INTO consolidations (
  id, uuid, customer_id, status, total_weight_lb, created_at, updated_at, delivery_address_id,
  delivery_method, current_step, tracking_code, dispatched_at, shipment_requested_at,
  customer_notified_shipment_at, follow_up_sent_at, review_requested_at, recipient_id
)
SELECT
  v.n, ('d0000000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid, pg_temp.cust(v.cust_n),
  v.status, 0, v.created_at, v.updated_at,
  CASE WHEN v.addr_n IS NULL THEN NULL ELSE pg_temp.addr(v.addr_n) END,
  v.method, v.step, v.tracking_code, v.dispatched_at, v.requested_at, v.notified_at,
  v.follow_up_at, v.review_at,
  CASE WHEN v.recip_n IS NULL THEN NULL ELSE pg_temp.recip(v.recip_n) END
FROM (VALUES
  (1, 3, 1, 'ABIERTO', 'CORREOS_CR', NULL::int, NULL::int, pg_temp.ago(2), pg_temp.ago(2), NULL::text, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz),
  (2, 4, 1, 'ABIERTO', 'CORREOS_CR', 4, 1, pg_temp.ago(1.5), pg_temp.ago(1.5), NULL, NULL, NULL, NULL, NULL, NULL),
  (3, 1, 2, 'CERRADO', 'CORREOS_CR', 1, NULL, pg_temp.ago(4), pg_temp.ago(3), NULL, NULL, NULL, NULL, NULL, NULL),
  (4, 2, 2, 'CERRADO', 'CORREOS_CR', 2, NULL, pg_temp.ago(7), pg_temp.ago(5), NULL, NULL, NULL, NULL, NULL, NULL),
  (5, 6, 2, 'CERRADO', 'CORREOS_CR', 7, NULL, pg_temp.ago(20), pg_temp.ago(18), NULL, NULL, NULL, NULL, NULL, NULL),
  (6, 8, 2, 'CERRADO', 'TRACOPA', 9, NULL, pg_temp.ago(37), pg_temp.ago(35), NULL, NULL, NULL, NULL, NULL, NULL),
  (7, 10, 2, 'CERRADO', 'CORREOS_CR', 11, NULL, pg_temp.ago(24), pg_temp.ago(22), NULL, NULL, NULL, NULL, NULL, NULL),
  (8, 5, 2, 'CERRADO', 'CORREOS_CR', 6, NULL, pg_temp.ago(4), pg_temp.ago(1), NULL, NULL, NULL, NULL, NULL, NULL),
  (9, 2, 3, 'DESPACHADO', 'CORREOS_CR', 2, NULL, pg_temp.ago(12), pg_temp.ago(4), 'CR2026102400001', pg_temp.ago(4), pg_temp.ago(5), pg_temp.ago(5), NULL, NULL),
  (10, 1, 3, 'DESPACHADO', 'TRACOPA', 1, NULL, pg_temp.ago(6), pg_temp.ago(1), NULL, pg_temp.ago(1), pg_temp.ago(2), NULL, NULL, NULL),
  (11, 10, 3, 'DESPACHADO', 'RETIRO', NULL, NULL, pg_temp.ago(5), pg_temp.ago(0.5), NULL, pg_temp.ago(0.5), pg_temp.ago(1), NULL, NULL, NULL),
  (12, 4, 4, 'DESPACHADO', 'CORREOS_CR', 3, 2, pg_temp.ago(14), pg_temp.ago(6), 'CR2026101700002', pg_temp.ago(6), pg_temp.ago(7), pg_temp.ago(7), NULL, NULL),
  (13, 2, 5, 'ENTREGADO', 'CORREOS_CR', 2, NULL, pg_temp.ago(20), pg_temp.ago(8), 'CR2026101400003', pg_temp.ago(10), pg_temp.ago(11), pg_temp.ago(11), NULL, NULL),
  (14, 1, 5, 'ENTREGADO', 'MENSAJERIA', 1, NULL, pg_temp.ago(30), pg_temp.ago(18), 'MS-20260926-04', pg_temp.ago(20), pg_temp.ago(21), pg_temp.ago(21), NULL, NULL),
  (15, 4, 5, 'ENTREGADO', 'CORREOS_CR', 5, 3, pg_temp.ago(55), pg_temp.ago(38), 'CR2026090900005', pg_temp.ago(45), pg_temp.ago(46), pg_temp.ago(46), pg_temp.ago(40), pg_temp.ago(39)),
  (16, 8, 2, 'CERRADO', 'TRACOPA', 9, NULL, pg_temp.ago(10), pg_temp.ago(8), NULL, NULL, NULL, NULL, NULL, NULL),
  (17, 11, 2, 'CERRADO', 'CORREOS_CR', 12, NULL, pg_temp.prev_month_end(22), pg_temp.prev_month_end(23.5), NULL, NULL, NULL, NULL, NULL, NULL),
  (18, 10, 1, 'ABIERTO', 'CORREOS_CR', 11, NULL, pg_temp.ago(1), pg_temp.ago(1), NULL, NULL, NULL, NULL, NULL, NULL),
  (19, 9, 2, 'CERRADO', 'CORREOS_CR', 10, NULL, pg_temp.ago(3), pg_temp.ago(2), NULL, NULL, NULL, NULL, NULL, NULL)
) AS v(n, cust_n, step, status, method, addr_n, recip_n, created_at, updated_at, tracking_code,
       dispatched_at, requested_at, notified_at, follow_up_at, review_at)
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  delivery_address_id = EXCLUDED.delivery_address_id,
  delivery_method = EXCLUDED.delivery_method,
  current_step = EXCLUDED.current_step,
  tracking_code = EXCLUDED.tracking_code,
  dispatched_at = EXCLUDED.dispatched_at,
  shipment_requested_at = EXCLUDED.shipment_requested_at,
  customer_notified_shipment_at = EXCLUDED.customer_notified_shipment_at,
  follow_up_sent_at = EXCLUDED.follow_up_sent_at,
  review_requested_at = EXCLUDED.review_requested_at,
  recipient_id = EXCLUDED.recipient_id;
SELECT setval('consolidations_id_seq', GREATEST((SELECT max(id) FROM consolidations), 19));

-- Paquetes. Los que no tienen orden llevan su propia fecha de llegada y de aviso; los de una
-- orden llegaron un día antes de crearla y ya se avisaron. El costo del courier sigue la
-- misma regla del alta: peso x tarifa + seguro (solo desde 2 lb).
INSERT INTO packages (
  id, uuid, consolidation_id, customer_id, tracking_number, weight_lb, package_type, status,
  arrival_date, created_at, courier_cost_usd, tc_banco, insurance_applied, courier_rate_id,
  store_name, notified_at
)
SELECT
  v.n,
  ('e0000000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid,
  v.order_n,
  pg_temp.cust(v.cust_n),
  '1ZSEED' || lpad(v.n::text, 8, '0'),
  v.weight,
  cr.package_type,
  v.status,
  COALESCE(con.created_at - interval '1 day', pg_temp.ago(v.arrival_days)),
  COALESCE(con.created_at - interval '1 day', pg_temp.ago(v.arrival_days)),
  ROUND(v.weight * cr.rate_usd + CASE WHEN v.insurance AND v.weight >= 2 THEN cr.insurance_usd ELSE 0 END, 2),
  v.tc,
  v.insurance,
  cr.id,
  v.store,
  CASE
    WHEN con.id IS NOT NULL THEN con.created_at - interval '12 hours'
    WHEN v.notified_days IS NULL THEN NULL
    ELSE pg_temp.ago(v.notified_days)
  END
FROM (VALUES
  -- Sin orden: en Panamá sin avisar (1 a 7), ya avisados (8 a 10), entregados sin orden (11 y 12).
  (1, 1, NULL::int, 2.30, 'PANAMA', 'Amazon', 1, true, 505.20, NULL::numeric, 1::numeric),
  (2, 1, NULL, 5.75, 'PANAMA', 'Shein', 1, true, 505.20, NULL, 2),
  (3, 1, NULL, 0.80, 'PANAMA', 'Temu', 1, true, 505.20, NULL, 3),
  (4, 3, NULL, 1.40, 'PANAMA', 'eBay', 1, true, 505.20, NULL, 2),
  (5, 5, NULL, 3.10, 'PANAMA', 'Walmart', 2, true, 505.20, NULL, 1),
  (6, 6, NULL, 4.20, 'PANAMA', 'Nike', 1, true, 504.80, NULL, 4),
  (7, 6, NULL, 22.00, 'PANAMA', 'Costco', 3, true, 504.80, NULL, 6),
  (8, 2, NULL, 2.90, 'PANAMA', 'Amazon', 1, true, 505.20, 2, 4),
  (9, 2, NULL, 6.40, 'PANAMA', 'Best Buy', 2, true, 505.20, 2, 5),
  (10, 4, NULL, 1.95, 'PANAMA', 'Apple', 1, true, 505.20, 1, 3),
  (11, 7, NULL, 3.30, 'ENTREGADO', 'Amazon', 1, true, 498.00, 60, 65),
  (12, 2, NULL, 4.10, 'ENTREGADO', 'Etsy', 1, true, 500.50, 45, 50),
  -- En órdenes: EN_TRAMITE una vez pagada la factura, ENTREGADO al finalizar.
  (13, 3, 1, 2.20, 'PANAMA', 'Amazon', 1, true, 505.20, NULL, NULL),
  (14, 3, 1, 4.55, 'PANAMA', 'Shein', 1, true, 505.20, NULL, NULL),
  (15, 4, 2, 3.75, 'PANAMA', 'Walmart', 1, true, 505.20, NULL, NULL),
  (16, 1, 3, 7.20, 'PANAMA', 'Amazon', 1, true, 505.20, NULL, NULL),
  (17, 1, 3, 2.60, 'PANAMA', 'Shein', 1, true, 505.20, NULL, NULL),
  (18, 2, 4, 5.30, 'PANAMA', 'Best Buy', 1, true, 505.20, NULL, NULL),
  (19, 6, 5, 3.45, 'PANAMA', 'Nike', 1, true, 504.80, NULL, NULL),
  (20, 6, 5, 1.15, 'PANAMA', 'Adidas', 1, false, 504.80, NULL, NULL),
  (21, 8, 6, 12.80, 'PANAMA', 'B&H Photo', 1, true, 503.40, NULL, NULL),
  (22, 10, 7, 9.10, 'PANAMA', 'Amazon', 2, true, 503.90, NULL, NULL),
  (23, 5, 8, 4.40, 'EN_TRAMITE', 'Walmart', 2, true, 505.20, NULL, NULL),
  (24, 2, 9, 6.10, 'EN_TRAMITE', 'Amazon', 1, true, 504.10, NULL, NULL),
  (25, 1, 10, 8.25, 'PANAMA', 'Target', 1, true, 505.20, NULL, NULL),
  (26, 10, 11, 2.45, 'EN_TRAMITE', 'eBay', 1, true, 505.20, NULL, NULL),
  (27, 4, 12, 5.05, 'EN_TRAMITE', 'Apple', 1, true, 504.10, NULL, NULL),
  (28, 4, 12, 1.80, 'EN_TRAMITE', 'Amazon', 1, true, 504.10, NULL, NULL),
  (29, 2, 13, 3.90, 'ENTREGADO', 'Etsy', 1, true, 503.40, NULL, NULL),
  (30, 1, 14, 11.30, 'ENTREGADO', 'Amazon', 1, true, 502.00, NULL, NULL),
  (31, 4, 15, 2.70, 'ENTREGADO', 'Nike', 1, true, 499.00, NULL, NULL),
  (32, 8, 16, 310.00, 'PANAMA', 'Dell Business', 1, true, 505.20, NULL, NULL),
  (33, 8, 16, 280.50, 'PANAMA', 'Dell Business', 1, true, 505.20, NULL, NULL),
  (34, 8, 16, 195.25, 'PANAMA', 'Lenovo', 1, true, 505.20, NULL, NULL),
  (35, 11, 17, 18.40, 'EN_TRAMITE', 'Amazon', 1, true, 505.60, NULL, NULL),
  (36, 10, 18, 3.20, 'PANAMA', 'Amazon', 1, true, 505.20, NULL, NULL),
  (37, 10, 18, 1.40, 'PANAMA', 'Shein', 2, true, 505.20, NULL, NULL),
  (38, 9, 19, 5.60, 'PANAMA', 'Amazon', 1, true, 505.20, NULL, NULL),
  (39, 9, 19, 2.10, 'PANAMA', 'eBay', 1, true, 505.20, NULL, NULL)
) AS v(n, cust_n, order_n, weight, status, store, courier_id, insurance, tc, notified_days, arrival_days)
JOIN courier_rates cr ON cr.id = v.courier_id
LEFT JOIN consolidations con ON con.id = v.order_n
ON CONFLICT (id) DO UPDATE SET
  consolidation_id = EXCLUDED.consolidation_id,
  customer_id = EXCLUDED.customer_id,
  tracking_number = EXCLUDED.tracking_number,
  weight_lb = EXCLUDED.weight_lb,
  package_type = EXCLUDED.package_type,
  status = EXCLUDED.status,
  arrival_date = EXCLUDED.arrival_date,
  created_at = EXCLUDED.created_at,
  courier_cost_usd = EXCLUDED.courier_cost_usd,
  tc_banco = EXCLUDED.tc_banco,
  insurance_applied = EXCLUDED.insurance_applied,
  courier_rate_id = EXCLUDED.courier_rate_id,
  store_name = EXCLUDED.store_name,
  notified_at = EXCLUDED.notified_at;
SELECT setval('packages_id_seq', GREATEST((SELECT max(id) FROM packages), 39));

-- Peso de cada orden = suma de sus paquetes.
UPDATE consolidations c
SET total_weight_lb = COALESCE((SELECT SUM(weight_lb) FROM packages WHERE consolidation_id = c.id), 0)
WHERE c.id BETWEEN 1 AND 19;
