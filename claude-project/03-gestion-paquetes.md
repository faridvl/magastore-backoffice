# Gestión de Paquetes

## ¿Qué es un paquete?

Un paquete es una mercancía física que un cliente importó desde Estados Unidos y que ingresó al sistema de Magastore en Miami. Cada paquete se registra individualmente con su número de tracking del transportista, su peso y el cliente al que pertenece.

---

## Información que se registra de un paquete

| Campo | Descripción | Requerido |
|---|---|---|
| Cliente | A quién pertenece el paquete | Sí |
| Número de tracking | Código del transportista (UPS, FedEx, Amazon, etc.) | Sí |
| Peso (libras) | Peso real del paquete. Debe ser mayor a 0. | Sí |
| Tipo de envío | Aéreo o Marítimo | Sí |
| Notas internas | Observaciones del operador (daños, instrucciones especiales) | No |
| URL de evidencia | Enlace a foto de daño o evidencia del paquete | No |

---

## Tipos de envío

| Tipo | Descripción |
|---|---|
| **Aéreo** | El paquete viaja en avión. Más rápido, generalmente más costoso. |
| **Marítimo** | El paquete viaja en barco. Más lento, generalmente más económico. |

El tipo de envío se selecciona al registrar el paquete y actualmente aplica la misma tarifa de cobro para ambos tipos.

---

## Estados del paquete (ciclo de vida)

Un paquete pasa por los siguientes estados en orden:

```
MIAMI → TRANSITO → ADUANA → BODEGA_CR → ENTREGADO
```

| Estado | Significado | Ubicación física |
|---|---|---|
| **MIAMI** | El paquete llegó al depósito de Magastore en Miami y fue registrado en el sistema | Miami Warehouse, FL |
| **TRANSITO** | El paquete está en camino hacia Costa Rica (vuelo o barco) | En tránsito internacional |
| **ADUANA** | El paquete llegó a Costa Rica y está en proceso de despacho aduanero | Aduana de Costa Rica |
| **BODEGA_CR** | El paquete pasó aduana y está en la bodega de Magastore en Costa Rica, listo para entrega | Bodega CR |
| **ENTREGADO** | El paquete fue entregado al cliente | En manos del cliente |

**Importante:** El sistema no valida que los estados se cambien en orden. Un operador puede cambiar el estado de MIAMI directamente a ENTREGADO si es necesario, aunque no es la práctica normal.

---

## Historial de eventos del paquete

Cada vez que se registra o actualiza un paquete, el sistema genera automáticamente un evento de seguimiento. Estos eventos son los que el cliente ve en la página pública de rastreo.

Cada evento registra:
- El estado en ese momento
- Tipo de evento (INFO, WARNING, DAMAGE, CRITICAL)
- Descripción del evento
- Ubicación
- Fecha y hora

---

## Notas internas y evidencia fotográfica

Al actualizar el estado de un paquete, el operador puede:
- Agregar **notas internas** (visibles solo para el operador, no para el cliente)
- Agregar una **URL de evidencia** (foto de daño, foto de recepción, etc.)

**Atención:** Las notas internas y la URL de evidencia se sobrescriben cada vez que se actualiza el estado. No se acumulan — solo se conserva el último valor ingresado.

---

## Pantallas disponibles

| Pantalla | Qué permite hacer |
|---|---|
| **Lista de paquetes** (`/admin/logistics`) | Ver todos los paquetes con filtros por estado y búsqueda por tracking/cliente |
| **Registrar paquete** (`/admin/logistics/create`) | Ingresar un nuevo paquete al sistema. Muestra preview de cobro antes de guardar. |
| **Detalle de paquete** (`/admin/logistics/[id]`) | Ver toda la información del paquete, su historial de eventos y panel de facturación |
| **Editar paquete** (`/admin/logistics/edit/[id]`) | Modificar datos del paquete o actualizar su estado |

---

## Preview de cobro al registrar

Antes de guardar un paquete, el sistema muestra un cálculo estimado del cobro al cliente basado en:
- El peso ingresado
- Las tarifas actuales configuradas en el sistema (precio/libra, tipo de cambio)
- El peso mínimo cobrable (si el paquete pesa menos del mínimo, se cobra el mínimo)

Este preview es una **estimación**. La factura real se genera cuando se crea la consolidación y se factura.

---

## Preguntas frecuentes sobre paquetes

**¿Puedo registrar un paquete sin saber el peso exacto?**
No. El sistema requiere un peso mayor a 0 para registrar el paquete.

**¿Puedo cambiar el cliente de un paquete después de registrarlo?**
No está disponible en la interfaz actual. El cliente se asigna al registrar el paquete y no se puede cambiar posteriormente.

**¿Qué pasa si dos paquetes tienen el mismo número de tracking?**
El sistema no impide actualmente registrar dos paquetes con el mismo tracking number. Es responsabilidad del operador evitar duplicados.

**¿Puede un paquete pertenecer a más de una consolidación?**
No. Un paquete solo puede pertenecer a una consolidación a la vez. Una vez consolidado, no se puede mover a otra consolidación.

**¿Cómo sabe el cliente el estado de su paquete?**
El cliente puede ir a la página pública de rastreo e ingresar su número de tracking para ver el estado actual y el historial de eventos.
