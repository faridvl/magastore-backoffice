# BILLING_RULES.md

Complete audit of every location in the codebase where billing variables (price per pound,
exchange rate, fee, minimum weight) appear or are used in a calculation.
Derived exclusively from reading source files.

---

## Locations inventory

---

### Location 1 — `src/shared/api/repositories/logistics.repo.ts:134–156`

**Role:** The only place that actually INSERTs a billing record into the database.

**Current values:**
```
price_lb  = 4.5      (USD per pound)
exchange  = 525      (CRC per USD)
fee       = 1500     (CRC, flat fee added to total)
min_lb    = 1        (minimum billable pounds)
```

**Current formula:**
```
chargedWeight = MAX(actualWeight, 1)
totalCRC      = (chargedWeight × 4.5 × 525) + 1500
```

**All values hardcoded:** Yes — `const RATES = { price_lb: 4.5, exchange: 525, fee: 1500, min_lb: 1 }` at line 134.

**Uses `system_settings`:** No.

**Fee treatment:** The `fee: 1500` is a flat CRC amount added after the weight-based calculation. It represents a fixed charge per invoice regardless of weight.

**What is stored:** All four components are snapshotted into the `billing` row as `applied_rate_usd`, `applied_exchange`, `applied_fee_crc`, and `total_weight_charged`. This snapshot design is correct.

---

### Location 2 — `src/components/containers/logistics/use-package-calculator.ts:41–57`

**Role:** Operator cost preview shown during package creation. Never writes to the database.

**Current values:**
```
price_per_lb  → system_settings.price_per_lb   (live DB)
exchange_rate → system_settings.exchange_rate  (live DB)
min_weight    → system_settings.min_weight     (live DB)
fee           → not used
```

**Current formula:**
```
weight         = weight_lb > 0 ? MAX(weight_lb, min_weight) : 0
cobroTotalUSD  = weight × price_per_lb
cobroTotalCRC  = cobroTotalUSD × exchange_rate
ganancia       = cobroTotalCRC - costoOperativoCRC   (operator-entered field)
appliedMin     = weight_lb > 0 && weight_lb < min_weight
```

**All values hardcoded:** No — three of four variables read from `system_settings`.

**Uses `system_settings`:** Yes (price, exchange, min_weight). The flat fee is not included.

**Discrepancy with Location 1:** This preview omits the fixed fee (`1500 CRC` in the repo). An operator sees `cobroTotalCRC = weight × price × exchange`; the actual invoice charges `(weight × price × exchange) + 1500`. The customer is charged more than the preview shows.

---

### Location 3 — `src/components/containers/logistics/logistics-view-detail/use-logistics-detail.ts:22–76`

**Role:** Financial panel shown in the package detail view. Never writes to the database. Values reset on navigation.

**Current values:**
```
tarifaXLibre      = 6       (USD per pound, hardcoded in useState)
tipoCambio        = 540     (CRC per USD, hardcoded in useState)
costoEnvioCorreos = 2500    (CRC flat fee, hardcoded in useState)
costoPTY          = 0       (operator cost, hardcoded in useState)
```

**Current formula:**
```
fleteUSD     = peso × tarifaXLibre                      (= peso × 6)
totalPagar   = fleteUSD × tipoCambio + costoEnvioCorreos (= (peso × 6 × 540) + 2500)
gananciaTotal = totalPagar - costoPTY
```

**All values hardcoded:** Yes — all four are initial `useState` defaults. The operator can edit them locally but changes are never persisted.

**Uses `system_settings`:** No.

**Minimum weight applied:** No.

**Comparison to Location 1 at the same weight:**

| Weight | Location 1 (actual invoice) | Location 3 (detail view) |
|---|---|---|
| 1 lb | `(1 × 4.5 × 525) + 1500 = ₡3,862.50` | `(1 × 6 × 540) + 2500 = ₡5,740` |
| 5 lbs | `(5 × 4.5 × 525) + 1500 = ₡13,312.50` | `(5 × 6 × 540) + 2500 = ₡18,700` |
| 10 lbs | `(10 × 4.5 × 525) + 1500 = ₡25,125` | `(10 × 6 × 540) + 2500 = ₡34,900` |

