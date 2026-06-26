-- Etapa 20: Tabla package_events + trigger de historial de status
-- Ejecutar en Neon una sola vez.
-- Si la tabla ya existe, el CREATE TABLE IF NOT EXISTS no hace nada.

-- 1. Crear tabla si no existe
CREATE TABLE IF NOT EXISTS package_events (
  id          SERIAL PRIMARY KEY,
  package_id  INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  event_type  TEXT NOT NULL DEFAULT 'INFO',
  description TEXT,
  location    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Trigger de fallback: registra el cambio de status automaticamente
--    si por alguna razon el INSERT explicito del repo no se ejecuta.
--    En produccion normal, el repo hace el INSERT directamente (con location y note).
CREATE OR REPLACE FUNCTION fn_package_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO package_events (package_id, status, event_type, description, location)
    VALUES (NEW.id, NEW.status, 'INFO', NEW.internal_notes, NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_package_status_history ON packages;

CREATE TRIGGER trg_package_status_history
  AFTER UPDATE OF status ON packages
  FOR EACH ROW
  EXECUTE FUNCTION fn_package_status_history();
