# DATABASE_SPEC.md

Schema verified against live Neon DB on 2026-06-24. Real column names, types, and constraints
are confirmed. Discrepancies from the TypeScript types are marked **[TYPE MISMATCH]**.
No DDL or migration files exist in this project.

---

## Real DB state (2026-06-24)

| Table | Rows | Notes |
|---|---|---|
| `users` | 1 | Single operator |
| `customers` | 8 | Dev/test data |
| `packages` | 21 | All status = `MIAMI` — no status changes have been made |
| `package_events` | 21 | One per package, all MIAMI events — written by DB trigger |
| `consolidations` | 0 | None created yet |
| `billing` | 0 | No invoices generated yet |
| `settings_history` | 14 | Settings edited multiple times |

## DB Trigger (discovered 2026-06-24)

**`trg_package_status_history`** fires on INSERT and UPDATE on `packages`, calls `fn_log_package_status_change()`.
This automatically writes a row to `package_events` on every status change. The application code does NOT need an INSERT — the DB handles it. This resolves the long-standing "no INSERT into package_events" mystery documented in CLAUDE.md.

## `system_settings` live values (2026-06-24)

| Column | DB value | Code hardcoded in `logistics.repo.ts:134` | Delta |
|---|---|---|---|
| `price_per_lb` | **$6.00** | $4.50 | Code undercharges by 25% |
| `exchange_rate` | **₡480** | ₡525 | Code uses wrong rate |
| `profit_per_lb` (= fee) | **₡2,900** | ₡1,500 | Code undercharges by ₡1,400 |
| `min_weight` | **1 lb** | 1 lb | ✅ Matches |

**Impact:** A 5 lb invoice at DB rates = ₡17,300. At hardcoded rates = ₡13,312. Difference: **₡3,988 (30%) per invoice.**

## Known Data Quality Issues

- **`package_type` has 5 distinct values in DB:** `"AEREO"`, `"Maritimo"`, `"Maritimo"`, `"MARITIMO"`, `"AVION"`. The type enum in code uses title-case (`Aereo`, `Maritimo`). Inconsistent — needs normalization. **[TYPE MISMATCH]**
- **`customers.user_uuid`** column exists in DB (UNIQUE) but is not in the `Customer` TypeScript type. Currently all NULL. **[TYPE MISMATCH]**
- **`system_settings.updated_by`** column (uuid) exists in DB but not in `SystemSettings` type. Always NULL. **[TYPE MISMATCH]**
- **`packages` has no `updated_at`** in the real DB (contradicts the spec below). **[TYPE MISMATCH]**

---

## Source of truth

| File | What it reveals |
|---|---|
| `src/types/logistics/logistics.types.ts` | `Package`, `PackageEvent`, `Consolidation`, `Billing` interfaces |
| `src/types/customer/customer.types.ts` | `Customer`, `CustomerAddress` interfaces |
| `src/types/auth/auth.ts` | `User` type |
| `src/types/settings/settings.types.ts` | `SystemSettings`, `SettingsHistory` types |
| `src/shared/api/repositories/logistics.repo.ts` | SQL for packages, package_events, consolidations, billing |
| `src/shared/api/repositories/customers.repo.ts` | SQL for customers, customer_addresses |
| `src/shared/api/repositories/user.repo.ts` | SQL for users |
| `src/shared/api/repositories/settings.repo.ts` | SQL for system_settings, settings_history |

---

## Tables

---

### `users`

**Purpose:** Authentication. Stores operator accounts. Currently only ADMIN-role accounts are returned by the application.

**Primary key:** `id` — `INTEGER` [inferred from `User.id: number`]

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK, auto-increment |
| `name` | TEXT | NOT NULL | Display name, returned on login |
| `email` | TEXT | NOT NULL | Login credential; unique |
| `password` | TEXT | NOT NULL | bcrypt hash |

**Foreign keys:** None.

**Indexes (inferred from query patterns):**
- UNIQUE on `email` — `SELECT * FROM users WHERE email = ${email}` (`user.repo.ts:4`)

**Business meaning:** Operators who manage the backoffice. Role is hardcoded to `'ADMIN'` in `auth.service.ts:25` — the column is not stored in the DB; it is returned as a constant by the application.

---

### `customers`

**Purpose:** Registry of clients whose packages the courier receives and delivers.

