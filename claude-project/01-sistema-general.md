# Sistema Magastore — Visión General

## ¿Qué es Magastore?

Magastore es un sistema de gestión logística para una empresa de courier que importa paquetes desde Miami, Estados Unidos, hacia Costa Rica. Los operadores administran el recorrido completo de cada paquete: desde que llega al depósito en Miami hasta que se entrega al cliente en Costa Rica.

El sistema tiene dos partes:
- **Backoffice (admin):** Pantallas internas donde los operadores registran paquetes, gestionan clientes, consolidan envíos y generan cobros.
- **Página pública de rastreo:** Donde los clientes finales pueden consultar el estado de su paquete con su número de tracking.

---

## ¿Quiénes usan el sistema?

**Operadores (rol ADMIN):** Personal interno de Magastore. Tienen acceso completo al backoffice. Registran paquetes, actualizan estados, crean consolidaciones y gestionan cobros.

**Clientes:** Importadores que envían mercancía desde Estados Unidos. No tienen cuenta en el sistema; solo pueden consultar el estado de su paquete en la página pública de rastreo usando su número de tracking.

---

## Flujo general de una importación

```
1. Cliente compra en tienda online de EEUU
       ↓
2. El paquete llega al depósito en Miami
       ↓
3. Operador REGISTRA el paquete en el sistema (status: MIAMI)
       ↓
4. Paquete sale en vuelo/barco hacia Costa Rica (status: TRANSITO)
       ↓
5. Paquete llega a Aduana de Costa Rica (status: ADUANA)
       ↓
6. Paquete pasa aduana y llega a la bodega de Magastore en CR (status: BODEGA_CR)
       ↓
7. Operador consolida paquetes del mismo cliente (opcional)
       ↓
8. Se genera la factura (cobro por peso)
       ↓
9. Cliente paga y paquete se entrega (status: ENTREGADO)
```

---

## Módulos del sistema

| Módulo | Descripción |
|---|---|
| **Clientes** | Registro y gestión de clientes importadores. Cada cliente tiene un casillero único (ej: MG-ABCD12-5) |
| **Logística / Paquetes** | Registro de paquetes, actualización de estados, seguimiento de tracking |
| **Consolidaciones** | Agrupación de múltiples paquetes de un mismo cliente en un solo envío para facturación conjunta |
| **Cobros / Facturación** | Generación de facturas por peso, registro de pagos |
| **Configuración** | Tarifas del servicio: precio por libra, tipo de cambio, cargo fijo, peso mínimo |
| **Rastreo público** | Página que el cliente consulta con su número de tracking para ver en qué estado está su paquete |

---

## Monedas utilizadas

El sistema opera en dos monedas:
- **USD (dólares americanos):** Se usa para la tarifa por libra (precio_por_libra).
- **CRC (colones costarricenses):** Las facturas se emiten en colones. La conversión usa el tipo de cambio configurado en el sistema.

---

## URL del sistema

- Backoffice admin: acceso protegido con usuario y contraseña
- Rastreo público: disponible para todos los clientes sin login
