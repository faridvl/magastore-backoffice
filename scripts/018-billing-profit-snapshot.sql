-- Congela la rentabilidad real de la factura al momento de confirmarla, para que
-- editar/desactivar una tarifa de courier o de delivery_rates después no altere
-- retroactivamente la ganancia de facturas ya emitidas.
--
-- courier_cost_crc: SUM(courier_cost_usd * tc_banco) de los paquetes de la orden,
--                    calculado al confirmar. Con 017-packages-cost-not-null.sql
--                    aplicada, nunca debería quedar NULL para facturas nuevas.
-- delivery_cost_crc: copiado de pre_billing.delivery_cost_crc (ya era snapshot ahí,
--                    pero no viajaba a billing). Puede ser NULL si el rango de
--                    Correos/Tracopa no tenía costo real confirmado ("por confirmar").
-- profit_crc: total_amount_crc - courier_cost_crc - COALESCE(delivery_cost_crc, 0).
-- has_unknown_cost: true si delivery_cost_crc es NULL — evita que reportes agregados
--                    traten ese NULL como cero de forma silenciosa; deben marcarlo
--                    explícitamente como ganancia incompleta.
ALTER TABLE billing ADD COLUMN IF NOT EXISTS courier_cost_crc numeric(12,2);
ALTER TABLE billing ADD COLUMN IF NOT EXISTS delivery_cost_crc numeric(12,2);
ALTER TABLE billing ADD COLUMN IF NOT EXISTS profit_crc numeric(12,2);
ALTER TABLE billing ADD COLUMN IF NOT EXISTS has_unknown_cost boolean NOT NULL DEFAULT false;