**Primary key:** `id` — `UUID` [inferred from `Customer.id: string`, used as FK target in packages and consolidations JOINs]

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `customer_id` | SERIAL INTEGER | NOT NULL | Internal auto-increment; used only for generating `customer_code` via `pg_get_serial_sequence` (`customers.repo.ts:43`) |
| `id_card` | TEXT | NOT NULL | National or passport ID; unique |
| `id_type` | TEXT | NOT NULL | `'FISICA'`, `'JURIDICA'`, `'DIMEX'`, or `'PASAPORTE'` |
| `first_name` | TEXT | NOT NULL | |
| `last_name` | TEXT | NOT NULL | |
| `email` | TEXT | NOT NULL | Unique |
| `phone` | TEXT | NOT NULL | |
| `customer_code` | TEXT | NOT NULL | Human-readable code: `'MG-' \|\| UPPER(SUBSTRING(uuid)) \|\| '-' \|\| serial` |
| `is_active` | BOOLEAN | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**Foreign keys:** None.

**Indexes (inferred from query patterns):**
- UNIQUE on `id_card` — checked via `WHERE id_card = ${idCard} OR email = ${email}` (`customers.repo.ts:8-13`)
- UNIQUE on `email` — same query
- Index on `first_name` [inferred] — searched with `ILIKE` in `logistics.repo.ts:71`
- Index on `customer_code` [inferred] — searched with `ILIKE` in `logistics.repo.ts:71`

**Business meaning:** The customer is the importer who shipped goods from the US to Costa Rica. A customer can have multiple packages across multiple shipments.

---

### `customer_addresses`

**Purpose:** Delivery addresses for customers. One customer may have multiple addresses; exactly one must be marked `is_default`.

**Primary key:** `id` — `UUID` [inferred from `CustomerAddress.id: string`]

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `customer_id` | UUID | NOT NULL | FK → `customers.id` |
| `province` | TEXT | NOT NULL | Costa Rica province |
| `canton` | TEXT | NOT NULL | Costa Rica canton |
| `district` | TEXT | NOT NULL | Costa Rica district |
| `exact_address` | TEXT | NOT NULL | Full street address |
| `address_label` | TEXT | NOT NULL | Default `'Casa'` (`customers.repo.ts:57`) |
| `is_default` | BOOLEAN | NOT NULL | Default `false`; service enforces at least one `true` |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**Foreign keys:**
- `customer_id` → `customers.id` — confirmed: `WHERE ca.customer_id = c.id` (`customers.repo.ts:99`)

**Indexes (inferred):**
- FK index on `customer_id`

**Business meaning:** Costa Rica address used for last-mile delivery. The `is_default` flag designates the primary delivery address shown on invoices and labels.

---

### `packages`

**Purpose:** Individual parcels received at the Miami warehouse. Central operational entity.

**Primary key:** `id` — `INTEGER` [inferred from `Package.id: number`]

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK, auto-increment (SERIAL) |
| `uuid` | UUID | NOT NULL | External identifier; unique |
| `consolidation_id` | INTEGER | NULLABLE | FK → `consolidations.id`; null until package is consolidated |
| `customer_id` | UUID | NOT NULL | FK → `customers.id` |
| `tracking_number` | TEXT | NOT NULL | Carrier tracking number |
| `weight_lb` | DECIMAL | NOT NULL | Must be > 0 (enforced in service) |
| `package_type` | TEXT | NOT NULL | Default `'Aereo'`; also `'Maritimo'` (`logistics.repo.ts:21`) |
| `status` | TEXT | NOT NULL | `'MIAMI'`, `'TRANSITO'`, `'ADUANA'`, `'BODEGA_CR'`, `'ENTREGADO'` |
| `internal_notes` | TEXT | NULLABLE | Operator notes; overwritten on each status update |
| `evidence_url` | TEXT | NULLABLE | URL of damage photo; overwritten on each status update |
| `arrival_date` | TIMESTAMPTZ | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Updated to `NOW()` on status change |

**Foreign keys:**
- `customer_id` → `customers.id` — confirmed: `LEFT JOIN customers c ON p.customer_id = c.id` (`logistics.repo.ts:69`)
- `consolidation_id` → `consolidations.id` — confirmed: `UPDATE packages SET consolidation_id = ${cons.id}` (`logistics.repo.ts:106-108`)

