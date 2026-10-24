-- Escenario 03: estimados, facturas, cobros y participación sobre la ganancia de las órdenes del 02.
-- Los montos salen de las tarifas y de los paquetes con la misma fórmula del README ("Billing"),
-- para que las pantallas no muestren incoherencias:
--   peso cobrado = MAX(peso real, peso mínimo)
--   flete        = peso cobrado x precio por lb x tipo de cambio (NORMAL)
--                  con el descuento del tipo de cliente (DESCUENTO) o el costo real de los paquetes (AL_COSTO)
--   total        = flete + tarifa de entrega (0 en retiro en oficina)
--
-- Estados por orden (3 a 19; la 1, 2 y 18 no tienen estimado):
--   3 estimado sin confirmar y sin avisar       4 factura sin pagar y sin avisar
--   5 y 6 factura avisada sin pagar (18 y 35 d) 7 estimado avisado hace 22 d (sin factura)
--   8 pagada, pago sin avisar                   9 pagada, 10 sin pagar con envío ya despachado
--  11 retiro en oficina pagado                  12 pagada con ajuste del costo de envío (vuelto pendiente)
--  13, 14 y 15 finalizadas (la 15 con autoría "histórica") 16 montos de millones, factura avisada
--  17 factura del último día del mes anterior, 11:00 p. m. en Costa Rica (en UTC cae al día siguiente)
--  19 estimado de un cliente que paga al costo

CREATE OR REPLACE FUNCTION pg_temp.ago(days numeric) RETURNS timestamptz
  LANGUAGE sql AS $$ SELECT now() - days * interval '1 day' $$;
CREATE OR REPLACE FUNCTION pg_temp.prev_month_end(hours numeric) RETURNS timestamptz
  LANGUAGE sql AS $$
    SELECT ((date_trunc('month', now() AT TIME ZONE 'America/Costa_Rica') - interval '1 day')
            + hours * interval '1 hour') AT TIME ZONE 'America/Costa_Rica'
  $$;

DROP TABLE IF EXISTS pg_temp._actor, pg_temp._plan, pg_temp._calc, pg_temp._amounts, pg_temp._final;

-- Autor de las facturas: el primer usuario de la base (el de prueba).
CREATE TEMP TABLE _actor AS SELECT id, name FROM users ORDER BY id LIMIT 1;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _actor) THEN
    RAISE EXCEPTION 'No hay usuarios: crea el usuario de prueba antes de sembrar la facturación.';
  END IF;
END $$;

CREATE TEMP TABLE _plan AS
SELECT * FROM (VALUES
  (3, 'GAM', pg_temp.ago(3.5), NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::text, NULL::timestamptz, false),
  (4, 'GAM', pg_temp.ago(5.5), NULL, pg_temp.ago(5), NULL, NULL, NULL, false),
  (5, 'RESTO', pg_temp.ago(18.5), pg_temp.ago(18), pg_temp.ago(18), NULL, NULL, NULL, false),
  (6, 'GAM', pg_temp.ago(35.5), pg_temp.ago(35), pg_temp.ago(35), NULL, NULL, NULL, false),
  (7, 'RESTO', pg_temp.ago(22), pg_temp.ago(21.5), NULL, NULL, NULL, NULL, false),
  (8, 'GAM', pg_temp.ago(3), pg_temp.ago(2.8), pg_temp.ago(2.5), pg_temp.ago(1), 'SINPE_MOVIL', NULL, false),
  (9, 'GAM', pg_temp.ago(11), pg_temp.ago(10.8), pg_temp.ago(10.5), pg_temp.ago(9), 'TRANSFERENCIA', pg_temp.ago(9), false),
  (10, 'GAM', pg_temp.ago(5), pg_temp.ago(4.8), pg_temp.ago(4.5), NULL, NULL, NULL, false),
  (11, 'RESTO', pg_temp.ago(4), pg_temp.ago(3.8), pg_temp.ago(3.5), pg_temp.ago(3), 'EFECTIVO', NULL, false),
  (12, 'GAM', pg_temp.ago(13), pg_temp.ago(12.8), pg_temp.ago(12.5), pg_temp.ago(10), 'SINPE_MOVIL', pg_temp.ago(10), false),
  (13, 'GAM', pg_temp.ago(19), pg_temp.ago(18.8), pg_temp.ago(18.5), pg_temp.ago(17), 'TARJETA', pg_temp.ago(17), false),
  (14, 'GAM', pg_temp.ago(29), pg_temp.ago(28.8), pg_temp.ago(28.5), pg_temp.ago(27), 'EFECTIVO', pg_temp.ago(27), false),
  (15, 'RESTO', pg_temp.ago(54), pg_temp.ago(53.8), pg_temp.ago(53.5), pg_temp.ago(52), NULL, pg_temp.ago(52), true),
  (16, 'GAM', pg_temp.ago(9.5), pg_temp.ago(8.2), pg_temp.ago(8), NULL, NULL, NULL, false),
  (17, 'GAM', pg_temp.prev_month_end(22.5), pg_temp.prev_month_end(22.7), pg_temp.prev_month_end(23),
       pg_temp.prev_month_end(23.4), 'TRANSFERENCIA', pg_temp.prev_month_end(23.5), false),
  (19, 'GAM', pg_temp.ago(2.5), NULL, NULL, NULL, NULL, NULL, false)
) AS p(order_n, zone, estimate_at, pre_notified_at, invoice_at, paid_at, payment_method, payment_notified_at, backfilled);