The detail view systematically overstates charges by 35–48% relative to what the database actually records.

---

### Location 4 — `src/pages/admin/billing/index.tsx:12–52`

**Role:** The admin billing dashboard. Entirely mocked — reads from a hardcoded array, no DB connection.

**Current values:**
```
TARIFA_POR_LIBRA = 5.00   (USD per pound, module-level constant)
COSTO_POR_LIBRA  = 2.50   (USD per pound, module-level constant)
```

**Current formula:**
```
totalRevenue = totalWeight × 5.00
netProfit    = totalWeight × (5.00 − 2.50)
```

**All values hardcoded:** Yes — module-level constants.

**Uses `system_settings`:** No.

**Currency:** Result is in USD (displayed with `$`). No CRC conversion applied.

**Fee applied:** No.

**Minimum weight applied:** No.

**Comparison to Location 1 at the same weight:**
The billing page shows USD totals without conversion; the database stores CRC totals. The results are in different currencies and cannot be compared without the exchange rate.

---

### Location 5 — `src/components/containers/settings-container/use-settings.ts:52–55`

**Role:** Settings panel display — computes preview metrics to inform the admin of the effective CRC rate and profit percentage. Never used for billing.

**Current values:**
```
price_per_lb  → system_settings.price_per_lb  (live DB)
exchange_rate → system_settings.exchange_rate (live DB)
profit_per_lb → system_settings.profit_per_lb (live DB)
```

**Current formula:**
```
priceInCRC   = price_per_lb × exchange_rate
profitMargin = (profit_per_lb ÷ priceInCRC) × 100   (expressed as %)
```

**All values hardcoded:** No.

**Uses `system_settings`:** Yes.

**Note:** This is purely a display-level calculation. The result (`priceInCRC`, `profitMargin`) is rendered in the settings UI and nowhere else.

---

### Location 6 — `src/components/containers/settings-container/settings-container.tsx:78–81`

**Role:** UI label mapping for the settings form fields.

```
{ label: 'Precio Lb (USD)',  key: 'price_per_lb'  }
{ label: 'Cambio (CRC)',     key: 'exchange_rate'  }
{ label: 'Fee Lb (CRC)',     key: 'profit_per_lb'  }   ← labeled "Fee" in the UI
{ label: 'Min. Lbs',         key: 'min_weight'     }
```

**Finding:** The UI labels `profit_per_lb` as "Fee Lb (CRC)". The type definition names it `profit_per_lb`. The service labels it "Ganancia por Libra". Three different names for the same DB column — there is no agreement on what this field means.

The hardcoded `fee: 1500` in `generateBilling` (Location 1) is never read from `system_settings`, even though this column exists and is editable by the admin.

---

## Summary table

| # | File | Role | Price/Lb | Exchange | Fee | Min Weight | Source |
|---|---|---|---|---|---|---|---|
| 1 | `logistics.repo.ts:134` | Actual invoice INSERT | `4.5` HC | `525` HC | `1500` HC | `1` HC | None |
| 2 | `use-package-calculator.ts:42` | Creation preview | `system_settings` | `system_settings` | **missing** | `system_settings` | DB ✅ (partial) |
| 3 | `use-logistics-detail.ts:22` | Detail view display | `6` HC | `540` HC | `2500` HC | **missing** | None |
| 4 | `billing/index.tsx:12` | Billing page (mock) | `5.00` HC | **missing** | **missing** | **missing** | None |
| 5 | `use-settings.ts:52` | Settings display | `system_settings` | `system_settings` | `system_settings` | N/A | DB ✅ |

HC = hardcoded. **bold** = component missing from formula.

**No two locations use the same values or the same formula.**

---

## The `profit_per_lb` ambiguity

`system_settings.profit_per_lb` is the most confused field in the schema:

| Context | Name used | Meaning implied |
|---|---|---|
| `settings.types.ts:4` | `profit_per_lb` | Profit per pound |
| `settings.service.ts:13` | `'Ganancia por Libra'` | Profit per pound |
| `settings-container.tsx:80` | `'Fee Lb (CRC)'` | A fee charged in CRC |
| `use-settings.ts:55` | Divisor in profit margin % | Profit per pound |
| `generateBilling` (repo) | Not referenced at all | — |

