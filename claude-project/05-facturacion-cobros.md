# Facturación y Cobros

## ¿Cómo se cobra una importación?

El cobro se calcula en base al **peso del paquete o de la consolidación** aplicando las tarifas configuradas en el sistema. La factura se emite en **colones costarricenses (CRC)**.

---

## Fórmula de cobro

```
Peso cobrable  = MÁXIMO(peso real, peso mínimo)
Total en USD   = Peso cobrable × Precio por libra (USD)
Total en CRC   = (Total en USD × Tipo de cambio) + Cargo fijo (CRC)
```

### Ejemplo con las tarifas actuales

Tarifas vigentes (configuradas en el sistema):
- Precio por libra: **$6.00 USD**
- Tipo de cambio: **₡480 por dólar**
- Cargo fijo: **₡2,900**
- Peso mínimo: **1 libra**

**Paquete de 3 libras:**
```
Peso cobrable  = MÁXIMO(3, 1) = 3 lb
Total USD      = 3 × $6.00 = $18.00
Total CRC      = ($18.00 × ₡480) + ₡2,900
             = ₡8,640 + ₡2,900
             = ₡11,540
```

**Paquete de 0.5 libras (menos del mínimo):**
```
Peso cobrable  = MÁXIMO(0.5, 1) = 1 lb  ← se cobra el mínimo
Total CRC      = ($6.00 × ₡480) + ₡2,900
             = ₡2,880 + ₡2,900
             = ₡5,780
```

---

## Componentes de la factura

| Componente | Descripción |
|---|---|
| **Peso cobrado** | El peso usado para el cálculo (puede ser mayor al real si aplica mínimo) |
| **Tarifa por libra aplicada** | El precio/lb vigente al momento de generar la factura |
| **Tipo de cambio aplicado** | El tipo de cambio vigente al momento de generar la factura |
| **Cargo fijo** | El monto fijo en CRC que se suma a todas las facturas |
| **Total en CRC** | El monto final que debe pagar el cliente |

**Importante:** Las tarifas se **fotografían** en la factura al momento de generarla. Si las tarifas cambian después, las facturas ya emitidas no se modifican.

---

## Proceso para generar una factura

1. Los paquetes del cliente deben estar en una **consolidación**
2. La consolidación debe estar en estado **CERRADO** o superior
3. El operador genera la factura desde la pantalla de cobros
4. El sistema crea la factura usando las tarifas actuales del sistema
5. La factura queda en estado **Pendiente de pago**

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
- Ver el detalle de cada factura (peso, tarifas aplicadas, total)
- **Marcar una factura como pagada** (botón "Cobrar Ahora")
- Ver consolidaciones que aún no tienen factura generada (tab "Por Facturar")

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
- Es solo una **estimación** — la factura real se genera al momento de facturar la consolidación

---

## Preguntas frecuentes sobre facturación

**¿Se puede generar una factura para un paquete suelto (sin consolidación)?**
El modelo de negocio de Magastore factura por consolidación, no por paquete individual. Todos los paquetes deben estar en una consolidación antes de facturar.

**¿Qué pasa si el peso del paquete es menor al mínimo?**
Se cobra el peso mínimo (1 libra). Ejemplo: un paquete de 0.3 lbs se cobra como si pesara 1 lb.

**¿Puedo generar dos facturas para la misma consolidación?**
No. El sistema solo permite una factura por consolidación. Si se intenta generar una segunda factura para la misma consolidación, el sistema lo rechaza.

**¿Las tarifas cambian automáticamente en las facturas ya emitidas?**
No. Cada factura guarda una "fotografía" de las tarifas del momento en que fue generada. Los cambios futuros en las tarifas no afectan facturas anteriores.

**¿Cómo registro que un cliente pagó?**
Desde la pantalla de cobros, se hace clic en la factura del cliente y se usa el botón "Cobrar Ahora" o "Marcar como Pagado".

**¿Puedo anular o eliminar una factura?**
No está disponible en el sistema actual. Las facturas son permanentes una vez generadas.

**¿El sistema acepta pagos parciales?**
No. El sistema solo registra si la factura está pagada o no pagada. No hay pagos parciales.
