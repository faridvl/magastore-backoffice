-- Migración 002: Agregar método y costo de entrega a la tabla billing
-- Ejecutar DESPUÉS de 001-delivery-fees-settings.sql
--
-- delivery_method  : 'CORREOS_CR' | 'TRACOPA' | 'RETIRO' (retiro en oficina, costo 0)
-- delivery_fee_crc : snapshot del costo de entrega al momento de generar la factura

ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS delivery_method  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS delivery_fee_crc NUMERIC(10,2) DEFAULT 0;

-- Las facturas anteriores quedan con delivery_method = NULL y delivery_fee_crc = 0
-- (representan facturas generadas antes de esta funcionalidad)

-- Verificar estructura actualizada
SELECT
  uuid,
  total_amount_crc,
  is_paid,
  delivery_method,
  delivery_fee_crc,
  created_at
FROM billing
ORDER BY created_at DESC
LIMIT 5;