**Indexes (inferred from query patterns):**
- UNIQUE on `uuid` — queried as primary lookup: `WHERE p.uuid = ${packageUuid}`
- Index on `status` — filtered in every paginated list query
- Index on `tracking_number` — searched with `ILIKE`
- FK index on `customer_id`
- FK index on `consolidation_id`

**Business meaning:** Represents a single physical parcel. Its lifecycle is tracked from entry in Miami through customs (`ADUANA`), Costa Rica warehouse (`BODEGA_CR`), to final delivery (`ENTREGADO`). Can belong to a consolidation or be invoiced individually.

---

### `package_events`

**Purpose:** Immutable audit log of package status milestones and incidents.

**Primary key:** `id` — `INTEGER` [inferred from `PackageEvent.id: number`]

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK, auto-increment |
| `package_id` | INTEGER | NOT NULL | FK → `packages.id` |
| `status` | TEXT | NOT NULL | Status label at event time |
| `event_type` | TEXT | NOT NULL | `'INFO'`, `'WARNING'`, `'DAMAGE'`, `'CRITICAL'` |
| `description` | TEXT | NOT NULL | Human-readable event description |
| `location` | TEXT | NOT NULL | Geographic location at event time |
| `created_at` | TIMESTAMPTZ | NOT NULL | Immutable timestamp |

**Foreign keys:**
- `package_id` → `packages.id` — confirmed: `WHERE ev.package_id = p.id` (`logistics.repo.ts:41`)

**Indexes (inferred):**
- FK index on `package_id`
- Index on `created_at` — ordered `DESC` in every query

**Business meaning:** Public-facing tracking history shown on the `/tracking` page. Each row represents a discrete milestone or incident in the package's journey. **No INSERT into this table exists in the current application code** — how rows are written is not implemented.

---

### `consolidations`

**Purpose:** Groups multiple packages into a single shipment for bulk handling and invoicing.

**Primary key:** `id` — `INTEGER` [inferred from `Consolidation.id: number`]

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK, auto-increment |
| `uuid` | UUID | NOT NULL | External identifier; unique |
| `customer_id` | UUID | NOT NULL | FK → `customers.id` [inferred; Consolidation type has `customer_id: string`] |
| `status` | TEXT | NOT NULL | `'ABIERTO'`, `'CERRADO'`, `'DESPACHADO'`, `'ENTREGADO'` |
| `total_weight_lb` | DECIMAL | NOT NULL | Recalculated as `SUM(packages.weight_lb)` on every consolidation operation |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Updated to `NOW()` on weight recalculation |

**Foreign keys:**
- `customer_id` → `customers.id` [inferred from type; no direct JOIN SQL found for this FK]

**Indexes (inferred):**
- UNIQUE on `uuid` — queried as primary lookup: `SELECT id FROM consolidations WHERE uuid = ${uuid}` (`logistics.repo.ts:102`)
- FK index on `customer_id`

**Business meaning:** A consolidation is a container that groups multiple packages from (presumably) the same customer into one shipment, reducing handling cost. Its total weight drives billing when invoiced at the consolidation level.

---

### `billing`

**Purpose:** Financial records (invoices) for packages or consolidations. Append-only in practice — no UPDATE or DELETE exists in application code.

**Primary key:** `id` — `INTEGER` [inferred from `Billing.id: number`]

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK, auto-increment |
| `uuid` | UUID | NOT NULL | External identifier |
| `package_id` | INTEGER | NULLABLE | FK → `packages.id`; set when invoicing a single package |
| `consolidation_id` | INTEGER | NULLABLE | FK → `consolidations.id`; set when invoicing a consolidation |
| `applied_rate_usd` | DECIMAL | NOT NULL | USD rate per lb at invoice time (snapshot) |
| `applied_exchange` | DECIMAL | NOT NULL | USD→CRC exchange rate at invoice time (snapshot) |
| `applied_fee_crc` | DECIMAL | NOT NULL | Fixed fee in CRC at invoice time (snapshot) |
| `total_weight_charged` | DECIMAL | NOT NULL | `MAX(actual_weight, min_lb)` — weight used for calculation |
| `total_amount_crc` | DECIMAL | NOT NULL | Final amount owed in Costa Rican colones |
| `is_paid` | BOOLEAN | NOT NULL | Default `false` [inferred] |
| `paid_at` | TIMESTAMPTZ | NULLABLE | Set when payment is confirmed |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**Constraints:**
- `package_id` and `consolidation_id` are mutually exclusive: the INSERT uses a ternary — one is always `null` (`logistics.repo.ts:168-169`). This constraint is enforced by application logic, not a DB CHECK.

