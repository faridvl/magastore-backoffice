# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev       # Start Next.js dev server (localhost:3000)
npm run lint      # Run ESLint (next/core-web-vitals)
next build        # Production build (no script alias)
```

No test suite is configured.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
MAGASTORE_DB_POSTGRES_URL=postgresql://...
JWT_SECRET=your-secret-key
```

`src/shared/api/config.ts` exposes `env.API.BASE_URL` — all API client calls go through that.

---

## Required Workflow

Before making any change, follow these steps in order:

1. **Read all related files** — never act on a single file. Trace the full vertical slice: types → service → repository → API handler → hook → container.
2. **Understand the execution flow** — map the request path from UI event to database query and back.
3. **Search for existing implementations** — find at least one similar feature already built in the codebase and use it as the reference pattern.
4. **Analyze impact** — identify which other components, cache keys, types, or SQL queries would be affected by the change.
5. **Present a plan** — explain what you will change and why before writing any code. Wait for confirmation on non-trivial tasks.
6. **Implement** — make only the changes the plan describes.

Do not implement after reading a single file. Do not infer the full picture from one layer.

---

## Task Execution Protocol

For any non-trivial task (new endpoint, schema change, new feature, refactor):

1. **Analyze** — read the relevant files and map the current behavior.
2. **Report findings** — summarize what exists, what's missing, and what constraints apply.
3. **Present a plan** — list the specific files to change and what changes each requires.
4. **Implement** — execute the plan, file by file.
5. **Validate** — confirm types compile, lint passes, and the change is consistent with the surrounding code.
6. **Summarize** — state what changed and flag anything the developer should verify manually.

Do not jump directly to step 4.

---

## Architecture

This is a **Next.js 14 backoffice** using the Pages Router (not App Router). TypeScript strict mode is on. Path alias `@/*` maps to `src/*`.

### Request flow

```
Page (SSR auth) → Container → Custom Hook → React Query → Next.js API route → Service → Repository → Neon SQL
```

**Pages** (`src/pages/admin/`) are thin shells: they apply `authorizeServerSidePage()` in `getServerSideProps`, render `DashboardLayout`, and mount a single container component. No business logic belongs here.

**Containers** (`src/components/containers/`) are the smart components. They consume a custom hook and render common UI components. One container per feature page.

**Custom hooks** (`use-*.ts` co-located with containers) own all local state (pagination, search, filters) and call React Query hooks. They return a clean object — no raw query results leak out.

**React Query hooks** live in `src/shared/api/querys/` (GET) and `src/shared/api/mutations/` (POST/PUT/PATCH). They wrap `useApiQuery` / `useApiMutation` from the same directory and call `ApiServiceClient` which handles Bearer token injection from cookies automatically.

**Services** (`src/shared/api/services/`) contain business rules, input validation, and data transformation. **Repositories** (`src/shared/api/repositories/`) contain raw SQL against Neon using the template-literal `sql` client from `src/lib/db.ts`. Complex DB operations use manual `BEGIN`/`COMMIT`/`ROLLBACK`.

### Authentication

`src/hocs/auth.tsx` exports two HOCs:
- `authorizeServerSidePage(callback?, options?)` — redirects to `/login` if no token, redirects non-admins away from `adminOnly` routes.
- `unauthorizeServerSidePage()` — redirects already-authenticated users away from login.

Tokens are stored in cookies via `CookiesManager` (`src/shared/utils/cookies-manager.ts`). The API client reads `SESSION_ACCESS_TOKEN` automatically on every request.

### Styling

Tailwind-only. No CSS modules. Use the `tailwind()` utility from `src/utils/tailwind-utils.ts` (wraps `clsx` + `twMerge`) to compose conditional class strings. Common components use variant enums (e.g., `ButtonVariant`, `TypographyVariant`) to map props to Tailwind class sets.

---

## Key Conventions

**File naming:** `use-*.ts` hooks, `*.service.ts` services, `*.repo.ts` repositories, `*.types.ts` types, `*-container.tsx` containers.

