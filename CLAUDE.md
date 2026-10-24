# CLAUDE.md

Índice para Claude Code. El detalle vive en los módulos de abajo; se edita ahí.

@.claude/HANDOFF.md
@.claude/RULES.md

## Qué es esto

**Magastore backoffice**: sistema de un courier que trae paquetes de Panamá a Costa Rica. Maneja
clientes, paquetes, órdenes de envío (flujo de 5 pasos), factura en colones (CRC), cobro,
avisos por WhatsApp y correo, y rastreo público. Lo usa un operador no técnico, sobre todo
desde un iPad. Next 14 con Pages Router y SQL crudo sobre Neon: es un repo legado.

## Las tres reglas que más se rompen

1. **Fechas**: la base está en UTC y el negocio en `America/Costa_Rica`. Convertir antes de
   truncar a día o mes, y usar los helpers de `src/shared/utils/timezone.ts`.
2. **Dinero**: tarifas desde `system_settings` y lo cobrado congelado como snapshot; nunca
   ₡0 en silencio. `sql\`BEGIN\`` sobre Neon HTTP **no** es una transacción.
3. **Todo a `develop`**, sin push ni PR hasta que el usuario lo pida. Producción se migra a mano.

## Comandos

```bash
npm run dev            # :3000
npm run lint           # next lint
npm run build          # next build (también lo hace Vercel)
npx tsc --noEmit       # no hay script typecheck
```

No hay tests. Antes de cada commit: `lint` y `tsc --noEmit` limpios y `HANDOFF.md` al día.
Migraciones: ver `.claude/RULES.md` y `README.md`.

## Documentos a pedido

| Documento | Para qué |
|---|---|
| `.claude/ARCHITECTURE.md` | Stack, carpetas, flujo, auth, dominio, estados, riesgos |
| `.claude/DECISIONS.md` | Por qué se decidió cada cosa (una entrada fechada por decisión) |
| `README.md` | Resumen, variables de entorno y migraciones (paso a producción) |
| `claude-project/*.md` | Base de conocimiento funcional del sistema (13 archivos, 00-indice primero) |
| `.claude/docs/ordenes-step-by-step-plan.md` | Vigente: resumen del flujo de 5 pasos y postventa |
| `.claude/docs/email-setup.md` | Vigente: configuración de Resend |
| `.claude/docs/ordenes-envio-v2-flujo.md` | Cerrado: rediseño paquete-céntrico de órdenes |
| `.claude/docs/orden-envio-detalle-ux-plan.md` | Cerrado: acciones del detalle de orden |
| `.claude/docs/metodos-entrega-configurables-plan.md` | Cerrado: métodos de entrega en tabla |
| `.claude/docs/tarifas-correos-rangos-plan.md` | Cerrado: tarifas de Correos por rango y zona |
| `.claude/docs/customer-code-warehouse-plan.md` | Cerrado: código de cliente por casillero |
| `.claude/docs/billing-v1-plan.md` | Cerrado: facturación por orden (V1) |
| `.claude/docs/auditoria-autoria-plan.md` | Plan parcial: autoría (pagos ya, resto pendiente) |
| `.claude/docs/billing-gap.md`, `billing-rules.md`, `billing-page-assessment.md` | Histórico (junio): análisis previos a V1 |
| `.claude/docs/database-spec.md`, `erd.md` | Histórico (junio): esquema, desactualizado |