-- Cálculo por orden con las tarifas vigentes (misma búsqueda de tarifa que la app).
CREATE TEMP TABLE _calc AS
SELECT
  p.*,
  c.id AS con_id, c.customer_id, c.delivery_method, c.delivery_address_id, c.recipient_id,
  s.price_per_lb, s.exchange_rate, s.farid_share_percent,
  GREATEST(c.total_weight_lb, s.min_weight) AS charged_lb,
  COALESCE(ct.billing_mode, 'NORMAL') AS mode,
  COALESCE(ct.discount_percent, 0) AS discount,
  (SELECT COALESCE(SUM(courier_cost_usd * tc_banco), 0) FROM packages WHERE consolidation_id = c.id) AS courier_cost,
  dm.is_pickup,
  r.fee_crc AS rate_fee, r.cost_crc AS rate_cost, (r.id IS NOT NULL) AS has_rate,
  CASE c.delivery_method WHEN 'CORREOS_CR' THEN s.correos_fee_crc WHEN 'TRACOPA' THEN s.tracopa_fee_crc END AS fallback_fee
FROM _plan p
JOIN consolidations c ON c.id = p.order_n
JOIN customers cu ON cu.id = c.customer_id
LEFT JOIN customer_types ct ON ct.id = cu.customer_type_id
JOIN delivery_methods dm ON dm.code = c.delivery_method
CROSS JOIN system_settings s
LEFT JOIN LATERAL (
  SELECT dr.id, dr.fee_crc, dr.cost_crc
  FROM delivery_rates dr
  WHERE dr.delivery_method = c.delivery_method
    AND (dr.zone = p.zone OR dr.zone IS NULL)
    AND dr.is_active
    AND dr.min_weight_kg <= GREATEST(c.total_weight_lb, s.min_weight) * s.kg_per_lb
    AND dr.max_weight_kg >= GREATEST(c.total_weight_lb, s.min_weight) * s.kg_per_lb
  ORDER BY dr.zone ASC NULLS LAST
  LIMIT 1
) r ON NOT dm.is_pickup;

CREATE TEMP TABLE _amounts AS
SELECT
  k.*,
  CASE WHEN k.is_pickup THEN 0 WHEN k.has_rate THEN k.rate_fee ELSE k.fallback_fee END AS fee,
  CASE WHEN k.is_pickup THEN 0 WHEN k.has_rate THEN k.rate_cost ELSE NULL END AS delivery_cost,
  ROUND(CASE k.mode
    WHEN 'AL_COSTO' THEN k.courier_cost
    WHEN 'DESCUENTO' THEN k.charged_lb * k.price_per_lb * k.exchange_rate * (1 - k.discount / 100)
    ELSE k.charged_lb * k.price_per_lb * k.exchange_rate
  END, 2) AS flete
FROM _calc k;

-- Si una orden no tuviera tarifa de entrega, el total saldría nulo y el INSERT fallaría a propósito.
CREATE TEMP TABLE _final AS
SELECT
  a.*,
  a.flete + a.fee AS total,
  a.flete + a.fee - ROUND(a.courier_cost, 2) - COALESCE(a.delivery_cost, 0) AS profit,
  (a.delivery_cost IS NULL AND NOT a.is_pickup) AS unknown_cost
FROM _amounts a;

-- Estimados.
INSERT INTO pre_billing (
  uuid, consolidation_id, estimated_amount_crc, delivery_method, delivery_fee_crc, delivery_cost_crc,
  applied_rate_usd, applied_exchange, total_weight_charged, is_confirmed, confirmed_at,
  created_at, updated_at, notified_at, applied_billing_mode, applied_discount_percent
)
SELECT
  ('f1000000-0000-4000-8000-' || lpad(f.order_n::text, 12, '0'))::uuid,
  f.con_id, f.total, f.delivery_method, f.fee, f.delivery_cost,
  f.price_per_lb, f.exchange_rate, f.charged_lb, (f.invoice_at IS NOT NULL), f.invoice_at,
  f.estimate_at, f.estimate_at, f.pre_notified_at, f.mode, f.discount
