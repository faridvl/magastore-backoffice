-- Guía de rastreo del despacho y enlace de rastreo por transportista.
--
-- Todo es ADITIVO: tres ADD COLUMN nullable, sin UPDATE sobre filas existentes.
-- Verificado contra la BD antes de escribir esta migración: ninguna de las tres
-- columnas existe, y las 5 órdenes actuales están todas en CERRADO (ninguna
-- despachada), así que no hay historial al que le falte guía retroactivamente.
--
-- === consolidations.tracking_code ===
-- La guía la emite el transportista POR BULTO DESPACHADO, y el bulto es la orden
-- completa — de ahí que viva en consolidations y no en packages. Ponerla por
-- paquete obligaría a repetir el mismo valor N veces y abriría la puerta a que
-- diverjan entre sí.
--
-- Es NULLABLE a propósito, por tres motivos distintos:
--   1. Las órdenes ya existentes nunca la tuvieron.
--   2. Se puede despachar sin guía y agregarla después (decisión del dueño): el
--      operador no siempre tiene el número a mano al momento de entregar el bulto.
--   3. Los métodos con is_pickup = true (Retiro en oficina) no generan guía nunca.
ALTER TABLE consolidations ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- Cuándo se despachó. Separado de updated_at, que cambia con cualquier edición y
-- por lo tanto no sirve como fecha de despacho.
ALTER TABLE consolidations ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

-- === delivery_methods.tracking_url ===
-- El enlace de rastreo pertenece al transportista, NO al texto de la plantilla.
-- Si estuviera escrito en el mensaje, despachar por Encomienda enviaría al
-- cliente el rastreador de Correos. Con la URL en el catálogo, una sola plantilla
-- sirve para todos los transportistas, presentes y futuros, y darlos de alta no
-- requiere tocar código — que es la razón por la que delivery_methods existe
-- (ver migración 022).
--
-- Se crea en NULL y NO se rellena aquí, ni siquiera para CORREOS_CR: la
-- instrucción fue no modificar ningún registro existente de producción. La URL se
-- carga desde Ajustes → Métodos de entrega. Mientras esté vacía, el aviso de
-- despacho no se ofrece — comportamiento correcto, no un fallo.
--
-- NULL es además el valor correcto y permanente para los métodos de retiro, que
-- no tienen nada que rastrear.
ALTER TABLE delivery_methods ADD COLUMN IF NOT EXISTS tracking_url TEXT;