The field is used as a display-only profit margin indicator in the settings panel. It is **never used in any billing calculation**. Meanwhile, the flat CRC fee (`1500`) is hardcoded in the repo and has no corresponding DB field.

---

## Canonical billing formula

### Requirements

1. `system_settings` is the only source of truth for all rate variables
2. Applies to consolidation-level billing (works with `consolidation.total_weight_lb`)
3. Enforces minimum billable weight
4. No rate values exist in application code — all come from the DB

### Prerequisite: rename `profit_per_lb` → `fee_crc`

The `profit_per_lb` field must be repurposed. The settings UI already labels it "Fee Lb (CRC)". Its intended meaning is a flat fee per invoice in CRC, which is what the `1500` constant in `generateBilling` represents. Renaming the column in `system_settings` and updating all references resolves the ambiguity and provides the missing DB-sourced fee.

Required changes in `system_settings`:

| Old column name | New column name | New meaning |
|---|---|---|
| `profit_per_lb` | `fee_crc` | Flat fee added to every invoice, in CRC |

### The canonical formula

```
-- Inputs (all from system_settings):
price_per_lb  = system_settings.price_per_lb   (USD per pound)
exchange_rate = system_settings.exchange_rate  (CRC per USD)
fee_crc       = system_settings.fee_crc        (flat CRC fee, currently named profit_per_lb)
min_weight    = system_settings.min_weight     (minimum billable pounds)

-- Input from consolidation:
actual_weight = consolidations.total_weight_lb

-- Derived:
charged_weight       = MAX(actual_weight, min_weight)
freight_usd          = charged_weight × price_per_lb
freight_crc          = freight_usd × exchange_rate
total_amount_crc     = freight_crc + fee_crc
```

Written inline:

```
total_amount_crc = (MAX(consolidation.total_weight_lb, system_settings.min_weight)
                    × system_settings.price_per_lb
                    × system_settings.exchange_rate)
                   + system_settings.fee_crc
```

### Snapshot fields stored in `billing`

| Column | Value stored |
|---|---|
| `applied_rate_usd` | `system_settings.price_per_lb` at invoice time |
| `applied_exchange` | `system_settings.exchange_rate` at invoice time |
| `applied_fee_crc` | `system_settings.fee_crc` at invoice time |
| `total_weight_charged` | `MAX(actual, min_weight)` |
| `total_amount_crc` | Final calculated total |

The snapshot design already in `logistics.repo.ts` is correct and must be preserved. Past invoices must not change when settings change.

---

## Migration plan

The following describes which calculations must be removed, replaced, or centralized.
No code should be written until the team confirms this plan.

---

### Step 1 — Rename `profit_per_lb` to `fee_crc` in `system_settings`

**Type:** Database column rename + application code update.

**Reason:** The column is already editable as a fee in the settings UI. Renaming it to `fee_crc` aligns the DB, type, service label, and UI label, and makes it available to `generateBilling`.

**Files to update:**
- `system_settings` DB column
- `src/types/settings/settings.types.ts` — rename field in `SystemSettings` type
- `src/shared/api/repositories/settings.repo.ts` — UPDATE query column name
- `src/shared/api/services/settings.service.ts` — history label for the field
- `src/components/containers/settings-container/use-settings.ts` — useState key
- `src/components/containers/settings-container/settings-container.tsx` — form key

**Risk:** Medium. The settings history label changes for new entries; old history rows retain the old label.

---

### Step 2 — Remove hardcoded `RATES` from `logistics.repo.ts:134`

**Type:** Replace constant with DB read inside transaction.

**Reason:** `RATES` is the root cause of all rate divergence. After Step 1, `system_settings` has all four required values. The repo must read them within the same transaction that generates the billing record.

**Required behavior:**
- `generateBilling` must first read `system_settings` (using `getSettings()` from `settings.repo.ts`)
- Rates are then used for calculation AND snapshotted into the `billing` INSERT
- If `system_settings` row is not found, throw an explicit error — do not fall back to constants
- The function must only accept `type: 'CONSOLIDATION'` if the business rule is adopted; the `'PACKAGE'` path should be removed or guarded