FROM _final f
ON CONFLICT (uuid) DO UPDATE SET
  estimated_amount_crc = EXCLUDED.estimated_amount_crc,
  delivery_method = EXCLUDED.delivery_method,
  delivery_fee_crc = EXCLUDED.delivery_fee_crc,
  delivery_cost_crc = EXCLUDED.delivery_cost_crc,
  applied_rate_usd = EXCLUDED.applied_rate_usd,
  applied_exchange = EXCLUDED.applied_exchange,
  total_weight_charged = EXCLUDED.total_weight_charged,
  is_confirmed = EXCLUDED.is_confirmed,
  confirmed_at = EXCLUDED.confirmed_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  notified_at = EXCLUDED.notified_at,
  applied_billing_mode = EXCLUDED.applied_billing_mode,
  applied_discount_percent = EXCLUDED.applied_discount_percent;

-- Facturas (solo donde hay fecha de factura). Se congelan tarifa, cambio y ganancia.
INSERT INTO billing (
  invoice_number, uuid, consolidation_id, applied_rate_usd, applied_exchange, applied_fee_crc, total_weight_charged,
  total_amount_crc, is_paid, paid_at, created_at, delivery_method, delivery_fee_crc,
  delivery_address_snapshot, courier_cost_crc, delivery_cost_crc, profit_crc, has_unknown_cost,
  applied_billing_mode, applied_discount_percent, payment_method, created_by_id, created_by_name,
  paid_by_id, paid_by_name, authorship_backfilled, payment_notified_at,
  original_delivery_fee_crc, actual_delivery_fee_crc, change_returned, change_returned_at
)
SELECT
  -- Números de factura en orden cronológico (F-0001, F-0002...), a continuación de las que ya existan.
  COALESCE((SELECT max(invoice_number) FROM billing WHERE uuid::text NOT LIKE 'f0000000-0000-4000-8000-%'), 0)
    + row_number() OVER (ORDER BY f.invoice_at, f.order_n),
  ('f0000000-0000-4000-8000-' || lpad(f.order_n::text, 12, '0'))::uuid,
  f.con_id, f.price_per_lb, f.exchange_rate, f.fee, f.charged_lb,
  f.total, (f.paid_at IS NOT NULL), f.paid_at, f.invoice_at, f.delivery_method, f.fee,
  CASE WHEN ca.id IS NULL OR f.is_pickup THEN NULL ELSE
    concat_ws(' · ',
      concat_ws(', ', ca.exact_address, ca.district, ca.canton, ca.province),
      CASE WHEN rc.id IS NOT NULL THEN 'Recibe: ' || concat_ws(', ', rc.full_name, rc.phone) END)
  END,
  ROUND(f.courier_cost, 2), f.delivery_cost, f.profit, f.unknown_cost,
  f.mode, f.discount, f.payment_method, actor.id, actor.name,
  CASE WHEN f.paid_at IS NOT NULL THEN actor.id END,
  CASE WHEN f.paid_at IS NOT NULL THEN actor.name END,
  f.backfilled, f.payment_notified_at,
  NULL, NULL, NULL, NULL
FROM _final f
CROSS JOIN _actor actor
LEFT JOIN customer_addresses ca ON ca.id = f.delivery_address_id
LEFT JOIN customer_recipients rc ON rc.id = f.recipient_id
WHERE f.invoice_at IS NOT NULL
ORDER BY f.invoice_at, f.order_n
ON CONFLICT (uuid) DO UPDATE SET
  applied_rate_usd = EXCLUDED.applied_rate_usd,
  applied_exchange = EXCLUDED.applied_exchange,
  applied_fee_crc = EXCLUDED.applied_fee_crc,
  total_weight_charged = EXCLUDED.total_weight_charged,
  total_amount_crc = EXCLUDED.total_amount_crc,
  is_paid = EXCLUDED.is_paid,
  paid_at = EXCLUDED.paid_at,
  created_at = EXCLUDED.created_at,
  delivery_method = EXCLUDED.delivery_method,
  delivery_fee_crc = EXCLUDED.delivery_fee_crc,
  delivery_address_snapshot = EXCLUDED.delivery_address_snapshot,
  courier_cost_crc = EXCLUDED.courier_cost_crc,
  delivery_cost_crc = EXCLUDED.delivery_cost_crc,
  profit_crc = EXCLUDED.profit_crc,
  has_unknown_cost = EXCLUDED.has_unknown_cost,
  applied_billing_mode = EXCLUDED.applied_billing_mode,
  applied_discount_percent = EXCLUDED.applied_discount_percent,
  payment_method = EXCLUDED.payment_method,
  created_by_id = EXCLUDED.created_by_id,
  created_by_name = EXCLUDED.created_by_name,
  paid_by_id = EXCLUDED.paid_by_id,
  paid_by_name = EXCLUDED.paid_by_name,
  authorship_backfilled = EXCLUDED.authorship_backfilled,
  payment_notified_at = EXCLUDED.payment_notified_at,
  original_delivery_fee_crc = NULL,
  actual_delivery_fee_crc = NULL,
  change_returned = NULL,
  change_returned_at = NULL;

