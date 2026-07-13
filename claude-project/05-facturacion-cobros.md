# Facturación y Cobros

## ¿Cómo se cobra una importación?

El cobro se calcula en base al **peso de la orden de envío** aplicando las tarifas configuradas en el sistema más la tarifa de entrega local seleccionada. La factura se emite en **colones costarricenses (CRC)**.

---

## Fórmula de cobro

```
Peso cobrable  = MÁXIMO(peso real, peso mínimo)
Flete USD      = Peso cobrable × Precio por libra (USD)
Flete CRC      = Flete USD × Tipo de cambio
Total CRC      = Flete CRC + Tarifa de entrega local (CRC)
```

### Métodos de entrega y sus tarifas

| Método | Tarifa fija |
|---|---|
| **Correos de Costa Rica** | ₡2,900 CRC |
| **Tracopa / Encomienda** | ₡2,500 CRC |
| **Retiro en bodega** | ₡0 |

### Ejemplo: orden de envío de 3 libras por Correos CR

Tarifas vigentes:
- Precio por libra: **$6.00 USD**
- Tipo de cambio: **₡480 por dólar**
- Peso mínimo: **1 libra**
- Entrega por Correos CR: **₡2,900**

```
Peso cobrable  = MÁXIMO(3, 1) = 3 lb
Flete USD      = 3 × $6.00 = $18.00
Flete CRC      = $18.00 × ₡480 = ₡8,640
Total CRC      = ₡8,640 + ₡2,900 = ₡11,540
```

### Ejemplo: orden de envío de 1 libra con retiro en bodega

```
Peso cobrable  = MÁXIMO(1, 1) = 1 lb
Flete CRC      = $6.00 × ₡480 = ₡2,880
Total CRC      = ₡2,880 + ₡0 = ₡2,880
```

---

## Componentes de la factura

| Componente | Descripción |
|---|---|
| **Peso cobrado** | El peso usado para el cálculo (puede ser mayor al real si aplica mínimo) |
| **Tarifa por libra aplicada** | El precio/lb vigente al momento de generar la factura |
| **Tipo de cambio aplicado** | El tipo de cambio vigente al momento de generar la factura |
| **Método de entrega** | Correos CR / Tracopa / Retiro en bodega |
| **Tarifa de entrega aplicada** | El costo de entrega vigente al momento de generar la factura |
| **Total en CRC** | El monto final que debe pagar el cliente |

**Importante:** Las tarifas se **fotografían** en la factura al momento de generarla. Si las tarifas cambian después, las facturas ya emitidas no se modifican.

---

## Proceso para generar una factura

1. Los paquetes del cliente deben estar en una **orden de envío**
2. La orden de envío debe estar en estado **CERRADO** o superior
3. El operador va a la pantalla de **Cobros** (`/admin/billing`), tab **"Por Facturar"**
4. Hace clic en la orden de envío y selecciona **"Generar Factura"**
5. Selecciona el **método de entrega** (Correos CR, Tracopa o Retiro en bodega)
6. El sistema crea la factura usando las tarifas actuales del sistema
7. La factura queda en estado **Pendiente de pago**

---

## Estado de pago

Una factura puede estar en uno de dos estados:

| Estado | Descripción |
|---|---|
| **Pendiente** | El cliente aún no ha pagado |
| **Pagado** | El operador registró el pago del cliente |

Cuando se marca una factura como pagada, el sistema registra automáticamente la fecha y hora del pago.

---

## Pantalla de cobros (`/admin/billing`)

La pantalla de cobros permite:
- Ver todas las facturas generadas
- Filtrar por estado (pagadas / pendientes / todas)
- Buscar por nombre de cliente o código de casillero
- Ver el detalle de cada factura (peso, tarifas aplicadas, método de entrega, total)
- **Marcar una factura como pagada** (botón "Cobrar Ahora")
- Ver órdenes de envío que aún no tienen factura generada (tab "Por Facturar")
- **Descargar PDF** de la factura

### Métricas que muestra la pantalla

| Métrica | Qué mide |
|---|---|
| Total por Cobrar | Suma de facturas pendientes de pago |
| Facturas pagadas | Cantidad de facturas ya cobradas |
| Facturas pendientes | Cantidad de facturas sin cobrar |
| Eficiencia de cobro | % de facturas que han sido pagadas |

---

## Preview de cobro (antes de registrar el paquete)

Al registrar un nuevo paquete, el sistema muestra un **cálculo estimado** del cobro usando las tarifas actuales. Este preview:
- Se calcula en tiempo real mientras se ingresa el peso
- Usa las tarifas configuradas en `Configuración`
- Es solo una **estimación** — la factura real se genera al momento de facturar la orden de envío y depende también del método de entrega elegido

---

## Preguntas frecuentes sobre facturación

**¿Se puede generar una factura para un paquete suelto (sin orden de envío)?**
El modelo de negocio de Magastore factura por orden de envío, no por paquete individual. Todos los paquetes deben estar en una orden de envío antes de facturar.

**¿Qué pasa si el peso del paquete es menor al mínimo?**
Se cobra el peso mínimo (1 libra). Ejemplo: un paquete de 1 lb (mínimo posible) se cobra normalmente.

**¿Puedo generar dos facturas para la misma orden de envío?**
No. El sistema solo permite una factura por orden de envío.

**¿Las tarifas cambian automáticamente en las facturas ya emitidas?**
No. Cada factura guarda una "fotografía" de las tarifas del momento en que fue generada.

**¿Cómo registro que un cliente pagó?**
Desde la pantalla de cobros, se hace clic en la factura del cliente y se usa el botón "Cobrar Ahora" o "Marcar como Pagado".

**¿Puedo anular o eliminar una factura?**
No está disponible en el sistema actual. Las facturas son permanentes una vez generadas.

**¿El sistema acepta pagos parciales?**
No. El sistema solo registra si la factura está pagada o no pagada. No hay pagos parciales.

**¿Puedo cambiar el método de entrega después de generar la factura?**
No. El método de entrega se selecciona al generar la factura y queda registrado como parte del snapshot de la factura.