**Files affected:**
- `src/shared/api/repositories/logistics.repo.ts` — `generateBilling`

**Risk:** High. This changes what amounts are actually invoiced. Must be tested with the current DB values before and after to confirm parity.

---

### Step 3 — Add fee to `use-package-calculator.ts`

**Type:** Add missing variable to preview formula.

**Reason:** The creation preview currently omits the flat fee. Operators see a lower amount than what the database records. After Step 1, `system_settings.fee_crc` is available via `useSettingsQuery`.

**Required change:**
- Read `settings.fee_crc` in `usePackageCalculator`
- Add `fee_crc` to `cobroTotalCRC` calculation: `cobroTotalCRC = (weight × price × rate) + fee_crc`
- Show the fee as a separate line in the preview UI

**Files affected:**
- `src/components/containers/logistics/use-package-calculator.ts`
- `src/components/containers/logistics/create-package-container.tsx` (display)

---

### Step 4 — Replace `use-logistics-detail.ts` hardcoded state

**Type:** Remove hardcoded defaults, load from `system_settings`.

**Reason:** `tarifaXLibre: 6`, `tipoCambio: 540`, `costoEnvioCorreos: 2500` are disconnected from both the DB settings and the actual billing records. The detail view will show conflicting information once real billing data is displayed.

**Required change:**
- Remove the four hardcoded financial fields from the `useState` initializer
- Fetch `system_settings` via `useSettingsQuery` (already available via `usePackageCalculator` pattern)
- If a billing record exists for the package's consolidation, display actual billed amounts from the `billing` row — not a recalculation

**Files affected:**
- `src/components/containers/logistics/logistics-view-detail/use-logistics-detail.ts`

---

### Step 5 — Replace `billing/index.tsx` mock data and constants

**Type:** Replace entirely — mock page replacement.

**Reason:** `TARIFA_POR_LIBRA`, `COSTO_POR_LIBRA`, and `MOCK_BILLING` are all to be removed. This is the billing list page; it must query real `billing` records from the database.

**Required change:**
- Create `GET /api/billing` endpoint
- Create `use-billing-query.ts` hook
- Remove `MOCK_BILLING`, `TARIFA_POR_LIBRA`, `COSTO_POR_LIBRA` constants
- Display `billing.total_amount_crc`, `billing.is_paid`, `billing.paid_at` from real data
- Aggregate metrics (total receivable, paid vs pending) from DB query results

**Files affected:**
- `src/pages/admin/billing/index.tsx` — full replacement
- New: `src/shared/api/querys/billing/use-billing-query.ts`
- New: `src/pages/api/billing/index.ts`
- New: `src/shared/api/repositories/billing.repo.ts` (or extend `logistics.repo.ts`)

---

### Step 6 — Clarify `profit_per_lb` / `fee_crc` intent in settings UI

**Type:** Label update only.

**Reason:** The settings container currently labels `profit_per_lb` as "Fee Lb (CRC)". After the rename in Step 1, the UI label and DB column will be in agreement. The display formula in `use-settings.ts:52-55` (`profitMargin`) uses this field as a profit margin denominator — after renaming it to `fee_crc`, that formula no longer makes semantic sense and should either be removed or replaced with a meaningful metric.

**Files affected:**
- `src/components/containers/settings-container/use-settings.ts` — remove or replace `profitMargin` calculation
- `src/components/containers/settings-container/settings-container.tsx` — confirm label

---

### Migration sequence

| Step | Description | Risk | Dependency |
|---|---|---|---|
| 1 | Rename `profit_per_lb` → `fee_crc` in DB + types | Medium | None |
| 2 | Remove hardcoded RATES, read from `system_settings` in `generateBilling` | High | Step 1 |
| 3 | Add fee to creation preview | Low | Step 1 |
| 4 | Replace hardcoded state in detail view | Low | Step 2 (to show real billed amounts) |
| 5 | Replace mock billing page with real data | Medium | Step 2 (requires real billing records) |
| 6 | Clean up settings UI formula | Low | Step 1 |

Steps 1 and 2 are the critical path. Steps 3–6 are independent UI corrections that can follow in any order after Step 2 is complete.
