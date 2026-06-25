# Consolidaciones

## ¿Qué es una consolidación?

Una consolidación es la agrupación de **varios paquetes de un mismo cliente** en un único envío o despacho para efectos de facturación y manejo logístico. En vez de facturar cada paquete por separado, se cobra el total de todos los paquetes consolidados juntos.

**Beneficio:** Simplifica el proceso de cobro y reduce el costo administrativo cuando un cliente tiene múltiples paquetes en el mismo período.

---

## Flujo de una consolidación

```
1. Cliente tiene varios paquetes registrados en el sistema
       ↓
2. Operador agrupa los paquetes en una consolidación (status: ABIERTO)
       ↓
3. Operador cierra la consolidación cuando está lista para facturar (status: CERRADO)
       ↓
4. Se genera la factura de la consolidación
       ↓
5. Consolidación se despacha (status: DESPACHADO)
       ↓
6. Paquetes son entregados al cliente (status: ENTREGADO)
```

---

## Estados de una consolidación

| Estado | Significado |
|---|---|
| **ABIERTO** | La consolidación está activa y puede recibir más paquetes |
| **CERRADO** | La consolidación está lista para facturar. Ya no se aceptan más paquetes. |
| **DESPACHADO** | La consolidación fue despachada/enviada al cliente o en camino a entrega |
| **ENTREGADO** | Todos los paquetes de la consolidación fueron entregados |

---

## Peso total de una consolidación

El sistema calcula automáticamente el **peso total** de la consolidación sumando el peso de todos los paquetes que contiene. Este peso total es el que se usa para calcular el monto a cobrar.

Cada vez que se agrega un paquete a la consolidación, el peso total se recalcula automáticamente.

---

## ¿Qué paquetes se pueden consolidar?

- Paquetes que pertenezcan al **mismo cliente**
- Paquetes que **no estén ya en otra consolidación**

**Nota importante:** El sistema no valida automáticamente que todos los paquetes de una consolidación sean del mismo cliente. Es responsabilidad del operador verificarlo antes de consolidar.

---

## Facturación de consolidaciones

La factura se genera **a nivel de consolidación**, no por paquete individual. Esto significa:

- Se cobra el peso total de todos los paquetes consolidados juntos
- Se aplica el peso mínimo cobrable sobre el peso total (no sobre cada paquete)
- Se genera una sola factura para todo el grupo

Ver el documento **05-facturacion-cobros.md** para la fórmula de cálculo detallada.

---

## Preguntas frecuentes sobre consolidaciones

**¿Un paquete siempre tiene que estar en una consolidación para ser facturado?**
En el modelo de negocio de Magastore, sí — la facturación está diseñada para hacerse a nivel de consolidación. Sin embargo, la estructura técnica del sistema permite facturar paquetes individualmente (aunque esta funcionalidad no se usa en la práctica).

**¿Puedo agregar paquetes a una consolidación que ya está CERRADA?**
No. Una vez cerrada, la consolidación no acepta más paquetes.

**¿Puedo eliminar un paquete de una consolidación?**
No está disponible en la interfaz actual. Una vez que un paquete se agrega a una consolidación, no se puede remover.

**¿Una consolidación puede tener paquetes de diferentes clientes?**
Técnicamente el sistema lo permite, pero es un error operativo. Siempre se deben consolidar paquetes del mismo cliente.

**¿Cuántos paquetes puede tener una consolidación?**
No hay un límite definido. Puede tener desde 1 paquete en adelante.

**¿Qué pasa con el estado de los paquetes individuales cuando se consolidan?**
El estado de cada paquete sigue siendo independiente. La consolidación tiene su propio estado separado del estado de cada paquete.
