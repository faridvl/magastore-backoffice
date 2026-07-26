-- Plantillas de WhatsApp editables desde el backoffice. Antes vivían como
-- constantes en src/shared/constants/whatsapp-templates.ts, así que cambiar un
-- texto exigía un deploy.
--
-- code: identificador estable que el código usa para buscar la plantilla. NO se
--       edita desde la UI — renombrarlo dejaría al builder sin plantilla.
-- body: el texto con placeholders {{variable}} que interpolate() reemplaza.
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Semilla con el texto exacto que hoy está en el código, para que el
-- comportamiento no cambie al migrar la lectura a BD.
INSERT INTO whatsapp_templates (code, name, description, body) VALUES
(
  'PACKAGES_AVAILABLE',
  'Paquetes disponibles',
  'Se envía al cliente cuando tiene paquetes en bodega sin orden de envío, para que indique cómo desea proceder.',
  '📦 Estimado(a), {{nombre}}.

Le informamos que actualmente tiene los siguientes paquetes disponibles en nuestra bodega en Panamá:

{{lista_paquetes}}

*Peso total disponible:* {{peso_total}} lb

Antes de programar su envío a Costa Rica, agradecemos nos indique cómo desea proceder:

1. Enviar todos los paquetes disponibles.
2. Esperar la llegada de más paquetes para consolidarlos en un solo envío.
3. Separar los paquetes en diferentes envíos.
4. Actualizar la dirección de entrega (si aplica).

Una vez recibamos su confirmación, prepararemos su envío y le enviaremos la prefactura correspondiente.

Quedamos atentos a su respuesta. Será un gusto asistirle.

*MAGASTORE 📦✈️*'
),
(
  'PREBILLING_READY',
  'Estimado listo',
  'Se envía junto con el PDF de la prefactura, cuando la orden ya tiene el estimado generado.',
  '📦 Estimado(a), {{nombre}}.

Su envío #{{id_orden}} ya tiene el estimado listo (adjunto el PDF).

Peso total: {{peso_total}} lb
Método de entrega: {{metodo_entrega}}

Quedamos atentos a su confirmación para proceder.

*MAGASTORE 📦✈️*'
),
(
  'WAREHOUSE_WELCOME',
  'Bienvenida de casillero',
  'Se envía al cliente nuevo con los datos del casillero donde debe recibir su mercancía.',
  'Estos serían los datos de tu nuevo casillero en {{ruta_label}} 📫:

Nombre apellido: MGA {{nombre_completo}}
Dirección: {{direccion}}
Referencia: {{codigo}}
Estado: {{estado}}
Ciudad: {{ciudad}}
Codigo postal: {{codigo_postal}}
Teléfono: {{telefono}}'
)
ON CONFLICT (code) DO NOTHING;
