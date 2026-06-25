-- Script 003: Normalizar package_type a valores canónicos AEREO / MARITIMO
-- Ejecutar una vez en Neon. Registrar en development-plan.md tras ejecutar.
--
-- Problema: la tabla packages contiene variantes mezcladas:
--   AEREO, Aereo, AVION  ->  deben ser AEREO
--   MARITIMO, Maritimo   ->  deben ser MARITIMO
--
-- Verificar antes de ejecutar:
--   SELECT package_type, COUNT(*) FROM packages GROUP BY package_type;
--
-- Ejecutar:
BEGIN;

UPDATE packages
SET package_type = 'AEREO'
WHERE package_type IN ('Aereo', 'AVION', 'aereo', 'avion');

UPDATE packages
SET package_type = 'MARITIMO'
WHERE package_type IN ('Maritimo', 'maritimo');

-- Verificar resultado (debe mostrar solo AEREO y MARITIMO):
SELECT package_type, COUNT(*) AS total
FROM packages
GROUP BY package_type
ORDER BY package_type;

COMMIT;