**Current rate values (hardcoded in `logistics.repo.ts:134`):**
- `applied_rate_usd` → `4.5`
- `applied_exchange` → `525`
- `applied_fee_crc` → `1500`
- `min_lb` → `1`

These constants are NOT read from `system_settings` at invoice time.

**Foreign keys:**
- `package_id` → `packages.id` — confirmed: `logistics.repo.ts:168`
- `consolidation_id` → `consolidations.id` — confirmed: `logistics.repo.ts:169`

**Indexes (inferred):**
- FK index on `package_id`
- FK index on `consolidation_id`

**Business meaning:** Each row is a permanent financial record. The snapshot columns (`applied_rate_usd`, `applied_exchange`, `applied_fee_crc`) ensure that future rate changes do not retroactively alter past invoices.

---

### `system_settings`

**Purpose:** Singleton configuration table. Stores operational rates and minimums used by the pricing preview.

**Primary key:** `id` — `UUID`, hardcoded value `'00000000-0000-0000-0000-000000000000'` (`settings.repo.ts:3`)

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK; always `'00000000-0000-0000-0000-000000000000'` |
| `price_per_lb` | DECIMAL | NOT NULL | USD price charged per pound |
| `exchange_rate` | DECIMAL | NOT NULL | USD → CRC conversion rate |
| `profit_per_lb` | DECIMAL | NOT NULL | Internal margin per pound (not used in billing) |
| `min_weight` | DECIMAL | NOT NULL | Minimum billable weight in pounds |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Updated to `NOW()` on every settings change |

**Foreign keys:** None.

**Indexes:** None beyond PK.

**Business meaning:** Controls the live cost preview shown to operators in `use-package-calculator.ts`. The values are **not** read by `generateBilling` (which uses hardcoded constants instead). Every change is audited in `settings_history`.

---

### `settings_history`

**Purpose:** Append-only audit trail of every change to `system_settings` fields.

**Primary key:** `id` — `UUID` [inferred from `SettingsHistory.id: string`]

**Columns:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK, auto-generated |
| `parameter_name` | TEXT | NOT NULL | Human-readable label: `'Precio por Libra'`, `'Tipo de Cambio'`, `'Ganancia por Libra'`, `'Peso Mínimo'` |
| `old_value` | DECIMAL | NOT NULL | Previous value |
| `new_value` | DECIMAL | NOT NULL | New value |
| `changed_at` | TIMESTAMPTZ | NOT NULL | Timestamp of change (DEFAULT NOW() [inferred]) |
| `changed_by_name` | TEXT | NOT NULL | Operator display name from session cookie |

**Foreign keys:** None — no FK to `system_settings`.

**Indexes (inferred):**
- Index on `changed_at` — queried `ORDER BY changed_at DESC LIMIT 15` (`settings.repo.ts:14`)

**Business meaning:** Provides accountability for rate changes. Operators see the last 15 changes with old/new values in the settings dashboard. Only field-level granularity — one row per changed field, not per settings save.

---

## Cross-cutting observations

1. **No DDL in repository.** The entire schema is reconstructed from application code. Adding or removing columns requires coordinated changes across types, repos, services, and queries — there is no single migration file to update.

2. **Dual identifiers on packages and consolidations.** Both use an internal INTEGER `id` (for FK relationships within SQL) and a public `uuid` (for external API references). Customers use UUID for both internal JOINs and external references.

3. **`customers` has two numeric identifiers.** `id` (UUID, external) and `customer_id` (SERIAL INT, internal — used only in `customer_code` generation). This column exists but never appears in any query other than `pg_get_serial_sequence`.

4. **`billing` constraint is application-enforced.** The mutual exclusivity of `package_id` / `consolidation_id` is implemented in TypeScript, not in a DB CHECK constraint.

5. **`package_events` has no writer.** The table is read by `getTrackingHistory` but no INSERT exists in the codebase. It may be populated externally or the feature is incomplete.

6. **`system_settings` and billing are decoupled.** `generateBilling` uses hardcoded rate constants; `system_settings` only feeds the operator cost preview.
