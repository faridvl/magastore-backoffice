# BILLING_IMPLEMENTATION_GAP.md

Analysis of the current billing implementation against the business rule:
**"A billing record must be generated per consolidation."**

All findings are derived directly from source code. File paths and line numbers are included for every claim.

---

## 1. Does the existing code enforce billing per consolidation?

**No.**

`generateBilling` in `logistics.repo.ts:130-184` accepts two paths, controlled by a `type` parameter:

```
POST /api/logistics?action=invoice
body: { targetUuid: string, type: 'PACKAGE' | 'CONSOLIDATION' }
```

Both paths are fully implemented and equally accessible. The `type` value is passed from the request body with no restriction at the API, service, or repository layer. Nothing prevents a caller from generating a package-level invoice. The business rule is not encoded anywhere in the system.

---

## 2. Is package-level billing used anywhere in the UI?

**No, but it exists in the API layer.**

The frontend has no component that calls the invoice endpoint:
- No mutation file for invoicing exists under `src/shared/api/mutations/` (only `use-add-package-mutation.ts` and `use-create-customer-mutation.ts` exist)
- `logistics-view-detail.tsx` shows a financial summary panel but `handleSaveFinancial` in `use-logistics-detail.ts:81-84` does nothing — it only sets `isEditingFinancial(false)`, no API call
- `pages/admin/billing/index.tsx` is fully mocked: it uses a hardcoded `MOCK_BILLING` array (lines 16-21), no query hook, no real data
- `pages/admin/packages/index.tsx` simulates an Excel search with `setTimeout` and hardcoded mock results

The `POST /logistics?action=invoice` endpoint exists and works at the API level, but nothing in the UI triggers it.

---

## 3. Can `billing.package_id` be removed from future workflows?

**It can be excluded from new flows, but it cannot be dropped from the table without a migration.**

If the business rule is adopted exclusively, new invoices should only set `billing.consolidation_id`. However:
- Any existing billing rows with `package_id` set would lose their FK reference
- The `Billing` type in `logistics.types.ts:61-62` declares both as `number | null`
- The constraint that exactly one of the two is non-null is enforced only in application code (`logistics.repo.ts:168-169`) — there is no DB CHECK constraint

Adopting the consolidation-only rule means:
1. The service must reject `type === 'PACKAGE'` requests
2. `billing.package_id` becomes permanently null for all new records
3. The column can be formally dropped only after a confirmed migration

---

## 4. Involved files

| Layer | File | Relevant code |
|---|---|---|
| API handler | `src/pages/api/logistics/index.tsx:52-55` | Routes `action=invoice` to `LogisticsService.createInvoice` |
| Service | `src/shared/api/services/logistics.service.ts:122-131` | `createInvoice(uuid, type)` — no validation, delegates directly to repo |
| Repository | `src/shared/api/repositories/logistics.repo.ts:130-184` | `generateBilling(targetUuid, type)` — transactional, hardcoded rates |
| Type | `src/types/logistics/logistics.types.ts:58-71` | `Billing` interface |

No query hooks, mutation hooks, or UI components currently call these layers for billing generation.

---

## 5. Does the current billing calculation cover all required components?

### What exists

| Component | Implemented | Location | Notes |
|---|---|---|---|
| Total weight | Yes | `logistics.repo.ts:143-152` | Read from `packages.weight_lb` or `consolidations.total_weight_lb` |
| Minimum weight | Yes | `logistics.repo.ts:155` | `Math.max(actualWeight, RATES.min_lb)` where `min_lb = 1` |
| Price per pound | Yes | `logistics.repo.ts:134` | Hardcoded `price_lb: 4.5` (USD) |
| Exchange rate | Yes | `logistics.repo.ts:134` | Hardcoded `exchange: 525` (CRC per USD) |
| Fixed fee | Yes | `logistics.repo.ts:134` | Hardcoded `fee: 1500` (CRC) |
| Rate snapshot | Yes | `logistics.repo.ts:159-176` | Stored in `applied_rate_usd`, `applied_exchange`, `applied_fee_crc` |
| Transaction safety | Yes | `logistics.repo.ts:100, 119, 122` | `BEGIN` / `COMMIT` / `ROLLBACK` |

### Formula implemented

```
chargedWeight = MAX(actual_weight, 1)
totalCRC = (chargedWeight × 4.5 × 525) + 1500
```

This formula is correct in structure. The stored `total_amount_crc` is in Costa Rican colones.

### What is missing from the calculation

| Gap | Detail |
|---|---|
| Rates are hardcoded, not from `system_settings` | `RATES = { price_lb: 4.5, exchange: 525, fee: 1500, min_lb: 1 }` at `logistics.repo.ts:134`. `system_settings` has live values but they are ignored by billing. Updating `system_settings` has no effect on invoices. |
| `profit_per_lb` is never used | `system_settings.profit_per_lb` is stored and displayed in settings but never factored into any calculation in any file. |
| No per-type rate differentiation | `package_type` (`Aereo` / `Maritimo`) exists on every package but the billing formula applies the same rate regardless of type. |

---

## 6. Production-readiness gaps

### 6.1 Rate source is disconnected from settings

**Files:** `logistics.repo.ts:134`, `settings.repo.ts`, `use-package-calculator.ts`

`generateBilling` uses hardcoded constants. `system_settings` is only read by `useSettingsQuery` for the operator cost preview. If an admin changes `price_per_lb` in the settings panel, the actual invoice amounts do not change. Three separate rate configurations currently exist in the codebase with different values:

