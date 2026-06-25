# Configuración de Tarifas

## ¿Qué es la configuración de tarifas?

La pantalla de configuración (`/admin/settings`) permite al operador ajustar las tarifas que usa el sistema para calcular los cobros. Todos los cambios quedan registrados en un historial de auditoría.

---

## Tarifas configurables

| Tarifa | Descripción | Valor actual |
|---|---|---|
| **Precio por libra (USD)** | Cuánto se cobra al cliente por cada libra importada, en dólares | $6.00/lb |
| **Tipo de cambio (CRC/USD)** | A cuántos colones equivale 1 dólar para efectos de conversión | ₡480 |
| **Cargo fijo (CRC)** | Monto fijo en colones que se suma a cada factura, independientemente del peso | ₡2,900 |
| **Peso mínimo (lbs)** | Peso mínimo cobrable. Si el paquete pesa menos, se cobra este peso mínimo | 1 lb |

---

## ¿Cómo afectan las tarifas al cobro?

Los cambios en tarifas **solo afectan facturas futuras**. Las facturas ya generadas conservan las tarifas del momento en que fueron creadas.

Fórmula:
```
Total CRC = (MÁXIMO(peso, peso_mínimo) × precio_por_libra × tipo_de_cambio) + cargo_fijo
```

---

## Historial de cambios

Cada vez que se modifica una tarifa, el sistema registra automáticamente:
- Qué tarifa cambió
- El valor anterior
- El nuevo valor
- La fecha y hora del cambio
- El nombre del operador que hizo el cambio

La pantalla de configuración muestra los **últimos 15 cambios** realizados.

---

## ¿Quién puede cambiar las tarifas?

Solo los operadores con acceso de administrador (`ADMIN`) pueden cambiar las tarifas desde la pantalla de configuración.

---

## Impacto de cambiar las tarifas

| Si cambias... | Impacto inmediato |
|---|---|
| Precio por libra | El preview de cobro al registrar paquetes mostrará el nuevo precio. Las nuevas facturas usarán este precio. |
| Tipo de cambio | Igual — afecta el preview y las nuevas facturas. |
| Cargo fijo | Igual — afecta el preview y las nuevas facturas. |
| Peso mínimo | El preview cambia. Paquetes con peso menor al nuevo mínimo se cobrarán diferente. |

---

## Preview de rentabilidad (pantalla de configuración)

La pantalla de configuración muestra en tiempo real cuánto equivale la tarifa en colones:

```
Precio en CRC = precio_por_libra × tipo_de_cambio
Ejemplo: $6.00 × ₡480 = ₡2,880 por libra
```

Esto ayuda al operador a visualizar el impacto de los cambios antes de guardarlos.

---

## Preguntas frecuentes sobre configuración

**¿Puedo tener tarifas diferentes para envíos aéreos y marítimos?**
No en la versión actual. El sistema aplica la misma tarifa para todos los tipos de envío.

**¿Con qué frecuencia debo actualizar el tipo de cambio?**
Eso depende de la política de la empresa. Magastore puede actualizar el tipo de cambio cuando lo considere necesario. Cada cambio queda registrado en el historial.

**¿Se puede ver el historial completo de cambios de tarifas?**
La pantalla muestra los últimos 15 cambios. Para ver un historial más antiguo, se requeriría consulta directa a la base de datos.

**¿Puedo restablecer las tarifas a un valor anterior?**
Sí, simplemente ingresa el valor anterior manualmente en la pantalla de configuración. El cambio quedará registrado como cualquier otro cambio.

**¿Qué pasa si dejo el precio en 0?**
El sistema lo aceptaría, pero generaría facturas de ₡0 más el cargo fijo. Se recomienda no establecer valores en 0.
