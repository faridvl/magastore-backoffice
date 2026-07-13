-- Etapa: rediseño flujo paquete-céntrico de órdenes de envío (ver .claude/docs/ordenes-envio-v2-flujo.md)
-- Ejecutar en Neon una sola vez.

-- 1. Proveedor/tienda del paquete, usado en la plantilla de WhatsApp de paquetes disponibles.
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS store_name TEXT;

-- 2. Marca de "orden notificada para cobro" — estampada al enviar la plantilla de WhatsApp de prefactura.
ALTER TABLE pre_billing
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- 3. Unicidad de tracking_number — evita registrar el mismo paquete dos veces.
--    Verificado sin duplicados en datos reales antes de aplicar (2026-07-13).
CREATE UNIQUE INDEX IF NOT EXISTS packages_tracking_number_key
  ON packages (tracking_number);