| Location | Rates |
|---|---|
| `logistics.repo.ts:134` (actual billing) | `price_lb: 4.5`, `exchange: 525`, `fee: ₡1,500` |
| `use-logistics-detail.ts:22-24` (package detail UI) | `tarifaXLibre: 6`, `tipoCambio: 540`, `costoEnvioCorreos: ₡2,500` |
| `billing/index.tsx:12-13` (billing page UI) | `TARIFA_POR_LIBRA: $5.00`, no exchange rate |
| `system_settings` (DB, live) | Values configurable by admin; not used by billing |

The operator preview, the detail view, the billing list, and the actual invoice INSERT all show different amounts for the same package.

---

### 6.2 No duplicate invoice protection

**File:** `logistics.service.ts:122-131`

`createInvoice` calls `generateBilling` with no prior check. Calling the endpoint twice for the same UUID creates two billing rows for the same package or consolidation. There is no UNIQUE constraint on `billing.package_id` or `billing.consolidation_id`, and no SELECT-before-INSERT guard in either the service or repository.

---

### 6.3 No mutation hook for invoicing

**Expected location:** `src/shared/api/mutations/logistics/use-invoice-mutation.ts` — does not exist.

There is no client-side entry point to trigger invoice generation from the UI. The `POST /logistics?action=invoice` endpoint works but is unreachable from any React component.

---

### 6.4 Billing page is entirely mocked

**File:** `src/pages/admin/billing/index.tsx:16-21`

The billing section of the admin is built on a static array of 4 hardcoded entries. It does not query the database, does not show real billing records, and the "Cobrar Ahora" button (`line 177`) has no `onClick` handler.

Routes defined in `routes.ts:28-31`:
- `/admin/billing` — exists but shows mock data
- `/admin/billing/:id` — referenced in routes, page file does not exist
- `/admin/billing/reports` — referenced in routes, page file does not exist

---

### 6.5 No API endpoint to read billing records

No `GET /billing` or `GET /billing/:id` handler exists. There is no query hook for billing. The `billing` table can only be written (via `generateBilling`) but never queried by the application.

---

### 6.6 No payment recording

**Type:** `Billing.is_paid: boolean`, `Billing.paid_at: Date | null` — `logistics.types.ts:68-69`

The columns exist in the type and presumably in the database. There is no endpoint, service method, or mutation to set `is_paid = true` or record `paid_at`. Payment confirmation has no path through the system.

---

### 6.7 No pre-billing status validation

**File:** `logistics.service.ts:122-131`

`createInvoice` performs no status checks before generating a billing record. There is nothing preventing an invoice from being generated for a package that is still in `MIAMI` status or a consolidation still in `ABIERTO` status.

---

### 6.8 Package detail view shows disconnected financial data

**File:** `use-logistics-detail.ts:17-26`

The financial panel in the package detail view uses local React state with hardcoded defaults (`tarifaXLibre: 6`, `tipoCambio: 540`, `costoEnvioCorreos: 2500`). These are not loaded from `system_settings` or from the `billing` table. The `handleSaveFinancial` function (`lines 81-84`) calls no mutation. Edits made in this view are discarded on navigation.

Additionally, the hook contains comments flagging missing backend data:
- `tienda: 'Amazon'` — `// [BACKEND MISSING]: Retornar tienda de origen` (`line 17`)
- `cliente: 'Cliente del Sistema'` — `// [BACKEND MISSING]: Retornar nombre del dueño` (`line 18`)
- `casillero: 'S-000'` — `// [BACKEND MISSING]: Retornar número de casillero` (`line 19`)

The customer name is not returned by `GET /logistics?uuid=...`. The `PackageDetail` type (`logistics.types.ts:117-125`) does not include any customer fields.

---

### 6.9 No consolidation-level validation before invoicing

If the rule is "billing per consolidation," the service must verify the consolidation exists and has an appropriate status before generating a billing record. Currently, `createInvoice` only checks whether the DB row is found (`if (!c) throw new Error(...)`) — it does not verify status, weight, or package count.

---

## Summary table

| Gap | Severity | Affected file(s) |
|---|---|---|
| Billing rates hardcoded, not read from `system_settings` | Critical | `logistics.repo.ts:134` |
| Three inconsistent rate sets across UI | Critical | `logistics.repo.ts`, `use-logistics-detail.ts`, `billing/index.tsx` |
| No duplicate billing prevention | High | `logistics.service.ts:122` |
| No mutation hook for invoice creation | High | missing file |
| Billing page is fully mocked | High | `pages/admin/billing/index.tsx` |
| No GET endpoint for billing records | High | no file |
| No payment confirmation path | High | `billing.is_paid` unused |
| Package type (`Aereo`/`Maritimo`) not factored into rate | Medium | `logistics.repo.ts:134` |
| No pre-billing status validation | Medium | `logistics.service.ts:122` |
| Package detail financial panel is disconnected | Medium | `use-logistics-detail.ts` |
| `billing/:id` and `billing/reports` pages do not exist | Medium | routes defined, no pages |
| Customer name not returned in package detail | Medium | `PackageDetail` type |
| `profit_per_lb` stored but never used | Low | `system_settings`, `settings.types.ts` |
| No DB constraint enforcing `package_id` XOR `consolidation_id` | Low | `billing` table |
