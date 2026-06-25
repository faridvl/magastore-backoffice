# Glosario de Términos

Definición de los términos técnicos y de negocio usados en el sistema Magastore.

---

## Términos de negocio

| Término | Definición |
|---|---|
| **Casillero** | Código único asignado a cada cliente de Magastore. Formato: `MG-XXXXXX-N`. Es la referencia principal del cliente. |
| **Importación** | El proceso de traer mercancía comprada en el exterior (típicamente EEUU) hacia Costa Rica a través de Magastore. |
| **Tracking / Número de rastreo** | Código alfanumérico del transportista (UPS, FedEx, Amazon, etc.) que identifica un paquete específico. |
| **Consolidación** | Agrupación de varios paquetes de un mismo cliente para efectos de un solo envío y una sola factura. |
| **Flete** | Costo del transporte calculado por peso. |
| **Cargo fijo** | Monto fijo en colones que se cobra en cada factura, independientemente del peso. |
| **Peso mínimo cobrable** | El peso mínimo que se cobra aunque el paquete pese menos. Actualmente: 1 libra. |
| **Tipo de cambio** | Cuántos colones (CRC) equivale un dólar (USD). Configurable en el sistema. |

---

## Estados de paquetes

| Estado | Significado en español simple |
|---|---|
| **MIAMI** | El paquete llegó al depósito en Miami y está siendo procesado |
| **TRANSITO** | El paquete está viajando hacia Costa Rica |
| **ADUANA** | El paquete llegó a CR y está siendo revisado por aduana |
| **BODEGA_CR** | El paquete pasó aduana y está guardado en la bodega de Magastore CR |
| **ENTREGADO** | El cliente ya recibió su paquete |

---

## Estados de consolidaciones

| Estado | Significado |
|---|---|
| **ABIERTO** | La consolidación está activa y puede recibir más paquetes |
| **CERRADO** | Lista para facturar, no acepta más paquetes |
| **DESPACHADO** | En proceso de entrega al cliente |
| **ENTREGADO** | Todos los paquetes fueron entregados |

---

## Tipos de envío

| Tipo | Significado |
|---|---|
| **Aéreo** | Transporte en avión — más rápido |
| **Marítimo** | Transporte en barco — más lento y económico |

---

## Tipos de eventos de rastreo

| Tipo | Color | Uso |
|---|---|---|
| **INFO** | Azul | Actualizaciones normales del recorrido |
| **WARNING** | Naranja | Demoras, documentos faltantes, situaciones que requieren atención |
| **DAMAGE** | Rojo | Daños físicos en el paquete |
| **CRITICAL** | Rojo oscuro | Situaciones graves: paquete perdido, retenido indefinidamente |

---

## Tipos de identificación de clientes

| Tipo | Descripción |
|---|---|
| **FISICA** | Cédula de identidad costarricense |
| **JURIDICA** | Cédula jurídica de empresa |
| **DIMEX** | Documento de Identidad Migratoria para Extranjeros |
| **PASAPORTE** | Pasaporte (clientes extranjeros) |

---

## Términos técnicos

| Término | Definición |
|---|---|
| **Snapshot de tarifas** | Copia de las tarifas vigentes que se guarda en cada factura al momento de generarla. Garantiza que facturas pasadas no cambien si las tarifas se actualizan. |
| **Singleton de configuración** | El sistema tiene exactamente una fila de configuración de tarifas. No puede haber más de una. |
| **Historial de tarifas** | Registro inmutable de todos los cambios de tarifas, con fecha, operador y valores anterior/nuevo. |
| **Backoffice** | El sistema de administración interno de Magastore, accesible solo para operadores. |
| **CRC** | Colón Costarricense — moneda de Costa Rica. Símbolo: ₡ |
| **USD** | Dólar Americano — moneda de Estados Unidos. Símbolo: $ |

---

## Acrónimos usados en el sistema

| Acrónimo | Significado |
|---|---|
| **MG** | Magastore (prefijo del casillero) |
| **CR** | Costa Rica |
| **PTY** | Panamá (usado en algunas referencias de rutas de tránsito) |
| **FL** | Florida (donde está el depósito en Miami) |
| **ADMIN** | Rol de administrador — único rol disponible actualmente |
