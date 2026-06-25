# Rastreo Público de Paquetes

## ¿Qué es la página de rastreo?

La página de rastreo (`/tracking`) es una **vista pública** — no requiere login — donde los clientes de Magastore pueden consultar el estado de sus paquetes usando el número de tracking del transportista.

Esta página está diseñada para que el cliente final pueda hacerse una idea de dónde está su paquete en cualquier momento, sin necesidad de contactar al operador.

---

## ¿Cómo usa el cliente la página de rastreo?

1. El cliente recibe (por WhatsApp, email, o el medio que use Magastore) su número de tracking
2. Entra a la página de rastreo de Magastore
3. Ingresa el número de tracking en el campo de búsqueda
4. El sistema muestra el estado actual y el historial del paquete

---

## Información que ve el cliente

| Información | Descripción |
|---|---|
| **Estado actual** | En qué etapa está el paquete (MIAMI, TRÁNSITO, ADUANA, BODEGA, ENTREGADO) |
| **Historial de eventos** | Todos los eventos registrados del paquete, ordenados del más reciente al más antiguo |
| **Fecha de cada evento** | Cuándo ocurrió cada movimiento |
| **Ubicación** | Dónde estaba el paquete en cada evento |
| **Descripción del evento** | Detalle de qué pasó en cada punto del recorrido |

---

## Tipos de eventos que puede ver el cliente

| Tipo | Color/Ícono | Cuándo se usa |
|---|---|---|
| **INFO** | Azul / informativo | Actualizaciones normales de estado (llegó a Miami, en tránsito, etc.) |
| **WARNING** | Naranja / advertencia | Situaciones que requieren atención (demora en aduana, información faltante) |
| **DAMAGE** | Rojo / daño | El paquete llegó con daños físicos |
| **CRITICAL** | Rojo oscuro / crítico | Situación grave (paquete perdido, retenido por aduana indefinidamente) |

---

## ¿Qué NO ve el cliente en la página de rastreo?

El cliente **no ve**:
- El precio que se le va a cobrar
- Las notas internas del operador
- El nombre del casillero de otros clientes
- Información de facturación o pagos

---

## ¿Cómo se generan los eventos de rastreo?

Los eventos se crean **automáticamente** por el sistema cada vez que:
1. Se **registra un paquete** (se crea el primer evento con estado MIAMI)
2. Se **actualiza el estado** del paquete

El operador no necesita crear los eventos manualmente — el sistema los genera solo.

---

## Página de rastreo del admin (`/admin/packages`)

Adicionalmente, existe una **versión interna** de búsqueda de paquetes para operadores (`/admin/packages`). Esta versión muestra información más detallada que la pública, incluyendo datos financieros y administrativos del paquete.

Esta pantalla interna está disponible solo para operadores autenticados.

---

## Preguntas frecuentes sobre rastreo

**¿El cliente necesita una cuenta para rastrear su paquete?**
No. La página de rastreo es pública y solo necesita el número de tracking.

**¿Con qué tracking puede rastrear el cliente?**
Con el número de tracking del transportista original (UPS, FedEx, Amazon, etc.) que se ingresó al registrar el paquete en el sistema.

**¿Cuándo puede el cliente ver su paquete en el rastreo?**
Desde el momento en que el operador registra el paquete en el sistema (estado MIAMI). Antes de eso, no aparece.

**¿El cliente puede ver el costo de su importación en el rastreo?**
No. La página pública solo muestra el estado y el historial del paquete, no información de costos.

**¿Qué ve el cliente si ingresa un tracking que no existe?**
El sistema muestra un mensaje indicando que no se encontró ningún paquete con ese número de tracking.

**¿Se actualiza el rastreo en tiempo real?**
Se actualiza cada vez que el operador modifica el estado del paquete en el backoffice.
