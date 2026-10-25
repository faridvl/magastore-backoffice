# RULES.md

Reglas duras de este repo. Las genéricas (sin `any`, container + hook, debounce, `staleTime`,
toasts) están en las skills `estandares-*`; aquí va lo específico y dónde este legado se aparta.
Si chocan, manda este archivo. El código existente no es regla: si difiere y no está aquí, se pregunta.

## Fechas: la base está en UTC, el negocio en `America/Costa_Rica`

- Las columnas son `timestamptz`: el instante se guarda bien. El error siempre está en la
  **lectura** que reduce un instante a día o mes. Nunca reescribir un `paid_at` a hora local.
- SQL: convertir antes de truncar, castear o comparar con un día:
  `date_trunc('month', paid_at AT TIME ZONE 'America/Costa_Rica')`. Aplica a `date_trunc`,
  `::date`, `TO_CHAR` y `CURRENT_DATE`.
- La zona va como **literal**, no como parámetro (Postgres rechaza el `GROUP BY`, error 42803).
- TypeScript: helpers de `src/shared/utils/timezone.ts` (`formatBusinessDate`,
  `formatBusinessDateTime`, `monthLabelEs`, `currentMonthKey`). Todo `toLocaleDateString` de
  fecha lleva `timeZone`; "este mes" sale de `currentMonthKey()`, no de `new Date()`.

## Dinero

- Tarifas y tipo de cambio salen de `system_settings` (fila única, id fijo, solo `UPDATE`,
  `settings.repo.ts`); el costo del courier sale de cada paquete y la entrega de `delivery_rates`.
  No agregar constantes de precio nuevas. Cada cambio en `system_settings` se registra en
  `settings_history` con valor anterior, nuevo y operador.
- Lo cobrado se congela como snapshot (`pre_billing`, `billing`: `applied_*`,
  `total_weight_charged`, dirección). Una factura vieja no puede cambiar con una tarifa nueva.
- Si falta un costo o tarifa, se bloquea con mensaje al operador; nunca ₡0 en silencio.

## SQL y datos

- SQL crudo con `sql` de `src/lib/db.ts` (Neon HTTP, tagged template). Valores siempre como
  `${param}`; nada de concatenar strings. Columnas explícitas, sin N+1 (`json_agg`).
- **`sql\`BEGIN\``/`COMMIT` no es una transacción**: sobre HTTP cada sentencia es una conexión
  distinta y el `ROLLBACK` no revierte nada. Para código nuevo: una sola sentencia con CTE
  (como `finalizeOrder`) o `sql.transaction([...])`. No agregar más `BEGIN`.

## Capas (Pages Router, sin ORM)

- `pages/api/*` (handler: método → 405, token → 401, delega) → `*.service.ts` (reglas,
  validación) → `*.repo.ts` (SQL). Respuesta `{ data }` o `{ message }`. Copiar un handler
  vecino; no hay `withErrorHandling` ni `AppError`: los services lanzan `Error` con mensaje en
  español. Algunos handlers deducen el status buscando palabras en el mensaje: no extenderlo.
- Handler de mutación: usar `getActor` (`src/shared/api/get-actor.ts`), que verifica el JWT y
  entrega quién actúa. Casi todos los demás solo comprueban que la cookie exista.
- Validar con `isUuid` los uuid que llegan del cliente.
- Endpoint nuevo: repo → service → handler → hook en `querys/` o `mutations/` (con
  `ApiServiceClient`); las claves de React Query incluyen filtros y paginación.
- Sin refactors oportunistas: lo que se ve de paso se anota, no se arregla.
- Formularios: react-hook-form + `yupResolver` (no hay zod).

## Dónde este repo no sigue los estándares

- **i18n**: `es.json`/`TEXT` quedaron de otra app y nadie los usa. Los textos van en el JSX, en
  español con tildes. No inventar keys sueltas.
- **Tipos**: hay 166 `any` en 75 archivos. No sumar más; tipar lo que se toque.
- **Teléfonos**: se guardan como `+506 XXXX-XXXX` (`customer-masks.ts`), no solo dígitos; no mezclar.
- **Colores**: Tailwind 3 con la paleta de `tailwind.config.js` (`primary`, `neutral`, `success`,
  `danger`...). Sin `@theme` ni `tokens.ts`. Hay hex sueltos viejos; no sumar más.
- **Textos al operador**: tuteo, sin términos internos (`consolidación`, `snapshot`): en pantalla
  es "orden de envío". Una acción principal por paso; iPad primero.

## Migraciones

- `scripts/NNN-descripcion.sql`, numeración seguida, idempotentes
  (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`). Nunca editar una ya aplicada.
- Dev: `dbmigrate up "[DEV] MAGASTORE"`; confirmar la base antes.
- Producción: un push a `main` solo muestra el plan; aplicar es manual desde Actions, con
  `confirmar` igual a lo que indica el resumen del plan (environment `db-production`; detalle en
  `README.md`, "Migraciones SQL"). Nunca desde la terminal. Entre el deploy de Vercel y la
  migración fallan órdenes, estimados, facturas y pagos: mergear a `main` fuera del horario
  del operador y aplicar de inmediato.

## Ramas y commits

- Todo a `develop`. Sin push ni PR hasta que el usuario lo pida; `main` es producción.
- Antes de commit: lint, `tsc`, `HANDOFF.md`.
