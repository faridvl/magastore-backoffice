-- Courier predeterminado: el que viene preseleccionado al registrar un paquete.
-- Antes se adivinaba en el frontend buscando por nombre ("aéreo" + "usa") en
-- use-package-calculator.ts, así que renombrar la tarifa rompía la selección
-- automática en silencio.
ALTER TABLE courier_rates ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Un solo predeterminado a la vez. Índice parcial: solo restringe las filas en
-- true, permitiendo cualquier cantidad de tarifas no predeterminadas.
CREATE UNIQUE INDEX IF NOT EXISTS courier_rates_single_default
  ON courier_rates ((is_default)) WHERE is_default = true;

-- Semilla: la tarifa que la heurística vieja venía eligiendo (Aéreo USA), o la
-- primera activa si esa ya no existiera. Sin esto ninguna quedaría marcada y el
-- formulario abriría sin courier preseleccionado.
UPDATE courier_rates SET is_default = true
WHERE id = (
  SELECT id FROM courier_rates
  WHERE is_active = true
  ORDER BY (LOWER(name) LIKE '%a_reo%usa%') DESC, id ASC
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM courier_rates WHERE is_default = true);