**New API endpoint checklist:**
1. Repository method in `src/shared/api/repositories/[domain].repo.ts`
2. Service method in `src/shared/api/services/[domain].service.ts`
3. Next.js handler in `src/pages/api/[domain]/[route].ts` (validate method, extract token, delegate to service)
4. React Query hook in `src/shared/api/querys/` or `mutations/`

**React Query cache keys** must include all filter/pagination params so invalidation works correctly. Use `placeholderData: (prev) => prev` on paginated queries to prevent flicker.

**Search inputs** are debounced at 400ms (useEffect + setTimeout pattern) and reset pagination to page 1 on change — see `src/components/containers/logistics/use-logistics.tsx` as reference.

**Error handling:** throw in repositories, catch + re-throw with context in services, catch in API handlers and return appropriate HTTP status.

---

## Refactoring Rules

- Do not perform opportunistic refactors. If the task is "add a field to the form", change only the form. Do not rename variables, extract helpers, or reorganize code in files you happen to touch.
- Do not rename files, move folders, or reorganize the directory structure unless explicitly requested.
- Do not change code outside the minimum set of files required for the task.
- If you notice a problem in a file you are editing, note it in your summary but do not fix it unless asked.

---

## Database Rules

- Read the existing repository file for the relevant domain before writing any new query. Reuse existing patterns for pagination, filters, and joins.
- Extend existing repository functions when the change is additive. Create a new function only when the query is structurally different.
- Never use `SELECT *`. List columns explicitly.
- Avoid N+1 queries. Use JOINs or `json_agg` for related data (see `logistics.repo.ts` for the pattern).
- Do not remove WHERE filters or LIMIT clauses without understanding their purpose. Most filters exist to prevent full table scans or to enforce business rules.
- Preserve existing business constraints in SQL: minimum weight, unique customer codes, foreign key relationships.
- Operations that touch more than one table must use explicit transactions (`BEGIN` / `COMMIT` / `ROLLBACK`) — see `consolidatePackages` in `logistics.repo.ts` as reference.
- Review the `settings_history` pattern before modifying `system_settings` — rate changes must be logged with old/new values and operator name.

---

## API Rules

- Before creating a new API handler, read at least two existing handlers in `src/pages/api/` to understand the method validation, token extraction, and error response patterns.
- Every handler must validate the HTTP method and return 405 for unhandled methods.
- Every protected handler must extract the token via `CookiesManager.getAccessToken({ req, res })` and return 401 if absent.
- Delegate all logic to the service layer. Handlers must not contain SQL or business rules.
- Return consistent JSON shapes: `{ data }` for success, `{ message }` for errors.
- Match the error status codes already in use: 400 validation, 401 auth, 404 not found, 500 server error.

---

## TypeScript Rules

- Do not introduce `any`. If a type is unknown, define an interface or use `unknown` with a type guard.
- Do not use `@ts-ignore` or `@ts-expect-error`.
- Prefer explicit interfaces over inline object types for anything shared across files.
- Reuse existing types from `src/types/` before defining new ones. Check for an existing `PaginatedResponse<T>`, `PackageStatus`, `IdType`, etc.
- Keep all code compatible with TypeScript strict mode (`strict: true` is enforced in `tsconfig.json`).

---

## Performance Rules

- Use `React.memo` only on components with expensive renders. The `Typography` component is already memoized — do not memo every component by default.
- Avoid triggering React Query refetches by keeping query keys stable. Do not create objects or arrays inline inside `queryKey` arrays; derive them from stable state variables.
- Use `placeholderData: (previousData) => previousData` on all paginated queries to prevent content flash between pages.
- Preserve the 400ms debounce on search inputs. Do not reduce it.
- Do not duplicate API requests. If the same data is already fetched by a parent hook, pass it down rather than issuing a second query.
- staleTime for most queries is 5 minutes (`1000 * 60 * 5`). Use the same value for consistency unless there is a specific reason for a shorter window.

---

## Domain Knowledge

This is a **package import and logistics backoffice** for a courier service operating in Costa Rica. Operators manage incoming packages from Miami, track their transit through customs and warehousing, consolidate shipments, and generate invoices for customers.

