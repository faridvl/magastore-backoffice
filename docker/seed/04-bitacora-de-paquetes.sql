-- Escenario 04: bitácora de cada paquete sembrado (rastreo público y detalle del paquete).
-- El trigger de la migración 005 solo registra cambios de estado, no altas, así que el historial
-- se escribe aquí de forma explícita. Se borra y se rehace por paquete para no duplicar eventos.

DELETE FROM package_events
WHERE package_id IN (SELECT id FROM packages WHERE uuid::text LIKE 'e0000000-0000-4000-8000-%');

-- Llegada a la bodega.
INSERT INTO package_events (package_id, status, event_type, description, location, created_at)
SELECT p.id, 'PANAMA', 'INFO', 'Paquete recibido en la bodega de Panamá', 'Bodega Panamá', p.arrival_date
FROM packages p
WHERE p.uuid::text LIKE 'e0000000-0000-4000-8000-%';

-- Aviso al cliente por WhatsApp.
INSERT INTO package_events (package_id, status, event_type, description, location, created_at)
SELECT p.id, 'PANAMA', 'INFO', 'Cliente notificado de disponibilidad por WhatsApp', NULL, p.notified_at
FROM packages p
WHERE p.uuid::text LIKE 'e0000000-0000-4000-8000-%' AND p.notified_at IS NOT NULL;

-- Salida hacia Costa Rica (al pagar la factura de la orden).
INSERT INTO package_events (package_id, status, event_type, description, location, created_at)
SELECT p.id, 'EN_TRAMITE', 'INFO', 'Paquete en camino a Costa Rica', 'En tránsito',
       COALESCE(b.paid_at, p.arrival_date + interval '3 days')
FROM packages p
LEFT JOIN billing b ON b.consolidation_id = p.consolidation_id
WHERE p.uuid::text LIKE 'e0000000-0000-4000-8000-%' AND p.status IN ('EN_TRAMITE', 'ENTREGADO');

-- Entrega.
INSERT INTO package_events (package_id, status, event_type, description, location, created_at)
SELECT p.id, 'ENTREGADO', 'INFO', 'Paquete entregado al cliente', 'Costa Rica',
       COALESCE(c.updated_at, p.arrival_date + interval '6 days')
FROM packages p
LEFT JOIN consolidations c ON c.id = p.consolidation_id
WHERE p.uuid::text LIKE 'e0000000-0000-4000-8000-%' AND p.status = 'ENTREGADO';
