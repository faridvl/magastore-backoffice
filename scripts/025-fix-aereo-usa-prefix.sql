-- Corrige el prefijo del casillero de "Aéreo USA", contaminado por el modelo
-- anterior a la migración 024.
--
-- Hasta la 024, warehouse_routes tenía UNIQUE(origin, package_type) y el JOIN
-- con courier_rates se hacía por esa clave natural. Como "Aéreo USA" y "CPF"
-- son ambos USA/AEREO, las dos tarifas resolvían a la MISMA fila de casillero:
-- editar el casillero desde CPF escribía la fila que "Aéreo USA" también
-- mostraba. Así fue como el prefijo de CPF (CPF285-) terminó guardado en la
-- fila que la 024 le adjudicó a "Aéreo USA".
--
-- El prefijo real de "Aéreo USA" es MGA-2453-C-: es el que llevan sus 10
-- clientes actuales (MGA-2453-C-01 … MGA-2453-C-10), emitidos por el esquema
-- previo a los casilleros. Ninguno de esos códigos usa CPF285-, así que este
-- cambio no invalida ningún código ya entregado a un cliente.
--
-- current_counter se deja en 10 a propósito: la numeración continúa la serie
-- existente y el próximo cliente recibe MGA-2453-C-11, sin colisionar con los
-- códigos ya asignados.

UPDATE warehouse_routes wr
SET code_prefix = 'MGA-2453-C-'
FROM courier_rates cr
WHERE cr.id = wr.courier_rate_id
  AND cr.name = 'Aéreo USA'
  AND wr.code_prefix = 'CPF285-';