SELECT setval('billing_invoice_number_seq', GREATEST((SELECT max(invoice_number) FROM billing), 1));

-- Orden 12: el transportista cobró ₡1.000 menos que el estimado. Queda el ajuste del paso 4:
-- el cliente pagó de más y el vuelto está pendiente. La ganancia congelada no cambia.
UPDATE billing
SET original_delivery_fee_crc = delivery_fee_crc,
    actual_delivery_fee_crc = delivery_fee_crc - 1000,
    delivery_fee_crc = delivery_fee_crc - 1000,
    total_amount_crc = total_amount_crc - 1000,
    change_returned = false
WHERE uuid = 'f0000000-0000-4000-8000-000000000012';

-- Participación sobre la ganancia: una fila por orden (FACTURADO si hay factura, si no ESTIMADO),
-- con el período del mes de Costa Rica en que se emitió.
INSERT INTO profit_shares (
  uuid, consolidation_id, billing_id, period, status, revenue_crc, courier_cost_crc, delivery_cost_crc,
  profit_base_crc, share_percent, share_crc, has_unknown_cost, created_at, updated_at
)
SELECT
  ('f2000000-0000-4000-8000-' || lpad(f.order_n::text, 12, '0'))::uuid,
  f.con_id,
  (SELECT b.id FROM billing b WHERE b.consolidation_id = f.con_id),
  to_char(COALESCE(f.invoice_at, f.estimate_at) AT TIME ZONE 'America/Costa_Rica', 'YYYY-MM'),
  CASE WHEN f.invoice_at IS NOT NULL THEN 'FACTURADO' ELSE 'ESTIMADO' END,
  f.total, ROUND(f.courier_cost, 2), f.delivery_cost, f.profit, f.farid_share_percent,
  ROUND(GREATEST(f.profit, 0) * f.farid_share_percent / 100, 2), f.unknown_cost,
  COALESCE(f.invoice_at, f.estimate_at), COALESCE(f.invoice_at, f.estimate_at)
FROM _final f
ON CONFLICT (consolidation_id) DO UPDATE SET
  billing_id = EXCLUDED.billing_id,
  period = EXCLUDED.period,
  status = EXCLUDED.status,
  revenue_crc = EXCLUDED.revenue_crc,
  courier_cost_crc = EXCLUDED.courier_cost_crc,
  delivery_cost_crc = EXCLUDED.delivery_cost_crc,
  profit_base_crc = EXCLUDED.profit_base_crc,
  share_percent = EXCLUDED.share_percent,
  share_crc = EXCLUDED.share_crc,
  has_unknown_cost = EXCLUDED.has_unknown_cost,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- Desglose por paquete: cobro prorrateado por peso y costo real del paquete (como la app).
DELETE FROM profit_share_packages
WHERE profit_share_id IN (SELECT id FROM profit_shares WHERE consolidation_id IN (SELECT con_id FROM _final));

INSERT INTO profit_share_packages (profit_share_id, package_id, weight_lb, revenue_crc, cost_crc, profit_crc, share_crc)
SELECT
  ps.id, p.id, p.weight_lb,
  ROUND(f.total * p.weight_lb / tw.total_weight, 2),
  ROUND(p.courier_cost_usd * p.tc_banco + COALESCE(f.delivery_cost, 0) * p.weight_lb / tw.total_weight, 2),
  ROUND(f.total * p.weight_lb / tw.total_weight
        - (p.courier_cost_usd * p.tc_banco + COALESCE(f.delivery_cost, 0) * p.weight_lb / tw.total_weight), 2),
  ROUND(GREATEST(f.total * p.weight_lb / tw.total_weight
        - (p.courier_cost_usd * p.tc_banco + COALESCE(f.delivery_cost, 0) * p.weight_lb / tw.total_weight), 0)
        * f.farid_share_percent / 100, 2)
FROM _final f
JOIN profit_shares ps ON ps.consolidation_id = f.con_id
JOIN packages p ON p.consolidation_id = f.con_id
JOIN LATERAL (SELECT SUM(weight_lb) AS total_weight FROM packages WHERE consolidation_id = f.con_id) tw ON true;
