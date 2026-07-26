-- Un casillero POR COURIER, no por (origin, package_type).
--
-- El modelo anterior asumía que la combinación origen + tipo de paquete
-- identificaba al casillero, así que courier_rates se unía a warehouse_routes
-- por esa clave natural. Pero pueden existir dos proveedores distintos de
-- USA/AEREO (ej. "Aéreo USA" y "CPF"), cada uno con su propia bodega, su
-- dirección y su numeración de casillero. Con el UNIQUE(origin, package_type)
-- ambos recibían la MISMA fila de warehouse_routes: asignarle el casillero de
-- uno a un cliente hacía desaparecer al otro de la lista de disponibles, y el
-- cliente nunca podía tener casillero en los dos.
--
-- A partir de aquí la relación es courier_rates 1—1 warehouse_routes.

ALTER TABLE warehouse_routes
  ADD COLUMN IF NOT EXISTS courier_rate_id INTEGER REFERENCES courier_rates(id) ON DELETE CASCADE;

-- Backfill: cada ruta existente se queda con el courier más antiguo de su
-- combinación (el que la venía usando de hecho). Los demás couriers que
-- compartían la ruta quedan sin casillero y se les crea uno propio abajo.
UPDATE warehouse_routes wr
SET courier_rate_id = (
  SELECT cr.id FROM courier_rates cr
  WHERE cr.origin = wr.origin AND cr.package_type = wr.package_type
  ORDER BY cr.id ASC
  LIMIT 1
)
WHERE wr.courier_rate_id IS NULL;

-- Una ruta huérfana (sin courier que la reclame) no puede quedar con la FK en
-- null: sin courier no hay forma de llegar a ella desde la UI.
DELETE FROM warehouse_routes WHERE courier_rate_id IS NULL;

-- El UNIQUE viejo es justamente el que impedía dos proveedores del mismo
-- origen y tipo. Se reemplaza por uno sobre el courier.
ALTER TABLE warehouse_routes DROP CONSTRAINT IF EXISTS warehouse_routes_origin_package_type_key;

ALTER TABLE warehouse_routes ALTER COLUMN courier_rate_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS warehouse_routes_courier_rate_id_key
  ON warehouse_routes (courier_rate_id);

-- origin/package_type se conservan como datos descriptivos del casillero (se
-- muestran en la UI y los lee el import), pero ya no son la clave de unión.
-- Se mantienen sincronizados con su courier.
UPDATE warehouse_routes wr
SET origin = cr.origin, package_type = cr.package_type
FROM courier_rates cr
WHERE cr.id = wr.courier_rate_id
  AND (wr.origin IS DISTINCT FROM cr.origin OR wr.package_type IS DISTINCT FROM cr.package_type);

-- Dos casilleros distintos no pueden emitir el mismo prefijo: los códigos
-- dejarían de ser identificables entre proveedores.
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_routes_code_prefix_key
  ON warehouse_routes (code_prefix);
