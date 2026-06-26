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

## Estado MVP — ~82% completo

### Pendiente

| Etapa | Descripcion | Prioridad |
|---|---|---|
| 19 | Package Detail: guardar peso real desde UI | Alta |
| 20 | Package Detail: cambio de estado inline + bitacora funcional | Alta |
| 21 | Package Detail: panel financiero real vs estimado | Media |
| 16 | Billing: direccion entrega en factura + pagina reportes | Media |
| 17 | State machine en status de paquetes | Baja |
| 18 | Rate limiting en login | Antes de produccion publica |

### Lo que funciona
Auth · Clientes (CRUD completo) · Paquetes (registro, status) · Consolidaciones (ciclo completo) · Facturacion (generar, PDF, marcar pagado) · Dashboard real · Tracking publico · Notificaciones email · Multi-rol ADMIN/OPERADOR · Toast notifications

### Lo que esta roto o incompleto
- Detalle de paquete: editar peso no guarda, sin cambio de estado real en UI, panel financiero siempre muestra estimado
- `/admin/logistics/edit/[id]`: 100% mock, auth comentada
- `/admin/packages`: mock con setTimeout
- `/admin/billing/reports`: ruta definida, pagina no existe

### Migraciones SQL ejecutadas en Neon
Scripts 001–004 ejecutados el 2026-06-25. Script 005 (trigger package_events) pendiente de verificar.
