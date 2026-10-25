-- Autoría de facturas (etapa 1 de .claude/docs/auditoria-autoria-plan.md) y
-- método de pago, más la plantilla de aviso de pago confirmado.
--
-- Cada autor se guarda como par (id FK, nombre): el id es la identidad
-- estable, el nombre es el snapshot legible que sobrevive si el usuario se
-- renombra o se borra (por eso ON DELETE SET NULL y no CASCADE).
--
-- Columnas nullable a propósito: si esta migración llega a una base antes que
-- el código que las llena, un INSERT del código viejo no debe fallar.
--
-- payment_method es TEXT con CHECK de valores fijos (no enum de Postgres):
-- agregar un método después es cambiar el CHECK, sin ALTER TYPE. Las facturas
-- pagadas antes de esta migración quedan sin método — no se sabe cuál fue.
ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IS NULL OR payment_method IN ('SINPE_MOVIL', 'TRANSFERENCIA', 'EFECTIVO', 'TARJETA', 'OTRO')),
  ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS paid_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_by_name TEXT,
  ADD COLUMN IF NOT EXISTS authorship_backfilled BOOLEAN NOT NULL DEFAULT false,
  -- Cuándo se le avisó al cliente que su pago quedó confirmado (paso 3 del
  -- wizard). Vive en billing porque el aviso es sobre el pago de la factura.
  ADD COLUMN IF NOT EXISTS payment_notified_at TIMESTAMPTZ;

-- Backfill del histórico al usuario más antiguo (el admin original), marcado
-- con authorship_backfilled para que la UI lo muestre como "Admin (histórico)"
-- en vez de afirmar una autoría que no se conoce. Si users está vacía se
-- aborta: dejar NULL en silencio es justo lo que la migración quiere evitar.
DO $$
DECLARE
  v_admin_id INTEGER;
  v_admin_name TEXT;
BEGIN
  SELECT id, name INTO v_admin_id, v_admin_name
  FROM users
  ORDER BY created_at ASC NULLS LAST, id ASC
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en la tabla users: no se puede atribuir el histórico de facturas.';
  END IF;

  UPDATE billing
  SET created_by_id = v_admin_id,
      created_by_name = v_admin_name,
      authorship_backfilled = true
  WHERE created_by_id IS NULL AND created_by_name IS NULL;

  UPDATE billing
  SET paid_by_id = v_admin_id,
      paid_by_name = v_admin_name,
      authorship_backfilled = true
  WHERE is_paid = true AND paid_by_id IS NULL AND paid_by_name IS NULL;
END $$;

-- Aviso al CLIENTE de que su pago quedó registrado. Se ofrece al marcar la
-- factura como pagada en el paso de cobro, justo antes de solicitar el envío.
INSERT INTO whatsapp_templates (code, name, description, body) VALUES
(
  'PAYMENT_CONFIRMED',
  'Pago confirmado (aviso al cliente)',
  'Se envía al cliente cuando se registra el pago de su orden. Confirma el monto recibido y le avisa que su envío se prepara.',
  'Hola, {{nombre}}! 👋🏻

¡Recibimos tu pago de *{{monto}}*! 🙌🏻 Muchas gracias por tu confianza.

Ya estamos preparando el envío de tu orden {{id_orden}}. 🚚📦 Te avisamos en cuanto vaya en camino.

*MAGASTORE 📦✈️*'
)
ON CONFLICT (code) DO NOTHING;