### Main Entities

| Entity | Table | Key Fields | Source |
|---|---|---|---|
| Package | `packages` | `uuid`, `tracking_number`, `weight_lb`, `status`, `consolidation_id`, `customer_id`, `package_type`, `internal_notes`, `evidence_url` | `types/logistics/logistics.types.ts` `Package` |
| Customer | `customers` | `id` (UUID string), `id_card`, `id_type`, `customer_code`, `is_active` | `types/customer/customer.types.ts` `Customer` |
| Customer Address | `customer_addresses` | `customer_id`, `province`, `canton`, `district`, `exact_address`, `address_label`, `is_default` | `types/customer/customer.types.ts` `CustomerAddress`; SQL in `customers.repo.ts` |
| Consolidation | `consolidations` | `uuid`, `customer_id`, `total_weight_lb`, `status` | `types/logistics/logistics.types.ts` `Consolidation` |
| Billing | `billing` | `uuid`, `package_id`, `consolidation_id`, `applied_rate_usd`, `applied_exchange`, `applied_fee_crc`, `total_weight_charged`, `total_amount_crc`, `is_paid`, `paid_at` | `types/logistics/logistics.types.ts` `Billing` |
| Package Event | `package_events` | `package_id`, `status`, `event_type`, `description`, `location` | `types/logistics/logistics.types.ts` `PackageEvent` |
| System Settings | `system_settings` | `price_per_lb`, `exchange_rate`, `profit_per_lb`, `min_weight` | `types/settings/settings.types.ts` `SystemSettings` |
| Settings History | `settings_history` | `parameter_name`, `old_value`, `new_value`, `changed_by_name`, `changed_at` | `types/settings/settings.types.ts` `SettingsHistory` |

**Note on `package_events`:** The only reference to this table in the entire `src/` codebase is a `SELECT` inside `getTrackingHistory` (`logistics.repo.ts:39-43`). There is no `INSERT` into `package_events` in any source file. How this table gets populated is not implemented in the current code.

### Package Status Lifecycle

```
MIAMI → TRANSITO → ADUANA → BODEGA_CR → ENTREGADO
```

Defined in `PackageStatus` enum — `types/logistics/logistics.types.ts:1-7`. No state machine is enforced: `updatePackageStatus` in `logistics.repo.ts:190-208` performs a direct `UPDATE` with no transition check; any value can be set regardless of current state. When status is set to `ENTREGADO`, `logistics.service.ts:152-154` executes a `console.log` — this is a stub with no real notification delivery.

### Consolidation Status Lifecycle

```
ABIERTO → CERRADO → DESPACHADO → ENTREGADO
```

Defined in `ConsolidationStatus` enum — `types/logistics/logistics.types.ts:9-14`. `total_weight_lb` is recalculated as `SUM(weight_lb)` of all packages with that `consolidation_id` on every consolidation operation (`logistics.repo.ts:111-117`). Linking packages and updating the weight run inside a single `BEGIN`/`COMMIT`/`ROLLBACK` block (`logistics.repo.ts:100-124`). Neither the service nor the repository validates that all grouped packages share the same `customer_id`.

### Billing Calculation

```
chargedWeight  = MAX(actual_weight_lb, min_weight)
totalCRC       = (chargedWeight × price_per_lb × exchange_rate) + fixed_fee_crc
```

`generateBilling` in `logistics.repo.ts:134` uses **hardcoded constants**: `{ price_lb: 4.5, exchange: 525, fee: 1500, min_lb: 1 }`. These constants are not read from `system_settings`. The `billing` row stores snapshots of the applied values (`applied_rate_usd`, `applied_exchange`, `applied_fee_crc`, `total_weight_charged`), making past invoices stable against future constant changes.

`use-package-calculator.ts` reads live `system_settings` via `useSettingsQuery` to compute the cost preview shown to the operator. This preview and the actual billing generation use **different rate sources** and may show different amounts if the hardcoded constants in `logistics.repo.ts` diverge from `system_settings`.

### Business Rules (confirmed in service/repo code)

