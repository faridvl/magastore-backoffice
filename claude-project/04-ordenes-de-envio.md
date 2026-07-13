# Órdenes de Envío

## ¿Qué es una orden de envío?

Una orden de envío es la agrupación de **varios paquetes de un mismo cliente** en un único envío o despacho para efectos de facturación y manejo logístico. En vez de facturar cada paquete por separado, se cobra el total de todos los paquetes agrupados juntos.

**Beneficio:** Simplifica el proceso de cobro y reduce el costo administrativo cuando un cliente tiene múltiples paquetes en el mismo período.

---

## Flujo de una orden de envío

```
1. Cliente tiene varios paquetes registrados en el sistema
       ↓
2. Operador crea una nueva orden de envío para el cliente
       ↓
3. Operador asigna los paquetes del cliente a la orden de envío (status: ABIERTO)
       ↓
4. Operador cierra la orden de envío cuando está lista para facturar (status: CERRADO)
       ↓
5. Se genera la factura de la orden de envío en la pantalla de Cobros
       ↓
6. Orden de envío se despacha (status: DESPACHADO)
       ↓
7. Paquetes son entregados al cliente (status: ENTREGADO)
```

---

## Estados de una orden de envío

| Estado | Significado |
|---|---|
| **ABIERTO** | La orden de envío está activa y puede recibir más paquetes |
| **CERRADO** | La orden de envío está lista para facturar. Ya no se aceptan más paquetes. |
| **DESPACHADO** | La orden de envío fue despachada/enviada al cliente o en camino a entrega |
| **ENTREGADO** | Todos los paquetes de la orden de envío fueron entregados |

---

## Peso total de una orden de envío

El sistema calcula automáticamente el **peso total** de la orden de envío sumando el peso de todos los paquetes que contiene. Este peso total es el que se usa para calcular el monto a cobrar.

Cada vez que se agrega un paquete a la orden de envío, el peso total se recalcula automáticamente.

---

## ¿Qué paquetes se pueden agrupar en una orden de envío?

- Paquetes que pertenezcan al **mismo cliente**
- Paquetes que **no estén ya en otra orden de envío**

Al asignar paquetes, el sistema muestra únicamente los paquetes disponibles del cliente seleccionado — ya filtra automáticamente los que están en otra orden de envío.

**Nota importante:** El sistema no valida automáticamente que todos los paquetes de una orden de envío sean del mismo cliente. Es responsabilidad del operador verificarlo antes de agruparlos.

---

## Pantalla de gestión de órdenes de envío (`/admin/shipment-orders`)

La pantalla de órdenes de envío permite al operador gestionar todo el ciclo de vida de las órdenes de envío.

### Qué muestra

- Lista de todas las órdenes de envío con cliente, estado, peso total, cantidad de paquetes y fecha
- Barra de búsqueda por nombre de cliente o casillero
- Filtros por estado: Todos / Abiertos / Cerrados / Despachados / Entregados
- Filtro de rango de fechas (Desde / Hasta)

### Crear una nueva orden de envío

1. Hacer clic en **"Nueva Orden de Envío"**
2. Buscar y seleccionar el cliente
3. Confirmar — la orden de envío se crea en estado **ABIERTO**

### Asignar paquetes

1. Hacer clic en una orden de envío existente para abrir el detalle
2. Hacer clic en **"Asignar Paquetes"**
3. El sistema muestra todos los paquetes disponibles del cliente (sin orden de envío asignada)
4. Seleccionar uno o más paquetes y confirmar

### Avanzar el estado

Desde el panel de detalle, el botón de acción avanza la orden de envío al siguiente estado:

| Estado actual | Acción disponible |
|---|---|
| ABIERTO | "Cerrar orden de envío" → pasa a CERRADO |
| CERRADO | "Marcar como Despachado" → pasa a DESPACHADO |
| DESPACHADO | "Marcar como Entregado" → pasa a ENTREGADO |
| ENTREGADO | Sin acciones disponibles |

**Nota:** No se puede cerrar una orden de envío sin paquetes asignados.

---

## Facturación de órdenes de envío

La factura se genera **a nivel de orden de envío**, no por paquete individual. Esto significa:

- Se cobra el peso total de todos los paquetes agrupados juntos
- Se aplica el peso mínimo cobrable sobre el peso total (no sobre cada paquete)
- Se genera una sola factura para todo el grupo
- Al facturar se selecciona el **método de entrega** (Correos CR, Tracopa o Retiro en bodega)

Ver el documento **05-facturacion-cobros.md** para la fórmula de cálculo detallada.

---

## Preguntas frecuentes sobre órdenes de envío

**¿Un paquete siempre tiene que estar en una orden de envío para ser facturado?**
Sí — la facturación está diseñada para hacerse a nivel de orden de envío.

**¿Puedo agregar paquetes a una orden de envío que ya está CERRADA?**
No. Una vez cerrada, la orden de envío no acepta más paquetes.

**¿Puedo eliminar un paquete de una orden de envío?**
No está disponible en la interfaz actual. Una vez que un paquete se agrega a una orden de envío, no se puede remover.

**¿Una orden de envío puede tener paquetes de diferentes clientes?**
Técnicamente el sistema lo permite, pero es un error operativo. Siempre se deben agrupar paquetes del mismo cliente.

**¿Cuántos paquetes puede tener una orden de envío?**
No hay un límite definido. Puede tener desde 1 paquete en adelante.

**¿Qué pasa con el estado de los paquetes individuales cuando se agrupan en una orden de envío?**
El estado de cada paquete sigue siendo independiente. La orden de envío tiene su propio estado separado del estado de cada paquete.

**¿Puedo eliminar una orden de envío?**
No está disponible. Las órdenes de envío son permanentes una vez creadas.
