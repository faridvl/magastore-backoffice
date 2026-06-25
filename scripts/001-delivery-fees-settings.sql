-- Migración 001: Agregar tarifas de entrega local a system_settings
-- Ejecutar en Neon SQL Editor antes de desplegar la nueva versión de billing
--
-- correos_fee_crc : tarifa Correos de Costa Rica (placeholder estimado)
-- tracopa_fee_crc : tarifa Tracopa / encomienda (placeholder estimado)
-- profit_per_lb   : se redefine como margen operativo en USD por libra
--                   (NO va en factura al cliente — solo para reporting interno)
--                   El valor anterior (₡2900 flat fee) era conceptualmente incorrecto.

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS correos_fee_crc NUMERIC(10,2) DEFAULT 4500,
  ADD COLUMN IF NOT EXISTS tracopa_fee_crc NUMERIC(10,2) DEFAULT 3000;

-- Resetear profit_per_lb a USD: si el precio es $6/lb y el costo real es ~$4/lb,
-- la ganancia estimada es $2/lb. Ajustar según margen real de la empresa.
UPDATE system_settings
  SET profit_per_lb = 2.00
  WHERE id = '00000000-0000-0000-0000-000000000000';

-- Verificar resultado
SELECT
  price_per_lb,
  exchange_rate,
  profit_per_lb  AS "ganancia_por_lb_usd",
  min_weight,
  correos_fee_crc,
  tracopa_fee_crc
FROM system_settings
WHERE id = '00000000-0000-0000-0000-000000000000';
