# Gestión de Clientes

## ¿Qué es un cliente en Magastore?

Un cliente es una persona física o jurídica que importa mercancía desde Estados Unidos a través de Magastore. Cada cliente tiene un **casillero único** (código de cliente) que lo identifica en el sistema y que se usa como referencia en todas sus importaciones.

---

## Casillero (Código de cliente)

El casillero es un código alfanumérico generado automáticamente al crear el cliente. Tiene el formato:

```
MG-XXXXXX-N
```

Ejemplo: `MG-21642F-13`

- `MG` es el prefijo de Magastore
- `XXXXXX` son 6 caracteres aleatorios en mayúscula
- `N` es un número secuencial

**El cliente usa este código para identificarse** cuando consulta el estado de sus paquetes o cuando se comunica con el operador.

---

## Tipos de identificación

Al registrar un cliente se debe seleccionar el tipo de documento de identidad:

| Tipo | Descripción |
|---|---|
| **FISICA** | Cédula de identidad costarricense (personas físicas) |
| **JURIDICA** | Cédula jurídica (empresas) |
| **DIMEX** | Documento de Identidad Migratoria para Extranjeros |
| **PASAPORTE** | Pasaporte (clientes extranjeros) |

---

## Información que se registra de un cliente

| Campo | Descripción | Requerido |
|---|---|---|
| Tipo de ID | Ver tabla anterior | Sí |
| Número de ID | Número del documento de identidad (único en el sistema) | Sí |
| Nombre | Primer nombre | Sí |
| Apellido | Apellido(s) | Sí |
| Email | Correo electrónico (único en el sistema) | Sí |
| Teléfono | Número de contacto | Sí |
| Nivel de lealtad | Regular / VIP / Diamond | Sí (por defecto: Regular) |
| Estado | Activo / Inactivo | Sí (por defecto: Activo) |
| Dirección(es) | Al menos una dirección de entrega en Costa Rica | Sí |

---

## Direcciones del cliente

Cada cliente puede tener **una o más direcciones** de entrega. La información de cada dirección incluye:

| Campo | Descripción |
|---|---|
| Provincia | Provincia de Costa Rica |
| Cantón | Cantón dentro de la provincia |
| Distrito | Distrito dentro del cantón |
| Dirección exacta | Descripción detallada de la ubicación |
| Etiqueta | Nombre descriptivo (ej: "Casa", "Oficina") — por defecto: "Casa" |
| Principal | Si es la dirección predeterminada para entregas |

**Regla:** Cada cliente debe tener al menos una dirección marcada como principal (`is_default`). Si se crea el cliente sin marcar ninguna como principal, el sistema asigna automáticamente la primera dirección como principal.

---

## Restricciones y validaciones

- El número de ID (`id_card`) debe ser **único** en el sistema. No se pueden registrar dos clientes con el mismo documento.
- El email debe ser **único** en el sistema.
- El casillero se genera automáticamente y **no se puede editar**.
- Un cliente **no se puede eliminar**, solo desactivar (`is_active = false`).

---

## Importación masiva desde Excel

El sistema permite importar múltiples clientes a la vez desde un archivo Excel (`.xlsx`).

### Cómo funciona

1. Ir a **Clientes** (`/admin/customers`)
2. Hacer clic en **"Descargar Template"** para obtener el archivo Excel con el formato correcto
3. Llenar el archivo con los datos de los clientes
4. Hacer clic en **"Importar Clientes"** y subir el archivo completado

### Estructura del Excel

| Columna | Descripción | Obligatorio |
|---|---|---|
| `cedula` | Número de documento de identidad | Sí |
| `tipo_identificacion` | FISICA / JURIDICA / DIMEX / PASAPORTE | Sí |
| `nombre` | Primer nombre | Sí |
| `apellidos` | Apellidos | Sí |
| `email` | Correo electrónico | Sí |
| `telefono` | Teléfono de contacto | Sí |
| `codigo_magastore` | Casillero existente (dejar vacío para generar uno nuevo) | No |
| `provincia` | Provincia de la dirección | Sí |
| `canton` | Cantón de la dirección | Sí |
| `distrito` | Distrito de la dirección | Sí |
| `direccion_exacta` | Dirección completa | Sí |
| `etiqueta` | Nombre de la dirección (ej: "Casa") | Sí |
| `es_principal` | "Si" o "No" — si es la dirección principal | Sí |

### Comportamiento del import

- **Múltiples filas del mismo cliente:** Si varias filas tienen el mismo número de cédula, el sistema las agrupa en un solo cliente con múltiples direcciones.
- **Casillero opcional:** Si la columna `codigo_magastore` viene vacía, el sistema genera uno nuevo automáticamente. Si viene con un valor, lo usa tal cual.
- **Import parcial:** Si un cliente falla (datos inválidos, cédula duplicada con conflicto), los demás se importan igualmente. El sistema reporta cuáles fallaron y por qué.
- **Conflicto de datos:** Si se intenta importar un cliente con una cédula que ya existe pero con diferente nombre o email, el sistema lo rechaza como error.

---

## Pantallas disponibles

| Pantalla | Qué permite hacer |
|---|---|
| **Lista de clientes** (`/admin/customers`) | Ver todos los clientes, buscar por nombre/código/ID, importar desde Excel, descargar template |
| **Crear cliente** (`/admin/customers/create`) | Registrar un nuevo cliente con su información y al menos una dirección |
| **Detalle de cliente** (`/admin/customers/[id]`) | Ver toda la información del cliente, sus direcciones y sus paquetes |

---

## Preguntas frecuentes sobre clientes

**¿Puedo cambiar el casillero de un cliente?**
No. El casillero se genera automáticamente al crear el cliente y no puede modificarse.

**¿Qué pasa si registro dos veces el mismo número de cédula?**
El sistema rechaza el registro con un error indicando que el número de ID ya existe.

**¿Puedo tener un cliente sin dirección?**
No. El sistema requiere al menos una dirección al crear el cliente.

**¿Cómo desactivo un cliente?**
Desde la pantalla de detalle o edición del cliente, se cambia el estado a "Inactivo".

**¿Los paquetes de un cliente inactivo siguen apareciendo?**
Sí. Desactivar un cliente no elimina ni oculta sus paquetes existentes.

**¿Puedo importar un cliente que ya existe en el sistema?**
Si la cédula ya existe con los mismos datos (mismo nombre y email), el sistema puede actualizar sus direcciones. Si la cédula existe con datos distintos (nombre o email diferente), se rechaza como error de conflicto.
