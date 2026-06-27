# Reglas de Negocio

Este documento reúne todas las restricciones, validaciones y comportamientos automáticos del sistema Magastore que afectan la operación diaria.

---

## Reglas de clientes

| # | Regla | Qué pasa si se viola |
|---|---|---|
| R1 | El número de documento (cédula/pasaporte/DIMEX) debe ser único en el sistema | Error al crear: "El número de ID ya existe" |
| R2 | El email debe ser único en el sistema | Error al crear: "El email ya existe" |
| R3 | Todo cliente debe tener al menos una dirección de entrega | No se puede crear el cliente sin al menos una dirección |
| R4 | Solo puede haber una dirección marcada como principal por cliente | El sistema automáticamente asigna la primera dirección como principal si ninguna lo está |
| R5 | Los clientes no se eliminan, solo se desactivan | El botón es "Desactivar", no "Eliminar" |
| R6 | El casillero (código de cliente) es generado automáticamente y no editable | No hay campo de edición para el código |

---

## Reglas de paquetes

| # | Regla | Qué pasa si se viola |
|---|---|---|
| R7 | El peso del paquete debe ser un número **entero** mayor o igual a 1 | El sistema bloquea decimales en el input y aplica un mínimo de 1 |
| R8 | Todo paquete debe tener un cliente asignado | El campo cliente es obligatorio |
| R9 | Todo paquete debe tener un número de tracking | El campo es obligatorio |
| R10 | Un paquete solo puede pertenecer a una consolidación a la vez | No se puede agregar a una segunda consolidación |
| R11 | Los estados del paquete siguen el ciclo: MIAMI → TRANSITO → ADUANA → BODEGA_CR → ENTREGADO | El sistema no impide saltar estados, pero es la secuencia correcta |
| R12 | Las notas internas y la URL de evidencia se sobrescriben en cada actualización | No hay historial de notas — solo se guarda la última |

---

## Reglas de consolidaciones

| # | Regla | Qué pasa si se viola |
|---|---|---|
| R13 | Una consolidación en estado CERRADO, DESPACHADO o ENTREGADO no acepta nuevos paquetes | Error al intentar agregar |
| R14 | El peso total de la consolidación se recalcula automáticamente al agregar paquetes | Automático — no requiere acción del operador |
| R15 | Solo se puede generar una factura por consolidación | Error: "Ya existe una factura para esta consolidación" |
| R16 | Solo se pueden facturar consolidaciones en estado CERRADO, DESPACHADO o ENTREGADO | Error si la consolidación está ABIERTA |
| R17 | No se puede cerrar una consolidación que no tiene paquetes asignados | El botón de cerrar queda deshabilitado si la consolidación está vacía |

---

## Reglas de facturación

| # | Regla | Qué pasa si se viola |
|---|---|---|
| R18 | El peso mínimo cobrable es 1 libra (configurable) | Si el paquete/consolidación pesa menos, se cobra el peso mínimo |
| R19 | Las tarifas se toman del sistema al momento de generar la factura y se guardan en la factura | Las tarifas se "fotografían" — cambios futuros no afectan facturas ya emitidas |
| R20 | Al generar una factura se debe seleccionar un método de entrega (Correos CR / Tracopa / Retiro) | Campo obligatorio al facturar |
| R21 | Una factura marcada como pagada no puede desmarcarse | No hay botón para "desmarcar" un pago |
| R22 | La fecha de pago se registra automáticamente al marcar como pagada | No se puede ingresar una fecha de pago manual |

---

## Reglas de tarifas / configuración

| # | Regla | Qué pasa si se viola |
|---|---|---|
| R23 | Solo existe una fila de configuración de tarifas en el sistema (singleton) | El sistema nunca crea una segunda fila — siempre actualiza la misma |
| R24 | Cada cambio de tarifa se registra en el historial con: campo, valor anterior, valor nuevo, operador y fecha | Automático — no requiere acción del operador |

---

## Reglas de importación masiva

| # | Regla | Qué pasa si se viola |
|---|---|---|
| R25 | Si varias filas del Excel tienen el mismo número de cédula, se agrupan en un solo cliente con múltiples direcciones | Comportamiento correcto — no es error |
| R26 | Si una cédula ya existe en el sistema con diferente nombre o email, se rechaza como conflicto | Error individual para ese cliente; los demás del lote continúan |
| R27 | El import es parcial: un cliente con error no cancela el resto del lote | El sistema reporta los fallidos y continúa con los demás |

---

## Reglas de autenticación

| # | Regla | Qué pasa si se viola |
|---|---|---|
| R28 | Solo usuarios con rol ADMIN pueden acceder al backoffice | Redirección automática al login |
| R29 | La sesión expira después de 12 horas | El usuario debe volver a iniciar sesión |
| R30 | Las contraseñas se almacenan cifradas (bcrypt) | El sistema nunca muestra ni almacena contraseñas en texto plano |

---

## Comportamientos automáticos del sistema

Estos comportamientos ocurren sin intervención del operador:

| Comportamiento | Cuándo ocurre |
|---|---|
| **Generación del casillero** | Al crear un cliente nuevo |
| **Asignación de dirección principal** | Si ninguna dirección se marca como principal, el sistema asigna la primera |
| **Creación del primer evento de rastreo** | Al registrar un paquete (estado MIAMI, tipo INFO) |
| **Creación de evento de seguimiento** | Cada vez que se actualiza el estado de un paquete |
| **Recálculo del peso total** | Cada vez que se agrega un paquete a una consolidación |
| **Registro en historial de tarifas** | Cada vez que se guarda un cambio en la configuración |
| **Registro de fecha de pago** | Cuando se marca una factura como pagada |
| **Truncado de decimales en peso** | Si se intenta ingresar un decimal en el campo de peso, el sistema aplica Math.floor y fuerza mínimo 1 |
