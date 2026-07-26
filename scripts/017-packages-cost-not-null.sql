-- Todo paquete debe registrar su costo real de courier (courier_cost_usd) y el
-- tipo de cambio usado (tc_banco) — es la base del cálculo de rentabilidad por
-- paquete y de la ganancia congelada en billing (ver 018-billing-profit-snapshot.sql).
-- Antes del código que exige esto en servicio/UI, ambas columnas podían quedar
-- NULL (paquete sin tarifa de courier activa seleccionada). Verificado en Neon
-- antes de esta migración: 0 filas con courier_cost_usd o tc_banco NULL.
ALTER TABLE packages ALTER COLUMN courier_cost_usd SET NOT NULL;
ALTER TABLE packages ALTER COLUMN tc_banco SET NOT NULL;
