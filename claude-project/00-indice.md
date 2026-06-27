# Magastore — Base de Conocimiento del Sistema

Este directorio contiene la documentación funcional completa del sistema Magastore Backoffice.
Está diseñada para ser subida a un Project de Claude.ai y poder responder preguntas sobre
cómo funciona el sistema, sus reglas, sus pantallas y sus flujos de operación.

---

## Documentos disponibles

| Archivo | Contenido |
|---|---|
| `01-sistema-general.md` | Qué es Magastore, para qué sirve, quiénes lo usan, flujo general |
| `02-gestion-clientes.md` | Clientes: casillero, tipos de ID, direcciones, import masivo, restricciones |
| `03-gestion-paquetes.md` | Paquetes: registro, estados, tipos de envío, historial, restricciones de peso |
| `04-consolidaciones.md` | Consolidaciones: agrupación de paquetes, estados, UI de gestión |
| `05-facturacion-cobros.md` | Fórmula de cobro, método de entrega, proceso de facturación, estados de pago |
| `06-configuracion-tarifas.md` | Tarifas configurables (flete y entrega local), historial de cambios, impacto |
| `07-rastreo-publico.md` | Página de rastreo para clientes, eventos, tipos |
| `08-reglas-de-negocio.md` | Todas las reglas, validaciones y comportamientos automáticos |
| `09-pantallas-guia.md` | Descripción de cada pantalla: qué muestra y qué permite hacer |
| `10-escenarios-operacion.md` | Flujos paso a paso de las operaciones más comunes |
| `11-preguntas-frecuentes.md` | FAQ: respuestas a las preguntas más comunes |
| `12-glosario.md` | Glosario de términos y acrónimos del sistema |

---

## Tarifas vigentes (a 2026-06-26)

### Flete internacional

| Tarifa | Valor |
|---|---|
| Precio por libra | $6.00 USD |
| Tipo de cambio | ₡480 por dólar |
| Ganancia por libra | $2.00 USD (solo reporting interno) |
| Peso mínimo cobrable | 1 libra (entero) |

**Fórmula:**
`Total CRC = (MÁXIMO(peso, 1 lb) × $6.00 × ₡480) + tarifa de entrega`

### Entrega local en Costa Rica

| Método | Tarifa fija |
|---|---|
| Correos de Costa Rica | ₡2,900 CRC |
| Tracopa / Encomienda | ₡2,500 CRC |
| Retiro en bodega | ₡0 |

---

## Cómo usar este Project en Claude

Puedes preguntarle a Claude cosas como:
- "¿Cómo registro un paquete nuevo?"
- "¿Cuánto le costaría a un cliente un paquete de 4 libras con envío por Correos?"
- "¿Qué estados puede tener un paquete?"
- "¿Cómo genero una factura?"
- "¿Qué información necesito para crear un cliente?"
- "¿Cómo importo clientes desde Excel?"
- "¿Cómo creo una consolidación?"
- "¿Qué ve el cliente cuando rastrea su paquete?"
- "¿Qué pasa si un paquete llega dañado?"
- "¿Cuándo debo actualizar el tipo de cambio?"
