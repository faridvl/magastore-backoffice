-- Marca persistente de "cliente notificado por WhatsApp" por paquete.
-- NULL = nunca notificado. Los paquetes nuevos nacen NULL, por lo que un
-- cliente ya notificado vuelve a aparecer como "con paquetes nuevos sin
-- notificar" apenas se le registra otro paquete.
-- Complementa (no reemplaza) el evento de bitácora en package_events.
ALTER TABLE packages ADD COLUMN IF NOT EXISTS notified_at timestamptz;