- `weight_lb` must be `> 0` — enforced in `logistics.service.ts:73`.
- Every customer must have at least one address. If none is marked `is_default`, the service sets the first one as default — `customers.service.ts:13-19`.
- `id_card` and `email` uniqueness is checked via `checkExistingCustomer` before any INSERT — `customers.service.ts:22-27`.
- `customer_code` is generated at INSERT time: `'MG-' || UPPER(SUBSTRING(uuid_generate_v4()::text FROM 31)) || '-' || nextval(serial_sequence)` — `customers.repo.ts:43`.
- `system_settings` is a singleton: fixed UUID `00000000-0000-0000-0000-000000000000`, all access uses `UPDATE`, never `INSERT` — `settings.repo.ts:3,22-34`.
- Every field change in `system_settings` is compared against the previous value and, if different, logged to `settings_history` with old value, new value, and operator name — `settings.service.ts:10-24`.

### Customer ID Types

`IdType` union type: `'FISICA' | 'JURIDICA' | 'DIMEX' | 'PASAPORTE'` — `types/customer/customer.types.ts:1`. The value is stored as-is. No format or length validation per type exists in any service or repository file.

### Auth

JWT tokens expire in `12h` — `auth.service.ts:20`. The fallback secret is the hardcoded string `'clave_secreta_por_defecto'` when `JWT_SECRET` is absent — `auth.service.ts:19`. `UserRole` enum has one value: `ADMIN` — `types/auth/auth.ts:1-3`.

### Critical Flows (High Risk of Regression)

| Flow | Entry Files | Risk |
|---|---|---|
| Package registration | `use-package-calculator.ts`, `logistics.service.ts:registerIncomingPackage`, `logistics.repo.ts:createPackage` | Preview uses live `system_settings`; actual invoice uses hardcoded constants — amounts can differ |
| Generate invoice | `logistics.service.ts:createInvoice`, `logistics.repo.ts:generateBilling` | Transactional; changing `RATES` constant at `logistics.repo.ts:134` changes all future invoice amounts |
| Consolidate packages | `logistics.service.ts:processConsolidation`, `logistics.repo.ts:consolidatePackages` | Transactional — a mid-transaction failure leaves `packages.consolidation_id` partially updated |
| Update system settings | `settings.service.ts:updateSystemSettings`, `settings.repo.ts` | History is logged field-by-field; a missing field in `newData` silently skips its history entry |
| Customer creation | `customers.service.ts:registerCustomer`, `customers.repo.ts:createCustomerWithAddresses` | SQL CTE — customer and all addresses are inserted atomically; failure rolls back both |

### External Integrations

- **Neon PostgreSQL** (`@neondatabase/serverless`) — primary database, HTTP transport — `src/lib/db.ts`
- **JWT** (`jsonwebtoken`) — 12-hour expiry, `JWT_SECRET` env var with hardcoded fallback — `auth.service.ts:17-21`
- **bcryptjs** — password comparison at login — `auth.service.ts:14`
- **Delivery notification** — `console.log` stub only, triggered at `logistics.service.ts:152-154` when status = `ENTREGADO`; no real email or SMS integration exists

### Geographic Scope

Addresses use Costa Rica administrative divisions: `province`, `canton`, `district` — `types/customer/customer.types.ts`. Billing is denominated in CRC (Costa Rican colón): fields `total_amount_crc`, `applied_fee_crc`. Package entry is described as "Registro de entrada de mercancía en Miami" — `logistics.repo.ts:16`.

### Areas Where Changes Have High Impact

- **`RATES` constant in `logistics.repo.ts:134`** — controls actual invoice amounts. Changing it affects all future billing. This is separate from `system_settings`.
- **`system_settings`** — affects only the operator cost preview (`use-package-calculator.ts`) and the settings history audit trail; does not affect invoicing until `generateBilling` is updated to read from the DB.
- **`packages.status`** — read by the public-facing `/tracking` page; status values are customer-visible.
- **`authorizeServerSidePage` in `src/hocs/auth.tsx`** — wraps every protected admin page via `getServerSideProps`; a change here affects the entire admin surface.
