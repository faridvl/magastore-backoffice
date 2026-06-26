# Magastore Backoffice

Backoffice de courier — importaciones Miami → Costa Rica. Registro de paquetes, consolidaciones, facturacion en CRC, tracking para el cliente.

**Stack:** Next.js 14 (Pages Router) · TypeScript strict · Neon PostgreSQL · React Query · Tailwind · JWT · Resend · sonner

---

## Instalacion

```bash
npm install
npm run dev   # localhost:3000
```

`.env.local` requerido:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
MAGASTORE_DB_POSTGRES_URL=postgresql://...
JWT_SECRET=your-secret-key
RESEND_API_KEY=...
EMAIL_FROM=notificaciones@tudominio.com
```

Ver [`CLAUDE.md`](CLAUDE.md) para arquitectura y convenciones.

---

## Estado MVP — ~95% completo

### Completado

| Etapa | Descripcion |
|---|---|
| 16 | Billing: direccion entrega snapshot en factura + pagina de reportes mensuales |
| 18 | Rate limiting en login (5 intentos / 1 min por IP, sin dependencias externas) |
| 19 | Package Detail: guardar peso real desde UI |
| 20 | Package Detail: cambio de estado inline + bitacora funcional |
| 21 | Package Detail: panel financiero real vs estimado |

### Descartado

| Etapa | Descripcion | Razon |
|---|---|---|
| 17 | State machine en status de paquetes | Flujo opcional; no se bloquean transiciones |

### Pendiente

Ninguna etapa pendiente — MVP completo.

### Lo que funciona
Auth · Clientes (CRUD completo) · Paquetes (registro, status, cambio de estado inline con bitacora) · Consolidaciones (ciclo completo) · Facturacion (generar con snapshot de tarifas y direccion, PDF, marcar pagado) · Reportes mensuales · Dashboard real · Tracking publico · Notificaciones email · Multi-rol ADMIN/OPERADOR · Toast notifications

### Lo que esta roto o incompleto
- `/admin/packages`: mock con setTimeout

### Migraciones SQL ejecutadas en Neon
Scripts 001–006 ejecutados.
