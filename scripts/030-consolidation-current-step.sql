-- Paso del wizard de la orden de envío (step-by-step del detalle).
--
-- El flujo tiene 4 pasos operativos + 1 estado final:
--   1 = Confirmación (dirección + método, antes de generar el estimado)
--   2 = Cobro (estimado generado, esperando pago)
--   3 = Despacho (facturada, solicitando/esperando envío al proveedor)
--   4 = Notificación y cierre (ya ENTREGADO: avisar al cliente, ajustar el
--       costo real de envío si difiere del estimado, registrar vuelto)
--   5 = Finalizada (el stepper deja de mostrarse, pantalla normal)
--
-- El paso 4→5 NO corresponde a una transición de `status`: la orden ya está en
-- ENTREGADO desde que entra al paso 4 (marcar entregado también mueve los
-- paquetes a ENTREGADO — eso ocurre al ENTRAR al paso 4, no al finalizar).
-- "Finalizar" al cierre del paso 4 solo avanza current_step, sin tocar status
-- ni paquetes de nuevo.
--
-- current_step es un dato explícito, no derivado de `status` + existencia de
-- pre_billing/billing: derivarlo obliga a re-inferir el paso en cada render y
-- se rompe apenas se agregue un paso que no mueva `status` (como el 4→5). Se
-- persiste para que una orden a medio camino (el operador cierra el
-- navegador) se reabra exactamente donde iba.
--
-- ADITIVO: ADD COLUMN con DEFAULT, sin tocar filas de forma destructiva. El
-- UPDATE de backfill de abajo solo corrige el valor de las órdenes que ya
-- existían antes de esta migración, a partir de su status actual — no cambia
-- ningún otro campo.
ALTER TABLE consolidations
  ADD COLUMN IF NOT EXISTS current_step SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE consolidations
  DROP CONSTRAINT IF EXISTS consolidations_current_step_check;

ALTER TABLE consolidations
  ADD CONSTRAINT consolidations_current_step_check
  CHECK (current_step BETWEEN 1 AND 5);

-- Backfill: coloca cada orden existente en el paso que le corresponde según su
-- status actual. Las órdenes ENTREGADO ya existentes se backfillean a 5
-- (Finalizada) directo, no a 4 — no tiene sentido resucitar el paso de
-- notificación/ajuste para órdenes que ya se cerraron antes de que este paso
-- existiera; ese trabajo, si hace falta, se hace a mano.
--
-- Caso sin resolver, documentado en ordenes-step-by-step-plan.md: una orden
-- CERRADO sin pre_billing (posible tras un reabrir viejo, antes de esta
-- migración) queda en paso 2 sin cumplir el requisito de "estimado generado"
-- que el wizard nuevo exige para estar ahí. Se decide no moverla a paso 1
-- automáticamente porque status=CERRADO significa que la orden ya no admite
-- agregar/quitar paquetes con las reglas viejas, y forzarla a paso 1 la
-- reabriría implícitamente. Si aparece un caso así en producción, corregirlo
-- a mano (UPDATE puntual) es más seguro que una regla genérica aquí.
UPDATE consolidations con
SET current_step = CASE con.status
  WHEN 'ABIERTO'    THEN 1
  WHEN 'CERRADO'    THEN 2
  WHEN 'DESPACHADO' THEN 3
  WHEN 'ENTREGADO'  THEN 5
  ELSE con.current_step
END
WHERE con.current_step = 1 AND con.status != 'ABIERTO';

CREATE INDEX IF NOT EXISTS idx_consolidations_current_step
  ON consolidations (current_step);

-- Ajuste del costo real de envío (paso 4). El costo de Correos/transportista
-- puede diferir del que se usó al generar el estimado — el operador lo
-- confirma cuando el transportista lo informa, después del despacho.
--
-- Alcance acordado con el dueño: este ajuste SOLO corrige lo que se le cobró
-- al cliente (delivery_fee_crc / total_amount_crc) y el posible vuelto. NO
-- toca delivery_cost_crc, profit_crc ni profit_shares — la ganancia y la
-- participación de Farid quedan exactamente como se calcularon al confirmar
-- la factura. Decisión explícita: tocar profit_crc acá desincroniza la
-- participación ya congelada (upsertProfitShare, estado FACTURADO) sin que se
-- haya pedido ese recálculo, y el riesgo de error no se justifica por una
-- diferencia que normalmente es de unos pocos cientos de colones.
--
-- actual_delivery_fee_crc es NULLABLE y opcional a propósito, mismo criterio
-- que tracking_code (migración 027): el transportista no siempre confirma el
-- costo real al momento del despacho, y la orden no debe quedar trabada sin
-- poder avanzar de paso por eso.
ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS actual_delivery_fee_crc NUMERIC(12, 2);

-- El fee facturado originalmente (antes de cualquier ajuste), preservado
-- porque setActualDeliveryFee SOBREESCRIBE delivery_fee_crc con el valor real
-- — sin este snapshot, la diferencia (para el vuelto) daría siempre 0 al
-- releer la orden después de guardar, justo cuando más hace falta mostrarla.
-- Se fija una sola vez, en el primer ajuste; un segundo ajuste posterior sigue
-- comparando contra el fee que el cliente vio en la factura original, no
-- contra el ajuste anterior.
ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS original_delivery_fee_crc NUMERIC(12, 2);

-- Vuelto: solo aplica cuando actual_delivery_fee_crc < delivery_fee_crc (se le
-- cobró de más). Se registra si se entregó, igual que is_paid/paid_at
-- registran el cobro — para que quede rastro de que el ajuste se resolvió con
-- el cliente y no solo se calculó en pantalla.
ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS change_returned BOOLEAN;

ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS change_returned_at TIMESTAMPTZ;

-- Marca de "ya se copió/envió la solicitud de envío al proveedor" (paso 3,
-- Despacho). Mismo patrón que pre_billing.notified_at: se estampa AL COPIAR
-- el mensaje (handleCopyShipmentRequest), no al confirmar una respuesta del
-- proveedor — no hay forma de saber si el proveedor ya contestó, solo si el
-- operador ya le mandó el mensaje. El chip "Envío solicitado, esperando
-- confirmación" del paso 3 usaba antes !tracking_code como proxy (impreciso:
-- aparecía aunque nunca se hubiera copiado nada); ahora depende de este dato
-- real.
ALTER TABLE consolidations
  ADD COLUMN IF NOT EXISTS shipment_requested_at TIMESTAMPTZ;

-- Marca de "ya se avisó AL CLIENTE que su envío fue solicitado" (paso 3),
-- distinta de shipment_requested_at (que marca el aviso AL PROVEEDOR). Son dos
-- destinatarios distintos del mismo evento: uno interno (operador→proveedor,
-- copia el mensaje), otro externo (operador→cliente, abre WhatsApp). El chip
-- "Cliente notificado / no notificado" del paso 3 depende de esta columna.
ALTER TABLE consolidations
  ADD COLUMN IF NOT EXISTS customer_notified_shipment_at TIMESTAMPTZ;
