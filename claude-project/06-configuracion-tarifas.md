# Configuración de Tarifas

## ¿Qué es la configuración de tarifas?

La pantalla de configuración (`/admin/settings`) permite al operador ajustar las tarifas que usa el sistema para calcular los cobros. Todos los cambios quedan registrados en un historial de auditoría.

---

## Tarifas configurables

### Flete internacional

| Tarifa | Descripción | Valor actual |
|---|---|---|
| **Precio por libra (USD)** | Cuánto se cobra al cliente por cada libra importada, en dólares | $6.00/lb |
| **Tipo de cambio (CRC/USD)** | A cuántos colones equivale 1 dólar para efectos de conversión | ₡480 |
| **Ganancia por libra (USD)** | Margen de ganancia estimado por libra — solo para reporting interno, no afecta la factura | $2.00/lb |
| **Peso mínimo (lbs)** | Peso mínimo cobrable. Si el paquete pesa menos, se cobra este peso mínimo. Solo acepta enteros. | 1 lb |

### Entrega local en Costa Rica

| Tarifa | Descripción | Valor actual |
|---|---|---|
| **Correos de Costa Rica** | Tarifa fija de envío cuando el cliente elige Correos CR | ₡2,900 |
| **Tracopa / Encomienda** | Tarifa fija de envío cuando el cliente elige Tracopa | ₡2,500 |

El **Retiro en bodega** no tiene tarifa — es gratuito.

---

## ¿Cómo afectan las tarifas al cobro?

Los cambios en tarifas **solo afectan facturas futuras**. Las facturas ya generadas conservan las tarifas del momento en que fueron creadas.

Fórmula completa:
```
Flete CRC  = MÁXIMO(peso, peso_mínimo) × precio_por_libra × tipo_de_cambio
Total CRC  = Flete CRC + tarifa_de_entrega_local
```

---

## Historial de cambios

Cada vez que se modifica una tarifa, el sistema registra automáticamente:
- Qué tarifa cambió
- El valor anterior
- El nuevo valor
- La fecha y hora del cambio
- El nombre del operador que hizo el cambio

La pantalla de configuración muestra el historial completo de cambios realizados, con paginación.

---

## ¿Quién puede cambiar las tarifas?

Solo los operadores con acceso de administrador (`ADMIN`) pueden cambiar las tarifas desde la pantalla de configuración.

---

## Impacto de cambiar las tarifas

| Si cambias... | Impacto inmediato |
|---|---|
| Precio por libra | El preview de cobro al registrar paquetes mostrará el nuevo precio. Las nuevas facturas usarán este precio. |
| Tipo de cambio | Igual — afecta el preview y las nuevas facturas. |
| Correos CR / Tracopa | Las nuevas facturas que usen ese método de entrega cobrarán la nueva tarifa. |
| Peso mínimo | El preview cambia. Si el nuevo mínimo es mayor, paquetes pequeños se cobrarán más. |
| Ganancia por libra | Solo afecta el indicador de rentabilidad visible en la pantalla de settings. No afecta facturas. |

---

## Preview de rentabilidad (pantalla de configuración)

La pantalla de configuración muestra en tiempo real el impacto de las tarifas vigentes:

```
Cobro por libra en CRC = precio_por_libra × tipo_de_cambio
Ganancia estimada / lb = profit_per_lb × tipo_de_cambio
```

Esto ayuda al operador a visualizar el impacto de los cambios antes de guardarlos.

---

## Preguntas frecuentes sobre configuración

**¿Puedo tener tarifas diferentes para envíos aéreos y marítimos?**
No en la versión actual. El sistema aplica la misma tarifa de flete para todos los tipos de envío.

**¿Con qué frecuencia debo actualizar el tipo de cambio?**
Eso depende de la política de la empresa. Magastore puede actualizar el tipo de cambio cuando lo considere necesario. Cada cambio queda registrado en el historial.

**¿Se puede ver el historial completo de cambios de tarifas?**
Sí, el historial completo está disponible en la pantalla de configuración con paginación.

**¿Puedo restablecer las tarifas a un valor anterior?**
Sí, simplemente ingresa el valor anterior manualmente en la pantalla de configuración. El cambio quedará registrado como cualquier otro cambio.

**¿Qué pasa si dejo el precio en 0?**
El sistema lo aceptaría, pero generaría facturas sin costo de flete (solo la tarifa de entrega). Se recomienda no establecer valores en 0.

**¿La tarifa de Retiro en bodega se puede configurar?**
No. El retiro en bodega siempre es gratuito (₡0) y no tiene campo de configuración.
