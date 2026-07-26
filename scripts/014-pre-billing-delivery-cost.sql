-- Snapshot del costo real de entrega (cost_crc de delivery_rates) capturado al
-- generar el estimado. Sin esto, la rentabilidad de órdenes pasadas se recalcula
-- con la tarifa vigente y cambia retroactivamente al editar/eliminar tarifas.
-- NULL = pre-billing anterior a esta migración o costo "por confirmar" al momento
-- del estimado (el detalle hace fallback al lookup vivo en esos casos).
ALTER TABLE pre_billing ADD COLUMN IF NOT EXISTS delivery_cost_crc numeric(12,2);
